'use client';

import {
  Clock3,
  MapPin,
  Mic2,
} from 'lucide-react';

import type {
  LiveQueueState,
} from '@/hooks/useLiveEvent';

type Props = {
  venueName: string;
  status: LiveQueueState;
  currentSinger: string;
  currentSong: string;
  currentArtist?: string | null;
  position: number | null;
  estimatedWaitMinutes: number;
  loading?: boolean;
  onReturn: () => void;
};

const STATUS_CONFIG: Record<
  LiveQueueState,
  {
    label: string;
    className: string;
  }
> = {
  waiting: {
    label: 'Waiting in the queue',
    className: 'sv-live-status-waiting',
  },
  soon: {
    label: "You're getting close",
    className: 'sv-live-status-soon',
  },
  next: {
    label: "You're on deck",
    className: 'sv-live-status-next',
  },
  performing: {
    label: "You're up now!",
    className: 'sv-live-status-performing',
  },
};

export default function SVLiveShowBanner({
  venueName,
  status,
  currentSinger,
  currentSong,
  currentArtist,
  position,
  estimatedWaitMinutes,
  loading = false,
  onReturn,
}: Props) {
  const statusConfig =
    STATUS_CONFIG[status];

  return (
    <section className="sv-live-show-banner">
      <div className="sv-live-show-top-row">
        <div>
          <div className="sv-live-show-kicker">
            <span className="sv-live-dot" />
            Live tonight
          </div>

          <div className="sv-live-show-venue">
            <MapPin size={16} />
            <span>
              {loading
                ? 'Loading show...'
                : venueName}
            </span>
          </div>
        </div>

        <div
          className={`sv-live-show-status ${statusConfig.className}`}
        >
          {loading
            ? 'Loading'
            : statusConfig.label}
        </div>
      </div>

      <div className="sv-live-show-now">
        <div className="sv-live-show-now-icon">
          <Mic2 size={22} />
        </div>

        <div className="sv-live-show-now-copy">
          <span>Now singing</span>

          <strong>
            {loading
              ? 'Loading...'
              : currentSinger || 'Waiting for the next singer'}
          </strong>

          {!loading && currentSong && (
            <p>
              {currentSong}
              {currentArtist
                ? ` · ${currentArtist}`
                : ''}
            </p>
          )}
        </div>
      </div>

      {!loading && (
        <div className="sv-live-show-details">
          {position !== null && (
            <div>
              <span>YOUR SPOT</span>
              <strong>
                {status === 'performing'
                  ? 'Now'
                  : status === 'next'
                    ? 'On deck'
                    : `#${position}`}
              </strong>
            </div>
          )}

          {status !== 'performing' &&
            estimatedWaitMinutes > 0 && (
              <div>
                <span>
                  <Clock3 size={14} />
                  EST. WAIT
                </span>

                <strong>
                  About {estimatedWaitMinutes} min
                </strong>
              </div>
            )}
        </div>
      )}

      <button
        type="button"
        className="sv-live-show-return"
        onClick={onReturn}
      >
        <Mic2 size={18} />
        Return to Tonight&apos;s Show
      </button>
    </section>
  );
}