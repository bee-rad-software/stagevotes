import type { StageCardTheme } from './types';

export type StageCardThemeConfig = {
  background: string;
  accent: string;
  accentSoft: string;
  border: string;
  glow: string;
  rarity: string;
};

export const themes: Record<
  StageCardTheme,
  StageCardThemeConfig
> = {
  regular: {
    background:
      'linear-gradient(155deg,#0d2549 0%,#172554 48%,#211936 100%)',
    accent: '#facc15',
    accentSoft: 'rgba(250,204,21,.10)',
    border: 'rgba(250,204,21,.62)',
    glow: 'rgba(250,204,21,.18)',
    rarity: 'UNCOMMON',
  },

  veteran: {
    background:
      'linear-gradient(155deg,#1f2937 0%,#475569 50%,#1e293b 100%)',
    accent: '#e2e8f0',
    accentSoft: 'rgba(226,232,240,.10)',
    border: 'rgba(226,232,240,.58)',
    glow: 'rgba(226,232,240,.22)',
    rarity: 'RARE',
  },

  elite: {
    background:
      'linear-gradient(155deg,#3b2100 0%,#7c4a03 48%,#291705 100%)',
    accent: '#fde047',
    accentSoft: 'rgba(253,224,71,.12)',
    border: 'rgba(253,224,71,.72)',
    glow: 'rgba(253,224,71,.28)',
    rarity: 'EPIC',
  },

  legend: {
    background:
      'linear-gradient(155deg,#240b45 0%,#581c87 48%,#172554 100%)',
    accent: '#d8b4fe',
    accentSoft: 'rgba(216,180,254,.12)',
    border: 'rgba(216,180,254,.68)',
    glow: 'rgba(192,132,252,.30)',
    rarity: 'LEGENDARY',
  },

  hallOfFame: {
    background:
      'linear-gradient(155deg,#050505 0%,#111827 52%,#332103 100%)',
    accent: '#fde68a',
    accentSoft: 'rgba(253,230,138,.11)',
    border: 'rgba(253,230,138,.75)',
    glow: 'rgba(253,230,138,.34)',
    rarity: 'HALL OF FAME',
  },
};

export function getStageCardTheme(
  badgeLabel: string
): StageCardTheme {
  const normalizedBadge = badgeLabel.toLowerCase();

  if (normalizedBadge.includes('hall of fame')) {
    return 'hallOfFame';
  }

  if (normalizedBadge.includes('legend')) {
    return 'legend';
  }

  if (normalizedBadge.includes('elite')) {
    return 'elite';
  }

  if (normalizedBadge.includes('veteran')) {
    return 'veteran';
  }

  return 'regular';
}