import { NextResponse } from 'next/server';
import { getSupabaseAdmin, AuthError } from '@/lib/server/stageVotesAuth';
import { favoriteSong, favoriteSongKey } from '@/lib/songFavorites';
export const dynamic = 'force-dynamic';

async function singer(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AuthError('Sign in to use your favorites.');
  const db = getSupabaseAdmin();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new AuthError('Please sign in again.');
  return { db, user };
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Favorites are unavailable.' },
    { status: error instanceof AuthError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(request: Request) {
  try {
    const { db, user } = await singer(request);
    const { data, error } = await db.from('singer_song_favorites').select('title,artist').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw new Error('Favorites are unavailable. Please try again.');
    return NextResponse.json({ songs: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
async function write(request: Request, remove: boolean) {
  try {
    const { db, user } = await singer(request);
    let song;
    try { song = favoriteSong(await request.json()); }
    catch { return NextResponse.json({ error: 'Enter a song title and artist under 300 characters.' }, { status: 400 }); }
    const song_key = favoriteSongKey(song);
    const { error } = remove
      ? await db.from('singer_song_favorites').delete().eq('user_id', user.id).eq('song_key', song_key)
      : await db.from('singer_song_favorites').upsert({ user_id: user.id, song_key, ...song }, { onConflict: 'user_id,song_key', ignoreDuplicates: true });
    if (error) throw new Error('Could not update your favorites. Please try again.');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export function POST(request: Request) { return write(request, false); }
export function DELETE(request: Request) { return write(request, true); }
