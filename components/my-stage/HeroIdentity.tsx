'use client';

import { useState } from 'react';
import type { SingerProfile } from './types';
import StageCardModal from './StageCardModal';

type Badge = {
  icon: string;
  color: string;
  background: string;
  border: string;
  label: string;
};

type HeroIdentityProps = {
  profile: SingerProfile;
  name: string;
  badge: Badge;
  current: number;
  target: number;
  nextTitle: string;
  averageScore: number;
wins: number;
venues: number;
};

export default function HeroIdentity({
  profile,
  name,
  badge,
  current,
  target,
  nextTitle,
  averageScore,
  wins,
  venues,
}: HeroIdentityProps) {

const [isStageCardOpen, setIsStageCardOpen] = useState(false);

  const percent = Math.min(
    100,
    Math.round((current / target) * 100)
  );

  const remaining = Math.max(0, target - current);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 340,
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#38bdf8',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
        }}
      >
        My Stage
      </p>

      <h1
        style={{
          margin: '8px 0 0',
          fontSize: 'clamp(36px,6vw,52px)',
          letterSpacing: '-.04em',
        }}
      >
        {name}
      </h1>
<div
  style={{
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
    gap: 20,
    marginTop: 20,
    flexWrap: 'wrap',
  }}
>
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 8,
      padding: '10px 16px',
      borderRadius: 999,
      border: `1px solid ${badge.border}`,
      background: badge.background,
      color: badge.color,
      fontWeight: 800,
    }}
  >
    <span style={{ fontSize: 18 }}>
      {badge.icon}
    </span>

    {badge.label}
  </div>

<button
  type="button"
  onClick={() => setIsStageCardOpen(true)}
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    padding: '8px 4px',
    border: 'none',
    background: 'transparent',
    color: '#7dd3fc',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  }}
>
  🃏 StageCard
</button>
</div>

      {/* Progress */}

<div
  style={{
    marginTop: 26,
    maxWidth: 440,
  }}
>
  <div
    style={{
      color: '#94a3b8',
      fontSize: 13,
      fontWeight: 800,
    }}
  >
    {current} / {target} Performances
  </div>

  <div
    style={{
      marginTop: 10,
      height: 14,
      borderRadius: 999,
      overflow: 'hidden',
      background: 'rgba(255,255,255,.09)',
      boxShadow:
        'inset 0 1px 3px rgba(0,0,0,.24)',
    }}
  >
    <div
      style={{
        width: `${percent}%`,
        height: '100%',
        borderRadius: 999,
        background:
          'linear-gradient(90deg,#facc15,#f97316)',
        boxShadow:
          '0 0 18px rgba(249,115,22,.26)',
      }}
    />
  </div>

  <div
    style={{
      marginTop: 13,
      color: '#94a3b8',
      fontSize: 13,
      lineHeight: 1.45,
    }}
  >
    {remaining} performances until
  </div>

  <div
    style={{
      marginTop: 3,
      color: 'white',
      fontSize: 15,
      fontWeight: 900,
    }}
  >
    ⭐ {nextTitle}
  </div>
</div>

      {profile.home_venue && (
        <div
          style={{
            marginTop: 20,
            color: '#7dd3fc',
            fontWeight: 700,
          }}
        >
          📍 {profile.home_venue}
        </div>
      )}

      {profile.bio && (
        <p
          style={{
            marginTop: 14,
            maxWidth: 650,
            color: '#cbd5e1',
            lineHeight: 1.6,
          }}
        >
          {profile.bio}
        </p>
      )}

<StageCardModal
  open={isStageCardOpen}
  onClose={() => setIsStageCardOpen(false)}
  name={name}
  badgeLabel={badge.label}
  performances={current}
  averageScore={averageScore}
  wins={wins}
  venues={venues}
  photoUrl={profile.photo_url}
/>

    </div>
  );
}
