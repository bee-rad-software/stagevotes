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
    shortLabel: string;
    accent: string;
    glow: string;
  }
> = {
  waiting: {
    label: 'Waiting in the queue',
    shortLabel: 'Waiting',
    accent: '#22c55e',
    glow: 'rgba(34,197,94,0.22)',
  },
  soon: {
    label: "You're getting close",
    shortLabel: 'Almost up',
    accent: '#facc15',
    glow: 'rgba(250,204,21,0.22)',
  },
  next: {
    label: "You're on deck",
    shortLabel: 'On deck',
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.24)',
  },
  performing: {
    label: "You're up now!",
    shortLabel: 'Performing',
    accent: '#ef4444',
    glow: 'rgba(239,68,68,0.28)',
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

  const positionLabel =
    status === 'performing'
      ? 'Now'
      : status === 'next'
        ? 'On deck'
        : position !== null
          ? `#${position}`
          : 'Not queued';

  return (
    <section
      style={{
        position: 'sticky',
        top: 12,
        zIndex: 40,
        marginBottom: 22,
        padding: 18,
        overflow: 'hidden',
        borderRadius: 24,
        border:
          '1px solid rgba(56,189,248,0.24)',
        background:
          'linear-gradient(145deg, rgba(8,20,38,0.98), rgba(18,28,54,0.98))',
        boxShadow:
          '0 24px 60px rgba(0,0,0,0.34)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(
              circle at top right,
              ${statusConfig.glow},
              transparent 38%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(56,189,248,0.15),
              transparent 42%
            )
          `,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#fb923c',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: '#ef4444',
                  boxShadow:
                    '0 0 14px rgba(239,68,68,0.9)',
                }}
              />

              Live tonight
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginTop: 8,
                color: '#e0f2fe',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              <MapPin
                size={17}
                color="#38bdf8"
              />

              <span>
                {loading
                  ? 'Loading show...'
                  : venueName}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${statusConfig.accent}55`,
              color: statusConfig.accent,
              background: statusConfig.glow,
              fontSize: 12,
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            {loading
              ? 'Loading'
              : statusConfig.shortLabel}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'auto minmax(0, 1fr)',
            gap: 14,
            alignItems: 'center',
            marginTop: 18,
            padding: 16,
            borderRadius: 18,
            border:
              '1px solid rgba(255,255,255,0.08)',
            background:
              'rgba(255,255,255,0.045)',
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 16,
              color: '#ffffff',
              background:
                'linear-gradient(135deg, #f97316, #ea580c)',
              boxShadow:
                '0 12px 28px rgba(249,115,22,0.28)',
            }}
          >
            <Mic2 size={24} />
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: '#94a3b8',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Now singing
            </div>

            <div
              style={{
                marginTop: 3,
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 900,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {loading
                ? 'Loading...'
                : currentSinger ||
                  'Waiting for the next singer'}
            </div>

            {!loading && currentSong && (
              <div
                style={{
                  marginTop: 3,
                  color: '#cbd5e1',
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentSong}
                {currentArtist
                  ? ` · ${currentArtist}`
                  : ''}
              </div>
            )}
          </div>
        </div>

        {!loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                estimatedWaitMinutes > 0 &&
                status !== 'performing'
                  ? '1fr 1fr'
                  : '1fr',
              gap: 10,
              marginTop: 12,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background:
                  'rgba(255,255,255,0.04)',
                border:
                  '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Your spot
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: statusConfig.accent,
                  fontSize: 20,
                  fontWeight: 950,
                }}
              >
                {positionLabel}
              </div>
            </div>

            {status !== 'performing' &&
              estimatedWaitMinutes > 0 && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background:
                      'rgba(255,255,255,0.04)',
                    border:
                      '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#94a3b8',
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Clock3 size={13} />
                    Est. wait
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: '#ffffff',
                      fontSize: 18,
                      fontWeight: 900,
                    }}
                  >
                    About {estimatedWaitMinutes} min
                  </div>
                </div>
              )}
          </div>
        )}

        <button
          type="button"
          onClick={onReturn}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            marginTop: 14,
            padding: '13px 16px',
            border: 0,
            borderRadius: 16,
            color: '#ffffff',
            background:
              'linear-gradient(135deg, #f97316, #ea580c)',
            boxShadow:
              '0 14px 30px rgba(249,115,22,0.24)',
            fontSize: 14,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          <Mic2 size={18} />
          Return to Tonight&apos;s Show
        </button>
      </div>
    </section>
  );
}