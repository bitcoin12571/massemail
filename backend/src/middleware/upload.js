import multer from 'multer';
import path from 'node:path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

function fileFilter(req, file, callback) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error(`File type "${file.mimetype || 'unknown'}" is not allowed`);
    error.status = 400;
    return callback(error);
  }
  callback(null, true);
}

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter
});

export function serializeUploadedFiles(files = []) {
  return files.map((file) => ({
    filename: path.basename(file.originalname).replace(/[\u0000-\u001f\u007f]/g, '_'),
    contentType: file.mimetype,
    content: file.buffer.toString('base64')
  }));
}
