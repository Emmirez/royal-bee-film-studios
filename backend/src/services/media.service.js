import { cloudinary } from '../config/cloudinary.js';
import { env, integrations } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Folders staff may upload into. Keeps uploads organized and prevents arbitrary paths. */
export const MEDIA_FOLDERS = ['hero', 'ticker', 'founder', 'gallery', 'services', 'productions', 'news', 'general', 'staff', 'projects'];

export function assertCloudinary() {
  if (!integrations.cloudinaryConfigured()) {
    throw ApiError.serviceUnavailable(
      'Media uploads need Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the server .env.',
      'CLOUDINARY_NOT_CONFIGURED',
    );
  }
}

export const folderPath = (folder) => `${env.cloudinary.rootFolder}/${folder}`;

/** Upload a buffer to Cloudinary via a stream. */
export function uploadBuffer(buffer, { folder, resourceType = 'auto', deliveryType = 'upload', tags = [] }) {
  assertCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, type: deliveryType, tags, use_filename: true, unique_filename: true },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
}

/**
 * Signature for direct browser → Cloudinary uploads (large videos).
 * Only folder/timestamp/tags are signed, so the client cannot change them.
 */
export function signUpload({ folder, resourceType = 'image' }) {
  assertCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: folderPath(folder), timestamp, tags: 'royal-bee-cms' };
  const signature = cloudinary.utils.api_sign_request(params, env.cloudinary.apiSecret);
  return {
    ...params,
    signature,
    apiKey: env.cloudinary.apiKey,
    cloudName: env.cloudinary.cloudName,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType}/upload`,
  };
}

/** Confirm a client-reported upload really exists before we record it. */
export async function fetchResource(publicId, resourceType = 'image', deliveryType = 'upload') {
  assertCloudinary();
  return cloudinary.api.resource(publicId, { resource_type: resourceType, type: deliveryType });
}

export async function destroyResource(publicId, resourceType = 'image', deliveryType = 'upload') {
  assertCloudinary();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType, invalidate: true });
}

/** Short-lived signed URL for private (authenticated) assets such as enquiry attachments. */
export function privateDownloadUrl(publicId, { resourceType = 'raw', format, expiresInSeconds = 300 } = {}) {
  assertCloudinary();
  return cloudinary.utils.private_download_url(publicId, format || '', {
    resource_type: resourceType,
    type: 'authenticated',
    expires_at: Math.round(Date.now() / 1000) + expiresInSeconds,
  });
}

export async function testCloudinaryConnection() {
  if (!integrations.cloudinaryConfigured()) return { ok: false, status: 'not_configured' };
  try {
    await cloudinary.api.ping();
    return { ok: true, status: 'connected' };
  } catch (err) {
    return { ok: false, status: 'error', error: err?.error?.message || err.message };
  }
}
