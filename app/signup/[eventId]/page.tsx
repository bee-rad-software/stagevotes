'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams } from 'next/navigation';
import {
  History,
  ListMusic,
  Plus,
  Trophy,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

import SVSingerHero from '@/components/singer/SVSingerHero';
import SVQueueStatusCard from '@/components/singer/SVQueueStatusCard';
import SVBottomSheet from '@/components/ui/SVBottomSheet';
import SVSongPicker, {
  type SVSongOption,
} from '@/components/singer/SVSongPicker';
import SVTipCard from '@/components/singer/SVTipCard';
import SVSingerProfilePrompt from '@/components/singer/SVSingerProfilePrompt';
import {
  getRotationIdentity,
} from '@/lib/rotationIdentity';
import SVFirstPerformanceCelebration from '@/components/singer/SVFirstPerformanceCelebration';
import {
  buildRotationQueue,
} from '@/lib/rotationQueue';
import type {
  AISongRecommendationsResponse,
} from '@/lib/aiSongRecommendations';

type QueueState =
  | 'waiting'
  | 'soon'
  | 'next'
  | 'performing';

type SingerProfile = {
  id: string;
  user_id?: string;
  stage_name: string | null;
  display_name: string | null;
  photo_url: string | null;
};

type Performance = {
  id: string;
  event_id: string;
  account_id?: string | null;
  singer_name: string;
  duet_partner_name?: string | null;
  performance_note?: string | null;
  song_title: string;
  artist?: string | null;
  queue_order?: number | null;
  round?: number | null;
  status?: string | null;
  device_id?: string | null;
  singer_profile_id?: string | null;

  checked_in_at?: string | null;
  checked_in_by?: string | null;
};

type EventData = {
  id: string;
  account_id?: string | null;
  name?: string | null;
  venue?: string | null;
  venue_name?: string | null;
  current_performance_id?: string | null;
  competition_mode?: string | null;
  tournament_event_id?: string | null;
  signups_open?: boolean | null;
  additional_songs_open?: boolean | null;
  is_show_ended?: boolean | null;
  judging_enabled?: boolean | null;
};

const CURRENT_SHOW_KEY =
  'stagevotes_current_event_id';

const SMS_CONSENT_VERSION = '2026-09-23';

function normalizeUsPhone(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
}

function rememberCurrentShow(
  eventId: string
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    CURRENT_SHOW_KEY,
    eventId
  );

  window.dispatchEvent(
    new Event(
      'stagevotes-current-show-change'
    )
  );
}

export default function SignupPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  useEffect(() => {
  if (!eventId) return;

  rememberCurrentShow(eventId);
}, [eventId]);

  const [event, setEvent] = useState<EventData | null>(null);
  const [queue, setQueue] = useState<Performance[]>([]);

  const [singerName, setSingerName] = useState('');
  const [savedSingerName, setSavedSingerName] = useState('');

  const [smsPhone, setSmsPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);

   const [isDuet, setIsDuet] =
    useState(false);

  const [
    duetPartnerName,
    setDuetPartnerName,
  ] = useState('');

  const [
    performanceNote,
    setPerformanceNote,
  ] = useState('');

  const [singerProfile, setSingerProfile] =
    useState<SingerProfile | null>(null);

  const singerProfileIdRef =
  useRef<string | null>(null);

const singerNameRef = useRef('');

const eventRef =
  useRef<EventData | null>(null);

type AchievementCelebration = {
  id: string;
  performanceId: string;
  singerName: string;
  songTitle: string;
  venueName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon: string;
  isSecret: boolean;
  earnedCount?: number;
  earnedPercentage?: number;
  earnedBadges: number;
  totalBadges: number;
};

const [
  achievementCelebrations,
  setAchievementCelebrations,
] = useState<AchievementCelebration[]>(
  []
);

const activeAchievementCelebration =
  achievementCelebrations[0] || null;

function dismissAchievementCelebration() {
  setAchievementCelebrations(
    (current) => current.slice(1)
  );
}

useEffect(() => {
  singerNameRef.current = (
    savedSingerName ||
    singerName
  )
    .trim()
    .toLowerCase();
}, [savedSingerName, singerName]);

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [currentSinger, setCurrentSinger] =
    useState<Performance | null>(null);

  const [onDeckSinger, setOnDeckSinger] =
    useState<Performance | null>(null);

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitLockRef = useRef(false);

  const [songSheetOpen, setSongSheetOpen] =
    useState(false);

  const [editingPerformanceId, setEditingPerformanceId] =
    useState<string | null>(null);

  const [pickerSongs, setPickerSongs] =
    useState<SVSongOption[]>([]);

  const [pickerLoading, setPickerLoading] =
    useState(false);

  const [aiRecommendations, setAIRecommendations] =
    useState<SVSongOption[]>([]);

  const [aiRecommendationsLoading, setAIRecommendationsLoading] =
    useState(false);

  const [aiRecommendationsMessage, setAIRecommendationsMessage] =
    useState('');

  const [
  karafunChannel,
  setKarafunChannel,
] = useState('');

  const [surpriseSong, setSurpriseSong] =
    useState<SVSongOption | null>(null);

  const [duplicateWarning, setDuplicateWarning] =
    useState('');

   const [pendingConflictSong, setPendingConflictSong] =
  useState<any | null>(null);

const [songConflictWarning, setSongConflictWarning] =
  useState('');

  const [
  pickerError,
  setPickerError,
] = useState('');

  const [
  claimableSinger,
  setClaimableSinger,
] = useState<{
  name: string;
  performanceIds: string[];
  requiresHostApproval?: boolean;
} | null>(null);

const [recoveryRequest, setRecoveryRequest] =
  useState<{
    id: string;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
  } | null>(null);

  const [tipsEnabled, setTipsEnabled] =
    useState(false);

  const [venmoUrl, setVenmoUrl] = useState('');
  const [cashappUrl, setCashappUrl] = useState('');
  const [applePayUrl, setApplePayUrl] = useState('');

  const [
  maxQueuedSongsPerSinger,
  setMaxQueuedSongsPerSinger,
] = useState(3);

  function getDeviceId() {
    if (typeof window === 'undefined') {
      return '';
    }

    let deviceId = window.localStorage.getItem(
      'karavote_device_id'
    );

    if (!deviceId) {
      deviceId = crypto.randomUUID();

      window.localStorage.setItem(
        'karavote_device_id',
        deviceId
      );
    }

    return deviceId;
  }

  async function claimGuestPerformances(
  profileId: string
) {
  const deviceId = getDeviceId();

  if (!deviceId || !eventId || !profileId) {
    return;
  }

  const { error } = await supabase
    .from('performances')
    .update({
      singer_profile_id: profileId,
    })
    .eq('event_id', eventId)
    .eq('device_id', deviceId)
    .is('singer_profile_id', null);

  if (error) {
    console.error(
      'Unable to claim guest performances:',
      error.message
    );
  }
}

  async function loadSingerProfile() {
    setProfileLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

   if (!user) {
  setSingerProfile(null);
  singerProfileIdRef.current = null;
  setProfileLoading(false);
  return;
}

    const { data, error } = await supabase
      .from('singer_profiles')
      .select(
        `
        id,
        user_id,
        stage_name,
        display_name,
        photo_url
        `
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error(
        'Unable to load singer profile:',
        error.message
      );

      setProfileLoading(false);
      return;
    }

    const profile = data as SingerProfile | null;

    setSingerProfile(profile);

    singerProfileIdRef.current =
  profile?.id || null;

   if (profile?.id) {
  await claimGuestPerformances(
    profile.id
  );

  await loadQueue();
}

    const profileName =
      profile?.stage_name?.trim() ||
      profile?.display_name?.trim() ||
      '';

    if (profileName) {
      setSingerName(profileName);
    }

    setProfileLoading(false);
  }

  async function loadEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error(
        'Unable to load event:',
        error.message
      );

      setMessage(
        'We could not load this karaoke event.'
      );

      return;
    }

    const eventData = data as EventData;

    setEvent(eventData);

    eventRef.current = eventData;

    if (!eventData.account_id) {
      return;
    }

    const { data: accountData, error: accountError } =
      await supabase
        .from('accounts')
        .select(
  `
  tips_enabled,
  venmo_url,
  cashapp_url,
  apple_pay_url,
  karafun_channel,
  max_songs_per_singer
  `
)
        .eq('id', eventData.account_id)
        .maybeSingle();

    if (accountError) {
      console.error(
        'Unable to load account settings:',
        accountError.message
      );

      return;
    }

    setTipsEnabled(
      accountData?.tips_enabled || false
    );

    setVenmoUrl(accountData?.venmo_url || '');
    setCashappUrl(accountData?.cashapp_url || '');
    setApplePayUrl(accountData?.apple_pay_url || '');
    setMaxQueuedSongsPerSinger(
  accountData?.max_songs_per_singer ?? 3
);
    setKarafunChannel(
  accountData?.karafun_channel || ''
);
  }

  async function loadQueue() {
    const { data, error } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)
.neq('status', 'completed')
.neq('status', 'skipped')
.order('round', {
  ascending: true,
})
.order('queue_order', {
  ascending: true,
});

    if (error) {
      console.error(
        'Unable to load queue:',
        error.message
      );

      return;
    }

   const queueData =
  (data || []) as Performance[];

const { data: currentEvent } = await supabase
  .from('events')
  .select('current_performance_id')
  .eq('id', eventId)
  .single();

const currentPerformanceId =
  currentEvent?.current_performance_id || null;

const orderedQueue =
  buildRotationQueue(
    queueData,
    currentPerformanceId
  );

setQueue(orderedQueue);

const actualCurrentSinger =
  orderedQueue.find(
    (performance) =>
      performance.id === currentPerformanceId
  ) || null;

setCurrentSinger(actualCurrentSinger);

const waitingQueue =
  orderedQueue.filter(
    (performance) =>
      performance.id !== currentPerformanceId
  );

setOnDeckSinger(
  waitingQueue[0] || null
);
  }

