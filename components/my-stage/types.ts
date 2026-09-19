export type SingerProfile = {
  id?: string;
  user_id?: string;
  display_name?: string | null;
  stage_name?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  home_venue?: string | null;
  profile_visibility?: string | null;
};

export type SingerStats = {
  performances: number;
  averageScore: number;
  wins: number;
  venues: number;
};

export type SingerFavorites = {
  artist: string;
  song: string;
};

export type PersonalBests = {
  highestScore: number;
  highestScoreSong: string;
  bestFinish: string;
  mostPerformedArtist: string;
  signatureSong: string;
};

export type TimelineEntry = {
  id: string;
  songTitle: string;
  artist: string;
  venue: string;
  performedAt: string;
  averageScore: number | null;
};

export type AchievementCollectionItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  unlockedDescription: string;
  icon: string;
  category: string;
  isSecret: boolean;
  criteriaType: string;
  criteriaConfig: Record<string, unknown>;
  points: number;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
  triggeringPerformanceId: string | null;
  metadata: Record<string, unknown>;
  earnedCount: number;
  totalSingers: number;
  earnedPercentage: number;
};