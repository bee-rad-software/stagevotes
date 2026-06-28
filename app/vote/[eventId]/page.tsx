'use client';

import { useEffect, useState } from 'react';
import { supabase, EventRow, PerformanceRow } from '@/lib/supabase';
import Image from 'next/image';

import { useParams } from 'next/navigation';

type VoteCategory = {
  id: string;
  event_id: string;
  category_name: string;
};

function getDeviceId() {
  if (typeof window === 'undefined') return '';

  let id = window.localStorage.getItem('karavote_device_id');

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('karavote_device_id', id);
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
  const [categories, setCategories] = useState<VoteCategory[]>([]);
const [scores, setScores] = useState<Record<string, number>>({});
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
  load();

  const channel = supabase.channel(`vote-${eventId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, load)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [eventId]);

useEffect(() => {
  setScores({});
  setMessage('');
}, [current?.id]);

  async function load() {
    const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
    setEvent(ev);

if (ev?.account_id) {
  const { data: accountData } = await supabase
    .from('accounts')
    .select('logo_url')
    .eq('id', ev.account_id)
    .single();

  setLogoUrl(accountData?.logo_url || '');
}
    
    const { data: cats } = await supabase
  .from('vote_categories')
  .select('*')
  .eq('event_id', eventId);

setCategories(cats || []);
    
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

  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('performance_id', current.id)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existingVote) {
    setMessage('You have already voted for this performance.');
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
    setMessage(error.message);
    return;
  }

  setMessage(`Thanks. Your ${score}-star vote was counted.`);
}

async function submitCategoryVotes() {
  setMessage('');

  if (!event?.is_voting_open || !current) {
    setMessage('Voting is closed right now.');
    return;
  }

  const missingScore = categories.some((category) => !scores[category.id]);

  if (missingScore) {
    setMessage('Please vote in every category.');
    return;
  }

  const voterKey = getVoterKey();
  const deviceId = getDeviceId();

  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('performance_id', current.id)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existingVote) {
    setMessage('You have already voted for this performance.');
    return;
  }

  const rows = categories.map((category) => ({
    event_id: eventId,
    account_id: current.account_id,
    performance_id: current.id,
    voter_key: voterKey,
    device_id: deviceId,
    category_id: category.id,
    score: scores[category.id]
  }));

  const { error } = await supabase.from('votes').insert(rows);

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage('Thanks. Your votes were counted.');
}

const completed = Object.keys(scores).length;
const allCategoriesScored = completed === categories.length;
  
  return (
    <main className="container">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
  <Image
    src="/stagevotes-logo.png"
    alt="StageVotes"
    width={250}
    height={125}
  />
  
     {logoUrl && (
  <img
    src={logoUrl}
    alt="Venue Logo"
    style={{
      maxHeight: '120px',
      maxWidth: '300px',
      display: 'block',
      margin: '0 auto 24px',
      objectFit: 'contain'
    }}
  />
)}   
        
        <h1>Judge Voting</h1>
</div>
      <p className="small">{event?.name}</p>

      <div className="card">
        {current ? (
          <>
            <h2>{current.singer_name}</h2>
            <p>{current.song_title}{current.artist ? ` by ${current.artist}` : ''}</p>
            <p>Voting is <span className="badge">{event?.is_voting_open ? 'Open' : 'Closed'}</span></p>

<p
  style={{
    fontWeight: 'bold',
    color: '#38bdf8'
  }}
>
  {completed} / {categories.length} Categories Scored
</p>
            
            {categories.map((category) => (
<div
  key={category.id}
  className="card"
  style={{
    background: scores[category.id]
      ? 'rgba(250,204,21,0.15)'
      : undefined,
    border: scores[category.id]
      ? '2px solid #facc15'
      : undefined
  }}
>
    <h3>{category.category_name}</h3>

    <div className="row">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          className="vote-button"
          key={score}
          style={{
  background: scores[category.id] >= score ? '#facc15' : 'white',
  color: scores[category.id] >= score ? '#111827' : '#111827',
  border: scores[category.id] === score ? '3px solid #f97316' : '1px solid #ccc'
}}
          onClick={() =>
            setScores({
              ...scores,
              [category.id]: score
            })
          }
        >
          {score}
        </button>
      ))}
    </div>

    {scores[category.id] && (
      <p className="small">Selected: {scores[category.id]} stars</p>
    )}
  </div>
))}

{!allCategoriesScored && (
  <p
    style={{
      color: '#fbbf24',
      fontWeight: 'bold'
    }}
  >
    Please score all categories before submitting.
  </p>
)}
            
<button
  onClick={submitCategoryVotes}
  disabled={!allCategoriesScored}
  style={{
    opacity: allCategoriesScored ? 1 : 0.5,
    cursor: allCategoriesScored ? 'pointer' : 'not-allowed'
  }}
>
  Submit Votes
</button>
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
