'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type EventRow = {
  id: string;
  name: string;
  venue: string;
  created_at: string;
  is_show_ended: boolean;
  is_archived: boolean;
};

export default function AnalyticsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState('');
  const [performances, setPerformances] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [peopleVotes, setPeopleVotes] = useState<any[]>([]);

  
  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setMessage('');

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = '/login';
      return;
    }

    const { data: accountUser, error: accountUserError } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userData.user.id)
      .single();

    if (accountUserError || !accountUser) {
      setMessage('Unable to find your account.');
      return;
    }

   const { data: events, error } = await supabase
  .from('events')
  .select('*')
  .eq('account_id', accountUser.account_id)
  .eq('is_show_ended', true)
  .order('created_at', { ascending: false });

if (error) {
  setMessage(error.message);
  return;
}

setEvents(events || []);
    const eventIds = (events || []).map((event) => event.id);

if (eventIds.length === 0) {
  setPerformances([]);
  setVotes([]);
  setPeopleVotes([]);
  return;
}

const { data: performanceData } = await supabase
  .from('performances')
  .select('*')
  .in('event_id', eventIds);

setPerformances(performanceData || []);

const { data: voteData } = await supabase
  .from('votes')
  .select('*')
  .in('event_id', eventIds);

setVotes(voteData || []);

const { data: peopleVoteData } = await supabase
  .from('peoples_choice_votes')
  .select('*')
  .in('event_id', eventIds);

setPeopleVotes(peopleVoteData || []);
  }

const totalShows = events.length;

const totalPerformances = performances.length;
const totalJudgeVotes = new Set(
  votes.map(v => `${v.performance_id}-${v.voter_key}`)
).size;

const totalPeopleVotes = peopleVotes.length;

const uniqueSingers = new Set(
  performances.map((p) => p.singer_name?.trim()).filter(Boolean)
).size;

const averageSingers =
  totalShows > 0
    ? (uniqueSingers / totalShows).toFixed(1)
    : "0";

const averagePerformances =
  totalShows > 0
    ? (totalPerformances / totalShows).toFixed(1)
    : "0";

const averageAudienceVotes =
  totalShows > 0
    ? (totalPeopleVotes / totalShows).toFixed(1)
    : "0";
  
  return (
    <main className="container">
      <div className="card">
        <h1>Show History</h1>

        <div style={{ marginBottom: '20px' }}>
         
          <Link href="/history/season">
  <button type="button">Season Leaderboard</button>
</Link>
          
          <Link href="/account">
            <button type="button">← Back to Account</button>
          </Link>
        </div>

       <h1>Venue Analytics</h1>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginTop: 24
  }}
>

  <div className="card">
    <h2>{totalShows}</h2>
    <p>Shows Hosted</p>
  </div>

  <div className="card">
    <h2>{totalPerformances}</h2>
    <p>Total Songs</p>
  </div>

  <div className="card">
    <h2>{uniqueSingers}</h2>
    <p>Unique Singers</p>
  </div>

  <div className="card">
    <h2>{averagePerformances}</h2>
    <p>Avg Songs / Show</p>
  </div>

  <div className="card">
    <h2>{totalJudgeVotes}</h2>
    <p>Judge Votes</p>
  </div>

  <div className="card">
    <h2>{totalPeopleVotes}</h2>
    <p>People's Choice Votes</p>
  </div>

  <div className="card">
    <h2>{averageAudienceVotes}</h2>
    <p>Avg Audience Votes</p>
  </div>

</div>
      </div>
    </main>
  );
}
