'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FavoriteSong, favoriteSongKey } from '@/lib/songFavorites';

export function useSongFavorites(enabled = true) {
  const [userId, setUserId] = useState<string | null>(null);
  const [songs, setSongs] = useState<FavoriteSong[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const currentUser = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let disposed = false;
    async function load(id: string | null, token?: string) {
      const ticket = ++generation.current;
      currentUser.current = id;
      setUserId(id); setSongs([]); setError(''); setLoading(true);
      if (!id || !token) { setLoading(false); return; }
      try {
        const response = await fetch('/api/singer/favorites', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load favorites.');
        if (!disposed && ticket === generation.current) setSongs(data.songs);
      } catch (e) { if (!disposed && ticket === generation.current) setError(e instanceof Error ? e.message : 'Could not load favorites.'); }
      finally { if (!disposed && ticket === generation.current) setLoading(false); }
    }
    // Subscribe first so an older getSession result cannot overwrite a sign-in change.
    let authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (!disposed) void load(session?.user.id || null, session?.access_token);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!disposed && !authChanged) void load(session?.user.id || null, session?.access_token);
    });
    return () => { disposed = true; ++generation.current; subscription.unsubscribe(); };
  }, [enabled]);
  const has = useCallback((song: FavoriteSong) => songs.some(item => favoriteSongKey(item) === favoriteSongKey(song)), [songs]);
  async function update(song: FavoriteSong, remove = false) {
    if (busy) return false;
    const owner = currentUser.current;
    setBusy(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!owner || session?.user.id !== owner) throw new Error('Sign in to use your favorites.');
      const response = await fetch('/api/singer/favorites', { method: remove ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: song.title, artist: song.artist }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update favorites.');
      if (currentUser.current !== owner) return false;
      setSongs(old => remove ? old.filter(item => favoriteSongKey(item) !== favoriteSongKey(song)) : old.some(item => favoriteSongKey(item) === favoriteSongKey(song)) ? old : [song, ...old]);
      return true;
    } catch (e) { if (currentUser.current === owner) setError(e instanceof Error ? e.message : 'Could not update favorites.'); return false; }
    finally { setBusy(false); }
  }
  return { userId, songs, loading, busy, error, has, update };
}
