'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import SVQueueStatusCard from '@/components/singer/SVQueueStatusCard';
import SVTipCard from '@/components/singer/SVTipCard';
import SVLogoHeader from '@/components/singer/SVLogoHeader';
import SVSongEditor from '@/components/singer/SVSongEditor';
import SVSingerHero from '@/components/singer/SVSingerHero';
import SVSongsCard from '@/components/singer/SVSongsCard';
import SVBottomSheet from '@/components/ui/SVBottomSheet';
import SVSongPicker, {
  SVSongOption,
} from '@/components/singer/SVSongPicker';
import SVJoinCard from '@/components/singer/SVJoinCard';
import SVSingerActions from '@/components/singer/SVSingerActions';

type SongEntry = {
  songTitle: string;
  artist: string;
};

export default function SingerPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<any>(null);

  const [singerName, setSingerName] = useState('');
const [songs, setSongs] = useState<SongEntry[]>([]);  
  const [message, setMessage] = useState('');
  const [queue, setQueue] = useState<any[]>([]);
  const [savedSingerName, setSavedSingerName] = useState('');
  const [currentSinger, setCurrentSinger] = useState<any>(null);
const [onDeckSinger, setOnDeckSinger] = useState<any>(null);
  const [songSuggestions, setSongSuggestions] = useState<any[]>([]);
const [activeSongIndex, setActiveSongIndex] = useState<number | null>(null);
  const [artistSuggestions, setArtistSuggestions] = useState<any[]>([]);
 const [duplicateWarning, setDuplicateWarning] = useState('');
  const [notificationPermission, setNotificationPermission] =
  useState<NotificationPermission | null>(null);
  const [notifiedOnDeck, setNotifiedOnDeck] = useState(false);
const [notifiedCurrent, setNotifiedCurrent] = useState(false);
  const [venmoUrl, setVenmoUrl] = useState('');
const [cashappUrl, setCashappUrl] = useState('');
const [applePayUrl, setApplePayUrl] = useState('');
const [tipsEnabled, setTipsEnabled] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [songSheetOpen, setSongSheetOpen] = useState(false);
const [editingPerformanceId, setEditingPerformanceId] =
  useState<string | null>(null);
const [pickerSongs, setPickerSongs] = useState<SVSongOption[]>([]);
const [pickerLoading, setPickerLoading] = useState(false);

async function loadEvent() {
  const { data, error } = await supabase
    .from('events')
    .select('id, account_id')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error(error.message);
    return;
  }

  setEvent(data);

  if (data?.account_id) {
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('tips_enabled, venmo_url, cashapp_url, apple_pay_url, logo_url')
      .eq('id', data.account_id)
      .single();

    if (accountError) {
      console.error(accountError.message);
      return;
    }

    setTipsEnabled(accountData?.tips_enabled || false);
    setVenmoUrl(accountData?.venmo_url || '');
    setCashappUrl(accountData?.cashapp_url || '');
    setApplePayUrl(accountData?.apple_pay_url || '');
    setLogoUrl(accountData?.logo_url || '');
  }
}
  
