import { randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/server/stageVotesAuth';
import { PHOTO_BUCKET, PHOTO_CAPTION_LIMIT, PHOTO_NAME_LIMIT, PHOTO_UPLOAD_LIMIT, PhotoError, photoId, photoSignature, photoText } from '@/lib/eventPhotos';
import { checkPhotoOrigin, guestIdentity, normalizeEventPhoto, photoEvent, photoFailure, photoHash, photoHost, photoResponse, photoRpcError } from '@/lib/server/eventPhotos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
type Context = { params: Promise<{ eventId: string }> };
const publicColumns = 'id, caption, display_name, status, storage_path, created_at';
async function removeObject(path: string | null) {
  if (!path) return;
  const { error } = await getSupabaseAdmin().storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.error('Photo storage cleanup failed:', error.message);
}

export async function GET(req: Request, context: Context) {
  try {
    const { eventId } = await context.params;
    const hostMode = new URL(req.url).searchParams.get('mode') === 'host';
    const event = hostMode ? await photoHost(req, eventId) : await photoEvent(eventId);
    const admin = getSupabaseAdmin();
    if (!hostMode && new URL(req.url).searchParams.get('summary') === '1') {
      const { count, error } = await admin.from('event_photos').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 'approved');
      if (error) throw error;
      return photoResponse({ enabled: event.photo_sharing_enabled, closed: Boolean(event.is_show_ended),
        eventName: event.name, photoCount: count || 0, photos: [], reports: [] }, guestIdentity(req).guest);
    }
    const { data, error } = await admin.from('event_photos')
      .select(hostMode ? publicColumns + ', event_photo_reports(count)' : publicColumns)
      .eq('event_id', event.id).in('status', hostMode ? ['pending','approved'] : ['approved'])
      .order('created_at', { ascending: false }).limit(250);
    if (error) throw error;
    const rows = (data || []) as any[];
    const paths = rows.map(row => row.storage_path).filter(Boolean) as string[];
    const signed = paths.length ? await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 120) : { data: [], error: null };
    if (signed.error) throw signed.error;
    const urls = new Map((signed.data || []).filter(item => !item.error).map(item => [item.path, item.signedUrl]));
    const photos = rows.filter(row => urls.has(row.storage_path)).map(row => ({
      id: row.id, caption: row.caption, displayName: row.display_name, status: row.status,
      createdAt: row.created_at, url: urls.get(row.storage_path),
      reports: hostMode ? row.event_photo_reports?.[0]?.count || 0 : 0,
    }));
    let reports: { photoId: string; reason: string }[] = [];
    if (hostMode) {
      const result = await admin.from('event_photo_reports').select('photo_id, reason')
        .eq('event_id', event.id).order('created_at', { ascending: false }).limit(100);
      if (result.error) throw result.error;
      reports = (result.data || []).map(r => ({ photoId: r.photo_id, reason: r.reason }));
    }
    const identity = hostMode ? null : guestIdentity(req);
    return photoResponse({ enabled: event.photo_sharing_enabled, closed: Boolean(event.is_show_ended),
      eventName: event.name, photoCount: photos.length, photos: photos.filter(Boolean), reports }, identity?.guest);
  } catch (error) { return photoFailure(error); }
}

