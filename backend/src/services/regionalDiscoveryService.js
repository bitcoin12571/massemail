import dns from 'node:dns/promises';
import net from 'node:net';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const USER_AGENT = 'MailoraRegionalParser/1.0';
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MOLDOVA_PHONE_REGEX = /(?:\+?373[\s().-]*|(?<!\d)0)(?:\d[\s().-]*){8}(?!\d)/g;
const WEBSITE_BATCH_SIZE = 10;
const WEBSITE_CONCURRENCY = 8;
const CONTACT_PAGE_CONCURRENCY = 3;
const DNS_CONCURRENCY = 20;
const emailDomainCache = new Map();
const RESERVED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  'mailora.invalid'
]);

const WEBSITE_TAGS = [
  'website',
  'contact:website',
  'url',
  'contact:url',
  'brand:website',
  'operator:website'
];

const CATEGORY_MATCHERS = {
  all: () => true,
  restaurant: tags => ['restaurant', 'cafe', 'fast_food', 'bar', 'pub'].includes(tags.amenity),
  shop: tags => Boolean(tags.shop),
  services: tags => Boolean(tags.office || tags.craft || tags.service),
  medical: tags => Boolean(tags.healthcare || ['clinic', 'doctors', 'dentist', 'pharmacy', 'hospital'].includes(tags.amenity)),
  education: tags => ['school', 'college', 'university', 'kindergarten', 'language_school'].includes(tags.amenity),
  auto: tags => ['car', 'car_repair', 'car_parts', 'tyres', 'fuel'].includes(tags.shop) ||
    ['car_wash', 'vehicle_inspection', 'fuel', 'charging_station'].includes(tags.amenity),
  beauty: tags => ['beauty', 'hairdresser', 'cosmetics', 'massage'].includes(tags.shop) ||
    ['spa', 'sauna'].includes(tags.leisure),
  fitness: tags => ['fitness_centre', 'sports_centre', 'swimming_pool'].includes(tags.leisure) ||
    ['gym', 'fitness'].includes(tags.sport),
  hospitality: tags => ['hotel', 'guest_house', 'hostel', 'apartment'].includes(tags.tourism),
  tourism: tags => ['travel_agent', 'tourism'].includes(tags.shop) ||
    ['travel_agent', 'information', 'attraction'].includes(tags.tourism),
  real_estate: tags => tags.office === 'estate_agent' || tags.shop === 'estate_agent',
  construction: tags => ['builder', 'construction', 'plumber', 'electrician', 'carpenter', 'painter'].includes(tags.craft) ||
    ['doityourself', 'hardware', 'building_materials'].includes(tags.shop),
  finance: tags => ['bank', 'atm', 'bureau_de_change'].includes(tags.amenity) ||
    ['accountant', 'financial', 'insurance'].includes(tags.office),
  legal: tags => ['lawyer', 'notary'].includes(tags.office),
  it: tags => ['computer', 'electronics', 'mobile_phone'].includes(tags.shop) ||
    ['telecommunication', 'it', 'software'].includes(tags.office),
  entertainment: tags => ['cinema', 'theatre', 'nightclub', 'events_venue'].includes(tags.amenity) ||
    ['escape_game', 'amusement_arcade'].includes(tags.leisure)
};

function withTimeout(milliseconds) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function fetchJson(url, options = {}, timeoutMs = 12000) {
  const timeout = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: timeout.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    timeout.clear();
  }
}

function normalizeWebsite(value) {
  if (!value) return '';
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function getWebsiteFromTags(tags = {}) {
  for (const key of WEBSITE_TAGS) {
    const website = normalizeWebsite(tags[key]);
    if (website) return website;
  }
  return '';
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, '')
    .replace(/[),.;:]+$/, '');
}

function isPublicContactEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const [local, domain] = email.split('@');
  if (RESERVED_EMAIL_DOMAINS.has(domain) || domain.endsWith('.invalid') || domain.endsWith('.test')) {
    return false;
  }
  return ![
    'example', 'test', 'noreply', 'no-reply', 'donotreply',
    'privacy', 'abuse', 'webmaster'
  ].some(blocked => local.includes(blocked));
}

export function isEmailDomainRelatedToWebsite(email, website) {
  try {
    const emailDomain = String(email || '').split('@')[1]?.toLowerCase();
    const websiteDomain = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
    return Boolean(emailDomain) && (
      emailDomain === websiteDomain ||
      emailDomain.endsWith(`.${websiteDomain}`) ||
      websiteDomain.endsWith(`.${emailDomain}`)
    );
  } catch {
    return false;
  }
}

export async function verifyEmailDomain(email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase();
  if (!domain || RESERVED_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, method: 'invalid', domain: domain || '' };
  }
  if (emailDomainCache.has(domain)) return emailDomainCache.get(domain);

  const verification = (async () => {
    try {
      const mxRecords = await Promise.race([
        dns.resolveMx(domain),
        new Promise((_, reject) => setTimeout(() => {
          const error = new Error('DNS timeout');
          error.code = 'ETIMEOUT';
          reject(error);
        }, 3000))
      ]);
      const usableMx = mxRecords.filter(record => record.exchange && record.exchange !== '.');
      if (usableMx.length > 0) {
        return {
          valid: true,
          method: 'mx',
          domain,
          mx: usableMx.sort((left, right) => left.priority - right.priority)[0].exchange
        };
      }
      return { valid: false, method: 'no-mx', domain };
    } catch (error) {
      if (!['ENODATA', 'ENOTFOUND'].includes(error.code)) {
        return { valid: false, method: 'dns-error', domain };
      }

      try {
        const addresses = await dns.resolve(domain);
        return {
          valid: addresses.length > 0,
          method: addresses.length > 0 ? 'implicit-mx' : 'no-mx',
          domain
        };
      } catch {
        return { valid: false, method: 'no-mx', domain };
      }
    }
  })();

  emailDomainCache.set(domain, verification);
  return verification;
}