async function queueProfileAchievements(
  performance: Performance,
  profileId: string
) {
  const {
    data: earnedRows,
    error: earnedError,
  } = await supabase
    .from('singer_achievements')
    .select(`
      id,
      achievement_id,
      earned_at,
      achievement_definitions (
        title,
        unlocked_description,
        icon,
        is_secret
      )
    `)
    .eq(
      'singer_profile_id',
      profileId
    )
    .eq(
      'triggering_performance_id',
      performance.id
    )
    .order('earned_at', {
      ascending: true,
    });

  if (earnedError) {
    console.error(
      'Unable to load newly earned achievements:',
      earnedError.message
    );

    return false;
  }

  const unseenRows = (
    earnedRows || []
  ).filter((earned: any) => {
    return !window.localStorage.getItem(
      `stagevotes_achievement_${earned.id}`
    );
  });

  if (unseenRows.length === 0) {
    return false;
  }

  const achievementIds = unseenRows.map(
    (earned: any) =>
      earned.achievement_id
  );

  const [
    earnedCountResult,
    totalCountResult,
    badgeStatsResult,
  ] = await Promise.all([
    supabase
      .from('singer_achievements')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'singer_profile_id',
        profileId
      ),

    supabase
      .from('achievement_definitions')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true),

    supabase
      .from('achievement_badge_stats')
      .select(`
        achievement_id,
        earned_count,
        earned_percentage
      `)
      .in(
        'achievement_id',
        achievementIds
      ),
  ]);

  const badgeStatsMap = new Map(
    (badgeStatsResult.data || []).map(
      (badgeStats: any) => [
        badgeStats.achievement_id,
        badgeStats,
      ]
    )
  );

  const currentEvent = eventRef.current;

  const celebrations:
    AchievementCelebration[] =
    unseenRows.map((earned: any) => {
      const definition = Array.isArray(
        earned.achievement_definitions
      )
        ? earned
            .achievement_definitions[0]
        : earned.achievement_definitions;

      const badgeStats =
        badgeStatsMap.get(
          earned.achievement_id
        );

      window.localStorage.setItem(
        `stagevotes_achievement_${earned.id}`,
        'shown'
      );

      return {
        id: earned.id,
        performanceId: performance.id,
        singerName:
          performance.singer_name ||
          savedSingerName ||
          singerName ||
          'Singer',
        songTitle:
          performance.song_title ||
          'Your performance',
        venueName:
          currentEvent?.venue_name ||
          currentEvent?.venue ||
          'Your karaoke venue',
        achievementTitle:
          definition?.title ||
          'Achievement Unlocked',
        achievementDescription:
          definition
            ?.unlocked_description ||
          'You earned a new StageVotes badge!',
        achievementIcon:
          definition?.icon || '🏆',
        isSecret:
          definition?.is_secret ||
          false,
        earnedCount: Number(
          badgeStats?.earned_count || 1
        ),
        earnedPercentage: Number(
          badgeStats
            ?.earned_percentage || 0
        ),
        earnedBadges:
          earnedCountResult.count ||
          unseenRows.length,
        totalBadges:
          totalCountResult.count || 24,
      };
    });

  setAchievementCelebrations(
    (current) => [
      ...current,
      ...celebrations,
    ]
  );

  return true;
}

 async function queueFinalCountdownCelebration(
  profileId: string
) {
  const {
    data: definition,
    error: definitionError,
  } = await supabase
    .from('achievement_definitions')
    .select(`
      id,
      title,
      unlocked_description,
      icon,
      is_secret
    `)
    .eq(
      'slug',
      'the-final-countdown'
    )
    .maybeSingle();

  if (
    definitionError ||
    !definition
  ) {
    if (definitionError) {
      console.error(
        'Unable to load final countdown badge:',
        definitionError.message
      );
    }

    return;
  }

  const {
    data: earned,
    error: earnedError,
  } = await supabase
    .from('singer_achievements')
    .select(`
      id,
      achievement_id,
      triggering_performance_id
    `)
    .eq(
      'singer_profile_id',
      profileId
    )
    .eq(
      'achievement_id',
      definition.id
    )
    .maybeSingle();

  if (
    earnedError ||
    !earned
  ) {
    if (earnedError) {
      console.error(
        'Unable to load final countdown unlock:',
        earnedError.message
      );
    }

    return;
  }

  const celebrationKey =
    `stagevotes_achievement_${earned.id}`;

  if (
    window.localStorage.getItem(
      celebrationKey
    )
  ) {
    return;
  }

  const [
    performanceResult,
    earnedCountResult,
    totalCountResult,
    badgeStatsResult,
  ] = await Promise.all([
    supabase
      .from('performances')
      .select(`
        id,
        singer_name,
        song_title
      `)
      .eq(
        'id',
        earned.triggering_performance_id
      )
      .maybeSingle(),

    supabase
      .from('singer_achievements')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'singer_profile_id',
        profileId
      ),

    supabase
      .from('achievement_definitions')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('is_active', true),

    supabase
      .from('achievement_badge_stats')
      .select(`
        earned_count,
        earned_percentage
      `)
      .eq(
        'achievement_id',
        definition.id
      )
      .maybeSingle(),
  ]);

  const performance =
    performanceResult.data;

  const badgeStats =
    badgeStatsResult.data;

  const currentEvent = eventRef.current;

  window.localStorage.setItem(
    celebrationKey,
    'shown'
  );

  setAchievementCelebrations(
    (current) => [
      ...current,
      {
        id: earned.id,
        performanceId:
          earned
            .triggering_performance_id ||
          'final-performance',
        singerName:
          performance?.singer_name ||
          savedSingerName ||
          singerName ||
          'Singer',
        songTitle:
          performance?.song_title ||
          'Your final performance',
        venueName:
          currentEvent?.venue_name ||
          currentEvent?.venue ||
          'Your karaoke venue',
        achievementTitle:
          definition.title,
        achievementDescription:
          definition
            .unlocked_description,
        achievementIcon:
          definition.icon,
        isSecret:
          definition.is_secret,
        earnedCount: Number(
          badgeStats?.earned_count || 1
        ),
        earnedPercentage: Number(
          badgeStats
            ?.earned_percentage || 0
        ),
        earnedBadges:
          earnedCountResult.count || 1,
        totalBadges:
          totalCountResult.count || 24,
      },
    ]
  );

  if ('vibrate' in navigator) {
    navigator.vibrate?.([
      80,
      60,
      120,
    ]);
  }
}

