import type { HostIQRecommendation } from '@/lib/hostIQ';

export type AIHostIQUrgency = 'normal' | 'watch' | 'urgent';

export type AIHostBriefing = {
  headline: string;
  summary: string;
  nextAction: string;
  announcement: string;
  urgency: AIHostIQUrgency;
};

export type AIHostBriefingRequest = {
  eventId: string;
  targetEndTime: string;
  bufferMinutes: number;
  averageMinutes: number;
  isLiveEstimate: boolean;
  sampleSize: number;
  queueMinutes: number;
  projectedEndTime: string;
  remainingSongs: number;
  remainingSingers: number;
  signupsOpen: boolean;
  additionalSongsOpen: boolean;
  showStarted: boolean;
  votingOpen: boolean;
  karaFunConnected: boolean;
  recommendation: Pick<
    HostIQRecommendation,
    'status' | 'title' | 'message' | 'capacitySongs'
  >;
};
