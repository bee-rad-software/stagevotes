export type AISongRecommendation = {
  title: string;
  artist: string;
  reason: string;
  id?: string | number;
  karafunSongId?: number | null;
};

export type AISongRecommendationsResponse = {
  recommendations: AISongRecommendation[];
  historyCount: number;
};