async function maybeCelebrateFirstPerformance(
  payload: any
) {
  if (
    payload.eventType !== 'UPDATE' ||
    payload.new?.status !== 'completed' ||
    payload.old?.status === 'completed'
  ) {
    return;
  }

  const performance =
    payload.new as Performance;

  const profileId =
    singerProfileIdRef.current;

  const deviceId = getDeviceId();

  const sameProfile = Boolean(
    profileId &&
    performance.singer_profile_id ===
      profileId
  );

  const sameDevice = Boolean(
    deviceId &&
    performance.device_id === deviceId
  );

  const sameLegacyName = Boolean(
    !performance.singer_profile_id &&
    !performance.device_id &&
    !profileId &&
    singerNameRef.current &&
    performance.singer_name
      ?.trim()
      .toLowerCase() ===
      singerNameRef.current
  );

    if (
    !sameProfile &&
    !sameDevice &&
    !sameLegacyName
  ) {
    return;
  }

  if (sameProfile && profileId) {
    const queued =
      await queueProfileAchievements(
        performance,
        profileId
      );

    if (
      queued &&
      'vibrate' in navigator
    ) {
      navigator.vibrate?.([
        80,
        60,
        120,
      ]);
    }

    return;
  }

  const celebrationKey =
    `stagevotes_first_performance_${performance.id}`;

  if (
    window.localStorage.getItem(
      celebrationKey
    )
  ) {
    return;
  }

  let countQuery = supabase
    .from('performances')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('status', 'completed');

  if (profileId) {
    countQuery = countQuery.eq(
      'singer_profile_id',
      profileId
    );
  } else if (deviceId) {
    countQuery = countQuery.eq(
      'device_id',
      deviceId
    );
  } else {
    return;
  }

  const {
    count,
    error,
  } = await countQuery;

  if (error) {
    console.error(
      'Unable to check first performance:',
      error.message
    );

    return;
  }

  if (count !== 1) {
    return;
  }

  window.localStorage.setItem(
    celebrationKey,
    'shown'
  );

  if (
    'vibrate' in navigator
  ) {
    navigator.vibrate?.([
      80,
      60,
      120,
    ]);
  }

  const currentEvent =
    eventRef.current;

   setAchievementCelebrations(
    (current) => [
      ...current,
      {
        id: `guest-first-${performance.id}`,
        performanceId: performance.id,
        singerName:
          performance.singer_name ||
          savedSingerName ||
          singerName ||
          'Singer',
        songTitle:
          performance.song_title ||
          'Your performance',
        venueName:
          currentEvent?.venue_name ||
          currentEvent?.venue ||
          'Your karaoke venue',
        achievementTitle:
          'First Performance',
        achievementDescription:
          `You officially took the stage${
            performance.singer_name
              ? `, ${performance.singer_name}`
              : ''
          }!`,
        achievementIcon: '🎤',
        isSecret: false,
        earnedBadges: 1,
        totalBadges: 24,
      },
    ]
  );
}

  useEffect(() => {
    const savedName = localStorage.getItem(
      'karavote_singer_name'
    );

    if (savedName) {
      setSingerName(savedName);
      setSavedSingerName(savedName);
    }

    const savedSmsPhone = localStorage.getItem(
      `stagevotes_sms_phone_${eventId}`
    );

    if (savedSmsPhone) {
      setSmsPhone(savedSmsPhone);
    }

    loadEvent();
    loadQueue();
    loadSingerProfile();

   const channel = supabase
  .channel(`signup-${eventId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'performances',
      filter: `event_id=eq.${eventId}`,
    },
   (payload) => {
  void maybeCelebrateFirstPerformance(
    payload
  );

  loadQueue();
}
  )
    .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'events',
      filter: `id=eq.${eventId}`,
    },
    (payload) => {
      loadEvent();
      loadQueue();

      const updatedEvent =
        payload.new as EventData;

      const profileId =
        singerProfileIdRef.current;

      if (
        updatedEvent.is_show_ended ===
          true &&
        profileId
      ) {
        void queueFinalCountdownCelebration(
          profileId
        );
      }
    }
  )
  .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const singerKey = (
    savedSingerName ||
    singerName
  )
    .trim()
    .toLowerCase();

 function performanceBelongsToSinger(
  performance: Performance
) {
  const deviceId = getDeviceId();

  // Best identity: logged-in singer profile
  if (
    singerProfile?.id &&
    performance.singer_profile_id === singerProfile.id
  ) {
    return true;
  }

  // Guest identity: same physical device
  if (
    deviceId &&
    performance.device_id === deviceId
  ) {
    return true;
  }

 /*
 * Only use the old name-based fallback when
 * neither side has a modern identity attached.
 *
 * A host-created walk-up with the same name
 * must NOT automatically become this singer's
 * performance.
 */
if (
  performance.singer_profile_id ||
  performance.device_id ||
  singerProfile?.id
) {
  return false;
}

return Boolean(
  singerKey &&
    performance.singer_name
      ?.trim()
      .toLowerCase() === singerKey
);
}

  const myPerformances = useMemo(
    () => queue.filter(performanceBelongsToSinger),
    [
      queue,
      singerKey,
      singerProfile?.id,
    ]
  );

  const myIndex = queue.findIndex(
    performanceBelongsToSinger
  );

  const rawMyPosition =
  myIndex >= 0 ? myIndex + 1 : null;

  const hasJoined =
    myPerformances.length > 0;

  const isTournament =
  event?.competition_mode === 'tournament';

  const signupsAreOpen =
  event?.signups_open !== false;

  const additionalSongsAreOpen =
  event?.additional_songs_open !== false;

  const additionalSongsPaused =
  hasJoined && !additionalSongsAreOpen;

  const hasReachedSongLimit =
  !isTournament &&
  myPerformances.length >=
    maxQueuedSongsPerSinger;

  const performanceNeedingSong =
  myPerformances.find(
    (performance) =>
      !performance.song_title?.trim()
  ) || null;

const tournamentPerformance =
  isTournament
    ? myPerformances[0] || null
    : null;

const isCheckedIn =
  Boolean(
    tournamentPerformance?.checked_in_at
  );

const isTournamentReady =
  Boolean(
    tournamentPerformance?.checked_in_at &&
    tournamentPerformance?.song_title?.trim()
  );

const needsCompetitionSong =
  Boolean(
    singerProfile?.id &&
    performanceNeedingSong
  );

  const isCurrentSinger = Boolean(
    currentSinger &&
      performanceBelongsToSinger(currentSinger)
  );

  const isOnDeckSinger = Boolean(
    onDeckSinger &&
      performanceBelongsToSinger(onDeckSinger)
  );

  const myPosition =
  isCurrentSinger
    ? 0
    : isOnDeckSinger
    ? 1
    : rawMyPosition;

  const queueState: QueueState =
    isCurrentSinger
      ? 'performing'
      : isOnDeckSinger
        ? 'next'
        : myPosition === 3
          ? 'soon'
          : 'waiting';

  const averageMinutesPerSong = 4;

  const estimatedWaitMinutes =
  isCurrentSinger
    ? 0
    : isOnDeckSinger
    ? averageMinutesPerSong
    : myPosition && myPosition > 1
    ? (myPosition - 1) *
      averageMinutesPerSong
    : 0;

  async function searchPickerSongs(
  searchText: string
) {
  const cleanedSearch =
    searchText.trim();

  setSurpriseSong(null);

  setPickerError('');

  if (cleanedSearch.length < 2) {
    setPickerSongs([]);
    setPickerLoading(false);
    return;
  }

  setPickerLoading(true);

  try {
    /*
     * If this venue has KaraFun configured,
     * search KaraFun's catalog directly.
     */
    if (karafunChannel) {
      const response = await fetch(
        `https://www.karafun.com/${karafunChannel}/` +
          `?type=search` +
          `&q=${encodeURIComponent(cleanedSearch)}` +
          `&types=karaoke`
      );

      if (!response.ok) {
        throw new Error(
          `KaraFun search failed: ${response.status}`
        );
      }

      const data = await response.json();

      const queuedTitles = new Set(
        queue.map((performance) =>
          performance.song_title
            ?.trim()
            .toLowerCase()
        )
      );

      const formattedSongs: SVSongOption[] =
        (Array.isArray(data) ? data : [])
          .slice(0, 25)
          .map((song: any) => ({
            title: song.title || '',
            artist: song.artist || '',
            karafunSongId:
              Number(song.songId) || null,
            status: queuedTitles.has(
              String(song.title || '')
                .trim()
                .toLowerCase()
            )
              ? 'queued'
              : 'available',
          }));

      setPickerSongs(formattedSongs);
      return;
    }

    /*
     * No KaraFun configured:
     * keep using the StageVotes catalog.
     */
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist')
      .or(
        `title.ilike.%${cleanedSearch}%,artist.ilike.%${cleanedSearch}%`
      )
      .limit(25);

    if (error) {
      throw error;
    }

    const queuedTitles = new Set(
      queue.map((performance) =>
        performance.song_title
          ?.trim()
          .toLowerCase()
      )
    );

    const formattedSongs: SVSongOption[] =
      (data || []).map(
        (song): SVSongOption => ({
          id: song.id,
          title: song.title,
          artist: song.artist || '',
          status: queuedTitles.has(
            song.title
              .trim()
              .toLowerCase()
          )
            ? 'queued'
            : 'available',
        })
      );

    setPickerSongs(formattedSongs);
  } catch (error) {
  console.error(
    'Song search failed:',
    error
  );

  setPickerSongs([]);

  setPickerError(
    'We could not search the karaoke catalog. Please try again.'
  );
} finally {
    setPickerLoading(false);
  }
}

  async function pickSurpriseSong() {
  setMessage('');
  setDuplicateWarning('');
  setPickerError('');
  setPickerLoading(true);

  try {
    /*
     * If KaraFun is configured, use KaraFun
     * as the source of truth for Surprise Me.
     */
    if (karafunChannel) {
      const surpriseTerms = [
        'love',
        'rock',
        'dance',
        'party',
        'country',
        'classic',
        'pop',
      ];

      const randomTerm =
        surpriseTerms[
          Math.floor(
            Math.random() *
              surpriseTerms.length
          )
        ];

      const response = await fetch(
        `https://www.karafun.com/${karafunChannel}/` +
          `?type=search` +
          `&q=${encodeURIComponent(randomTerm)}` +
          `&types=karaoke`
      );

      if (!response.ok) {
        throw new Error(
          `KaraFun search failed: ${response.status}`
        );
      }

      const data = await response.json();

      const queuedTitles = new Set(
        queue.map((performance) =>
          performance.song_title
            ?.trim()
            .toLowerCase()
        )
      );

      const availableSongs =
        (Array.isArray(data) ? data : []).filter(
          (song: any) =>
            !queuedTitles.has(
              String(song.title || '')
                .trim()
                .toLowerCase()
            )
        );

      if (availableSongs.length === 0) {
        setPickerError(
          'Every song we checked is already queued. Try searching instead.'
        );
        return;
      }

      const selectedSong =
        availableSongs[
          Math.floor(
            Math.random() *
              availableSongs.length
          )
        ];

      setSurpriseSong({
        title: selectedSong.title || '',
        artist: selectedSong.artist || '',
        status: 'available',
        note: 'StageVotes picked this one for you',
        karafunSongId:
          Number(selectedSong.songId) || null,
      });

      return;
    }

    /*
     * No KaraFun configured:
     * fall back to the StageVotes catalog.
     */
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist')
      .limit(250);

    if (error || !data?.length) {
      throw error ||
        new Error(
          'No StageVotes songs available.'
        );
    }

    const queuedTitles = new Set(
      queue.map((performance) =>
        performance.song_title
          ?.trim()
          .toLowerCase()
      )
    );

    const availableSongs = data.filter(
      (song) =>
        !queuedTitles.has(
          song.title.trim().toLowerCase()
        )
    );

    if (availableSongs.length === 0) {
      setPickerError(
        'Every song we checked is already queued. Try searching instead.'
      );
      return;
    }

    const selectedSong =
      availableSongs[
        Math.floor(
          Math.random() *
            availableSongs.length
        )
      ];

    setSurpriseSong({
      id: selectedSong.id,
      title: selectedSong.title,
      artist: selectedSong.artist || '',
      status: 'available',
      note: 'StageVotes picked this one for you',
      karafunSongId: null,
    });
  } catch (error) {
    console.error(
      'Surprise song search failed:',
      error
    );

    setPickerError(
      'We could not find a surprise song. Try again!'
    );
  } finally {
    setPickerLoading(false);
  }
}

  async function generateAIRecommendations() {
    if (!singerProfile?.id) return;

    setAIRecommendationsLoading(true);
    setAIRecommendationsMessage('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setAIRecommendationsMessage(
          'Sign in again to get recommendations from your song history.'
        );
        return;
      }

      const response = await fetch('/api/singer/song-recommendations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      const payload = (await response.json()) as
        | AISongRecommendationsResponse
        | { error?: string };

      if (!response.ok || !('recommendations' in payload)) {
        throw new Error(
          'error' in payload && payload.error
            ? payload.error
            : 'We could not create recommendations right now.'
        );
      }

      setAIRecommendations(
        payload.recommendations.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          status: 'available',
          note: song.reason,
          karafunSongId: song.karafunSongId ?? null,
          selectionSource: 'ai_recommendation',
        }))
      );
      setAIRecommendationsMessage(
        `Based on ${payload.historyCount} song${
          payload.historyCount === 1 ? '' : 's'
        } from your performance history.`
      );
    } catch (error) {
      setAIRecommendations([]);
      setAIRecommendationsMessage(
        error instanceof Error
          ? error.message
          : 'We could not create recommendations right now.'
      );
    } finally {
      setAIRecommendationsLoading(false);
    }
  }

  async function checkDuplicateSong(
  songTitle: string
) {
  const normalizedTitle = songTitle
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('performances')
    .select(`
      id,
      singer_name,
      song_title,
      status,
      device_id,
      singer_profile_id
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error(
      'Duplicate check failed:',
      error.message
    );

    return {
      blocked: false,
      warning: '',
    };
  }

  const matchingSongs = (data || []).filter(
    (performance) => {
      if (
        performance.id ===
        editingPerformanceId
      ) {
        return false;
      }

      return (
        performance.song_title
          ?.trim()
          .replace(/\s+/g, ' ')
          .toLowerCase() ===
        normalizedTitle
      );
    }
  );

  const myDuplicate = matchingSongs.find(
    (performance) => {
      const sameProfile = Boolean(
        singerProfile?.id &&
          performance.singer_profile_id ===
            singerProfile.id
      );

      const sameDevice = Boolean(
        deviceId &&
          performance.device_id === deviceId
      );

      const sameName =
        performance.singer_name
          ?.trim()
          .replace(/\s+/g, ' ')
          .toLowerCase() ===
        singerName
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();

      return (
        sameProfile ||
        sameDevice ||
        sameName
      );
    }
  );

  if (myDuplicate) {
    return {
      blocked: true,
      warning:
        `You already have "${myDuplicate.song_title}" in your songs tonight.`,
    };
  }

  const anotherSinger = matchingSongs[0];

  if (anotherSinger) {
    const alreadySung =
      anotherSinger.status === 'completed';

    return {
      blocked: false,
      warning: alreadySung
        ? `"${anotherSinger.song_title}" has already been sung tonight by ${anotherSinger.singer_name}.`
        : `"${anotherSinger.song_title}" is already in tonight’s queue for ${anotherSinger.singer_name}.`,
    };
  }

  return {
    blocked: false,
    warning: '',
  };
}

  async function getCurrentRound() {
  const { data, error } = await supabase
    .from('performances')
    .select('round, status')
    .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  const activePerformances =
    (data || []).filter(
      (performance) =>
        performance.status !== 'completed' &&
        performance.status !== 'skipped'
    );

  if (activePerformances.length === 0) {
    return 1;
  }

  return Math.min(
    ...activePerformances.map(
      (performance) =>
        performance.round || 1
    )
  );
}

  async function getNextQueueDetails() {
    const { data, error } = await supabase
      .from('performances')
      .select(
        `
        queue_order,
        round,
        status
        `
      )
      .eq('event_id', eventId);

    if (error) {
      throw new Error(error.message);
    }

    const allPerformances = data || [];

    const activePerformances =
      allPerformances.filter(
        (performance) =>
          performance.status !== 'completed' &&
          performance.status !== 'skipped'
      );

    const activeRound =
      activePerformances.length > 0
        ? Math.min(
            ...activePerformances.map(
              (performance) =>
                performance.round || 1
            )
          )
        : 1;

    const maxQueueOrder =
      allPerformances.length > 0
        ? Math.max(
            ...allPerformances.map(
              (performance) =>
                performance.queue_order || 0
            )
          )
        : 0;

    return {
      activeRound,
      nextQueueOrder:
        maxQueueOrder + 1,
    };
  }

  async function getSingerQueueDetails(
  singerProfileId: string | null,
  deviceId: string
) {
  const { data, error } = await supabase
  .from('performances')
  .select(`
    round,
    queue_order,
    singer_profile_id,
    device_id,
    status
  `)
  .eq('event_id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  const singerPerformances =
    (data || []).filter((performance) => {
      if (
        singerProfileId &&
        performance.singer_profile_id ===
          singerProfileId
      ) {
        return true;
      }

      return Boolean(
        deviceId &&
        performance.device_id === deviceId
      );
    });

  // Completed songs still count toward a singer's
  // rounds. Otherwise, after singing once, that singer
  // can look brand-new and receive another song in the
  // current round. Skipped songs do not reserve a round,
  // but they do preserve the permanent rotation position.
  const roundPerformances =
    singerPerformances.filter(
      (performance) =>
        performance.status !== 'skipped'
    );

  const highestRound =
    roundPerformances.length > 0
      ? Math.max(
          ...roundPerformances.map(
            (performance) =>
              performance.round || 1
          )
        )
      : null;

  const originalOrder =
    singerPerformances.length > 0
      ? Math.min(
          ...singerPerformances.map(
            (performance) =>
              performance.queue_order || 0
          )
        )
      : null;

  return {
    highestRound,
    originalOrder,
  };
}

  async function verifyDeviceSinger() {
    const deviceId = getDeviceId();

    const {
  data: existingSignups,
  error,
} = await supabase
  .from('performances')
  .select(
    `
    id,
    singer_name,
    singer_profile_id,
    device_id,
    status
    `
  )
  .eq('event_id', eventId)
  .eq('device_id', deviceId)
  .order('created_at', {
    ascending: true,
  });

    if (error) {
      throw new Error(error.message);
    }

    const firstSignup =
  existingSignups?.[0] || null;

if (
  firstSignup &&
  firstSignup.singer_name
    .trim()
    .toLowerCase() !==
    singerName.trim().toLowerCase()
) {
  closeSongSheet();

  setMessage(
  `You're already signed up tonight as "${firstSignup.singer_name}". To keep the rotation fair, changing your name won't create a new spot. If you're signing up someone else, please ask the host.`
);

  return false;
}

    return true;
  }

