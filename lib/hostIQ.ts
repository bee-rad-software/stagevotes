export type HostIQAction =
  | 'close_additional_songs'
  | 'close_all_signups'
  | 'reopen_signups'
  | null;

export type HostIQRecommendation = {
  status: 'setup' | 'healthy' | 'watch' | 'warning' | 'closed';
  title: string;
  message: string;
  action: HostIQAction;
  actionLabel?: string;
  capacitySongs: number;
};

type CompletedPerformance = {
  completed_at?: string | null;
};

const DEFAULT_MINUTES_PER_SONG = 4;

export function calculateAverageSongMinutes(
  performances: CompletedPerformance[]
) {
  const completionTimes = performances
    .map((performance) =>
      performance.completed_at
        ? new Date(performance.completed_at).getTime()
        : Number.NaN
    )
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .slice(-9);

  const samples: number[] = [];

  for (let index = 1; index < completionTimes.length; index += 1) {
    const minutes =
      (completionTimes[index] - completionTimes[index - 1]) /
      60_000;

    // Ignore accidental rapid advances and long show breaks.
    if (minutes >= 2 && minutes <= 10) {
      samples.push(minutes);
    }
  }

  if (samples.length === 0) {
    return {
      averageMinutes: DEFAULT_MINUTES_PER_SONG,
      sampleSize: 0,
      isLiveEstimate: false,
    };
  }

  const average =
    samples.reduce((total, minutes) => total + minutes, 0) /
    samples.length;

  return {
    averageMinutes: Math.round(average * 10) / 10,
    sampleSize: samples.length,
    isLiveEstimate: true,
  };
}

export function getTargetDate(
  targetTime: string,
  now: Date
) {
  const [hours, minutes] = targetTime
    .split(':')
    .map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

export function formatHostTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildHostIQRecommendation({
  targetTime,
  now,
  projectedQueueMinutes,
  averageMinutes,
  bufferMinutes,
  signupsOpen,
  additionalSongsOpen,
}: {
  targetTime: string;
  now: Date;
  projectedQueueMinutes: number;
  averageMinutes: number;
  bufferMinutes: number;
  signupsOpen: boolean;
  additionalSongsOpen: boolean;
}): HostIQRecommendation {
  if (!targetTime) {
    return {
      status: 'setup',
      title: 'Set tonight\'s ending time',
      message:
        'Host IQ will watch the queue and tell you when to close additional songs and new-singer signups.',
      action: null,
      capacitySongs: 0,
    };
  }

  const target = getTargetDate(targetTime, now);

  if (!target) {
    return {
      status: 'setup',
      title: 'Choose a valid ending time',
      message:
        'Enter the time you want the show and closing announcements to finish.',
      action: null,
      capacitySongs: 0,
    };
  }

  const minutesUntilTarget = Math.max(
    0,
    (target.getTime() - now.getTime()) / 60_000
  );
  const availableMinutes =
    minutesUntilTarget - projectedQueueMinutes - bufferMinutes;
  const capacitySongs = Math.max(
    0,
    Math.floor(availableMinutes / Math.max(averageMinutes, 1))
  );

  if (!signupsOpen) {
    return {
      status: 'closed',
      title: 'Signups are closed',
      message:
        availableMinutes >= 0
          ? `The current queue is projected to finish with about ${Math.round(availableMinutes)} minutes to spare before the closing buffer.`
          : `The current queue is projected to run about ${Math.ceil(Math.abs(availableMinutes))} minutes beyond the planned closing buffer.`,
      action: availableMinutes >= averageMinutes * 3
        ? 'reopen_signups'
        : null,
      actionLabel:
        availableMinutes >= averageMinutes * 3
          ? 'Reopen Signups'
          : undefined,
      capacitySongs,
    };
  }

  if (availableMinutes <= 0) {
    return {
      status: 'warning',
      title: 'Close all signups now',
      message:
        availableMinutes < 0
          ? `The current queue is already projected to use the closing buffer by about ${Math.ceil(Math.abs(availableMinutes))} minutes.`
          : 'The current queue now fills the available show time, including the closing buffer.',
      action: 'close_all_signups',
      actionLabel: 'Close All Signups',
      capacitySongs: 0,
    };
  }

  if (capacitySongs <= 2) {
    if (additionalSongsOpen) {
      return {
        status: 'watch',
        title: 'Pause additional songs',
        message: `There is room for about ${capacitySongs || 1} more new ${capacitySongs === 1 ? 'singer' : 'singers'}. Keep new-singer signup open, but stop extra songs from singers already in the queue.`,
        action: 'close_additional_songs',
        actionLabel: 'Pause Additional Songs',
        capacitySongs,
      };
    }

    return {
      status: 'watch',
      title: 'New-singer signup can stay open briefly',
      message: `Additional songs are paused. The current pace leaves room for about ${capacitySongs || 1} more new ${capacitySongs === 1 ? 'singer' : 'singers'}.`,
      action: null,
      capacitySongs,
    };
  }

  return {
    status: 'healthy',
    title: 'The show is on pace',
    message: `The current plan leaves room for about ${capacitySongs} more songs while preserving a ${bufferMinutes}-minute closing buffer.`,
    action: null,
    capacitySongs,
  };
}
