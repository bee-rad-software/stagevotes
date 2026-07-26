export type StageCardTheme =
  | 'regular'
  | 'veteran'
  | 'elite'
  | 'legend'
  | 'hallOfFame';

export type StageCardData = {
  name: string;

  badgeLabel: string;

  performances: number;

  averageScore: number;

  wins: number;

  venues: number;

  photoUrl?: string | null;
};