async function claimExistingSinger() {
  if (!claimableSinger) {
    return;
  }

  const deviceId = getDeviceId();

  if (!deviceId) {
    setMessage(
      'Unable to identify this device. Please try again.'
    );
    return;
  }

  setSubmitting(true);
  setMessage('');

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let singerProfileId =
      singerProfile?.id || null;

    if (!singerProfileId && user) {
      const { data: profileRow } =
        await supabase
          .from('singer_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

      singerProfileId =
        profileRow?.id || null;
    }

    const { error } = await supabase
      .from('performances')
      .update({
        device_id: deviceId,
        singer_profile_id:
          singerProfileId,
      })
      .in(
        'id',
        claimableSinger.performanceIds
      );

    if (error) {
      throw error;
    }

    const claimedName =
      claimableSinger.name;

    localStorage.setItem(
      'karavote_singer_name',
      claimedName
    );

    setSingerName(claimedName);
    setSavedSingerName(claimedName);
    setClaimableSinger(null);

    setMessage(
      `Welcome back, ${claimedName}. Your existing spot is now connected to you.`
    );

    await loadQueue();
  } catch (error) {
    console.error(
      'Unable to claim singer spot:',
      error
    );

    setMessage(
      error instanceof Error
        ? error.message
        : 'Unable to claim this singer spot.'
    );
  } finally {
    setSubmitting(false);
  }
}

async function requestSingerRecovery() {
  if (!claimableSinger) return;

  const deviceId = getDeviceId();

  if (!deviceId) {
    setMessage(
      'Unable to identify this browser. Please try again.'
    );
    return;
  }

  setSubmitting(true);
  setMessage('');

  const { data, error } = await supabase
    .from('singer_recovery_requests')
    .insert({
      event_id: eventId,
      requested_name: claimableSinger.name,
      requested_device_id: deviceId,
      singer_profile_id:
        singerProfile?.id || null,
    })
    .select('id, status')
    .single();

  if (error || !data) {
    setMessage(
      error?.message ||
        'Unable to ask the host for access.'
    );
    setSubmitting(false);
    return;
  }

  const request = {
    id: data.id,
    name: claimableSinger.name,
    status: data.status as
      | 'pending'
      | 'approved'
      | 'rejected',
  };

  localStorage.setItem(
    `stagevotes_recovery_${eventId}`,
    request.id
  );

  setRecoveryRequest(request);
  setClaimableSinger(null);
  setSubmitting(false);
}

