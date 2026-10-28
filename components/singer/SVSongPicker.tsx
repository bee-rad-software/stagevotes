'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import SVSmartSongDiscovery from './SVSmartSongDiscovery';
import { Search } from 'lucide-react';

export type SVSongStatus = 'available' | 'queued' | 'favorite';

export type SVSongOption = {
  title: string;
  artist: string;
  status: SVSongStatus;
  id?: string | number;
  note?: string;
  karafunSongId?: number | null;
  singaVersions?: SVSongOption[];
  singaSongId?: string | null;
  singaVariantId?: string | null;
  selectionSource?: 'search' | 'surprise_me' | 'ai_recommendation';
};

export type SVSongSection = {
  title: string;
  icon?: string;
  songs: SVSongOption[];
};

type Props = {
  discoveryEventId?: string;
  songs: SVSongOption[];
  sections?: SVSongSection[];
  onSelect: (song: SVSongOption) => void;
  onSearch?: (searchText: string) => void;
  onSurpriseMe?: () => void;
  loading?: boolean;
  alertContent?: ReactNode;
  afterResultsContent?: ReactNode;
  optionsContent?: ReactNode;
  recommendations?: SVSongOption[];
  recommendationsLoading?: boolean;
  recommendationsMessage?: string;
  onGenerateRecommendations?: () => void;
};

export default function SVSongPicker({
  songs,
  discoveryEventId,
  sections = [],
  onSelect,
  onSearch,
  onSurpriseMe,
  loading = false,
  alertContent,
  afterResultsContent,
  optionsContent,
  recommendations = [],
  recommendationsLoading = false,
  recommendationsMessage = '',
  onGenerateRecommendations,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [versionChoices, setVersionChoices] = useState<SVSongOption[]>([]);
  const versionHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (versionChoices.length) versionHeadingRef.current?.focus(); }, [versionChoices]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const onSearchRef = useRef(onSearch);

useEffect(() => {
  const timer = window.setTimeout(() => {
    searchInputRef.current?.focus();
  }, 300);

  return () => window.clearTimeout(timer);
}, []);

useEffect(() => {
  onSearchRef.current = onSearch;
}, [onSearch]);

useEffect(() => {
  const term = searchTerm.trim();

  if (term.length < 2) {
    onSearchRef.current?.('');
    return;
  }

  const timer = window.setTimeout(() => {
    onSearchRef.current?.(term);
  }, 350);

  return () => window.clearTimeout(timer);
}, [searchTerm]);

  const filteredSongs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

const seen = new Set<string>();
return songs.filter(song => {
  if (!song.singaSongId) return true;
  if (seen.has(song.singaSongId)) return false;
  seen.add(song.singaSongId);
  return true;
});
  }, [searchTerm, songs]);

  const searching = searchTerm.trim().length > 0;

  function renderSong(song: SVSongOption) {
  return (
    <button
  key={`${song.id ?? ''}-${song.title}-${song.artist}`}
  className="sv-picker-song"
  onClick={() => {
    if (song.singaSongId) {
      setVersionChoices(song.singaVersions || [...songs, ...recommendations].filter(option => option.singaSongId === song.singaSongId));
    } else onSelect(song);
  }}
  type="button"
>
      <div>
        <div className="sv-picker-title">{song.title}</div>
        <div className="sv-picker-artist">{song.artist}</div>

        {song.note && !song.singaSongId && (
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

  if (versionChoices.length) {
    const song = versionChoices[0];
    return <div className="sv-song-picker" aria-labelledby="singa-version-heading">
      <button type="button" className="sv-brave-button" onClick={() => { setVersionChoices([]); window.setTimeout(() => searchInputRef.current?.focus(), 0); }}>← Back to songs</button>
      <h3 id="singa-version-heading" ref={versionHeadingRef} tabIndex={-1}>Choose your version</h3>
      <p><strong>{song.title}</strong><br />{song.artist}</p>
      <div className="sv-picker-results">
        {versionChoices.map(version => <button key={version.singaVariantId} type="button" className="sv-picker-song" onClick={() => { onSelect(version); setVersionChoices([]); }}>
          <div><div className="sv-picker-title">{version.note || 'Singa version'}</div><div className="sv-picker-artist">Select this version to continue</div></div>
          <span className="sv-chip sv-chip-blue">Choose</span>
        </button>)}
      </div>
    </div>;
  }

  return (
    <div className="sv-song-picker">
    <label className="sv-picker-search-label" htmlFor="song-picker-search">
      Find your song
    </label>
     <div className="sv-song-search-wrap">
  <Search size={19} />

  <input
    id="song-picker-search"
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

{alertContent && (
  <div
    aria-live="polite"
    style={{ marginTop: 10 }}
  >
    {alertContent}
  </div>
)}

{searchTerm.trim().length >= 2 && (
  <div className="sv-picker-section-title">
    {loading
      ? 'Searching karaoke library'
      : `${filteredSongs.length} match${
          filteredSongs.length === 1 ? '' : 'es'
        }`}
  </div>
)}

{searchTerm.trim().length < 2 && (
  <div className="sv-picker-search-help">
    Enter at least two letters of a song title or artist.
  </div>
)}

{loading && searchTerm.trim().length >= 2 && (
  <div className="sv-picker-empty sv-picker-loading">
    <span className="sv-picker-spinner" />
    Searching songs...
  </div>
)}

{!loading && searchTerm.trim().length >= 2 && filteredSongs.length === 0 && (
  <div className="sv-picker-empty">
    No songs found. Try another title or artist.
  </div>
)}

{searching && !loading && filteredSongs.map(renderSong)}

{!searching && sections.map((section) => (
  <section key={section.title} className="sv-picker-featured-section">
    <div className="sv-picker-featured-header">
      <span>{section.icon}</span>
      <h3>{section.title}</h3>
    </div>
    <div className="sv-picker-featured-list">
      {section.songs.map(renderSong)}
    </div>
  </section>
))}

{afterResultsContent}

{discoveryEventId && <SVSmartSongDiscovery eventId={discoveryEventId} onSelect={song => { if (song.singaVersions?.length) setVersionChoices(song.singaVersions); else onSelect(song); }} />}

{optionsContent && (
  <div className="sv-picker-options">
    <div className="sv-picker-section-title">Song options</div>
    {optionsContent}
  </div>
)}

{!searching && onGenerateRecommendations && (
  <section className="sv-ai-song-card">
    <div className="sv-ai-song-card-header">
      <div className="sv-ai-song-icon">✨</div>
      <div className="sv-ai-song-copy">
        <div className="sv-mobile-kicker">For your voice &amp; style</div>
        <h3>AI song recommendations</h3>
        <p>Fresh ideas based on songs you’ve completed with your StageVotes account.</p>
      </div>
    </div>

    <button
      type="button"
      className="sv-ai-song-button"
      onClick={onGenerateRecommendations}
      disabled={recommendationsLoading}
    >
      {recommendationsLoading
        ? 'Finding your songs…'
        : recommendations.length > 0
          ? 'Refresh recommendations'
          : 'Recommend songs for me'}
    </button>

    {recommendationsMessage && (
      <div className="sv-ai-song-message" aria-live="polite">
        {recommendationsMessage}
      </div>
    )}

    {recommendations.length > 0 && (
      <div className="sv-ai-song-results">
        {recommendations.map(renderSong)}
      </div>
    )}
  </section>
)}

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

    </div>
  );
}
