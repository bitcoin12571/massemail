import { describe, expect, it } from '@jest/globals';
import {
  extractEmailsFromHtml,
  extractPhonesFromHtml,
  isEmailDomainRelatedToWebsite,
  normalizeMoldovaPhone,
  normalizeOsmBusiness
} from '../src/services/regionalDiscoveryService.js';

describe('regionalDiscoveryService', () => {
  it('extracts and deduplicates public contact emails from HTML', () => {
    const emails = extractEmailsFromHtml(`
      <a href="mailto:OFFICE@LOCAL.MD">Contact</a>
      <p>office@local.md</p>
      <p>sales [at] local [dot] md</p>
      <p>noreply@local.md</p>
    `);

    expect(emails).toEqual(['office@local.md', 'sales@local.md']);
  });

  it('decodes Cloudflare-protected public email addresses', () => {
    const email = 'office@local.md';
    const key = 0x12;
    const encoded = [key, ...email].map((value, index) => {
      const code = index === 0 ? value : value.charCodeAt(0) ^ key;
      return code.toString(16).padStart(2, '0');
    }).join('');

    expect(extractEmailsFromHtml(`<span data-cfemail="${encoded}">protected</span>`))
      .toEqual([email]);
  });

  it('extracts and normalizes Moldova phone numbers', () => {
    const phones = extractPhonesFromHtml(`
      <a href="tel:+37322811888">Service</a>
      <p>Mobil: 078 899 880</p>
      <script>const fake = "012345678";</script>
    `);

    expect(phones).toEqual(['+373 22 811 888', '+373 78 899 880']);
    expect(normalizeMoldovaPhone('(022) 54-54-54')).toBe('+373 22 545 454');
    expect(normalizeMoldovaPhone('022 222 222')).toBe('');
  });

  it('normalizes an OpenStreetMap business with its public details', () => {
    const business = normalizeOsmBusiness({
      type: 'node',
      id: 42,
      lat: 46.98,
      lon: 28.86,
      tags: {
        name: 'Cafeneaua Botanica',
        amenity: 'cafe',
        email: 'HELLO@CAFE.MD',
        website: 'cafe.md',
        'addr:street': 'Dacia',
        'addr:housenumber': '10'
      }
    }, 'Botanica');

    expect(business).toEqual(expect.objectContaining({
      name: 'Cafeneaua Botanica',
      email: 'hello@cafe.md',
      category: 'cafe',
      address: 'Dacia 10',
      website: 'https://cafe.md/',
      region: 'Botanica'
    }));
  });

  it('identifies email domains related to the official website', () => {
    expect(isEmailDomainRelatedToWebsite('office@company.md', 'https://www.company.md/contacte')).toBe(true);
    expect(isEmailDomainRelatedToWebsite('office@mail.company.md', 'https://company.md')).toBe(true);
    expect(isEmailDomainRelatedToWebsite('company@gmail.com', 'https://company.md')).toBe(false);
  });
});