useEffect(() => {
  const savedName = localStorage.getItem('karavote_singer_name');

 if (savedName) {
  setSingerName(savedName);
  setSavedSingerName(savedName);
}
  loadEvent();
  loadQueue();

if ('Notification' in window) {
  setNotificationPermission(Notification.permission);

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
    });
  }
}
  
  const channel = supabase
    .channel(`signup-${eventId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'performances', filter: `event_id=eq.${eventId}` },
      loadQueue
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [eventId]);

 const isCurrentSinger =
  currentSinger &&
  savedSingerName &&
  currentSinger.singer_name.trim().toLowerCase() ===
    savedSingerName.trim().toLowerCase();

const isOnDeckSinger =
  onDeckSinger &&
  savedSingerName &&
  onDeckSinger.singer_name.trim().toLowerCase() ===
    savedSingerName.trim().toLowerCase();
  
useEffect(() => {
  if (notificationPermission !== 'granted') return;

  if (isOnDeckSinger && !notifiedOnDeck) {
    new Notification('🎤 StageVotes', {
      body: "You're on deck! Get ready to sing."
    });

    setNotifiedOnDeck(true);
  }

  if (isCurrentSinger && !notifiedCurrent) {
    new Notification('🎤 StageVotes', {
      body: "You're up now! Head to the stage."
    });

    setNotifiedCurrent(true);
  }
}, [
  isOnDeckSinger,
  isCurrentSinger,
  notificationPermission,
  notifiedOnDeck,
  notifiedCurrent
]);
  
 function getDeviceId() {
  if (typeof window === 'undefined') return '';

  let id = window.localStorage.getItem('karavote_device_id');

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('karavote_device_id', id);
  }

  return id;
}
  
  function updateSong(index: number, field: keyof SongEntry, value: string) {
    const updated = [...songs];
    updated[index][field] = value;
    setSongs(updated);
  }

  function addSongField() {
    setSongs([...songs, { songTitle: '', artist: '' }]);
  }

  function removeSongField(index: number) {
    if (songs.length === 1) return;
    setSongs(songs.filter((_, i) => i !== index));
  }

async function loadQueue() {
  const [{ data: queueData, error: queueError }, { data: eventData, error: eventError }] =
    await Promise.all([
      supabase
        .from('performances')
        .select('*')
        .eq('event_id', eventId)
        .neq('status', 'completed')
        .neq('status', 'skipped')
        .order('queue_order', { ascending: true }),

      supabase
        .from('events')
        .select('current_performance_id')
        .eq('id', eventId)
        .single(),
    ]);

  if (queueError) {
    console.error(queueError.message);
    return;
  }

  if (eventError) {
    console.error(eventError.message);
  }

  const activeQueue = queueData || [];
  const currentPerformanceId = eventData?.current_performance_id || null;

  const actualCurrentSinger = currentPerformanceId
    ? activeQueue.find(
        (performance) => performance.id === currentPerformanceId
      ) || null
    : null;

  const waitingQueue = activeQueue.filter(
    (performance) => performance.id !== currentPerformanceId
  );

  setQueue(activeQueue);
  setCurrentSinger(actualCurrentSinger);
  setOnDeckSinger(waitingQueue[0] || null);
}

 async function searchSongs(searchText: string, songIndex: number) {
  if (searchText.length < 2) {
    setSongSuggestions([]);
    return;
  }
  const { data } = await supabase
    .from('songs')
    .select('id,title,artist')
    .or(
      `title.ilike.%${searchText}%,artist.ilike.%${searchText}%`
    )
    .limit(10);

  setSongSuggestions(data || []);
  setActiveSongIndex(songIndex);
}

const searchPickerSongs = useCallback(
  async (searchText: string) => {
    const term = searchText.trim();

    if (term.length < 2) {
      setPickerSongs((current) =>
        current.length === 0 ? current : []
      );
      setPickerLoading(false);
      return;
    }

    setPickerLoading(true);

    const { data, error } = await supabase
      .from('songs')
      .select('id,title,artist')
      .or(`title.ilike.%${term}%,artist.ilike.%${term}%`)
      .limit(20);

    if (error) {
      console.error('Song search failed:', error);
      setPickerSongs([]);
      setPickerLoading(false);
      return;
    }

    const results: SVSongOption[] = (data || []).map((result) => {
      const alreadyQueued = songs.some(
        (queuedSong) =>
          queuedSong.songTitle.trim().toLowerCase() ===
          result.title.trim().toLowerCase()
      );

      return {
        title: result.title,
        artist: result.artist || '',
        status: alreadyQueued ? 'queued' : 'available',
      };
    });

    setPickerSongs(results);
    setPickerLoading(false);
  },
  [songs]
);

async function searchArtists(searchText: string) {
  if (searchText.length < 2) {
    setArtistSuggestions([]);
    return;
  }

  const { data } = await supabase
    .from('songs')
    .select('artist')
    .ilike('artist', `%${searchText}%`)
    .limit(10);

  const uniqueArtists = [
    ...new Map(
      (data || []).map(item => [item.artist, item])
    ).values()
  ];

  setArtistSuggestions(uniqueArtists);
}

async function checkDuplicateSong(songTitle: string) {
  if (songTitle.trim().length < 3) {
    setDuplicateWarning('');
    return;
  }

  const { data } = await supabase
    .from('performances')
    .select('singer_name, song_title')
    .eq('event_id', eventId)
    .neq('status', 'completed')
    .ilike('song_title', songTitle.trim())
    .limit(1);

  if (data && data.length > 0) {
    setDuplicateWarning(
      `⚠️ "${data[0].song_title}" is already queued by ${data[0].singer_name}.`
    );
  } else {
    setDuplicateWarning('');
  }
}
  
async function addSelectedSongToRotation(selected: SVSongOption) {
  const cleanName = singerName.trim();

  if (!cleanName) {
    setMessage('Enter your name before choosing a song.');
    return false;
  }

  setPickerLoading(true);
  setMessage('');

  const deviceId = getDeviceId();

  const { data: existingPerformances, error: loadError } = await supabase
    .from('performances')
    .select('id, singer_name, queue_order, round, status')
    .eq('event_id', eventId);

  if (loadError) {
    console.error(loadError.message);
    setMessage('We could not add your song. Please try again.');
    setPickerLoading(false);
    return false;
  }

  const activePerformances =
    existingPerformances?.filter(
      (performance) =>
        performance.status !== 'completed' &&
        performance.status !== 'skipped'
    ) || [];

  const singerPerformances = activePerformances.filter(
    (performance) =>
      performance.singer_name.trim().toLowerCase() ===
      cleanName.toLowerCase()
  );

  const maxQueueOrder =
    existingPerformances && existingPerformances.length > 0
      ? Math.max(
          ...existingPerformances.map(
            (performance) => performance.queue_order || 0
          )
        )
      : 0;

  const activeRound =
    activePerformances.length > 0
      ? Math.min(
          ...activePerformances.map(
            (performance) => performance.round || 1
          )
        )
      : 1;

  const nextRound = activeRound + singerPerformances.length;

  const { error: insertError } = await supabase
    .from('performances')
    .insert({
      event_id: eventId,
      account_id: event?.account_id,
      singer_name: cleanName,
      song_title: selected.title.trim(),
      artist: selected.artist.trim(),
      queue_order: maxQueueOrder + 1,
      round: nextRound,
      device_id: deviceId,
    });

  if (insertError) {
    console.error(insertError.message);
    setMessage(insertError.message);
    setPickerLoading(false);
    return false;
  }

  localStorage.setItem('karavote_singer_name', cleanName);
  setSavedSingerName(cleanName);

  setNotifiedOnDeck(false);
  setNotifiedCurrent(false);

  await loadQueue();

  setPickerLoading(false);
  setMessage(
    `“${selected.title}” was added to tonight’s rotation!`
  );

  return true;
}

  async function submitSignup() {
    setMessage('');

    const validSongs = songs.filter((song) => song.songTitle.trim());

    if (!singerName.trim() || validSongs.length === 0) {
      setMessage('Please enter your name and at least one song.');
      return;
    }

localStorage.setItem(
  'karavote_singer_name',
  singerName.trim()
);

setSavedSingerName(singerName.trim());

setNotifiedOnDeck(false);
setNotifiedCurrent(false);
    
    const deviceId = getDeviceId();

const { data: existingSignup } = await supabase
  .from('performances')
  .select('id, singer_name')
  .eq('event_id', eventId)
  .eq('device_id', deviceId)
  .neq('status', 'completed')
  .maybeSingle();

if (
  existingSignup &&
  existingSignup.singer_name.toLowerCase().trim() !== singerName.toLowerCase().trim()
) {
  setMessage('This phone is already signed up under a different name. Ask the host if you need to make a change.');
  return;
}
const { data: existing } = await supabase
  .from('performances')
  .select('*')
  .eq('event_id', eventId);

const activePerformances =
  existing?.filter(
    (p: any) =>
      p.status !== 'completed' &&
      p.status !== 'skipped'
  ) || [];

const activeRound =
  activePerformances.length > 0
    ? Math.min(
        ...activePerformances.map((p: any) => p.round || 1)
      )
    : 1;

const maxQueueOrder =
  existing && existing.length > 0
    ? Math.max(
        ...existing.map((p: any) => p.queue_order || 0)
      )
    : 0;

const startingOrder = maxQueueOrder + 1;
    
const rows = validSongs.map((song, index) => ({
  event_id: eventId,
   account_id: event?.account_id,
  singer_name: singerName.trim(),
  song_title: song.songTitle.trim(),
  artist: song.artist.trim(),
  queue_order: startingOrder + index,
  round: activeRound + index,
  device_id: deviceId
}));
    
    const { error } = await supabase.from('performances').insert(rows);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSingerName(singerName.trim());
setSongs([]); 
setMessage('You are signed up! Get ready to sing.');
await loadQueue();
  }

const myIndex = queue.findIndex(
  (p) =>
    savedSingerName &&
    p.singer_name.trim().toLowerCase() === savedSingerName.trim().toLowerCase()
);
  
const myPosition = myIndex >= 0 ? myIndex + 1 : null;
  const averageMinutesPerSong = 4;
const estimatedWaitMinutes =
  myPosition && myPosition > 1
    ? (myPosition - 1) * averageMinutesPerSong
    : 0;
const twoAway = queue[2];

const queueState =
  isCurrentSinger
    ? 'performing'
    : isOnDeckSinger
    ? 'next'
    : myPosition === 3
    ? 'soon'
    : 'waiting';

   const hasJoined = myIndex >= 0;

   const singerKey = (savedSingerName || singerName)
  .trim()
  .toLowerCase();

const myPerformances = queue.filter(
  (performance) =>
    singerKey &&
    performance.singer_name?.trim().toLowerCase() === singerKey
);

const mySavedSongs: SongEntry[] = myPerformances.map(
  (performance) => ({
    songTitle: performance.song_title || '',
    artist: performance.artist || '',
  })
);

   const joinedSongs: SongEntry[] = queue
  .filter(
    (performance) =>
      savedSingerName &&
      performance.singer_name.trim().toLowerCase() ===
        savedSingerName.trim().toLowerCase()
  )
  .map((performance) => ({
    songTitle: performance.song_title || '',
    artist: performance.artist || '',
  }));

    return (
  <main className="sv-mobile-page">
   <SVSingerHero
  singerName={singerName}
  venueName={event?.venue_name || event?.name || "Tonight's Karaoke"}
  editable={!hasJoined}
  status={queueState}
  onNameChange={setSingerName}
  onPhotoClick={() => {
    // We'll hook this up to uploads next.
  }}
/>

{hasJoined && myPosition && (
  <SVQueueStatusCard
    queueState={queueState}
    singerName={savedSingerName || singerName || 'Singer'}
    currentSingerName={currentSinger?.singer_name || 'Current singer'}
    nextSingerName={onDeckSinger?.singer_name || 'Next singer'}
    estimatedWaitMinutes={estimatedWaitMinutes}
  />
)}

{hasJoined ? (
<SVSongsCard
  songs={mySavedSongs}
  singerName={savedSingerName || singerName}
  isCurrentSinger={isCurrentSinger}
  onAddSong={() => {
    setEditingPerformanceId(null);
    setSongSheetOpen(true);
  }}
  onSubmit={() => {}}
  onChangeSong={(index) => {
    const performance = myPerformances[index];

    if (!performance) return;

    setEditingPerformanceId(performance.id);
    setSongSheetOpen(true);
  }}
  message={message}
/>
) : (
  <SVJoinCard
    singerName={singerName}
    songCount={songs.filter((song) => song.songTitle.trim()).length}
    message={message}
    onAddSong={() => {
      setEditingPerformanceId(null);
      setSongSheetOpen(true);
    }}
    onJoin={submitSignup}
  />
)}

{hasJoined && (
  <SVSingerActions
    notificationsEnabled={notificationPermission === 'granted'}
    onNotify={() => {
      if (!('Notification' in window)) {
        setMessage('Notifications are not supported on this device.');
        return;
      }

      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);

        if (permission === 'granted') {
          setMessage('Notifications are turned on!');
        }
      });
    }}
    onVote={() => {
      window.location.href = `/vote/${eventId}`;
    }}
    onLeaderboard={() => {
      window.location.href = `/leaderboard/${eventId}`;
    }}
    onHistory={() => {
      window.location.href = `/singer-history/${eventId}`;
    }}
  />
)}

   <SVTipCard
      tipsEnabled={tipsEnabled}
      venmoUrl={venmoUrl}
      cashappUrl={cashappUrl}
      applePayUrl={applePayUrl}
    />

<SVBottomSheet
  open={songSheetOpen}
title={editingPerformanceId === null ? 'Add Song' : 'Change Song'}
  onClose={() => {
    setSongSheetOpen(false);
    setEditingPerformanceId(null);
  }}
>
<SVSongPicker
  songs={pickerSongs}
  onSearch={searchPickerSongs}
  loading={pickerLoading}
  onSurpriseMe={async () => {
  setPickerLoading(true);

  const { data, error } = await supabase
    .from('songs')
    .select('id,title,artist')
    .limit(100);

  if (error || !data?.length) {
    console.error('Surprise song search failed:', error);
    setMessage('We could not find a surprise song. Try again!');
    setPickerLoading(false);
    return;
  }

  const availableSongs = data.filter((result) => {
    const alreadyQueued = songs.some(
      (queuedSong) =>
        queuedSong.songTitle.trim().toLowerCase() ===
        result.title.trim().toLowerCase()
    );

    return !alreadyQueued;
  });

  if (availableSongs.length === 0) {
    setMessage('No available surprise songs were found.');
    setPickerLoading(false);
    return;
  }

  const randomSong =
    availableSongs[
      Math.floor(Math.random() * availableSongs.length)
    ];

 const selectedSong: SVSongOption = {
  title: randomSong.title,
  artist: randomSong.artist || '',
  status: 'available',
};

if (editingPerformanceId !== null) {
  const { error: updateError } = await supabase
    .from('performances')
    .update({
      song_title: selectedSong.title,
      artist: selectedSong.artist,
    })
    .eq('id', editingPerformanceId);

  if (updateError) {
    console.error(updateError.message);
    setMessage('We could not change that song. Please try again.');
    setPickerLoading(false);
    return;
  }

  await loadQueue();
  setMessage(`Changed your song to “${selectedSong.title}”.`);
} else {
  const added = await addSelectedSongToRotation(selectedSong);

  if (!added) {
    setPickerLoading(false);
    return;
  }
}

setPickerLoading(false);
setSongSheetOpen(false);
setEditingPerformanceId(null);

}}

onSelect={async (selected) => {
  if (editingPerformanceId !== null) {
    const { error: updateError } = await supabase
      .from('performances')
      .update({
        song_title: selected.title,
        artist: selected.artist,
      })
      .eq('id', editingPerformanceId);

    if (updateError) {
      console.error(updateError.message);
      setMessage('We could not change that song. Please try again.');
      return;
    }

    await loadQueue();
    setMessage(`Changed your song to “${selected.title}”.`);
  } else {
    const added = await addSelectedSongToRotation(selected);

    if (!added) return;
  }

  setPickerSongs([]);
  setSongSheetOpen(false);
  setEditingPerformanceId(null);
}}
  />
</SVBottomSheet>

  </main>
);
}