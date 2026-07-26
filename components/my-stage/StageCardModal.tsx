'use client';

import StageCardFront from '../stagecard/StageCardFront';
import type { StageCardData } from '../stagecard/types';
import { getStageCardTheme } from '../stagecard/StageCardTheme';

type StageCardModalProps = {
  open: boolean;
  onClose: () => void;

  name: string;
  badgeLabel: string;

  performances: number;
  averageScore: number;
  wins: number;
  venues: number;

  photoUrl?: string | null;
};

export default function StageCardModal({
  open,
  onClose,
  name,
  badgeLabel,
  performances,
  averageScore,
  wins,
  venues,
  photoUrl,
}: StageCardModalProps) {
  if (!open) return null;

  const stageCardData: StageCardData = {
  name,
  badgeLabel,
  performances,
  averageScore,
  wins,
  venues,
  photoUrl,
};

const theme = getStageCardTheme(badgeLabel);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'SV';

  const cardNumber = String(performances).padStart(6, '0');

  const stats = [
    {
      label: 'Performances',
      value: performances,
    },
    {
      label: 'Average Score',
      value: averageScore.toFixed(2),
    },
    {
      label: 'Wins',
      value: wins,
    },
    {
      label: 'Venues',
      value: venues,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name}'s StageCard`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
        background: 'rgba(0,0,0,.84)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
<div
  onClick={(event) => event.stopPropagation()}
  style={{
    width: '100%',
    maxWidth: 420,
  }}
>
<StageCardFront
  data={stageCardData}
  theme={theme}
/>

  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginTop: 16,
    }}
  >
    <button
      type="button"
      style={{
        minHeight: 48,
        borderRadius: 14,
        border: '1px solid rgba(56,189,248,.35)',
        background: 'rgba(56,189,248,.12)',
        color: '#7dd3fc',
        fontWeight: 900,
        cursor: 'pointer',
      }}
    >
      📤 Share
    </button>

    <button
      type="button"
      style={{
        minHeight: 48,
        borderRadius: 14,
        border: '1px solid rgba(249,115,22,.35)',
        background:
          'linear-gradient(135deg,#facc15,#f97316)',
        color: '#111827',
        fontWeight: 900,
        cursor: 'pointer',
      }}
    >
      💾 Save
    </button>
  </div>
</div>
    </div>
  );
}