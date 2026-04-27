export const BATHROOM_PHOTO_BUCKET = 'bathroom-photos';
export const MAX_BATHROOM_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_BATHROOM_PHOTO_MB = 10;
export const BATHROOM_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const ALLOWED_BATHROOM_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function isAllowedBathroomPhotoType(contentType: string): boolean {
  return ALLOWED_BATHROOM_PHOTO_TYPES.has(contentType);
}

export function sanitizeBathroomPhotoFileName(fileName: string): string {
  const normalized = fileName.trim();
  const fallbackName = normalized.length > 0 ? normalized : 'photo';
  const sanitized = fallbackName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return sanitized.length > 0 ? sanitized : 'photo';
}

export function buildBathroomPhotoStoragePath(
  bathroomId: string,
  fileName: string,
  timestamp: number = Date.now()
): string {
  return `${bathroomId}/${timestamp}-${sanitizeBathroomPhotoFileName(fileName)}`;
}
