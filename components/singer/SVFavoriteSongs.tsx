'use client';
import { useState } from 'react';
import { useSongFavorites } from '@/hooks/useSongFavorites';
import type { FavoriteSong } from '@/lib/songFavorites';
import Link from 'next/link';

type Favorites = ReturnType<typeof useSongFavorites>;
export function FavoriteSongList({ favorites, onFind }: { favorites: Favorites; onFind?: (song: FavoriteSong) => void }) {
  const [filter, setFilter] = useState('');
  if (!favorites.userId && !favorites.loading) return null;
  const matches = favorites.songs.filter(song => `${song.title} ${song.artist}`.toLowerCase().includes(filter.trim().toLowerCase()));
  return <section className="sv-ai-song-card" aria-label="Your favorite songs" style={{ margin: '16px 0' }}>
    <h3>★ Your favorites</h3>
    <p>{onFind ? 'Find a favorite in this venue’s library, then choose your song or version.' : 'Saved to your account for your next show, at any venue.'}</p>
    {favorites.error && <p role="alert">{favorites.error}</p>}
    {favorites.loading ? <p role="status">Loading favorites…</p> : <>
      {favorites.songs.length > 0 ? <>
        <label>Filter favorites<input className="sv-song-search" type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Song or artist" /></label>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {matches.map(song => <div key={JSON.stringify([song.title, song.artist])} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #ffffff20' }}>
            <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}><strong>{song.title}</strong><div>{song.artist}</div></div>
            {onFind && <button className="sv-brave-button" style={{ width: 'auto', flexShrink: 0, padding: '10px' }} type="button" onClick={() => onFind(song)}>Find song</button>}
            <button className="sv-brave-button" style={{ width: 'auto', flexShrink: 0, padding: '10px' }} type="button" disabled={favorites.busy} aria-label={`Remove ${song.title} from favorites`} onClick={() => void favorites.update(song, true)}>Remove</button>
          </div>)}
          {!matches.length && <p>No favorites match that search.</p>}
        </div>
      </> : <p>Tap ☆ Save beside a song to build your list.</p>}
    </>}
  </section>;
}
export default function SVFavoriteSongs() {
  const favorites = useSongFavorites();
  return <><FavoriteSongList favorites={favorites} />{favorites.userId && <p><Link href="/my-venues">Find a show to sing your favorites →</Link></p>}</>;
}
