'use client';

import { themes } from './StageCardTheme';
import { QRCodeSVG } from 'qrcode.react';

import type {
  StageCardData,
  StageCardTheme,
} from './types';

type StageCardBackProps = {
  data: StageCardData;
  theme?: StageCardTheme;
};

export default function StageCardBack({
  data,
  theme = 'regular',
}: StageCardBackProps) {
  const cardTheme = themes[theme];

  const profileUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/singer/${encodeURIComponent(data.name)}`
    : `https://app.stagevotes.com/singer/${encodeURIComponent(data.name)}`;

  const achievements = [
    data.performances >= 1
      ? 'First Performance'
      : null,

    data.performances >= 25
      ? '25 Performances'
      : null,

    data.performances >= 50
      ? '50 Performances'
      : null,

    data.venues >= 5
      ? '5 Venues'
      : null,

    data.wins >= 1
      ? 'Contest Winner'
      : null,
  ].filter(Boolean) as string[];

  const visibleAchievements =
    achievements.length > 0
      ? achievements.slice(0, 3)
      : ['Journey Just Beginning'];

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
minHeight: 0,
        overflow: 'hidden',
        borderRadius: 28,
        color: 'white',
        background: cardTheme.background,
        border: `1px solid ${cardTheme.border}`,
        boxShadow: `0 24px 70px rgba(0,0,0,.48), 0 0 36px ${cardTheme.glow}`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(120deg,transparent 5%,rgba(255,255,255,.025) 28%,rgba(255,255,255,.09) 48%,rgba(255,255,255,.025) 67%,transparent 92%)',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -120,
          bottom: -140,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: `radial-gradient(circle,${cardTheme.glow},transparent 70%)`,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '20px 24px 14px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#38bdf8',
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            STAGEVOTES
          </div>

          <div
            style={{
              marginTop: 4,
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.18em',
            }}
          >
            STAGECARD
          </div>
        </div>

        <div
          style={{
            height: 1,
            margin: '14px 0',
            background:
              'linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)',
          }}
        />

        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            {data.name}
          </div>

          <div
            style={{
              display: 'inline-flex',
              marginTop: 10,
              padding: '8px 14px',
              borderRadius: 999,
              color: cardTheme.accent,
              background: cardTheme.accentSoft,
              border: `1px solid ${cardTheme.border}`,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            ⭐ {data.badgeLabel}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 9,
            marginTop: 16,
          }}
        >
          <InfoRow
            icon="🎤"
            label="Favorite Artist"
            value="Not selected yet"
          />

          <InfoRow
            icon="🎵"
            label="Signature Song"
            value="Not selected yet"
          />

          <InfoRow
            icon="📅"
            label="Joined StageVotes"
            value="Founding Season"
          />

          <InfoRow
            icon="🏆"
            label="Current Rank"
            value={data.badgeLabel}
          />
        </div>

        <div
          style={{
            marginTop: 16,
padding: 14,
            borderRadius: 18,
            background: 'rgba(255,255,255,.07)',
            border: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
            }}
          >
            Career Achievements
          </div>

          <div
            style={{
              display: 'grid',
              gap: 8,
marginTop: 10,
            }}
          >
            {visibleAchievements.map(
              (achievement) => (
                <div
                  key={achievement}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      color: cardTheme.accent,
                    }}
                  >
                    ★
                  </span>

                  <span>{achievement}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '82px 1fr',
            gap: 14,
            alignItems: 'center',
          }}
        >
        <div
  style={{
    width: 82,
    height: 82,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    background: 'white',
    padding: 6,
  }}
>
  <QRCodeSVG
    value={profileUrl}
    size={68}
    bgColor="#ffffff"
    fgColor="#0f172a"
    includeMargin={false}
  />
</div>

          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              View my Stage profile
            </div>

            <div
              style={{
                marginTop: 6,
                color: '#94a3b8',
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Scan to explore my Stage profile,
career stats, achievements,
and StageCards.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            textAlign: 'right',
            color: cardTheme.accent,
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          ↺ Tap to flip
        </div>
      </div>
    </div>
  );
}

type InfoRowProps = {
  icon: string;
  label: string;
  value: string;
};

function InfoRow({
  icon,
  label,
  value,
}: InfoRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '30px 1fr',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 18,
          textAlign: 'center',
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color: '#94a3b8',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: 15,
            fontWeight: 850,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}