import { PHOTO_UPLOAD_LIMIT } from '@/lib/eventPhotos';

export async function prepareEventPhoto(file: File): Promise<Blob> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) && !['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP, or iPhone photo.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('This browser could not open that photo. Try a JPEG or a screenshot instead.'); }
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo preparation is unavailable in this browser.');
    context.fillStyle = '#ffffff'; context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,'image/jpeg',.85));
    if (!blob || blob.size > PHOTO_UPLOAD_LIMIT) throw new Error('This photo is too large. Try a smaller image.');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
