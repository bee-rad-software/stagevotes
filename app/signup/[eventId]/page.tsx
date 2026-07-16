'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import SVQueueStatusCard from '@/components/singer/SVQueueStatusCard';
import SVTipCard from '@/components/singer/SVTipCard';
import SVLogoHeader from '@/components/singer/SVLogoHeader';
import SVSongEditor from '@/components/singer/SVSongEditor';
import SVSingerHero from '@/components/singer/SVSingerHero';

type SongEntry = {
  songTitle: string;
  artist: string;
};

export default function SignupPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<any>(null);

  const [singerName, setSingerName] = useState('');
  const [songs, setSongs] = useState<SongEntry[]>([
    { songTitle: '', artist: '' }
  ]);
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
  const { data, error } = await supabase
    .from('performances')
    .select('*')
    .eq('event_id', eventId)
    .neq('status', 'completed')
    .neq('status', 'skipped')
    .order('queue_order', { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  setQueue(data || []);
  const queueData = data || [];

setCurrentSinger(queueData[0] || null);
setOnDeckSinger(queueData[1] || null);
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
setSongs([{ songTitle: '', artist: '' }]);
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

    const hasJoined = Boolean(savedSingerName && myPosition);

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

    {myPosition && (
      <SVQueueStatusCard
        queueState={queueState}
        singerName={savedSingerName || singerName || 'Singer'}
        currentSingerName={currentSinger?.singer_name || 'Current singer'}
        nextSingerName={onDeckSinger?.singer_name || 'Next singer'}
        estimatedWaitMinutes={estimatedWaitMinutes}
      />
    )}

    <SVTipCard
      tipsEnabled={tipsEnabled}
      venmoUrl={venmoUrl}
      cashappUrl={cashappUrl}
      applePayUrl={applePayUrl}
    />

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
      onChange={(e) => setSingerName(e.target.value)}
      placeholder="Enter your name"
    />
  </div>

  <div className="sv-mobile-card-header">

           <div>
          <div className="sv-mobile-kicker">My songs tonight</div>
          <h2>{songs.length} songs queued</h2>
        </div>
      </div>

  {songs.map((song, index) => {
    const isCurrent = isCurrentSinger && index === 0;

   return (
      <div
        key={index}
        className={isCurrent ? 'sv-song-card active' : 'sv-song-card'}
      >
        <div>
          <div className="sv-song-number">
            {isCurrent ? 'NOW' : `#${index + 1}`}
          </div>

          <div className="sv-song-title">
            {song.songTitle || 'Choose a song'}
          </div>

          <div className="sv-song-status">
            {isCurrent ? 'Currently Performing' : 'Queued'}
          </div>
        </div>

        {!isCurrent && (
          <button
            className="sv-change-song"
            type="button"
            onClick={() => {
              // next step opens bottom sheet picker
            }}
          >
            Change
          </button>
        )}
      </div>
    );
  })}

  <button className="sv-full-button" type="button" onClick={addSongField}>
    + Add another song
  </button>

  <button type="button" onClick={submitSignup}>
    Sign Up
  </button>

  {message && <p>{message}</p>}
    </section>
  </main>
);
}