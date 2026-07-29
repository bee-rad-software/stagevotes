'use client';

import { useEffect, useMemo, useState } from 'react';
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
};

type EventData = {
  id: string;
  account_id?: string | null;
  name?: string | null;
  venue?: string | null;
  venue_name?: string | null;
};

export default function SignupPage() {
  const params = useParams();
  const eventId = params.eventId as string;

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

  const [songSheetOpen, setSongSheetOpen] =
    useState(false);

  const [editingPerformanceId, setEditingPerformanceId] =
    useState<string | null>(null);

  const [pickerSongs, setPickerSongs] =
    useState<SVSongOption[]>([]);

  const [pickerLoading, setPickerLoading] =
    useState(false);

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
          apple_pay_url
          `
        )
        .eq('id', eventData.account_id)
        .single();

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
  }

  async function loadQueue() {
    const { data, error } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)
      .neq('status', 'completed')
      .neq('status', 'skipped')
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

    const queueData = (data || []) as Performance[];

    setQueue(queueData);
    setCurrentSinger(queueData[0] || null);
    setOnDeckSinger(queueData[1] || null);
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
    if (
      singerProfile?.id &&
      performance.singer_profile_id === singerProfile.id
    ) {
      return true;
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

  const myPosition =
    myIndex >= 0 ? myIndex + 1 : null;

  const hasJoined =
    myPerformances.length > 0;

  const isCurrentSinger = Boolean(
    currentSinger &&
      performanceBelongsToSinger(currentSinger)
  );

  const isOnDeckSinger = Boolean(
    onDeckSinger &&
      performanceBelongsToSinger(onDeckSinger)
  );

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
    myPosition && myPosition > 1
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

    if (cleanedSearch.length < 2) {
      setPickerSongs([]);
      setPickerLoading(false);
      return;
    }

    setPickerLoading(true);

    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist')
      .or(
        `title.ilike.%${cleanedSearch}%,artist.ilike.%${cleanedSearch}%`
      )
      .limit(25);

    if (error) {
      console.error(
        'Song search failed:',
        error.message
      );

      setPickerSongs([]);
      setPickerLoading(false);
      return;
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
            song.title.trim().toLowerCase()
          )
            ? 'queued'
            : 'available',
        })
      );

    setPickerSongs(formattedSongs);
    setPickerLoading(false);
  }

  async function pickSurpriseSong() {
    setMessage('');
    setDuplicateWarning('');
    setPickerLoading(true);

    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist')
      .limit(250);

    if (error || !data?.length) {
      console.error(
        'Surprise song search failed:',
        error?.message
      );

      setMessage(
        'We could not find a surprise song. Try again!'
      );

      setPickerLoading(false);
      return;
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
      setMessage(
        'Every song we checked is already queued. Try searching instead.'
      );

      setPickerLoading(false);
      return;
    }

    const randomIndex = Math.floor(
      Math.random() *
        availableSongs.length
    );

    const selectedSong =
      availableSongs[randomIndex];

    setSurpriseSong({
      id: selectedSong.id,
      title: selectedSong.title,
      artist: selectedSong.artist || '',
      status: 'available',
      note: 'StageVotes picked this one for you',
    });

    setPickerLoading(false);
  }

  async function checkDuplicateSong(
    songTitle: string
  ) {
    const { data, error } = await supabase
      .from('performances')
      .select(
        `
        id,
        singer_name,
        song_title
        `
      )
      .eq('event_id', eventId)
      .neq('status', 'completed')
      .neq('status', 'skipped')
      .ilike(
        'song_title',
        songTitle.trim()
      )
      .limit(10);

    if (error) {
      console.error(
        'Duplicate check failed:',
        error.message
      );

      return false;
    }

    const duplicate = (data || []).find(
      (performance) =>
        performance.id !==
        editingPerformanceId
    );

    if (duplicate) {
      setDuplicateWarning(
        `⚠️ "${duplicate.song_title}" is already queued by ${duplicate.singer_name}.`
      );

      return true;
    }

    setDuplicateWarning('');
    return false;
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
      data: existingSignup,
      error,
    } = await supabase
      .from('performances')
      .select('id, singer_name')
      .eq('event_id', eventId)
      .eq('device_id', deviceId)
      .neq('status', 'completed')
      .neq('status', 'skipped')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (
      existingSignup &&
      existingSignup.singer_name
        .trim()
        .toLowerCase() !==
        singerName.trim().toLowerCase()
    ) {
      setMessage(
        'This phone is already signed up under a different name. Ask the host if you need to make a change.'
      );

      return false;
    }

    return true;
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

    setSubmitting(true);
    setMessage('');

    try {
      const {
        activeRound,
        nextQueueOrder,
      } = await getNextQueueDetails();

      const { error } = await supabase
        .from('performances')
        .insert({
          event_id: eventId,
          account_id: event.account_id,
          singer_name: singerName.trim(),
          song_title: song.title.trim(),
          artist: song.artist.trim(),
          queue_order: nextQueueOrder,
          round:
            activeRound +
            myPerformances.length,
          device_id: getDeviceId(),
          singer_profile_id:
            singerProfile?.id || null,
        });

      if (error) {
        setMessage(error.message);
        return;
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
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to add the song.'
      );
    } finally {
      setSubmitting(false);
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
      })
      .eq('id', performanceId)
      .eq('event_id', eventId);

    if (error) {
      setMessage(error.message);
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

  async function handleSongSelection(
    song: SVSongOption
  ) {
    if (song.status === 'queued') {
      return;
    }

    const duplicate =
      await checkDuplicateSong(song.title);

    if (duplicate) {
      return;
    }

    if (editingPerformanceId) {
      await changeQueuedSong(
        editingPerformanceId,
        song
      );

      return;
    }

    await addSongToQueue(song);
  }

  function openAddSong() {
    setEditingPerformanceId(null);
    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
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
    setMessage('');
    setSongSheetOpen(true);
  }

  function closeSongSheet() {
    setSongSheetOpen(false);
    setEditingPerformanceId(null);
    setPickerSongs([]);
    setSurpriseSong(null);
    setDuplicateWarning('');
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

      {hasJoined && myPosition && (
        <SVQueueStatusCard
          queueState={queueState}
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
              disabled={
                Boolean(singerProfile)
              }
            />

            {singerProfile && (
              <p className="sv-mobile-helper">
                Using your My Stage profile
              </p>
            )}
          </div>
        </section>
      )}

      <section className="sv-mobile-card">
        <div className="sv-mobile-card-header">
          <div>
            <div className="sv-mobile-kicker">
              My songs tonight
            </div>

            <h2>
              {myPerformances.length}{' '}
              {myPerformances.length === 1
                ? 'song queued'
                : 'songs queued'}
            </h2>
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
                    {performance.song_title}
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
                    onClick={() =>
                      openChangeSong(
                        performance.id
                      )
                    }
                  >
                    Change
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
      </SVBottomSheet>
    </main>
  );
}