import { describe, expect, it } from '@jest/globals';
import { normalizeAttachments } from '../src/services/emailService.js';

describe('normalizeAttachments', () => {
  it('converts base64 attachment content to a buffer', () => {
    const [attachment] = normalizeAttachments([{
      filename: 'photo.png',
      contentType: 'image/png',
      content: Buffer.from('image-data').toString('base64')
    }]);

    expect(attachment.filename).toBe('photo.png');
    expect(attachment.contentType).toBe('image/png');
    expect(Buffer.isBuffer(attachment.content)).toBe(true);
    expect(attachment.content.toString()).toBe('image-data');
  });

  it('keeps buffer content unchanged', () => {
    const content = Buffer.from('document-data');
    const [attachment] = normalizeAttachments([{ filename: 'file.pdf', content }]);

    expect(attachment.content).toBe(content);
    expect(attachment.contentType).toBe('application/octet-stream');
  });
});
