export type AISongRecommendation = {
  title: string;
  artist: string;
  reason: string;
  id?: string | number;
  singaVersions?: import('@/components/singer/SVSongPicker').SVSongOption[];
  singaSongId?: string;
  singaVariantId?: string;
  karafunSongId?: number | null;
};

export type AISongRecommendationsResponse = {
  recommendations: AISongRecommendation[];
  historyCount: number;
};
