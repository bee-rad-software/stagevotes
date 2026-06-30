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

export default function HistoryPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
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

    const { data, error } = await supabase
      .from('events')
      .select('id, name, venue, created_at, is_show_ended, is_archived')
      .eq('account_id', accountUser.account_id)
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setEvents(data || []);
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
