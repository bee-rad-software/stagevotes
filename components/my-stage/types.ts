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