useEffect(() => {
  const savedRequestId = localStorage.getItem(
    `stagevotes_recovery_${eventId}`
  );

  if (!savedRequestId && !recoveryRequest?.id) {
    return;
  }

  const requestId =
    recoveryRequest?.id || savedRequestId;

  async function checkRecoveryStatus() {
    const { data } = await supabase
      .from('singer_recovery_requests')
      .select('id, requested_name, status')
      .eq('id', requestId)
      .maybeSingle();

    if (!data) return;

    const status = data.status as
      | 'pending'
      | 'approved'
      | 'rejected';

    setRecoveryRequest({
      id: data.id,
      name: data.requested_name,
      status,
    });

    if (status === 'approved') {
      localStorage.setItem(
        'karavote_singer_name',
        data.requested_name
      );
      localStorage.removeItem(
        `stagevotes_recovery_${eventId}`
      );
      setSingerName(data.requested_name);
      setSavedSingerName(data.requested_name);
      setMessage(
        `Welcome back, ${data.requested_name}. The host restored your songs.`
      );
      await loadQueue();
      setRecoveryRequest(null);
    }
  }

  void checkRecoveryStatus();

  const timer = window.setInterval(
    checkRecoveryStatus,
    2500
  );

  return () => window.clearInterval(timer);
}, [eventId, recoveryRequest?.id]);

 async function verifySingerNameAvailable() {
  const cleanName = singerName
    .trim()
    .replace(/\s+/g, ' ');

  const normalizedName =
    cleanName.toLowerCase();

  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('performances')
    .select(
      `
      id,
      singer_name,
      device_id,
      singer_profile_id
      `
    )
    .eq('event_id', eventId)
    .neq('status', 'completed')
    .neq('status', 'skipped');

  if (error) {
    throw new Error(error.message);
  }

  const matchingPerformances =
    (data || []).filter(
      (performance) =>
        performance.singer_name
          ?.trim()
          .replace(/\s+/g, ' ')
          .toLowerCase() ===
        normalizedName
    );

  if (matchingPerformances.length === 0) {
    setClaimableSinger(null);
    return true;
  }

  /*
   * If any matching performance already belongs
   * to this device/profile, this is already us.
   */
  const belongsToSameSinger =
    matchingPerformances.some(
      (performance) =>
        performance.device_id === deviceId ||
        Boolean(
          singerProfile?.id &&
            performance.singer_profile_id ===
              singerProfile.id
        )
    );

  if (belongsToSameSinger) {
    setClaimableSinger(null);
    return true;
  }

  /*
   * A host-created walk-up has no device or
   * singer profile attached. If ALL matching
   * performances are unclaimed, offer to claim
   * the existing singer instead of blocking.
   */
  const claimablePerformances =
    matchingPerformances.filter(
      (performance) =>
        !performance.device_id &&
        !performance.singer_profile_id
    );

  if (
  claimablePerformances.length > 0 &&
  claimablePerformances.length ===
    matchingPerformances.length
) {
  setClaimableSinger({
    name: cleanName,
    performanceIds:
      claimablePerformances.map(
        (performance) =>
          performance.id
      ),
  });

  setMessage('');

  // Close the picker so the singer can see
  // the Claim My Spot prompt.
  closeSongSheet();

  return false;
}

  /*
   * Same name exists, but it already belongs
   * to another identified singer.
   */
  setClaimableSinger({
    name: cleanName,
    performanceIds:
      matchingPerformances.map(
        (performance) => performance.id
      ),
    requiresHostApproval: true,
  });

setMessage('');

closeSongSheet();

return false;
}

  async function addSongToQueue(
    song: SVSongOption
  ) {

    if (!signupsAreOpen) {
  setMessage(
    'Signups are closed for tonight. You can still change or remove songs already in your queue.'
  );

  closeSongSheet();
  return;
}

    if (additionalSongsPaused) {
      setMessage(
        'The host has paused additional songs. Your songs already in the queue are unchanged.'
      );

      closeSongSheet();
      return;
    }
    
    if (hasReachedSongLimit) {
  setMessage(
    `This venue allows up to ${maxQueuedSongsPerSinger} ${
      maxQueuedSongsPerSinger === 1
        ? 'song'
        : 'songs'
    } in the queue at a time.`
  );

  closeSongSheet();
  return;
}

    if (!singerName.trim()) {
      setMessage(
        'Please enter your name before choosing a song.'
      );

      closeSongSheet();
      return;
    }

    const normalizedSmsPhone = smsConsent
      ? normalizeUsPhone(smsPhone)
      : null;

    if (smsConsent && !normalizedSmsPhone) {
      setMessage(
        'Please enter a valid 10-digit U.S. mobile number for text alerts.'
      );
      closeSongSheet();
      return;
    }

        if (
      isDuet &&
      !duetPartnerName.trim()
    ) {
      setPickerError(
        'Please enter your duet partner’s name.'
      );
      return;
    }

    if (!event?.account_id) {
      setMessage(
        'The event is still loading. Please try again.'
      );

      return;
    }

    const deviceAllowed =
      await verifyDeviceSinger();

    if (!deviceAllowed) {
      return;
    }

    const nameAvailable =
  await verifySingerNameAvailable();

if (!nameAvailable) {
  return;
}

   if (submitLockRef.current) {
  return;
}

submitLockRef.current = true;

const submissionId = crypto.randomUUID();

setSubmitting(true);
setMessage('');

try {
      const {
  data: { user },
} = await supabase.auth.getUser();

let singerProfileId =
  singerProfile?.id || null;

if (!singerProfileId && user) {
  const { data: profileRow } =
    await supabase
      .from('singer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

  singerProfileId =
    profileRow?.id || null;
}
     const currentRound =
  await getCurrentRound();

const deviceId = getDeviceId();

const {
  highestRound: singerHighestRound,
  originalOrder: singerOriginalOrder,
} = await getSingerQueueDetails(
  singerProfileId,
  deviceId
);

const assignedRound =
  singerHighestRound === null
    ? currentRound
    : Math.max(
        currentRound,
        singerHighestRound + 1
      );

// A singer owns one permanent rotation position
// for the entire show.
//
// Existing singers keep their original position.
// Brand-new singers are assigned after every
// singer who has already joined the show.

let nextOrder: number;

if (singerOriginalOrder !== null) {
  nextOrder = singerOriginalOrder;
} else {
  const {
    data: eventPerformances,
    error: eventPerformancesError,
  } = await supabase
    .from('performances')
    .select('queue_order')
    .eq('event_id', eventId);

  if (eventPerformancesError) {
    throw new Error(
      eventPerformancesError.message
    );
  }

  const maxSingerOrder =
    (eventPerformances || []).reduce(
      (max, performance) => {
        const order =
          performance.queue_order ?? 0;

        return Math.max(max, order);
      },
      0
    );

  nextOrder = maxSingerOrder + 1;
}

      const { data: createdPerformance, error } = await supabase
        .from('performances')
        .insert({
          event_id: eventId,
          account_id: event.account_id,
          singer_name: singerName.trim(),

                    duet_partner_name:
            isDuet
              ? duetPartnerName.trim()
              : null,

          song_title: song.title.trim(),
          artist: song.artist.trim(),
          performance_note:
            performanceNote.trim() || null,
          karafun_song_id:
  song.karafunSongId ?? null,

karafun_title:
  song.karafunSongId
    ? song.title.trim()
    : null,

karafun_artist:
  song.karafunSongId
    ? song.artist.trim()
    : null,
          queue_order: nextOrder,
round: assignedRound,
device_id: deviceId,
          singer_profile_id:
  singerProfileId,

    submission_id: submissionId,

  selection_source:
    song.selectionSource ||
    (song.note ===
    'StageVotes picked this one for you'
      ? 'surprise_me'
      : 'search'),
        })
        .select('id')
        .single();

     if (error) {
  setPickerError(
    error.message ||
      'We could not add this song. Please try again.'
  );
  return;
}

      let smsEnrollmentFailed = false;

      if (smsConsent && normalizedSmsPhone && createdPerformance?.id) {
        const { error: smsError } = await supabase
          .from('performance_sms_subscriptions')
          .insert({
            performance_id: createdPerformance.id,
            event_id: eventId,
            phone_e164: normalizedSmsPhone,
            consented_at: new Date().toISOString(),
            consent_version: SMS_CONSENT_VERSION,
            consent_source: 'singer_web_form',
          });

        if (smsError) {
          console.error('Unable to save SMS opt-in:', smsError);
          smsEnrollmentFailed = true;
        } else {
          localStorage.setItem(
            `stagevotes_sms_phone_${eventId}`,
            smsPhone
          );
        }
      }

      if (
  event.competition_mode === 'tournament' &&
  event.tournament_event_id &&
  singerProfileId
) {
  const {
    data: tournamentEventData,
    error: tournamentEventError,
  } = await supabase
    .from('tournament_events')
    .select(`
      id,
      tournament_id
    `)
    .eq(
      'id',
      event.tournament_event_id
    )
    .single();

  if (tournamentEventError) {
    console.error(
      'Unable to load tournament event:',
      tournamentEventError
    );
  } else {
    const {
      data: existingTournamentEntry,
      error: tournamentEntryLookupError,
    } = await supabase
      .from('tournament_entries')
      .select('id')
      .eq(
        'tournament_id',
        tournamentEventData.tournament_id
      )
     .eq(
  'singer_profile_id',
  singerProfileId
)
      .maybeSingle();

    if (tournamentEntryLookupError) {
      console.error(
        'Unable to find tournament entry:',
        tournamentEntryLookupError
      );
    } else {
      let tournamentEntryId =
        existingTournamentEntry?.id || null;

      if (!tournamentEntryId) {
        const {
          data: createdTournamentEntry,
          error: createTournamentEntryError,
        } = await supabase
          .from('tournament_entries')
          .insert({
            tournament_id:
              tournamentEventData.tournament_id,
            singer_profile_id:
  singerProfileId,
            status: 'active',
          })
          .select('id')
          .single();

        if (createTournamentEntryError) {
          console.error(
            'Unable to create tournament entry:',
            createTournamentEntryError
          );
        } else {
          tournamentEntryId =
            createdTournamentEntry.id;
        }
      }

      if (tournamentEntryId) {
        const {
          data: existingEventEntry,
          error: eventEntryLookupError,
        } = await supabase
          .from('tournament_event_entries')
          .select('id')
          .eq(
            'tournament_entry_id',
            tournamentEntryId
          )
          .eq(
            'tournament_event_id',
            event.tournament_event_id
          )
          .maybeSingle();

        if (eventEntryLookupError) {
          console.error(
            'Unable to find tournament event entry:',
            eventEntryLookupError
          );
        } else if (!existingEventEntry) {
          const {
            error: createEventEntryError,
          } = await supabase
            .from(
              'tournament_event_entries'
            )
            .insert({
              tournament_entry_id:
                tournamentEntryId,
              tournament_event_id:
                event.tournament_event_id,
              status: 'confirmed',
            });

          if (createEventEntryError) {
            console.error(
              'Unable to create tournament event entry:',
              createEventEntryError
            );
          }
        }
      }
    }
  }
}

      const cleanName =
        singerName.trim();

      localStorage.setItem(
        'karavote_singer_name',
        cleanName
      );

      setSingerName(cleanName);
      setSavedSingerName(cleanName);
      setIsDuet(false);
      setDuetPartnerName('');

      setMessage(
        smsEnrollmentFailed
          ? `"${song.title}" was added, but text alerts could not be enabled. Your browser will still show live queue updates.`
          : myPerformances.length === 0
          ? `You're in! "${song.title}" was added to the queue.`
          : `"${song.title}" was added to your songs tonight.`
      );

      closeSongSheet();
      await loadQueue();
    } catch (error) {
     setPickerError(
  error instanceof Error
    ? error.message
    : 'Unable to add the song.'
);
    } finally {
  setSubmitting(false);
  submitLockRef.current = false;
}
  }

  async function changeQueuedSong(
    performanceId: string,
    song: SVSongOption
  ) {
    setSubmitting(true);
    setMessage('');

    const { error } = await supabase
      .from('performances')
      .update({
  song_title: song.title.trim(),
  artist: song.artist.trim(),
  performance_note:
    performanceNote.trim() || null,

  karafun_song_id:
    song.karafunSongId ?? null,

  karafun_title:
    song.karafunSongId
      ? song.title.trim()
      : null,

  karafun_artist:
    song.karafunSongId
      ? song.artist.trim()
      : null,
})
      .eq('id', performanceId)
      .eq('event_id', eventId);

    if (error) {
  setPickerError(
    error.message ||
      'We could not change your song.'
  );
  setSubmitting(false);
  return;
}

    setMessage(
      `Your song was changed to "${song.title}".`
    );

    closeSongSheet();
    await loadQueue();
    setSubmitting(false);
  }

  async function handleSongSelection(song: any) {
  setDuplicateWarning('');
  setSongConflictWarning('');
  setPickerError('');

  const duplicateCheck =
    await checkDuplicateSong(song.title);

  if (duplicateCheck.blocked) {
    setDuplicateWarning(
      duplicateCheck.warning
    );
    return;
  }

  if (duplicateCheck.warning) {
    setSongConflictWarning(
      duplicateCheck.warning
    );

    setPendingConflictSong(song);
    return;
  }

  await confirmSongSelection(song);
}

async function removeQueuedSong(
  performanceId: string
) {
  const targetPerformance = queue.find(
    (performance) =>
      performance.id === performanceId
  );

  if (!targetPerformance) {
    setMessage(
      'That song is no longer in the queue.'
    );
    return;
  }

  if (
    !performanceBelongsToSinger(
      targetPerformance
    )
  ) {
    setMessage(
      'You can only remove your own songs.'
    );
    return;
  }

  if (
    performanceId ===
    event?.current_performance_id
  ) {
    setMessage(
      'You cannot remove the song you are currently performing.'
    );
    return;
  }

  if (
    !confirm(
      `Remove "${targetPerformance.song_title}" from your songs tonight?`
    )
  ) {
    return;
  }

  setSubmitting(true);
  setMessage('');

  const removedRound =
    targetPerformance.round || 1;

  const targetIdentity =
    getRotationIdentity(
      targetPerformance
    );

  const laterSingerSongs = queue.filter(
    (performance) =>
      performance.id !== performanceId &&
      getRotationIdentity(performance) ===
        targetIdentity &&
      (performance.round || 1) >
        removedRound
  );

  const { error: removeError } =
    await supabase
      .from('performances')
     .update({
  status: 'skipped',
})
      .eq('id', performanceId)
      .eq('event_id', eventId);

  if (removeError) {
    setMessage(
      removeError.message ||
        'We could not remove your song.'
    );
    setSubmitting(false);
    return;
  }

  const roundUpdates = await Promise.all(
    laterSingerSongs.map((performance) =>
      supabase
        .from('performances')
        .update({
          round: Math.max(
            1,
            (performance.round || 1) - 1
          ),
        })
        .eq('id', performance.id)
        .eq('event_id', eventId)
    )
  );

  const roundUpdateError =
    roundUpdates.find(
      (result) => result.error
    )?.error;

  if (roundUpdateError) {
    setMessage(
      `Your song was removed, but we could not update every later round: ${roundUpdateError.message}`
    );
  } else {
    setMessage(
      `"${targetPerformance.song_title}" was removed from your songs tonight.`
    );
  }

  await loadQueue();
  setSubmitting(false);
}

async function confirmSongSelection(song: SVSongOption) {
  setPendingConflictSong(null);
  setSongConflictWarning('');
  setDuplicateWarning('');

  if (editingPerformanceId) {
    await changeQueuedSong(editingPerformanceId, song);
  } else {
    await addSongToQueue(song);
  }
}

async function checkInTournamentSinger() {
  if (
    !isTournament ||
    !tournamentPerformance ||
    !singerProfile?.id
  ) {
    return;
  }

  setSubmitting(true);
  setMessage('');

  const { error } = await supabase
    .from('performances')
    .update({
      checked_in_at:
        new Date().toISOString(),
      checked_in_by: 'singer',
    })
    .eq(
      'id',
      tournamentPerformance.id
    )
    .eq(
      'event_id',
      eventId
    )
    .eq(
      'singer_profile_id',
      singerProfile.id
    );

  if (error) {
    setMessage(
      error.message ||
      'Unable to check in.'
    );

    setSubmitting(false);
    return;
  }

  setMessage('');

  await loadQueue();
  setSubmitting(false);
}

function openCompetitionSong() {
  if (!performanceNeedingSong) {
    return;
  }

  setEditingPerformanceId(
    performanceNeedingSong.id
  );
  setPerformanceNote(
    performanceNeedingSong.performance_note || ''
  );

  setPickerSongs([]);
  setSurpriseSong(null);
  setDuplicateWarning('');
  setPickerError('');
  setMessage('');
  setSongSheetOpen(true);
}

    async function moveMySong(
    performanceIndex: number,
    direction: 'earlier' | 'later'
  ) {
    /*
     * Once a show is running, KaraFun may
     * already have buffered upcoming songs.
     * The host can safely manage live changes.
     */
    if (event?.current_performance_id) {
      setMessage(
        'Song order can only be changed before the show starts. Ask the host if you need help.'
      );
      return;
    }

    const targetIndex =
      direction === 'earlier'
        ? performanceIndex - 1
        : performanceIndex + 1;

    const performance =
      myPerformances[performanceIndex];

    const targetPerformance =
      myPerformances[targetIndex];

    if (
      !performance ||
      !targetPerformance
    ) {
      return;
    }

    setSubmitting(true);
    setMessage('');

    const { error: swapError } =
      await supabase.rpc(
        'swap_singer_performance_rounds',
        {
          p_event_id: eventId,
          p_first_id: performance.id,
          p_second_id:
            targetPerformance.id,
        }
      );

    if (swapError) {
      setMessage(
        swapError.message ||
          'We could not reorder your songs.'
      );

      setSubmitting(false);
      return;
    }

    setMessage(
      direction === 'earlier'
        ? `"${performance.song_title}" was moved earlier.`
        : `"${performance.song_title}" was moved later.`
    );

    await loadQueue();
    setSubmitting(false);
  }

  function openAddSong() {
    setEditingPerformanceId(null);
    setPerformanceNote('');
    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
    setPickerError('');
    setMessage('');
    setSongSheetOpen(true);
  }

  function openChangeSong(
    performanceId: string
  ) {
    setEditingPerformanceId(
      performanceId
    );

    const performance =
      myPerformances.find(
        (item) => item.id === performanceId
      );

    setPerformanceNote(
      performance?.performance_note || ''
    );

    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
    setPickerError('');
    setMessage('');
    setSongSheetOpen(true);
  }

  function closeSongSheet() {
    setSongSheetOpen(false);
    setSmsConsent(false);
    setEditingPerformanceId(null);
    setDuetPartnerName('');
    setPerformanceNote('');
    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
    setPickerError('');
  }

    async function updateSingerNameForTonight() {
    const currentName = (
      savedSingerName ||
      singerName
    ).trim();

    const correctedName = window.prompt(
      'Enter the correct name for tonight:',
      currentName
    )?.trim();

    if (
      !correctedName ||
      correctedName === currentName
    ) {
      return;
    }

    const performanceIds =
      myPerformances.map(
        (performance) => performance.id
      );

    if (performanceIds.length === 0) {
      setMessage(
        'We could not find your songs tonight.'
      );
      return;
    }

    setSubmitting(true);
    setMessage('');

    const { error } = await supabase
      .from('performances')
      .update({
        singer_name: correctedName,
      })
      .in('id', performanceIds)
      .eq('event_id', eventId);

    if (error) {
      setMessage(
        error.message ||
          'We could not update your name.'
      );
      setSubmitting(false);
      return;
    }

    window.localStorage.setItem(
      'karavote_singer_name',
      correctedName
    );

    setSingerName(correctedName);
    setSavedSingerName(correctedName);

    await loadQueue();

    setMessage(
      `Your name has been updated to ${correctedName}.`
    );

    setSubmitting(false);
  }

  const venueName =
    event?.venue_name ||
    event?.venue ||
    event?.name ||
    "Tonight's Karaoke";

  const isGuestEntry =
    !profileLoading &&
    !singerProfile &&
    !hasJoined;

  return (
    <main className="sv-mobile-page">
      {isGuestEntry ? (
        <div className="sv-guest-venue-heading">
          <div className="sv-mobile-kicker">Welcome to StageVotes</div>
          <p>{venueName}</p>
        </div>
      ) : (
        <SVSingerHero
        singerName={
          singerName ||
          (profileLoading
            ? 'Loading...'
            : 'Singer')
        }
        venueName={venueName}
        photoUrl={
          singerProfile?.photo_url || null
        }
        editable={
          !hasJoined &&
          !singerProfile
        }
        status={queueState}
        onNameChange={setSingerName}
        onPhotoClick={() => {
          window.location.href = `/my-stage?event=${eventId}`;
        }}
        />
      )}

            {singerProfile?.id && (
        <button
          type="button"
          onClick={() => {
            window.location.href =
              `/my-stage?event=${eventId}`;
          }}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 9,
            margin: '0 0 18px',
            padding: '14px 18px',
            border:
              '1px solid rgba(56,189,248,.35)',
            borderRadius: 16,
            color: '#7dd3fc',
            background:
              'rgba(14,165,233,.1)',
            fontSize: 15,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          <Trophy size={18} />
          Open My Stage
        </button>
      )}

            {hasJoined && (
        <button
          type="button"
          disabled={submitting}
          onClick={
            updateSingerNameForTonight
          }
          style={{
            width: '100%',
            margin: '0 0 18px',
            padding: '13px 18px',
            border:
              '1px solid rgba(148,163,184,.25)',
            borderRadius: 16,
            color: '#cbd5e1',
            background:
              'rgba(15,23,42,.72)',
            fontSize: 14,
            fontWeight: 800,
            cursor: submitting
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          ✏️ Correct My Name
        </button>
      )}

      {hasJoined && myPosition && (
        <SVQueueStatusCard
          queueState={queueState}
          position={myPosition}
          singerName={
            savedSingerName ||
            singerName ||
            'Singer'
          }
          currentSingerName={
            currentSinger?.singer_name ||
            'Current singer'
          }
          nextSingerName={
            onDeckSinger?.singer_name ||
            'Next singer'
          }
          currentSongTitle={
  currentSinger?.song_title || ''
}

currentArtist={
  currentSinger?.artist || ''
}
          estimatedWaitMinutes={
            estimatedWaitMinutes
          }
        />
      )}

      {!hasJoined && (
        <section className={`sv-mobile-card${isGuestEntry ? ' sv-guest-entry-card' : ''}`}>
          {isGuestEntry && (
            <div className="sv-guest-entry-heading">
              <div className="sv-mobile-kicker">Tonight’s karaoke</div>
              <h1>Get on the list</h1>
              <p>Enter your name, pick a song, and you’re in.</p>
            </div>
          )}
          <div className="sv-singer-name-field">
            <div className="sv-mobile-kicker">
              {isGuestEntry ? 'Step 1 · Your name' : 'Singer Info'}
            </div>

            <label htmlFor="singer-name">
              Your name
            </label>

            <input
  id="singer-name"
  value={singerName}
  onChange={(inputEvent) =>
    setSingerName(
      inputEvent.target.value
    )
  }
  placeholder="Enter your name"
/>

            {singerProfile && (
  <p className="sv-mobile-helper">
    Using your My Stage profile. You can change
    your name for tonight if needed.
  </p>
)}
          </div>

          {isGuestEntry && (
            <div className="sv-guest-entry-action">
              <div className="sv-mobile-kicker">Step 2 · Choose a song</div>
              <button
                type="button"
                className="sv-full-button sv-guest-entry-button"
                onClick={() => {
                  if (!singerName.trim()) {
                    document.getElementById('singer-name')?.focus();
                    return;
                  }
                  openAddSong();
                }}
                disabled={
                  submitting ||
                  !signupsAreOpen ||
                  additionalSongsPaused ||
                  hasReachedSongLimit
                }
              >
                <Plus size={21} />
                {!signupsAreOpen
                  ? 'Signups closed'
                  : additionalSongsPaused
                    ? 'Additional songs paused'
                    : 'Choose a song & join'}
              </button>
              <p>
                {signupsAreOpen
                  ? singerName.trim()
                    ? 'No account needed. Selecting a song adds you to tonight’s queue.'
                    : 'Enter your name above to get started. No account needed.'
                  : 'The host has closed signups for tonight.'}
              </p>
              {message && (
                <p className="sv-mobile-message" role="alert">{message}</p>
              )}
            </div>
          )}

        </section>
 )}

 {claimableSinger && (
 <section
  className="sv-mobile-card"
  style={{
    border: '1px solid rgba(249, 115, 22, 0.55)',
    background:
      'linear-gradient(180deg, rgba(249, 115, 22, 0.12) 0%, rgba(15, 23, 42, 1) 45%)',
    boxShadow:
      '0 0 0 1px rgba(249, 115, 22, 0.08), 0 12px 32px rgba(0, 0, 0, 0.22)',
  }}
>
    <div
  className="sv-mobile-kicker"
  style={{
    color: '#f97316',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}
>
  <span style={{ fontSize: 18 }}>⚠️</span>
  Existing singer found
</div>

    <h3>
  {claimableSinger.name}{' '}is already in tonight&apos;s queue.
</h3>

<p>
  {claimableSinger.requiresHostApproval
    ? 'If this is you, ask the host to reconnect this browser to your existing songs.'
    : 'Did the host already add you? Claim this spot to connect it to your StageVotes profile. If not, please use a unique name.'}
</p>

    <div
      style={{
        display: 'grid',
        gap: 10,
        marginTop: 16,
      }}
    >
      <button
        type="button"
        className="sv-full-button"
        disabled={submitting}
        onClick={
          claimableSinger.requiresHostApproval
            ? requestSingerRecovery
            : claimExistingSinger
        }
      >
        {claimableSinger.requiresHostApproval
          ? 'Ask Host to Restore My Songs'
          : 'Claim My Spot'}
      </button>

      <button
        type="button"
        className="sv-change-song"
        disabled={submitting}
        onClick={() => {
          setClaimableSinger(null);
          setMessage('');
          setSingerName('');
        }}
      >
        No, use another name
      </button>
    </div>
  </section>
)}

{recoveryRequest?.status === 'pending' && (
  <section
    className="sv-mobile-card"
    aria-live="polite"
    style={{
      border: '1px solid rgba(56, 189, 248, 0.45)',
      textAlign: 'center',
    }}
  >
    <div className="sv-mobile-kicker">
      Waiting for host
    </div>

    <h3>Restore {recoveryRequest.name}?</h3>

    <p>
      Your request is on the host dashboard. This page
      will reconnect automatically when they approve it.
    </p>
  </section>
)}

{recoveryRequest?.status === 'rejected' && (
  <section className="sv-mobile-card">
    <div className="sv-mobile-kicker">
      Request not approved
    </div>

    <p>
      Please check the stage name with the host or use a
      different name.
    </p>

    <button
      type="button"
      className="sv-change-song"
      onClick={() => {
        localStorage.removeItem(
          `stagevotes_recovery_${eventId}`
        );
        setRecoveryRequest(null);
        setSingerName('');
      }}
    >
      Try Another Name
    </button>
  </section>
)}

      {(!isGuestEntry || myPerformances.length > 0) && (
      <section className="sv-mobile-card">
        <div className="sv-mobile-card-header">
          <div>
            <div className="sv-mobile-kicker">
  {isTournament
    ? 'Competition Entry'
    : 'My songs tonight'}
</div>

<h2>
  {isTournament
    ? 'Your tournament song'
    : `${myPerformances.length} ${
        myPerformances.length === 1
          ? 'song queued'
          : 'songs queued'
      }`}
</h2>

{isTournament &&
  tournamentPerformance && (
    <div
      className="sv-tournament-checkin"
    >
      {isTournamentReady ? (
        <div className="sv-tournament-ready">
          ✅ Ready to Compete
        </div>
      ) : isCheckedIn ? (
        <div className="sv-tournament-checked-in">
  <div className="sv-tournament-status-badge">
    ✓ CHECKED IN
  </div>

  {!tournamentPerformance
    .song_title
    ?.trim() && (
    <div className="sv-tournament-status-message">
      Choose your competition song to become ready.
    </div>
  )}
</div>
      ) : (
        <div className="sv-tournament-checkin-needed">
          <div>
            <strong>
              You haven't checked in yet
            </strong>

            <span>
              Let the host know you're
              here and ready to compete.
            </span>
          </div>

          <button
            type="button"
            className="sv-full-button"
            onClick={
              checkInTournamentSinger
            }
            disabled={submitting}
          >
            Check In
          </button>
        </div>
      )}
    </div>
  )}

          </div>

          <ListMusic size={22} />
        </div>

        {myPerformances.map(
          (performance, index) => {
            const isCurrent =
              isCurrentSinger &&
              performance.id ===
                currentSinger?.id;

            return (
              <div
                key={performance.id}
                className={
                  isCurrent
                    ? 'sv-song-card active'
                    : 'sv-song-card'
                }
              >
                <div>
                  <div className="sv-song-number">
                    {isCurrent
                      ? 'NOW'
                      : `#${index + 1}`}
                  </div>

                  <div className="sv-song-title">
  {performance.song_title?.trim()
    ? performance.song_title
    : '🏆 Competition Song Needed'}
</div>
                  {performance.artist && (
                    <div className="sv-song-artist">
                      {performance.artist}
                    </div>
                  )}

                  {performance.performance_note && (
                    <div className="sv-singer-performance-note">
                      <span aria-hidden="true">📝</span>
                      <span>
                        {performance.performance_note}
                      </span>
                    </div>
                  )}

                                    {performance
                    .duet_partner_name && (
                    <div
                      style={{
                        marginTop: 6,
                        color: '#7dd3fc',
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      🎤 Duet with{' '}
                      {
                        performance
                          .duet_partner_name
                      }
                    </div>
                  )}

                  <div className="sv-song-status">
                    {isCurrent
                      ? 'Currently Performing'
                      : 'Queued'}
                  </div>
                </div>

                {!isCurrent && (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}
  >

    <button
      type="button"
      className="sv-change-song"
      disabled={
        submitting ||
        index === 0 ||
        myPerformances[index - 1]
          ?.id ===
          event?.current_performance_id
      }
      onClick={() =>
        moveMySong(index, 'earlier')
      }
      title="Move this song earlier"
      style={{
        opacity:
          index === 0 ||
          myPerformances[index - 1]
            ?.id ===
            event?.current_performance_id
            ? 0.4
            : 1,
      }}
    >
      ↑ Earlier
    </button>

    <button
      type="button"
      className="sv-change-song"
      disabled={
        submitting ||
        index ===
          myPerformances.length - 1
      }
      onClick={() =>
        moveMySong(index, 'later')
      }
      title="Move this song later"
      style={{
        opacity:
          index ===
          myPerformances.length - 1
            ? 0.4
            : 1,
      }}
    >
      ↓ Later
    </button>

    <button
      type="button"
      className="sv-change-song"
      disabled={submitting}
      onClick={() => {
        if (
          !performance.song_title?.trim()
        ) {
          setEditingPerformanceId(
            performance.id
          );
          setPerformanceNote(
            performance.performance_note || ''
          );
          setPickerSongs([]);
          setSurpriseSong(null);
          setDuplicateWarning('');
          setMessage('');
          setSongSheetOpen(true);
          return;
        }

        openChangeSong(
          performance.id
        );
      }}
    >
      {performance.song_title?.trim()
        ? 'Change'
        : 'Choose Song'}
    </button>

    {!isTournament && (
      <button
        type="button"
        className="sv-change-song"
        disabled={submitting}
        onClick={() =>
          removeQueuedSong(
            performance.id
          )
        }
        style={{
          color: '#fca5a5',
          borderColor:
            'rgba(239, 68, 68, 0.45)',
          background:
            'rgba(127, 29, 29, 0.2)',
        }}
      >
        Remove
      </button>
    )}
  </div>
)}

              </div>
            );
          }
        )}

        {myPerformances.length === 0 && (
          <div className="sv-empty-song-state">
            <ListMusic size={28} />

            <div>
              <strong>
                Choose your first song
              </strong>

              <p>
                Selecting a song adds you
                directly to tonight’s queue.
              </p>
            </div>
          </div>
        )}

       {(!isGuestEntry && (!isTournament ||
  myPerformances.length === 0)) && (
  <>
    <button
      type="button"
      className="sv-full-button"
      onClick={openAddSong}
      disabled={
        submitting ||
        !signupsAreOpen ||
        additionalSongsPaused ||
        hasReachedSongLimit
      }
      style={{
        opacity:
          !signupsAreOpen ||
          additionalSongsPaused ||
          hasReachedSongLimit
            ? 0.55
            : 1,
        cursor:
          !signupsAreOpen ||
          additionalSongsPaused ||
          hasReachedSongLimit
            ? 'not-allowed'
            : 'pointer',
      }}
    >
      <Plus size={18} />

      {!signupsAreOpen
        ? 'Signups closed'
        : additionalSongsPaused
          ? 'Additional songs paused'
        : hasReachedSongLimit
          ? 'Queue limit reached'
          : myPerformances.length > 0
            ? 'Add another song'
            : 'Choose a song'}
    </button>

    {!signupsAreOpen ? (
      <p
        className="sv-mobile-helper"
        style={{
          marginTop: 10,
          textAlign: 'center',
          color: '#fca5a5',
        }}
      >
        Signups are closed for tonight.
        You can still change or remove songs
        already in your queue.
      </p>
    ) : additionalSongsPaused ? (
      <p
        className="sv-mobile-helper"
        style={{
          marginTop: 10,
          textAlign: 'center',
          color: '#fde68a',
        }}
      >
        The host has paused additional songs
        to keep tonight&apos;s show on schedule.
        Your current songs are still in the queue.
      </p>
    ) : hasReachedSongLimit ? (
      <p
        className="sv-mobile-helper"
        style={{
          marginTop: 10,
          textAlign: 'center',
          color: '#7dd3fc',
        }}
      >
        This venue allows up to{' '}
        {maxQueuedSongsPerSinger}{' '}
        {maxQueuedSongsPerSinger === 1
          ? 'song'
          : 'songs'}{' '}
        in the queue at a time. You can add
        another after one is completed or
        removed.
      </p>
    ) : null}
  </>
)}

        {message && (
          <p className="sv-mobile-message">
            {message}
          </p>
        )}
      </section>
      )}

      {!profileLoading && !singerProfile && (
        <SVSingerProfilePrompt
          onCreateProfile={() => {
            window.location.href =
              `/singer-signup?event=${eventId}`;
          }}
          onSignIn={() => {
            window.location.href =
              `/singer-login?event=${eventId}`;
          }}
        />
      )}

      {hasJoined && (
        <section className="sv-mobile-actions">
          <button
            type="button"
            disabled={!event?.judging_enabled}
            aria-disabled={!event?.judging_enabled}
            title={
              event?.judging_enabled
                ? 'View competition results'
                : 'Leaderboard is available only when judging is enabled'
            }
            style={{
              opacity: event?.judging_enabled
                ? 1
                : 0.45,
              cursor: event?.judging_enabled
                ? 'pointer'
                : 'not-allowed',
            }}
            onClick={() => {
              if (!event?.judging_enabled) {
                return;
              }

              window.location.href =
                `/leaderboard/${eventId}`;
            }}
          >
            <Trophy size={22} />
            {event?.judging_enabled
              ? 'Leaderboard'
              : 'No Judging'}
          </button>

          <button
            type="button"
          onClick={() => {
  console.log("EVENT ID:", eventId);

  const url = `/my-stage?event=${eventId}`;

  console.log("GOING TO:", url);

  window.location.href = url;
}}
          >
            <History size={22} />
            My Stage
          </button>
        </section>
      )}

      <SVTipCard
        tipsEnabled={tipsEnabled}
        venmoUrl={venmoUrl}
        cashappUrl={cashappUrl}
        applePayUrl={applePayUrl}
      />

      <SVBottomSheet
        open={songSheetOpen}
        title={
          editingPerformanceId
            ? 'Change Song'
            : 'Add Song'
        }
        onClose={closeSongSheet}
      >

        <SVSongPicker
          afterSearchContent={!editingPerformanceId && (
            <div className="sv-song-sms-options">
              <div className="sv-mobile-kicker">Optional text alerts</div>
              <h3>Get notified when it&apos;s your turn</h3>
              <p>Get an on-deck text and a text when you&apos;re up for this song.</p>

              <label htmlFor="sms-phone">Mobile number</label>
              <input
                id="sms-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={smsPhone}
                onChange={(inputEvent) => setSmsPhone(inputEvent.target.value)}
                placeholder="(479) 555-0123"
              />

              <label className="sv-song-sms-consent">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(inputEvent) => setSmsConsent(inputEvent.target.checked)}
                />
                <span>
                  Text me when I&apos;m on deck and when it&apos;s my turn. Up to 2 messages per queued
                  song. Message and data rates may apply. Reply STOP to opt out or HELP for help.
                  Consent is optional and is not required to participate.{' '}
                  <a href="/terms" target="_blank" rel="noreferrer">Terms</a>{' · '}
                  <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a>
                </span>
              </label>
            </div>
          )}
          optionsContent={
            <>
{!editingPerformanceId && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              border:
                '1px solid rgba(56,189,248,.22)',
              borderRadius: 14,
              background:
                'rgba(14,165,233,.08)',
            }}
          >
            <label
              htmlFor="is-duet"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#e2e8f0',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <input
                id="is-duet"
                type="checkbox"
                checked={isDuet}
                onChange={(event) => {
                  const checked =
                    event.target.checked;

                  setIsDuet(checked);

                  if (!checked) {
                    setDuetPartnerName('');
                  }
                }}
                style={{
                  width: 22,
                  height: 22,
                  accentColor: '#38bdf8',
                  cursor: 'pointer',
                }}
              />

              <span>
                This is a duet
              </span>
            </label>

            {isDuet && (
              <label
                htmlFor="duet-partner-name"
                style={{
                  display: 'grid',
                  gap: 7,
                  marginTop: 14,
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Duet partner’s name

                <input
                  id="duet-partner-name"
                  value={duetPartnerName}
                  onChange={(event) =>
                    setDuetPartnerName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your partner’s name"
                  autoComplete="off"
                  autoFocus
                />
              </label>
            )}
          </div>
        )}

        <label className="sv-singer-note-field">
          <span>
            Note for the host
            <small>Optional</small>
          </span>

          <textarea
            value={performanceNote}
            onChange={(event) =>
              setPerformanceNote(
                event.target.value.slice(0, 500)
              )
            }
            rows={3}
            maxLength={500}
            placeholder="Example: Please lower the key, +2 semitones, or I sing the second verse"
          />

          <small>
            Add any key, arrangement, duet, or intro instructions the host should know.
          </small>
        </label>
            </>
          }
          songs={pickerSongs}
          onSearch={searchPickerSongs}
          onSurpriseMe={pickSurpriseSong}
          recommendations={aiRecommendations}
          recommendationsLoading={aiRecommendationsLoading}
          recommendationsMessage={aiRecommendationsMessage}
          onGenerateRecommendations={
            singerProfile?.id
              ? generateAIRecommendations
              : undefined
          }
          loading={pickerLoading}
          onSelect={handleSongSelection}
          alertContent={
            pickerError || duplicateWarning || songConflictWarning ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(249, 115, 22, 0.55)',
                  background: 'rgba(249, 115, 22, 0.12)',
                  color: '#fed7aa',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    color: '#f97316',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}
                >
                  ⚠️ {duplicateWarning
                    ? 'Song already selected'
                    : songConflictWarning
                      ? 'Heads up'
                      : 'Something went wrong'}
                </strong>

                <div>
                  {pickerError ||
                    duplicateWarning ||
                    songConflictWarning}
                </div>

                {pendingConflictSong &&
                  songConflictWarning && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginTop: 12,
                      }}
                    >
                      <button
                        type="button"
                        className="sv-secondary-button"
                        onClick={() => {
                          setPendingConflictSong(null);
                          setSongConflictWarning('');
                        }}
                      >
                        Choose Another
                      </button>

                      <button
                        type="button"
                        className="sv-primary-button"
                        onClick={() =>
                          confirmSongSelection(
                            pendingConflictSong
                          )
                        }
                      >
                        Add Anyway
                      </button>
                    </div>
                  )}
              </div>
            ) : null
          }
        />

        {surpriseSong && (
          <div className="sv-surprise-confirm">
            <div className="sv-surprise-confirm-icon">
              🎲
            </div>

            <div className="sv-mobile-kicker">
              StageVotes picked
            </div>

            <h3>{surpriseSong.title}</h3>

            <p>{surpriseSong.artist}</p>

            <div className="sv-surprise-confirm-actions">
              <button
                type="button"
                className="sv-full-button"
                disabled={submitting}
                onClick={() =>
                  handleSongSelection(
                    surpriseSong
                  )
                }
              >
                {editingPerformanceId
                  ? 'Use This Song'
                  : 'Add This Song'}
              </button>

              <button
                type="button"
                className="sv-change-song"
                disabled={
                  pickerLoading ||
                  submitting
                }
                onClick={pickSurpriseSong}
              >
                Try Another
              </button>
            </div>
          </div>
        )}

        </SVBottomSheet>

            {activeAchievementCelebration && (
        <SVFirstPerformanceCelebration
          singerName={
            activeAchievementCelebration
              .singerName
          }
          songTitle={
            activeAchievementCelebration
              .songTitle
          }
          venueName={
            activeAchievementCelebration
              .venueName
          }
          achievementTitle={
            activeAchievementCelebration
              .achievementTitle
          }
          achievementDescription={
            activeAchievementCelebration
              .achievementDescription
          }
          achievementIcon={
            activeAchievementCelebration
              .achievementIcon
          }
          isSecret={
            activeAchievementCelebration
              .isSecret
          }
          earnedCount={
            activeAchievementCelebration
              .earnedCount
          }
          earnedPercentage={
            activeAchievementCelebration
              .earnedPercentage
          }
          earnedBadges={
            activeAchievementCelebration
              .earnedBadges
          }
          totalBadges={
            activeAchievementCelebration
              .totalBadges
          }
          hasProfile={Boolean(
            singerProfile?.id
          )}
          onDismiss={
            dismissAchievementCelebration
          }
          onSave={() => {
            if (singerProfile?.id) {
              window.location.href =
                `/my-stage?event=${eventId}`;

              return;
            }

            window.location.href =
              `/singer-signup?event=${eventId}&claim=first-performance`;
          }}
        />
      )}
    </main>
  );
}
