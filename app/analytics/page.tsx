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
    loadHistory();
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

        {message && <p>{message}</p>}

        {events.length === 0 ? (
          <p>No shows yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {events.map((event) => (
              <div
                key={event.id}
                className="card"
                style={{ margin: 0 }}
              >
                <h2>{event.name}</h2>
                <p>{event.venue}</p>
                <p>
                  {new Date(event.created_at).toLocaleDateString()} ·{' '}
                  {event.is_show_ended ? 'Ended' : 'Active'}
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link href={`/host/${event.id}`}>
                    <button type="button">Open Dashboard</button>
                  </Link>

                  <Link href={`/display/${event.id}`}>
                    <button type="button">Open TV Display</button>
                  </Link>

                  <Link href={`/history/${event.id}`}>
                    <button>View Report</button>
                  </Link>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
