export const PHOTO_CAPTION_LIMIT = 150;
export const PHOTO_NAME_LIMIT = 40;
export const PHOTO_UPLOAD_LIMIT = 3 * 1024 * 1024;
export const PHOTO_BUCKET = 'event-photos';
export type EventPhoto = { id: string; caption: string; displayName: string; createdAt: string; status: 'pending' | 'approved'; url: string; reports: number };
export class PhotoError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function photoText(value: unknown, max: number, label: string) {
  if (typeof value !== 'string') throw new PhotoError(`${label} is invalid.`);
  const text = value.trim();
  if (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new PhotoError(`${label} must be ${max} characters or fewer.`);
  return text;
}
export function photoId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new PhotoError('Invalid show or photo.', 400);
  return value;
}
export function photoSignature(bytes: Uint8Array) {
  return (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) ||
    (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP');
}
