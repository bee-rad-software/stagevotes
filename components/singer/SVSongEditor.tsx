'use client';

import { useState } from 'react';
import SVBottomSheet from '@/components/ui/SVBottomSheet';
import SVSongPicker, {
  SVSongOption,
} from './SVSongPicker';

type SongDraft = {
  songTitle: string;
  artist: string;
};

type SongSuggestion = {
  id: string | number;
  title: string;
  artist?: string | null;
};

type ArtistSuggestion = {
  artist: string;
};

type Props = {
  song: SongDraft;
  index: number;
  songsLength: number;
  activeSongIndex: number | null;
  songSuggestions: SongSuggestion[];
  artistSuggestions: ArtistSuggestion[];
  duplicateWarning?: string | null;
  updateSong: (index: number, field: 'songTitle' | 'artist', value: string) => void;
  searchSongs: (value: string, index: number) => void;
  searchArtists: (value: string) => void;
  checkDuplicateSong: (value: string) => void;
  setSongSuggestions: (value: SongSuggestion[]) => void;
  setActiveSongIndex: (value: number | null) => void;
  setArtistSuggestions: (value: ArtistSuggestion[]) => void;
  removeSongField: (index: number) => void;
};

export default function SVSongEditor({
  song,
  index,
  songsLength,
  activeSongIndex,
  songSuggestions,
  artistSuggestions,
  duplicateWarning,
  updateSong,
  searchSongs,
  searchArtists,
  checkDuplicateSong,
  setSongSuggestions,
  setActiveSongIndex,
  setArtistSuggestions,
  removeSongField,
}: Props) {

const [sheetOpen, setSheetOpen] = useState(false);

const pickerSongs: SVSongOption[] = [
  {
    title: 'Piano Man',
    artist: 'Billy Joel',
    status: 'available',
  },
  {
    title: 'Sweet Caroline',
    artist: 'Neil Diamond',
    status: 'queued',
  },
  {
    title: 'Friends in Low Places',
    artist: 'Garth Brooks',
    status: 'available',
  },
  {
    title: 'Before He Cheats',
    artist: 'Carrie Underwood',
    status: 'favorite',
  },
  {
    title: 'Mr. Brightside',
    artist: 'The Killers',
    status: 'favorite',
  },
];

  return (
    <div className="card">
      <h3>Song {index + 1}</h3>

      <label>Song title</label>
      <input
        value={song.songTitle}
        onChange={(e) => {
          updateSong(index, 'songTitle', e.target.value);
          searchSongs(e.target.value, index);
          checkDuplicateSong(e.target.value);
        }}
      />

      {activeSongIndex === index && songSuggestions.length > 0 && (
        <div className="sv-suggestion-list">
          {songSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="sv-suggestion-item"
              onClick={() => {
                updateSong(index, 'songTitle', suggestion.title);
                updateSong(index, 'artist', suggestion.artist || '');
                checkDuplicateSong(suggestion.title);
                setSongSuggestions([]);
                setActiveSongIndex(null);
              }}
            >
              <strong>{suggestion.title}</strong>
              <br />
              <small>{suggestion.artist}</small>
            </div>
          ))}
        </div>
      )}

      {duplicateWarning && (
        <p className="sv-warning-text">{duplicateWarning}</p>
      )}

      <label>Artist</label>
      <input
        value={song.artist}
        onChange={(e) => {
          updateSong(index, 'artist', e.target.value);
          searchArtists(e.target.value);
        }}
      />

      {artistSuggestions.length > 0 && (
        <div className="sv-suggestion-list">
          {artistSuggestions.map((artist) => (
            <div
              key={artist.artist}
              className="sv-suggestion-item"
              onClick={() => {
                updateSong(index, 'artist', artist.artist);
                setArtistSuggestions([]);
              }}
            >
              {artist.artist}
            </div>
          ))}
        </div>
      )}

      {songsLength > 1 && (
        <button className="danger" onClick={() => removeSongField(index)}>
          Remove Song
        </button>
      )}
    </div>
  );
}