'use client';

import { useState } from 'react';
import {
  Music2,
  Plus,
  SkipForward,
  Trash2,
  UserRound,
} from 'lucide-react';
import SVBottomSheet from '@/components/ui/SVBottomSheet';

type SingerDetail = {
  id: string;
  singerName: string;
  songTitle: string;
  artist?: string;
  signupType?: 'phone' | 'manual';
};

type Props = {
  open: boolean;
  singer: SingerDetail | null;
  onClose: () => void;
  onChangeSong?: (id: string) => void;
  onAddSong?: (id: string) => void;
  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
};

export default function SVSingerDetailSheet({
  open,
  singer,
  onClose,
  onChangeSong,
  onAddSong,
  onSkip,
  onRemove,
}: Props) {
  const [note, setNote] = useState('');

  if (!singer) return null;

  return (
    <SVBottomSheet
      open={open}
      title="Singer Details"
      onClose={onClose}
    >
      <div className="sv-singer-detail">
        <div className="sv-singer-detail-hero">
          <div className="sv-singer-detail-avatar">
            {singer.singerName
              .trim()
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <div className="sv-mobile-kicker">
              {singer.signupType === 'manual'
                ? 'Manual signup'
                : 'Singer signup'}
            </div>

            <h2>{singer.singerName}</h2>

            <div className="sv-singer-detail-song">
              <Music2 size={16} />
              <span>{singer.songTitle}</span>
            </div>

            {singer.artist && (
              <p>by {singer.artist}</p>
            )}
          </div>
        </div>

        <div className="sv-singer-detail-actions">
          <button
            type="button"
            onClick={() => onChangeSong?.(singer.id)}
          >
            <Music2 size={20} />
            <span>Change Song</span>
          </button>

          <button
            type="button"
            onClick={() => onAddSong?.(singer.id)}
          >
            <Plus size={20} />
            <span>Add Song</span>
          </button>

          <button
            type="button"
            onClick={() => onSkip?.(singer.id)}
          >
            <SkipForward size={20} />
            <span>Skip</span>
          </button>

          <button
            type="button"
            className="sv-singer-detail-danger"
            onClick={() => onRemove?.(singer.id)}
          >
            <Trash2 size={20} />
            <span>Remove</span>
          </button>
        </div>

        <label htmlFor="host-note">
          Host note
        </label>

        <textarea
          id="host-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Example: Needs a lower key"
          rows={4}
        />

        <div className="sv-singer-detail-meta">
          <UserRound size={16} />
          {singer.signupType === 'manual'
            ? 'Added by the host'
            : 'Signed up from their phone'}
        </div>
      </div>
    </SVBottomSheet>
  );
}