'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

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

  async function submitSignup() {
    setMessage('');

    const validSongs = songs.filter((song) => song.songTitle.trim());

    if (!singerName.trim() || validSongs.length === 0) {
      setMessage('Please enter your name and at least one song.');
      return;
    }

    const deviceId = getDeviceId();

const { data: existingSignup } = await supabase
  .from('performances')
  .select('id')
  .eq('event_id', eventId)
  .eq('device_id', deviceId)
  .neq('status', 'completed')
  .maybeSingle();

if (existingSignup) {
  setMessage('You are already in the queue. Ask the host if you need to make a change.');
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
      queue_order: startingOrder + index
    }));

    const { error } = await supabase.from('performances').insert(rows);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSingerName('');
    setSongs([{ songTitle: '', artist: '' }]);
    setMessage('You are signed up! Get ready to sing.');
  }

  return (
    <main className="container">
      <h1>Karaoke Signup</h1>

      <div className="card">
        <label>Your name</label>
        <input value={singerName} onChange={(e) => setSingerName(e.target.value)} />

        {songs.map((song, index) => (
          <div key={index} className="card">
            <h3>Song {index + 1}</h3>

            <label>Song title</label>
            <input
              value={song.songTitle}
              onChange={(e) => updateSong(index, 'songTitle', e.target.value)}
            />

            <label>Artist</label>
            <input
              value={song.artist}
              onChange={(e) => updateSong(index, 'artist', e.target.value)}
            />

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
