'use client';

import { Camera } from 'lucide-react';

type Props = {
  singerName?: string;
  venueName?: string;
  photoUrl?: string | null;
  editable?: boolean;
  onNameChange?: (value: string) => void;
  onPhotoClick?: () => void;
  status?: 'waiting' | 'soon' | 'next' | 'performing';
};

export default function SVSingerHero({
singerName = '',
  venueName = 'Tonight’s Karaoke',
  photoUrl,
  editable = false,
  onNameChange,
  onPhotoClick,
  status = 'waiting',
}: Props) {
  const initials =
    singerName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <section className={`sv-singer-hero sv-singer-hero-${status}`}>
      <button
        type="button"
        className="sv-singer-photo-button"
        onClick={onPhotoClick}
        aria-label="Add singer photo"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={singerName || 'Singer'}
            className="sv-singer-photo-image"
          />
        ) : (
          <div className="sv-singer-photo">
            {singerName ? initials : <Camera size={28} />}
          </div>
        )}
      </button>

      <div className="sv-singer-identity">
        <div className="sv-mobile-kicker">
          {editable ? 'Welcome to My Stage' : 'Welcome back'}
        </div>

        {editable ? (
          <input
            className="sv-singer-name-input"
            value={singerName}
            onChange={(event) => onNameChange?.(event.target.value)}
            placeholder="Enter your name"
            aria-label="Your name"
          />
        ) : (
          <h1>{singerName || 'Singer'}</h1>
        )}

        <p>{venueName}</p>
      </div>

      <button
        type="button"
        className="sv-photo-button"
        onClick={onPhotoClick}
      >
        <Camera size={18} />
        {photoUrl ? 'Change photo' : 'Add photo'}
      </button>
    </section>
  );
}