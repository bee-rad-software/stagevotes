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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

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

const filteredEvents = events.filter((event) => {
  const search = searchTerm.toLowerCase();

  const matchesSearch =
    event.name?.toLowerCase().includes(search) ||
    event.venue?.toLowerCase().includes(search) ||
    new Date(event.created_at).toLocaleDateString().includes(search);

  const matchesStatus =
    statusFilter === 'all' ||
    (statusFilter === 'active' && !event.is_show_ended) ||
    (statusFilter === 'ended' && event.is_show_ended) ||
    (statusFilter === 'archived' && event.is_archived);

  return matchesSearch && matchesStatus;
});

const sortedEvents = [...filteredEvents].sort((a, b) => {
  if (sortBy === 'newest') {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }

  if (sortBy === 'oldest') {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }

  if (sortBy === 'name') {
    return (a.name || '').localeCompare(b.name || '');
  }

  if (sortBy === 'venue') {
    return (a.venue || '').localeCompare(b.venue || '');
  }

  return 0;
});

async function duplicateShow(eventId: string) {

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

<input
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="🔍 Search by show name, venue, or date..."
  style={{
    width: '100%',
    padding: '12px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #555',
    background: '#1f1f2e',
    color: 'white',
    fontSize: '16px'
  }}
/>

      <div
  style={{
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '20px'
  }}
>
  {['all', 'active', 'ended', 'archived'].map((filter) => (
    <button
      key={filter}
      type="button"
      onClick={() => setStatusFilter(filter)}
      style={{
        background: statusFilter === filter ? '#38bdf8' : '#334155',
        color: statusFilter === filter ? '#0f172a' : 'white'
      }}
    >
      {filter === 'all'
        ? 'All Shows'
        : filter.charAt(0).toUpperCase() + filter.slice(1)}
    </button>
  ))}
</div>

<select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  style={{
    width: '100%',
    padding: '12px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #555',
    background: '#1f1f2e',
    color: 'white',
    fontSize: '16px'
  }}
>
  <option value="newest">Newest First</option>
  <option value="oldest">Oldest First</option>
  <option value="name">Show Name A-Z</option>
  <option value="venue">Venue A-Z</option>
</select>
        
        {message && <p>{message}</p>}

        {sortedEvents.length === 0 ? (
          <p>No shows yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {sortedEvents.map((event) => (
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

                  <button
  type="button"
  onClick={() => duplicateShow(event.id)}
>
  📋 Duplicate Show
</button>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
