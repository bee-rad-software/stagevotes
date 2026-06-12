'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Image from 'next/image';

type SongEntry = {
  songTitle: string;
  artist: string;
};

export default function SignupPage() {
  const params = useParams();
  const eventId = params.eventId as string;

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

useEffect(() => {
  const savedName = localStorage.getItem('karavote_singer_name');

 if (savedName) {
  setSingerName(savedName);
  setSavedSingerName(savedName);
}
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
  console.log('Notification debug:', {
    notificationPermission,
    browserPermission:
      'Notification' in window ? Notification.permission : 'not supported',
    isOnDeckSinger,
    isCurrentSinger,
    notifiedOnDeck,
    notifiedCurrent
  });

  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('Permission not granted:', Notification.permission);
    return;
  }

  if (isOnDeckSinger && !notifiedOnDeck) {
    console.log('Sending on deck notification');

    new Notification('🎤 StageVotes', {
      body: "You're on deck! Get ready to sing."
    });

    setNotifiedOnDeck(true);
  }

  if (isCurrentSinger && !notifiedCurrent) {
    console.log('Sending current notification');

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

const startingOrder = (existing?.length || 0) + 1;

    const rows = validSongs.map((song, index) => ({
  event_id: eventId,
  singer_name: singerName.trim(),
  song_title: song.songTitle.trim(),
  artist: song.artist.trim(),
  queue_order: startingOrder + index,
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

  return (
    <main className="container">
     <div style={{ textAlign: 'center', marginBottom: 20 }}>
  <Image
    src="/stagevotes-logo.png"
    alt="StageVotes"
    width={250}
    height={125}
  />
  <h1>StageVotes Signup</h1>
</div>

{isCurrentSinger && (
  <div
    className="card"
    style={{
      background: 'rgba(194,65,12,0.25)',
      border: '3px solid #c2410c',
      textAlign: 'center'
    }}
  >
    <h1>🎤 You're Up Now!</h1>
    <p>Head to the stage.</p>
  </div>
)}

{isOnDeckSinger && !isCurrentSinger && (
  <div
    className="card"
    style={{
      background: 'rgba(250,204,21,0.2)',
      border: '3px solid #facc15',
      textAlign: 'center'
    }}
  >
    <h1>⏭ You're On Deck!</h1>
    <p>Get ready to sing.</p>
  </div>
)}
      
{currentSinger && !isCurrentSinger && (
  <div className="card">
    {isCurrentSinger ? (
      <>
        <h2>🎤 You're Up Now!</h2>
        <p>Head to the stage.</p>
      </>
    ) : (
      <>
        <h3>🎤 Currently Singing</h3>
        <p>{currentSinger.singer_name}</p>
      </>
    )}
  </div>
)}
{onDeckSinger && !isOnDeckSinger && (
  <div className="card">
    {isOnDeckSinger ? (
      <>
        <h2>⏭ You're On Deck!</h2>
        <p>Get ready to sing.</p>
      </>
    ) : (
      <>
        <h3>⏭ On Deck</h3>
        <p>{onDeckSinger.singer_name}</p>
      </>
    )}
  </div>
)}
      
{myPosition && !isCurrentSinger && !isOnDeckSinger && (
  <div className="card">
    <h2>
      {myPosition === 1
        ? "🎤 You're up now!"
        : myPosition === 2
        ? "⏭️ You're on deck!"
        : myPosition === 3
        ? "🔔 You're 2 songs away!"
        : `🎶 You're #${myPosition} in line`}
      {myPosition > 1 && (
  <p className="small">
    ⏱ Estimated wait: about {estimatedWaitMinutes} minutes
  </p>
)}

{myPosition === 1 && (
  <p className="small">
    🎤 Head to the stage.
  </p>
)}
    </h2>
  </div>
)}
      
      <div className="card">
        <label>Your name</label>
        <input value={singerName} onChange={(e) => setSingerName(e.target.value)} />

        {songs.map((song, index) => (
          <div key={index} className="card">
            <h3>Song {index + 1}</h3>

            <label>Song title</label>
          <input
  value={song.songTitle}
  onChange={(e) => {
    updateSong(index, 'songTitle', e.target.value);
searchSongs(e.target.value, index);
checkDuplicateSong(e.target.value);
  }}
/>

{activeSongIndex === index && songSuggestions.length > 0 && (
  <div
    style={{
      background: '#222',
      border: '1px solid #444',
      borderRadius: 8,
      maxHeight: 250,
      overflowY: 'auto',
      marginTop: 4
    }}
  >
    {songSuggestions.map((suggestion) => (
      <div
        key={suggestion.id}
        style={{
          padding: 10,
          cursor: 'pointer',
          borderBottom: '1px solid #333'
        }}
        onClick={() => {
  updateSong(index, 'songTitle', suggestion.title);
  updateSong(index, 'artist', suggestion.artist || '');

  checkDuplicateSong(suggestion.title);

  setSongSuggestions([]);
  setActiveSongIndex(null);
}}
      >
        <strong>{suggestion.title}</strong>
        <br />
        <small>{suggestion.artist}</small>
      </div>
    ))}
  </div>
)}

{duplicateWarning && (
  <p
    style={{
      color: '#fbbf24',
      fontWeight: 'bold'
    }}
  >
    {duplicateWarning}
  </p>
)}
            
            <label>Artist</label>
  <input
  value={song.artist}
  onChange={(e) => {
    updateSong(index, 'artist', e.target.value);
    searchArtists(e.target.value);
  }}
/>

{artistSuggestions.length > 0 && (
  <div
    style={{
      background: '#222',
      border: '1px solid #444',
      borderRadius: 8,
      maxHeight: 250,
      overflowY: 'auto',
      marginTop: 4
    }}
  >
    {artistSuggestions.map((artist) => (
      <div
        key={artist.artist}
        style={{
          padding: 10,
          cursor: 'pointer',
          borderBottom: '1px solid #333'
        }}
        onClick={() => {
          updateSong(index, 'artist', artist.artist);
          setArtistSuggestions([]);
        }}
      >
        {artist.artist}
      </div>
    ))}
  </div>
)}

{songs.length > 1 && (
              <button className="danger" onClick={() => removeSongField(index)}>
                Remove Song
              </button>
            )}
          </div>
        ))}

        <button className="secondary" onClick={addSongField}>
          Add Another Song
        </button>

        <button onClick={submitSignup}>
          Sign Up
        </button>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
