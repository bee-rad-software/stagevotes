'use client';
import { useState } from 'react';
import { useSongFavorites } from '@/hooks/useSongFavorites';
import type { FavoriteSong } from '@/lib/songFavorites';
import Link from 'next/link';
import styles from './SVFavoriteSongs.module.css';

type Favorites = ReturnType<typeof useSongFavorites>;
export function FavoriteSongList({ favorites, onFind }: { favorites: Favorites; onFind?: (song: FavoriteSong) => void }) {
  const [filter, setFilter] = useState('');
  if (!favorites.userId && !favorites.loading) return null;
  const matches = favorites.songs.filter(song => `${song.title} ${song.artist}`.toLowerCase().includes(filter.trim().toLowerCase()));
  if (onFind) return <details className={styles.compact}>
    <summary>★ Favorites <span>{favorites.loading ? '…' : favorites.songs.length}</span></summary>
    <div className={styles.content}>
      {favorites.loading ? <p role="status">Loading favorites…</p> : <>
        {favorites.songs.length > 5 && <input className={styles.filter} aria-label="Filter favorites" type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter favorites" />}
        <div className={styles.list}>
          {matches.map(song => <div className={styles.row} key={JSON.stringify([song.title, song.artist])}>
            <button className={styles.song} type="button" onClick={() => onFind(song)} aria-label={`Find ${song.title} by ${song.artist}`}><strong>{song.title}</strong><span>{song.artist}</span></button>
            <button className={styles.remove} type="button" disabled={favorites.busy} aria-label={`Remove ${song.title} from favorites`} onClick={() => void favorites.update(song, true)}>×</button>
          </div>)}
          {!matches.length && <p>{favorites.songs.length ? 'No favorites match.' : 'Tap ☆ beside a song to save it.'}</p>}
        </div>
      </>}
    </div>
  </details>;
  return <section className="sv-ai-song-card" aria-label="Your favorite songs" style={{ margin: '16px 0' }}>
    <h3>★ Your favorites</h3>
    <p>Saved to your account for your next show, at any venue.</p>
    {favorites.error && <p role="alert">{favorites.error}</p>}
    {favorites.loading ? <p role="status">Loading favorites…</p> : <>
      {favorites.songs.length > 0 ? <>
        <label>Filter favorites<input className="sv-song-search" type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Song or artist" /></label>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {matches.map(song => <div key={JSON.stringify([song.title, song.artist])} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #ffffff20' }}>
            <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}><strong>{song.title}</strong><div>{song.artist}</div></div>
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
