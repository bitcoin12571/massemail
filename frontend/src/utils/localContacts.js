const CONTACTS_KEY = 'mailoraParsedRecipients';
const COMMON_FIRST_NAMES = [
  'alexandru', 'andrei', 'ana', 'cristina', 'daniel', 'diana', 'elena',
  'gabriel', 'ion', 'irina', 'maria', 'mariana', 'maxim', 'mihai',
  'natalia', 'nicolae', 'olga', 'pavel', 'sergiu', 'tatiana', 'victor'
];

function createContactId() {
  return crypto.randomUUID();
}

function inferNameFromEmail(email) {
  let username = String(email || '').split('@')[0].toLowerCase();
  if (!username) return 'Email Contact';

  username = username
    .replace(/[._-]+/g, ' ')
    .replace(/([a-zăâîșț])(\d+)/gi, '$1 $2')
    .trim();

  if (!username.includes(' ')) {
    const firstName = COMMON_FIRST_NAMES
      .sort((left, right) => right.length - left.length)
      .find(candidate => username.startsWith(candidate) && username.length > candidate.length);

    if (firstName) {
      return firstName[0].toUpperCase() + firstName.slice(1);
    }
  }

  return username
    .split(/\s+/)
    .filter(Boolean)
    .map(part => /^\d+$/.test(part)
      ? part
      : part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function inferLegacyFullName(email) {
  let username = String(email || '').split('@')[0].toLowerCase();
  username = username
    .replace(/[._-]+/g, ' ')
    .replace(/([a-zăâîșț])(\d+)/gi, '$1 $2')
    .trim();

  if (!username.includes(' ')) {
    const firstName = [...COMMON_FIRST_NAMES]
      .sort((left, right) => right.length - left.length)
      .find(candidate => username.startsWith(candidate) && username.length > candidate.length);
    if (firstName) username = `${firstName} ${username.slice(firstName.length)}`;
  }

  return username
    .split(/\s+/)
    .filter(Boolean)
    .map(part => /^\d+$/.test(part) ? part : part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export function getContactDisplayName(contact) {
  return String(contact?.name || '').trim() || inferNameFromEmail(contact?.email);
}

function normalizeContact(contact) {
  const email = String(contact.email || '').trim().toLowerCase();
  const existingName = String(contact.name || '').trim();
  const name = !existingName || existingName === inferLegacyFullName(email)
    ? inferNameFromEmail(email)
    : existingName;

  return {
    id: contact.id || createContactId(),
    email,
    name,
    company: String(contact.company || contact.name || '').trim(),
    region: String(contact.region || 'unknown').trim().toLowerCase(),
    category: String(contact.category || '').trim(),
    address: String(contact.address || '').trim(),
    website: String(contact.website || '').trim(),
    phone: String(contact.phone || '').trim(),
    status: contact.status || 'active',
    verified: contact.verified ?? false,
    source: contact.source || 'local',
    verifiedUrl: String(contact.verifiedUrl || contact.sourceUrl || '').trim(),
    emailDomain: String(contact.emailDomain || '').trim(),
    emailDomainValid: contact.emailDomainValid === true,
    emailDomainMethod: String(contact.emailDomainMethod || '').trim(),
    verificationLevel: String(contact.verificationLevel || '').trim()
  };
}

export function getLocalContacts() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    const normalized = stored
      .filter(contact => contact?.email)
      .map(normalizeContact);

    if (normalized.some((contact, index) => contact.id !== stored[index]?.id)) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

export function saveLocalContacts(contacts = []) {
  const merged = new Map(getLocalContacts().map(contact => [contact.email, contact]));

  contacts
    .filter(contact => contact?.email)
    .map(normalizeContact)
    .forEach(contact => {
      if (contact.source === 'regional_discovery' && contact.company) {
        for (const [email, existingContact] of merged) {
          const sameCompany = existingContact.source === 'regional_discovery' &&
            String(existingContact.company || existingContact.name).trim().toLowerCase() ===
            contact.company.trim().toLowerCase();
          if (sameCompany && email !== contact.email) merged.delete(email);
        }
      }

      const existing = merged.get(contact.email);
      merged.set(contact.email, { ...existing, ...contact, id: existing?.id || contact.id });
    });

  const result = [...merged.values()];
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(result));
  window.dispatchEvent(new Event('mailora:contacts-updated'));
  return result;
}

export function cacheLocalContacts(contacts = []) {
  const merged = new Map(getLocalContacts().map(contact => [contact.email, contact]));

  contacts
    .filter(contact => contact?.email)
    .map(normalizeContact)
    .forEach(contact => {
      const existing = merged.get(contact.email);
      merged.set(contact.email, { ...existing, ...contact, id: existing?.id || contact.id });
    });

  const result = [...merged.values()];
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(result));
  return result;
}

export function removeLocalContact(id) {
  const contacts = getLocalContacts().filter(contact => contact.id !== id);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  window.dispatchEvent(new Event('mailora:contacts-updated'));
}

export function clearLocalContacts() {
  localStorage.removeItem(CONTACTS_KEY);
  window.dispatchEvent(new Event('mailora:contacts-updated'));
}

export function mergeContacts(serverContacts = []) {
  const merged = new Map();

  [...getLocalContacts(), ...serverContacts].forEach(contact => {
    if (!contact?.email) return;
    const normalized = normalizeContact(contact);
    const existing = merged.get(normalized.email);
    merged.set(normalized.email, {
      ...normalized,
      ...Object.fromEntries(
        Object.entries(existing || {}).filter(([, value]) => value !== '' && value != null)
      ),
      id: existing?.id || normalized.id
    });
  });

  return [...merged.values()];
}
