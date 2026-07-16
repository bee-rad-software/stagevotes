'use client';

import { Clock3, Mic2, Radio } from 'lucide-react';

type Props = {
  singerName?: string;
  songTitle?: string;
  artist?: string;
  elapsed?: string;
  votingOpen?: boolean;
  showName?: string;
  photoUrl?: string | null;
};

export default function SVHostHero({
  singerName = 'Brad Bock',
  songTitle = 'Are You Gonna Be My Girl',
  artist = 'Jet',
  photoUrl,
  elapsed = '1:42',
  votingOpen = true,
  showName = 'Friday Night Karaoke',
}: Props) {
  return (
    <section className="sv-host-hero">
      <div className="sv-host-hero-top">
        <div>
          <div className="sv-live-pill">
            <span />
            Live now
          </div>

          <div className="sv-mobile-kicker">
            {showName}
          </div>
        </div>

        <div className="sv-host-hero-status">
          <Radio size={17} />
          {votingOpen ? 'Voting open' : 'Voting closed'}
        </div>
      </div>

      <div className="sv-host-hero-main">
       <div className="sv-host-avatar">
  {photoUrl ? (
    <img
      src={photoUrl}
      alt={singerName}
      className="sv-host-avatar-image"
    />
  ) : (
    singerName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  )}
</div>

        <div className="sv-host-performer">
          <div className="sv-mobile-kicker">
            Now performing
          </div>

          <h1>{singerName}</h1>

        <div className="sv-host-song">
  <span className="sv-host-song-note">♪</span>
  <span>{songTitle}</span>
</div>

          {artist && (
            <div className="sv-host-artist">
              by {artist}
            </div>
          )}
        </div>

<div className="sv-host-mic-art">
  <Mic2 size={108} strokeWidth={2.2} />
</div>
      </div>

      <div className="sv-host-hero-footer">
       <div className="sv-host-timer">
  <Clock3 size={18} />

  <div>
    <span>Live for</span>
    <strong>{elapsed}</strong>
  </div>
</div>

        <div className="sv-host-hero-footer-note">
          Current singer is live
        </div>
      </div>
    </section>
  );
}