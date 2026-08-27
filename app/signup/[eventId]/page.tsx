'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams } from 'next/navigation';
import {
  Bell,
  History,
  ListMusic,
  Plus,
  Trophy,
  Vote,
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
import {
  buildRotationQueue,
} from '@/lib/rotationQueue';

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
};

const CURRENT_SHOW_KEY =
  'stagevotes_current_event_id';

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

  const [singerProfile, setSingerProfile] =
    useState<SingerProfile | null>(null);

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

  const [
  karafunChannel,
  setKarafunChannel,
] = useState('');

  const [surpriseSong, setSurpriseSong] =
    useState<SVSongOption | null>(null);

  const [duplicateWarning, setDuplicateWarning] =
    useState('');

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);

  const [notifiedOnDeck, setNotifiedOnDeck] =
    useState(false);

  const [notifiedCurrent, setNotifiedCurrent] =
    useState(false);

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
} | null>(null);

  const [tipsEnabled, setTipsEnabled] =
    useState(false);

  const [venmoUrl, setVenmoUrl] = useState('');
  const [cashappUrl, setCashappUrl] = useState('');
  const [applePayUrl, setApplePayUrl] = useState('');

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
  karafun_channel
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

  useEffect(() => {
    const savedName = localStorage.getItem(
      'karavote_singer_name'
    );

    if (savedName) {
      setSingerName(savedName);
      setSavedSingerName(savedName);
    }

    loadEvent();
    loadQueue();
    loadSingerProfile();

    if ('Notification' in window) {
      setNotificationPermission(
        Notification.permission
      );
    }

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
    () => {
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
    () => {
      loadEvent();
      loadQueue();
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

  useEffect(() => {
    if (
      notificationPermission !== 'granted'
    ) {
      return;
    }

    if (
      isOnDeckSinger &&
      !notifiedOnDeck
    ) {
      new Notification('🎤 StageVotes', {
        body: "You're on deck! Get ready to sing.",
      });

      setNotifiedOnDeck(true);
    }

    if (
      isCurrentSinger &&
      !notifiedCurrent
    ) {
      new Notification('🎤 StageVotes', {
        body: "You're up now! Head to the stage.",
      });

      setNotifiedCurrent(true);
    }
  }, [
    isOnDeckSinger,
    isCurrentSinger,
    notificationPermission,
    notifiedOnDeck,
    notifiedCurrent,
  ]);

  async function requestNotifications() {
    if (!('Notification' in window)) {
      setMessage(
        'Notifications are not supported on this device.'
      );

      return;
    }

    const permission =
      await Notification.requestPermission();

    setNotificationPermission(permission);

    if (permission === 'granted') {
      setMessage(
        'Notifications are on. We will let you know when you are up!'
      );
    } else {
      setMessage(
        'Notifications were not enabled. You can still follow your position here.'
      );
    }
  }

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
  setClaimableSinger(null);

setMessage(
  `"${cleanName}" is already signed up for this show. Please use another name or claim the existing singer if it belongs to you.`
);

closeSongSheet();

return false;
}

  async function addSongToQueue(
    song: SVSongOption
  ) {

    if (!singerName.trim()) {
      setMessage(
        'Please enter your name before choosing a song.'
      );

      closeSongSheet();
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
     const {
  nextQueueOrder,
} = await getNextQueueDetails();

const currentRound =
  await getCurrentRound();

const singerHighestRound =
  myPerformances.length > 0
    ? Math.max(
        ...myPerformances.map(
          (performance) =>
            performance.round || 1
        )
      )
    : null;

const singerOriginalOrder =
  myPerformances.length > 0
    ? Math.min(
        ...myPerformances.map(
          (performance) =>
            performance.queue_order || 0
        )
      )
    : null;

const assignedRound =
  singerHighestRound === null
    ? currentRound
    : Math.max(
        currentRound,
        singerHighestRound + 1
      );

      const { error } = await supabase
        .from('performances')
        .insert({
          event_id: eventId,
          account_id: event.account_id,
          singer_name: singerName.trim(),
          song_title: song.title.trim(),
          artist: song.artist.trim(),
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
          queue_order:
  singerOriginalOrder !== null
    ? singerOriginalOrder
    : nextQueueOrder,

round: assignedRound,
device_id: getDeviceId(),
          singer_profile_id:
  singerProfileId,

  submission_id: submissionId,
        });

     if (error) {
  setPickerError(
    error.message ||
      'We could not add this song. Please try again.'
  );
  return;
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
      setNotifiedOnDeck(false);
      setNotifiedCurrent(false);

      setMessage(
        myPerformances.length === 0
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

  setPickerSongs([]);
  setSurpriseSong(null);
  setDuplicateWarning('');
  setPickerError('');
  setMessage('');
  setSongSheetOpen(true);
}

  function openAddSong() {
    setEditingPerformanceId(null);
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

    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
    setPickerError('');
    setMessage('');
    setSongSheetOpen(true);
  }

  function closeSongSheet() {
    setSongSheetOpen(false);
    setEditingPerformanceId(null);
    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
    setPickerError('');
  }

  const venueName =
    event?.venue_name ||
    event?.venue ||
    event?.name ||
    "Tonight's Karaoke";

  return (
    <main className="sv-mobile-page">
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
        <section className="sv-mobile-card">
          <div className="sv-singer-name-field">
            <div className="sv-mobile-kicker">
              Singer Info
            </div>

            <label htmlFor="singer-name">
              Your Name
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
  Did the host already add you? Claim this spot to connect
  it to your StageVotes profile. If not, please use a unique name.
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
        onClick={claimExistingSinger}
      >
        Claim My Spot
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

                  <div className="sv-song-status">
                    {isCurrent
                      ? 'Currently Performing'
                      : 'Queued'}
                  </div>
                </div>

                {!isCurrent && (
                  <button
  type="button"
  className="sv-change-song"
  onClick={() => {
    if (
      !performance.song_title?.trim()
    ) {
      setEditingPerformanceId(
        performance.id
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

        {(!isTournament ||
  myPerformances.length === 0) && (
  <button
    type="button"
    className="sv-full-button"
    onClick={openAddSong}
    disabled={submitting}
  >
    <Plus size={18} />

    {myPerformances.length > 0
      ? 'Add another song'
      : 'Choose a song'}
  </button>
)}

        {message && (
          <p className="sv-mobile-message">
            {message}
          </p>
        )}
      </section>

      {hasJoined && (
        <section className="sv-mobile-actions">
          <button
            type="button"
            onClick={requestNotifications}
          >
            <Bell size={22} />

            {notificationPermission ===
            'granted'
              ? 'Notifications On'
              : 'Notify Me'}
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                `/vote/${eventId}`;
            }}
          >
            <Vote size={22} />
            Vote
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                `/leaderboard/${eventId}`;
            }}
          >
            <Trophy size={22} />
            Leaderboard
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
       
               {pickerError && (
  <div
    style={{
      marginTop: 12,
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
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
      }}
    >
      <span aria-hidden="true">⚠️</span>

      <div>
        <div
          style={{
            color: '#f97316',
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 3,
          }}
        >
          Something went wrong
        </div>

        {pickerError}
      </div>
    </div>
  </div>
)}
       
        <SVSongPicker
          songs={pickerSongs}
          onSearch={searchPickerSongs}
          onSurpriseMe={pickSurpriseSong}
          loading={pickerLoading}
          onSelect={handleSongSelection}
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

        {duplicateWarning && (
          <p className="sv-duplicate-warning">
            {duplicateWarning}
          </p>
        )}

        {songConflictWarning &&
  !duplicateWarning && (
    <div className="sv-song-conflict-warning">
      <strong>Heads up</strong>

      <p>{songConflictWarning}</p>

      <span>
        You can still choose this song if
        you want.
      </span>
    </div>
  )}

{pendingConflictSong &&
  songConflictWarning && (
    <div className="sv-song-conflict-confirm">
      <div className="sv-song-conflict-icon">
        ⚠️
      </div>

      <div>
        <strong>Song already used tonight</strong>

        <p>{songConflictWarning}</p>

        <span>
          You can still add it, but choosing
          another song will keep the show
          more varied.
        </span>
      </div>

      <div className="sv-song-conflict-actions">
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
    </div>
  )}

      </SVBottomSheet>
    </main>
  );
}