export function extractEmailsFromHtml(html) {
  const decoded = String(html || '')
    .replace(/&#64;|&#x40;/gi, '@')
    .replace(/\s+(?:\[at\]|\(at\))\s+/gi, '@')
    .replace(/\s+(?:\[dot\]|\(dot\))\s+/gi, '.')
    .replace(/mailto:([^"'?\s>]+)/gi, (_, value) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    });

  const cloudflareEmails = [];
  const cloudflarePattern = /data-cfemail=["']([a-f0-9]+)["']/gi;
  let cloudflareMatch;
  while ((cloudflareMatch = cloudflarePattern.exec(decoded))) {
    const encoded = cloudflareMatch[1];
    const key = Number.parseInt(encoded.slice(0, 2), 16);
    let email = '';
    for (let index = 2; index < encoded.length; index += 2) {
      email += String.fromCharCode(Number.parseInt(encoded.slice(index, index + 2), 16) ^ key);
    }
    cloudflareEmails.push(email);
  }

  return [...new Set([...(decoded.match(EMAIL_REGEX) || []), ...cloudflareEmails]
    .map(normalizeEmail)
    .filter(isPublicContactEmail))];
}

export function normalizeMoldovaPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('373')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 8) return '';
  if (/^(\d)\1{7}$/.test(digits) || [...digits].some(digit => digits.split(digit).length - 1 >= 7)) {
    return '';
  }
  return `+373 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

export function extractPhonesFromHtml(html) {
  const text = String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const counts = new Map();

  (text.match(MOLDOVA_PHONE_REGEX) || [])
    .map(normalizeMoldovaPhone)
    .filter(Boolean)
    .forEach(phone => counts.set(phone, (counts.get(phone) || 0) + 1));

  return [...counts]
    .sort((left, right) => right[1] - left[1])
    .map(([phone]) => phone);
}

function getCategory(tags) {
  return tags.amenity || tags.shop || tags.office || tags.craft ||
    tags.healthcare || tags.tourism || 'business';
}

function getAddress(tags) {
  return [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:city']
  ].filter(Boolean).join(' ');
}

export function normalizeOsmBusiness(element, regionName) {
  const tags = element.tags || {};
  const email = normalizeEmail(tags.email || tags['contact:email']);

  return {
    osmId: `${element.type}-${element.id}`,
    name: String(tags.name || '').trim(),
    company: String(tags.name || '').trim(),
    email: isPublicContactEmail(email) ? email : '',
    region: regionName,
    category: getCategory(tags),
    address: getAddress(tags),
    phone: normalizeMoldovaPhone(tags.phone || tags['contact:phone']),
    website: getWebsiteFromTags(tags),
    latitude: element.lat || element.center?.lat || null,
    longitude: element.lon || element.center?.lon || null,
    source: 'OpenStreetMap',
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
  };
}

function isPrivateIp(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized === '::' ||
      normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb');
  }

  return true;
}

export async function isSafePublicUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (['localhost', 'localhost.localdomain'].includes(url.hostname.toLowerCase())) return false;

    const addresses = await dns.lookup(url.hostname, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIp(address));
  } catch {
    return false;
  }
}

async function fetchHtml(url, redirects = 0) {
  if (redirects > 3 || !(await isSafePublicUrl(url))) return '';

  const timeout = withTimeout(3000);
  try {
    const response = await fetch(url, {
      signal: timeout.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml'
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      return location ? fetchHtml(new URL(location, url).toString(), redirects + 1) : '';
    }

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) return '';

    const html = await response.text();
    return { html: html.slice(0, 1_000_000), url };
  } catch {
    return { html: '', url };
  } finally {
    timeout.clear();
  }
}

function findContactPages(html, website) {
  const linkRegex = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const candidates = [];
  let match;

  while ((match = linkRegex.exec(html))) {
    const href = match[1].toLowerCase();
    const label = match[2].replace(/<[^>]+>/g, ' ').trim().toLowerCase();
    if (!/(contact|contacte|kontakty|kontakt|despre|about|programare|rezervare|booking|suport|support|servicii|services)/.test(`${href} ${label}`)) continue;

    try {
      const link = new URL(match[1], website);
      if (link.origin !== new URL(website).origin) continue;
      const score =
        (/(^|\/)(contacte|kontakty|contact|about|despre-noi|programare|rezervare|booking)(\/|$)/.test(link.pathname.toLowerCase()) ? 20 : 0) +
        (/^(contact|contacte|контакты)$/.test(label) ? 10 : 0);
      candidates.push({ url: link.toString(), score });
    } catch {
      // Ignore malformed links.
    }
  }

  return [...new Set(
    candidates
      .sort((left, right) => right.score - left.score)
      .map(candidate => candidate.url)
  )].slice(0, CONTACT_PAGE_CONCURRENCY);
}

function chooseBestEmail(emails, website) {
  const hostname = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
  const preferredPrefixes = ['office', 'info', 'contact', 'sales', 'service', 'hello', 'support'];

  return [...new Set(emails)].sort((left, right) => {
    const leftDomain = left.split('@')[1];
    const rightDomain = right.split('@')[1];
    const leftPrefix = preferredPrefixes.indexOf(left.split('@')[0]);
    const rightPrefix = preferredPrefixes.indexOf(right.split('@')[0]);
    const leftDomainScore = leftDomain === hostname ? 20 : leftDomain.endsWith(`.${hostname}`) ? 24 : 0;
    const rightDomainScore = rightDomain === hostname ? 20 : rightDomain.endsWith(`.${hostname}`) ? 24 : 0;
    const leftGenericPenalty = ['info', 'office', 'contact'].includes(left.split('@')[0]) ? -3 : 0;
    const rightGenericPenalty = ['info', 'office', 'contact'].includes(right.split('@')[0]) ? -3 : 0;
    const leftScore = leftDomainScore + (leftPrefix >= 0 ? 10 - leftPrefix : 4) + leftGenericPenalty;
    const rightScore = rightDomainScore + (rightPrefix >= 0 ? 10 - rightPrefix : 4) + rightGenericPenalty;
    return rightScore - leftScore;
  })[0] || '';
}

export async function discoverWebsiteContact(website) {
  let homepage = await fetchHtml(website);
  if (!homepage.html) {
    const websiteUrl = new URL(website);
    const alternativeProtocol = websiteUrl.protocol === 'https:' ? 'http:' : 'https:';
    websiteUrl.protocol = alternativeProtocol;
    homepage = await fetchHtml(websiteUrl.toString());
  }
  if (!homepage.html) {
    const languagePages = await mapWithConcurrency(
      ['/ro/', '/ru/', '/en/'],
      3,
      pathname => fetchHtml(new URL(pathname, website).toString())
    );
    homepage = languagePages.find(page => page.html) || homepage;
  }
  if (!homepage.html) return null;

  const homepageEmails = extractEmailsFromHtml(homepage.html);
  const homepagePhones = extractPhonesFromHtml(homepage.html);
  let pages = [];

  const discoveredPages = findContactPages(homepage.html, homepage.url);
  const fallbackPages = [
    '/ro/contacte/',
    '/contacte/',
    '/contacts/',
    '/contact/',
    '/despre-noi/',
    '/about/',
    '/ro/despre-noi/',
    '/ro/contact/',
    '/programare/',
    '/rezervare/'
  ].map(pathname => new URL(pathname, homepage.url).toString());
  const pageUrls = [...new Set([...discoveredPages, ...fallbackPages])]
    .slice(0, CONTACT_PAGE_CONCURRENCY);

  pages = (await mapWithConcurrency(
    pageUrls,
    CONTACT_PAGE_CONCURRENCY,
    pageUrl => fetchHtml(pageUrl)
  )).filter(page => page.html);

  const pageEmails = pages.flatMap(page => extractEmailsFromHtml(page.html));
  const pagePhones = pages.flatMap(page => extractPhonesFromHtml(page.html));
  const email = chooseBestEmail([...pageEmails, ...homepageEmails], homepage.url);
  const phone = pagePhones[0] || homepagePhones[0] || '';

  if (!email) return null;
  const verifiedPage = pages.find(page => extractEmailsFromHtml(page.html).includes(email));
  return {
    email,
    phone,
    verifiedUrl: verifiedPage?.url || homepage.url,
    domainMatchesWebsite: isEmailDomainRelatedToWebsite(email, homepage.url)
  };
}

function createDirectOsmContacts(businesses) {
  const contacts = [];
  const seenEmails = new Set();

  for (const business of businesses) {
    if (!business.email || seenEmails.has(business.email)) continue;
    seenEmails.add(business.email);
    contacts.push({
      ...business,
      verified: true,
      verifiedUrl: business.sourceUrl,
      source: 'OpenStreetMap public listing',
      domainMatchesWebsite: business.website
        ? isEmailDomainRelatedToWebsite(business.email, business.website)
        : null
    });
  }

  return contacts;
}

async function validateDiscoveredContacts(contacts) {
  return (await mapWithConcurrency(
    contacts,
    DNS_CONCURRENCY,
    async contact => {
      const domainVerification = await verifyEmailDomain(contact.email);
      if (!domainVerification.valid) return null;

      return {
        ...contact,
        verified: true,
        emailDomain: domainVerification.domain,
        emailDomainValid: true,
        emailDomainMethod: domainVerification.method,
        verificationLevel: contact.domainMatchesWebsite
          ? 'official-domain'
          : 'public-source'
      };
    }
  )).filter(Boolean);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function geocodeRegion(region) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', region);

  const results = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
  });
  const match = results[0];
  if (!match?.boundingbox) throw new Error('Regiunea nu a fost găsită');

  return {
    query: region,
    displayName: match.display_name,
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    bbox: match.boundingbox.map(Number)
  };
}

async function fetchBusinesses(bbox) {
  const [south, north, west, east] = bbox;
  const area = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:15];
(
  nwr(${area})["name"]["email"];
  nwr(${area})["name"]["contact:email"];
  nwr(${area})["name"]["website"];
  nwr(${area})["name"]["contact:website"];
  nwr(${area})["name"]["url"];
  nwr(${area})["name"]["contact:url"];
  nwr(${area})["name"]["brand:website"];
  nwr(${area})["name"]["operator:website"];
);
out center tags;`;

  let lastError;
  for (const endpoint of OVERPASS_URLS) {
    try {
      return await fetchJson(endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ data: query })
      }, 18000);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Sursa de localuri nu răspunde: ${lastError?.message || 'eroare necunoscută'}`);
}

export async function discoverRegionalEmails({ region, category = 'all', offset = 0 }) {
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const normalizedCategory = CATEGORY_MATCHERS[category] ? category : 'all';
  const location = await geocodeRegion(region);
  const osmData = await fetchBusinesses(location.bbox);
  const matcher = CATEGORY_MATCHERS[normalizedCategory];
  const uniqueBusinesses = new Map();

  for (const element of osmData.elements || []) {
    const tags = element.tags || {};
    if (!tags.name || !matcher(tags)) continue;

    const business = normalizeOsmBusiness(element, location.displayName);
    const key = business.website || `${business.name.toLowerCase()}|${business.address.toLowerCase()}`;
    const existing = uniqueBusinesses.get(key);
    uniqueBusinesses.set(key, existing?.email ? existing : business);
  }

  const businesses = [...uniqueBusinesses.values()];
  const directContacts = safeOffset === 0 ? createDirectOsmContacts(businesses) : [];
  const businessesWithWebsites = businesses.filter(business => business.website);
  const websitesToCheck = businessesWithWebsites.slice(
    safeOffset,
    safeOffset + WEBSITE_BATCH_SIZE
  );

  const verifiedContacts = (await mapWithConcurrency(
    websitesToCheck,
    WEBSITE_CONCURRENCY,
    async business => {
      const verified = await discoverWebsiteContact(business.website);
      return verified ? {
        ...business,
        ...verified,
        verified: true,
        source: 'Official website',
        sourcePriority: 2
      } : null;
    }
  )).filter(Boolean);

  const contactsByBusiness = new Map();
  const buildBusinessKey = business => business.osmId || `${business.name.toLowerCase()}|${business.website || business.address}`;

  for (const contact of directContacts) {
    contactsByBusiness.set(buildBusinessKey(contact), { ...contact, sourcePriority: 1 });
  }

  for (const contact of verifiedContacts) {
    const key = buildBusinessKey(contact);
    const existing = contactsByBusiness.get(key);
    if (!existing || (contact.sourcePriority || 0) >= (existing.sourcePriority || 0)) {
      contactsByBusiness.set(key, contact);
    }
  }

  const contacts = [...contactsByBusiness.values()];

  const nextOffset = safeOffset + websitesToCheck.length;
  const validatedContacts = await validateDiscoveredContacts(contacts);

  return {
    region: location,
    category: normalizedCategory,
    businessesScanned: businesses.length,
    websitesChecked: websitesToCheck.length,
    websitesTotal: businessesWithWebsites.length,
    nextOffset,
    hasMore: nextOffset < businessesWithWebsites.length,
    contacts: validatedContacts,
    rejectedInvalidDomains: contacts.length - validatedContacts.length,
    attribution: 'Date © contribuitorii OpenStreetMap'
  };
}
