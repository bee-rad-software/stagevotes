import { createHash, createHmac, randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { AuthError, getSupabaseAdmin, requireStageVotesAccount } from '@/lib/server/stageVotesAuth';
import { PHOTO_UPLOAD_LIMIT, PhotoError, photoId, photoSignature } from '@/lib/eventPhotos';

export const photoHeaders = { 'Cache-Control': 'private, no-store' };
export function photoHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function guestIdentity(req: Request) {
  const cookie = req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('sv_photo_guest='))?.slice(15);
  const guest = cookie && /^[a-f0-9]{64}$/.test(cookie) ? cookie : randomBytes(32).toString('hex');
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new PhotoError('Photo sharing is unavailable.', 503);
  const hash = (value: string) => createHmac('sha256', secret).update('event-photos:' + value).digest('hex');
  const ip = (req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  return { guest, uploadKey: hash('guest:' + guest), networkKey: hash('network:' + ip) };
}
export function photoResponse(body: unknown, guest?: string, status = 200) {
  const response = NextResponse.json(body, { status, headers: photoHeaders });
  if (guest) response.cookies.set('sv_photo_guest', guest, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 2_592_000 });
  return response;
}
export function photoFailure(error: unknown) {
  if (error instanceof PhotoError || error instanceof AuthError) return photoResponse({ error: error.message }, undefined, error.status);
  console.error('Event photos:', error);
  return photoResponse({ error: 'Could not complete the photo request. Please try again.' }, undefined, 500);
}
export function checkPhotoOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) throw new PhotoError('Open the show page to share photos.', 403);
}
export async function photoEvent(id: string) {
  const { data, error } = await getSupabaseAdmin().from('events')
    .select('id, account_id, name, is_show_ended, photo_sharing_enabled').eq('id', photoId(id)).maybeSingle();
  if (error) {
    if (['42703', '42P01'].includes(error.code)) throw new PhotoError('Photo sharing needs the database setup SQL first.', 503);
    throw error;
  }
  if (!data) throw new PhotoError('This show could not be found.', 404);
  return data;
}
export async function photoHost(req: Request, eventId: string) {
  const { account, role } = await requireStageVotesAccount(req);
  const event = await photoEvent(eventId);
  if (account.id !== event.account_id || !['owner', 'admin', 'host'].includes(role)) throw new PhotoError('You cannot manage photos for this show.', 403);
  return event;
}
export async function normalizeEventPhoto(bytes: Buffer) {
  if (!bytes.length || bytes.length > PHOTO_UPLOAD_LIMIT || !photoSignature(bytes)) throw new PhotoError('Choose a JPEG, PNG, or WebP photo under 3 MB.');
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false }).timeout({ seconds: 8 });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format || '') || (meta.pages || 1) > 1) throw new Error('Unsupported image');
    return await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { throw new PhotoError('This photo could not be read. Try a different JPEG, PNG, or WebP image.'); }
}
export function photoRpcError(error: { message?: string }) {
  if (error.message?.includes('photo_limit')) throw new PhotoError('The photo limit has been reached. Please try again later.', 429);
  if (error.message?.includes('photos_closed')) throw new PhotoError('Photo uploads are closed for this show.', 409);
  if (error.message?.includes('photo_not_found')) throw new PhotoError('This photo is no longer available.', 404);
  throw error;
}
