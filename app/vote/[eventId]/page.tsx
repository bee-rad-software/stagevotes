'use client';

import { useEffect, useState } from 'react';
import { supabase, EventRow, PerformanceRow } from '@/lib/supabase';

import { useParams } from 'next/navigation';

function getDeviceId() {
  let id = localStorage.getItem('karavote_device_id');

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('karavote_device_id', id);
  }

  return id;
}

function getVoterKey() {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem('karavote_voter_key');
  if (existing) return existing;
  const key = crypto.randomUUID();
  localStorage.setItem('karavote_voter_key', key);
  return key;
}

export default function VotePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventRow | null>(null);
  const [current, setCurrent] = useState<PerformanceRow | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();

    const channel = supabase.channel(`vote-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function load() {
    const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
    setEvent(ev);
    
    console.log('Vote page event:', ev);
    console.log('Current performance id:', ev?.current_performance_id);
    
    if (ev?.current_performance_id) {
      const { data: perf } = await supabase
        .from('performances')
.select('*')
.eq('id', ev.current_performance_id)
.maybeSingle();
      console.log('Performance lookup:', perf);
      setCurrent(perf);
    } else {
      setCurrent(null);
    }
  }

  async function vote(score: number) {
    setMessage('');
    if (!event?.is_voting_open || !current) {
      setMessage('Voting is closed right now.');
      return;
    }

    const voterKey = getVoterKey();
    const deviceId = getDeviceId();

const voterKey = getVoterKey();
const deviceId = getDeviceId();

const { data: existingVote } = await supabase
  .from('votes')
  .select('id')
  .eq('performance_id', current.id)
  .eq('device_id', deviceId)
  .maybeSingle();

if (existingVote) {
  alert('You have already voted for this performance.');
  return;
}

const { error } = await supabase
  .from('votes')
  .insert({
    event_id: eventId,
    performance_id: current.id,
    voter_key: voterKey,
    score,
    device_id: deviceId,
  });

    if (error) {
      if (error.message.includes('duplicate')) {
        setMessage('You already voted for this singer.');
      } else {
        setMessage(error.message);
      }
      return;
    }

    setMessage(`Thanks. Your ${score}-star vote was counted.`);
  }

  return (
    <main className="container">
      <h1>Vote</h1>
      <p className="small">{event?.name}</p>

      <div className="card">
        {current ? (
          <>
            <h2>{current.singer_name}</h2>
            <p>{current.song_title}{current.artist ? ` by ${current.artist}` : ''}</p>
            <p>Voting is <span className="badge">{event?.is_voting_open ? 'Open' : 'Closed'}</span></p>

            <div className="row">
              {[1,2,3,4,5].map(score => (
                <button className="vote-button" key={score} onClick={() => vote(score)}>
                  {score}
                </button>
              ))}
            </div>
            <p className="small">1 = rough night, 5 = karaoke legend</p>
            {message && <p>{message}</p>}
          </>
        ) : (
          <p>No singer is active yet.</p>
        )}
      </div>
    </main>
  );
}
