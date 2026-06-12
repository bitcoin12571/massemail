import { describe, expect, it } from '@jest/globals';
import { serializeUploadedFiles } from '../src/middleware/upload.js';

describe('serializeUploadedFiles', () => {
  it('serializes buffers and strips path information from filenames', () => {
    const [attachment] = serializeUploadedFiles([{
      originalname: '../private/photo.png',
      mimetype: 'image/png',
      buffer: Buffer.from('image')
    }]);

    expect(attachment.filename).toBe('photo.png');
    expect(attachment.contentType).toBe('image/png');
    expect(Buffer.from(attachment.content, 'base64').toString()).toBe('image');
  });

  it('removes control characters from filenames', () => {
    const [attachment] = serializeUploadedFiles([{
      originalname: 'report\u0000.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('pdf')
    }]);

    expect(attachment.filename).toBe('report_.pdf');
  });
});
