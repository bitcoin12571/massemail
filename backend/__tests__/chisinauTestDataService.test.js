import { describe, expect, it } from '@jest/globals';
import {
  generateChisinauTestContacts,
  isReservedTestEmail
} from '../src/services/chisinauTestDataService.js';

describe('chisinauTestDataService', () => {
  it('generates unique contacts distributed across Chisinau sectors', () => {
    const contacts = generateChisinauTestContacts(500, 'user-123');
    const sectors = new Set(contacts.map(contact => contact.customData.sector));
    const emails = new Set(contacts.map(contact => contact.email));

    expect(contacts).toHaveLength(500);
    expect(emails.size).toBe(500);
    expect(sectors).toEqual(new Set(['Botanica', 'Buiucani', 'Centru', 'Ciocana', 'Rîșcani']));
    expect(contacts.every(contact => contact.customData.testData)).toBe(true);
  });

  it('keeps generated counts within the supported range', () => {
    expect(generateChisinauTestContacts(2, 'user')).toHaveLength(100);
    expect(generateChisinauTestContacts(20000, 'user')).toHaveLength(10000);
  });

  it('recognizes non-deliverable test domains', () => {
    expect(isReservedTestEmail('demo@mailora.invalid')).toBe(true);
    expect(isReservedTestEmail('demo@load.test')).toBe(true);
    expect(isReservedTestEmail('office@company.md')).toBe(false);
  });
});
