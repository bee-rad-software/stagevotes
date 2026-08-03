'use client';

import { useEffect, useState } from 'react';
import {
  Clock3,
  Mic2,
  Radio,
} from 'lucide-react';

type Props = {
  singerName?: string;
  songTitle?: string;
  artist?: string;
  startedAt?: string | null;
  votingOpen?: boolean;
  showName?: string;
  photoUrl?: string | null;
};

export default function SVHostHero({
  singerName = 'No current singer',
  songTitle = 'Waiting to begin',
  artist = '',
  photoUrl,
  startedAt = null,
  votingOpen = false,
  showName = 'Tonight’s Karaoke',
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }

    function updateElapsed() {
      const startedTime = new Date(
        startedAt!
      ).getTime();

      const seconds = Math.max(
        0,
        Math.floor(
          (Date.now() - startedTime) / 1000
        )
      );

      setElapsedSeconds(seconds);
    }

    updateElapsed();

    const interval = window.setInterval(
      updateElapsed,
      1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [startedAt]);

  const elapsed = formatElapsedTime(
    elapsedSeconds
  );

  const hasCurrentSinger =
    Boolean(startedAt);

  const initials =
    singerName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SV';

const displaySingerName = singerName
  .split(' ')
  .filter(Boolean)
  .map(
    (part) =>
      part.charAt(0).toUpperCase() +
      part.slice(1).toLowerCase()
  )
  .join(' ');

  return (
    <section
      className={
        hasCurrentSinger
          ? 'sv-host-hero is-live'
          : 'sv-host-hero is-waiting'
      }
    >
      <div className="sv-host-hero-glow" />

      <div className="sv-host-hero-top">
        <div>
          <div
            className={
              hasCurrentSinger
                ? 'sv-live-pill'
                : 'sv-live-pill is-waiting'
            }
          >
            <span />

            {hasCurrentSinger
              ? 'Live now'
              : 'Waiting to begin'}
          </div>

          <div className="sv-host-show-name">
            {showName}
          </div>
        </div>

        <div
          className={
            votingOpen
              ? 'sv-host-hero-status is-open'
              : 'sv-host-hero-status'
          }
        >
          <Radio size={16} />

          {votingOpen
            ? 'Voting open'
            : 'Voting closed'}
        </div>
      </div>

      <div className="sv-host-hero-main">
        <div className="sv-host-avatar-wrap">
          <div className="sv-host-avatar">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={singerName}
                className="sv-host-avatar-image"
              />
            ) : (
              initials
            )}
          </div>

          {hasCurrentSinger && (
            <div className="sv-host-avatar-live">
              <Mic2 size={13} />
            </div>
          )}
        </div>

        <div className="sv-host-performer">
          <div className="sv-mobile-kicker">
            {hasCurrentSinger
              ? 'Now performing'
              : 'Show status'}
          </div>

          <h1>{displaySingerName}</h1>

          <div className="sv-host-song">
            <span className="sv-host-song-note">
              ♪
            </span>

            <span>{songTitle}</span>
          </div>

          {artist && (
            <div className="sv-host-artist">
              {artist}
            </div>
          )}
        </div>

        <div className="sv-host-mic-art">
          <Mic2
            size={118}
            strokeWidth={1.8}
          />
        </div>
      </div>

      <div className="sv-host-hero-footer">
        <div className="sv-host-timer">
          <span className="sv-host-timer-icon">
            <Clock3 size={17} />
          </span>

          <div>
            <span>
              {hasCurrentSinger
                ? 'Live for'
                : 'Performance timer'}
            </span>

            <strong>
              {hasCurrentSinger
                ? elapsed
                : '0:00'}
            </strong>
          </div>
        </div>

        <div className="sv-host-hero-footer-status">
          <span
            className={
              hasCurrentSinger
                ? 'sv-host-status-dot is-live'
                : 'sv-host-status-dot'
            }
          />

          {hasCurrentSinger
            ? 'Current singer is on stage'
            : 'Start the first singer when ready'}
        </div>
      </div>
    </section>
  );
}

function formatElapsedTime(
  totalSeconds: number
) {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }

  return `${minutes}:${String(
    seconds
  ).padStart(2, '0')}`;
}