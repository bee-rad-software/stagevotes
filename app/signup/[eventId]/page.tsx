'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function SignupPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [singerName, setSingerName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [message, setMessage] = useState('');

  async function submitSignup() {
    setMessage('');

    if (!singerName || !songTitle) {
      setMessage('Please enter your name and song title.');
      return;
    }

    const { data: existing } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId);

    const nextOrder = (existing?.length || 0) + 1;

    const { error } = await supabase.from('performances').insert({
      event_id: eventId,
      singer_name: singerName,
      song_title: songTitle,
      artist,
      queue_order: nextOrder
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setSingerName('');
    setSongTitle('');
    setArtist('');
    setMessage('You are signed up! Get ready to sing.');
  }

  return (
    <main className="container">
      <h1>Karaoke Signup</h1>

      <div className="card">
        <label>Your name</label>
        <input value={singerName} onChange={(e) => setSingerName(e.target.value)} />

        <label>Song title</label>
        <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />

        <label>Artist</label>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />

        <button onClick={submitSignup}>Sign Up</button>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
