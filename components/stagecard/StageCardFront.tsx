'use client';

import { themes } from './StageCardTheme';
import { StageCardData, StageCardTheme } from './types';
import { forwardRef } from 'react';

type StageCardFrontProps = {
  data: StageCardData;
  theme?: StageCardTheme;
};

const StageCardFront = forwardRef<
  HTMLDivElement,
  StageCardFrontProps
>(function StageCardFront(
  {
    data,
    theme = 'regular',
  },
  ref
) {
  
    const cardTheme = themes[theme];

  const initials =
    data.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'SV';

  const cardNumber = String(data.performances).padStart(6, '0');

  const stats = [
    {
      label: 'Performances',
      value: data.performances,
    },
    {
      label: 'Average Score',
      value: data.averageScore.toFixed(2),
    },
    {
      label: 'Wins',
      value: data.wins,
    },
    {
      label: 'Venues',
      value: data.venues,
    },
  ];

  return (
   <div
   ref={ref}
  style={{
    position: 'relative',
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
    zIndex: 0,
    pointerEvents: 'none',
    background:
      'linear-gradient(120deg,transparent 5%,rgba(255,255,255,.025) 28%,rgba(255,255,255,.09) 48%,rgba(255,255,255,.025) 67%,transparent 92%)',
  }}
/>

      {/* Decorative glow */}

      <div
        style={{
          position: 'absolute',
          top: -120,
          left: -100,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle,${cardTheme.glow},transparent 70%)`,
        }}
      />

      <div
        style={{
          padding: '24px 24px 20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: '#38bdf8',
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          STAGEVOTES
        </div>

        <div
          style={{
            color: '#94a3b8',
            marginTop: 4,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '.18em',
          }}
        >
          STAGECARD
        </div>

        <div
          style={{
            width: 128,
height: 128,
margin: '18px auto',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `6px solid ${cardTheme.accent}`,
            boxShadow: `0 0 26px ${cardTheme.glow}`,
          }}
        >
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1e293b',
                fontSize: 42,
                fontWeight: 900,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 40,
          }}
        >
          {data.name}
        </h2>

        <div
          style={{
            display: 'inline-flex',
            marginTop: 16,
            padding: '10px 18px',
            borderRadius: 999,
            border: `1px solid ${cardTheme.accent}`,
            color: cardTheme.accent,
            fontWeight: 900,
            background: cardTheme.accentSoft,
boxShadow: `0 0 20px ${cardTheme.glow}`,
          }}
        >
          ⭐ {data.badgeLabel}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,1fr)',
          margin: '10px 18px 14px',
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(255,255,255,.05)',
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '16px 12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 31,
                fontWeight: 900,
              }}
            >
              {stat.value}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 24px 18px',
          fontSize: 12,
        }}
      >
       <div>
  <div
    style={{
      color: '#64748b',
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: '.12em',
    }}
  >
    CARD NUMBER
  </div>

  <div
    style={{
      marginTop: 4,
      fontWeight: 900,
    }}
  >
    SV-{cardNumber}
  </div>

  <div
    style={{
      marginTop: 6,
      color: cardTheme.accent,
      fontSize: 9,
      fontWeight: 950,
      letterSpacing: '.16em',
    }}
  >
    {cardTheme.rarity}
  </div>
</div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontWeight: 900,
            }}
          >
            Own the stage.
          </div>

          <div
            style={{
              marginTop: 4,
              color: '#7dd3fc',
            }}
          >
            Powered by StageVotes
          </div>
        </div>
      </div>
    </div>
  );
});

export default StageCardFront;