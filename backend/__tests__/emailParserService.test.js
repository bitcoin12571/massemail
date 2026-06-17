import { describe, expect, it } from '@jest/globals';
import {
  parseCSV,
  parseJSON,
  parsePlainText
} from '../src/services/emailParserService.js';

describe('emailParserService', () => {
  it('parses quoted CSV fields and normalizes email addresses', async () => {
    const parsed = await parseCSV(
      'email,name,region\r\n"JOHN@EXAMPLE.COM","Doe, John","Cluj"'
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.totalProcessed).toBe(1);
    expect(parsed.results).toEqual([expect.objectContaining({
      email: 'john@example.com',
      name: 'Doe, John',
      region: 'cluj'
    })]);
  });

  it('parses semicolon-delimited CSV with Romanian headers', async () => {
    const parsed = await parseCSV(
      'email;nume;regiune\nmaria@example.com;Maria;Iasi'
    );

    expect(parsed.results[0]).toEqual(expect.objectContaining({
      email: 'maria@example.com',
      name: 'Maria',
      region: 'iasi'
    }));
  });

  it('parses one email per line as plain text', async () => {
    const parsed = await parsePlainText(
      'FIRST@example.com\ninvalid\nsecond@cluj.ro'
    );

    expect(parsed.results).toHaveLength(2);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.results[0].email).toBe('first@example.com');
    expect(parsed.results[1].region).toBe('cluj');
  });

  it('parses JSON arrays using a database-compatible source', async () => {
    const parsed = await parseJSON(JSON.stringify([
      { email: 'USER@example.com', name: 'User', region: 'Brasov' }
    ]));

    expect(parsed.results[0]).toEqual(expect.objectContaining({
      email: 'user@example.com',
      region: 'brasov',
      source: 'csv_upload'
    }));
  });
});