export async function POST(req: Request, context: Context) {
  try {
    checkPhotoOrigin(req);
    const { eventId } = await context.params;
    photoId(eventId);
    const identity = guestIdentity(req);
    const admin = getSupabaseAdmin();
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json();
      if (body.action !== 'report') throw new PhotoError('Invalid photo request.');
      const reason = photoText(body.reason, 300, 'Report');
      if (!reason) throw new PhotoError('Please tell the host what should be reviewed.');
      const { error } = await admin.rpc('report_event_photo', { p_event_id: eventId, p_photo_id: photoId(body.photoId),
        p_uploader_key: identity.uploadKey, p_network_key: identity.networkKey, p_reason: reason });
      if (error) photoRpcError(error);
      return photoResponse({ ok: true }, identity.guest);
    }
    if (Number(req.headers.get('content-length') || 0) > 4 * 1024 * 1024) throw new PhotoError('Choose a smaller photo.', 413);
    const event = await photoEvent(eventId);
    if (!event.photo_sharing_enabled || event.is_show_ended) throw new PhotoError('Photo uploads are closed for this show.', 409);
    const form = await req.formData();
    const file = form.get('photo');
    if (!(file instanceof File) || !file.size || file.size > PHOTO_UPLOAD_LIMIT) throw new PhotoError('Choose a photo under 3 MB.', 413);
    const caption = photoText(form.get('caption') || '', PHOTO_CAPTION_LIMIT, 'Caption');
    const displayName = photoText(form.get('displayName') || '', PHOTO_NAME_LIMIT, 'Display name');
    if (form.get('permission') !== 'yes') throw new PhotoError('Confirm that you have permission to share this photo.');
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!photoSignature(bytes)) throw new PhotoError('Choose a JPEG, PNG, or WebP photo.');
    const removalToken = randomBytes(32).toString('hex');
    const { data: id, error: reserveError } = await admin.rpc('reserve_event_photo', {
      p_event_id: eventId, p_uploader_key: identity.uploadKey, p_network_key: identity.networkKey,
      p_caption: caption, p_display_name: displayName, p_removal_hash: photoHash(removalToken),
    });
    if (reserveError) photoRpcError(reserveError);
    const path = `${eventId}/${id}.webp`;
    try {
      const normalized = await normalizeEventPhoto(bytes);
      if (normalized.length > PHOTO_UPLOAD_LIMIT) throw new PhotoError('Choose a smaller photo.', 413);
      const { error: uploadError } = await admin.storage.from(PHOTO_BUCKET).upload(path, normalized, { contentType: 'image/webp', cacheControl: '60', upsert: false });
      if (uploadError) throw uploadError;
      const { data: finalized, error: finalizeError } = await admin.from('event_photos')
        .update({ storage_path: path, status: 'pending' }).eq('id', id).eq('event_id', eventId).eq('status', 'uploading').select('id').maybeSingle();
      if (finalizeError || !finalized) throw finalizeError || new Error('Could not finish upload');
    } catch (error) {
      await removeObject(path);
      await admin.from('event_photos').update({ status: 'rejected' }).eq('id', id).eq('event_id', eventId).eq('status', 'uploading');
      throw error;
    }
    return photoResponse({ id, removalToken, status: 'pending' }, identity.guest, 201);
  } catch (error) { return photoFailure(error); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    checkPhotoOrigin(req);
    const { eventId } = await context.params;
    const event = await photoHost(req, eventId);
    const body = await req.json();
    const admin = getSupabaseAdmin();
    if (body.action === 'settings') {
      if (typeof body.enabled !== 'boolean') throw new PhotoError('Choose whether to accept photo uploads.');
      if (body.enabled && event.is_show_ended) throw new PhotoError('Uploads stay closed after the show ends.', 409);
      const { error } = await admin.from('events').update({ photo_sharing_enabled: body.enabled }).eq('id', event.id).eq('account_id', event.account_id);
      if (error) throw error;
      return photoResponse({ ok: true });
    }
    if (!['approve','reject','remove'].includes(body.action)) throw new PhotoError('Invalid moderation action.');
    const id = photoId(body.photoId);
    const status = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'deleted';
    const { data, error } = await admin.from('event_photos').update({ status, moderated_at: new Date().toISOString() })
      .eq('event_id', event.id).eq('id', id).in('status', body.action === 'approve' ? ['pending'] : ['pending','approved'])
      .select('storage_path').maybeSingle();
    if (error) throw error;
    if (!data) throw new PhotoError('This photo has already been reviewed or removed.', 409);
    if (status !== 'approved') await removeObject(data.storage_path);
    return photoResponse({ ok: true });
  } catch (error) { return photoFailure(error); }
}

export async function DELETE(req: Request, context: Context) {
  try {
    checkPhotoOrigin(req);
    const { eventId } = await context.params;
    photoId(eventId);
    const body = await req.json();
    if (typeof body.removalToken !== 'string' || !/^[a-f0-9]{64}$/.test(body.removalToken)) throw new PhotoError('The removal link is not valid.', 403);
    const { data, error } = await getSupabaseAdmin().from('event_photos').update({ status: 'deleted', moderated_at: new Date().toISOString() })
      .eq('event_id', eventId).eq('id', photoId(body.photoId)).eq('removal_hash', photoHash(body.removalToken))
      .in('status', ['pending','approved','rejected','deleted']).select('storage_path').maybeSingle();
    if (error) throw error;
    if (!data) throw new PhotoError('This photo is already removed or cannot be removed from this device.', 404);
    await removeObject(data.storage_path);
    return photoResponse({ ok: true });
  } catch (error) { return photoFailure(error); }
}
