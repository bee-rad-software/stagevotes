'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export type SVSongStatus = 'available' | 'queued' | 'favorite';

export type SVSongOption = {
  title: string;
  artist: string;
  status: SVSongStatus;
  id?: string | number;
  note?: string;
};

export type SVSongSection = {
  title: string;
  icon?: string;
  songs: SVSongOption[];
};

type Props = {
  songs: SVSongOption[];
  sections?: SVSongSection[];
  onSelect: (song: SVSongOption) => void;
  onSearch?: (searchText: string) => void;
  onSurpriseMe?: () => void;
  loading?: boolean;
};

export default function SVSongPicker({
  songs,
  sections = [],
  onSelect,
  onSearch,
  onSurpriseMe,
  loading = false,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  const timer = window.setTimeout(() => {
    searchInputRef.current?.focus();
  }, 300);

  return () => window.clearTimeout(timer);
}, []);

useEffect(() => {
  const term = searchTerm.trim();

  if (term.length < 2) {
    onSearch?.('');
    return;
  }

  const timer = window.setTimeout(() => {
    onSearch?.(term);
  }, 350);

  return () => window.clearTimeout(timer);
}, [searchTerm, onSearch]);

  const filteredSongs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

return songs;
  }, [searchTerm, songs]);

  const searching = searchTerm.trim().length > 0;

  function renderSong(song: SVSongOption) {
  return (
    <button
      key={`${song.id ?? ''}-${song.title}-${song.artist}`}
      className="sv-picker-song"
      disabled={song.status === 'queued'}
      onClick={() => onSelect(song)}
      type="button"
    >
      <div>
        <div className="sv-picker-title">{song.title}</div>
        <div className="sv-picker-artist">{song.artist}</div>

        {song.note && (
          <div className="sv-picker-note">
            {song.note}
          </div>
        )}
      </div>

      <div className="sv-picker-status">
        {song.status === 'available' && (
          <span className="sv-chip sv-chip-blue">Choose</span>
        )}

        {song.status === 'favorite' && (
          <span className="sv-chip sv-chip-gold">★ Favorite</span>
        )}

        {song.status === 'queued' && (
          <span className="sv-chip sv-chip-orange">In Queue</span>
        )}
      </div>
    </button>
  );
}

  return (
    <div className="sv-song-picker">
     <div className="sv-song-search-wrap">
  <Search size={19} />

  <input
    ref={searchInputRef}
    className="sv-song-search"
    placeholder="Search by song or artist..."
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
  />

  {searchTerm && (
    <button
      type="button"
      className="sv-song-search-clear"
      onClick={() => setSearchTerm('')}
      aria-label="Clear search"
    >
      ×
    </button>
  )}
</div>

{!searching && onSurpriseMe && (
  <div className="sv-brave-card">
    <div className="sv-brave-icon">🎲</div>

    <div className="sv-brave-copy">
      <div className="sv-mobile-kicker">Feeling brave?</div>
      <h3>Let StageVotes pick for you</h3>
      <p>
        We’ll choose something similar to songs you enjoy singing.
      </p>
    </div>

    <button
      type="button"
      className="sv-brave-button"
      onClick={onSurpriseMe}
    >
      Surprise Me
    </button>
  </div>
)}

<div className="sv-picker-section-title">
  {searchTerm.trim().length < 2
    ? 'Find your song'
    : loading
    ? 'Searching karaoke library'
    : `${filteredSongs.length} match${
        filteredSongs.length === 1 ? '' : 'es'
      }`}
</div>

{searchTerm.trim().length < 2 && (
  <div className="sv-picker-empty">
    Type at least two letters from the song title or artist.
  </div>
)}

{loading && searchTerm.trim().length >= 2 && (
  <div className="sv-picker-empty sv-picker-loading">
    <span className="sv-picker-spinner" />
    Searching songs...
  </div>
)}

{!loading &&
  searchTerm.trim().length >= 2 &&
  filteredSongs.length === 0 && (
    <div className="sv-picker-empty">
      No songs found. Try another title or artist.
    </div>
  )}

    {!searching &&
  sections.map((section) => (
    <section
      key={section.title}
      className="sv-picker-featured-section"
    >
      <div className="sv-picker-featured-header">
        <span>{section.icon}</span>
        <h3>{section.title}</h3>
      </div>

      <div className="sv-picker-featured-list">
        {section.songs.map(renderSong)}
      </div>
    </section>
  ))}

{searching && !loading && filteredSongs.map(renderSong)}
    </div>
  );
}