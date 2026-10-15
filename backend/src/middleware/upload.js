import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MB = 1024 * 1024;

/** Memory-storage uploader with an explicit type allow-list and size cap. */
export function makeUploader({ types, maxSizeMb, maxFiles = 1 }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * MB, files: maxFiles },
    fileFilter: (_req, file, cb) => {
      if (!types.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`File type not allowed: ${file.mimetype}`));
      }
      return cb(null, true);
    },
  });
}

/** Staff media library: images up to 15MB, short videos up to 100MB. */
export const staffMediaUpload = makeUploader({
  types: [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES],
  maxSizeMb: 100,
});

/** Public enquiry attachments: documents and images, 10MB each, max 5. */
export const enquiryAttachmentUpload = makeUploader({
  types: [...IMAGE_TYPES.filter((t) => t !== 'image/gif'), ...DOCUMENT_TYPES],
  maxSizeMb: 10,
  maxFiles: 1,
});
