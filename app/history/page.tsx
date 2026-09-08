'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SVShell from '@/components/ui/SVShell';

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
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
const [duplicateEventId, setDuplicateEventId] = useState('');
const [duplicateName, setDuplicateName] = useState('');

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
  setMessage('');

  const { data: oldEvent, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !oldEvent) {
    setMessage(eventError?.message || 'Could not find show to duplicate.');
    return;
  }

if (!duplicateName.trim()) {
  setMessage('Please enter a show name.');
  return;
}
  
  const { data: newEvent, error: newEventError } = await supabase
    .from('events')
    .insert({
      account_id: oldEvent.account_id,
      name: duplicateName.trim(),
      venue: oldEvent.venue,
      pin: oldEvent.pin,
      is_voting_open: false,
      current_performance_id: null,
      is_show_ended: false,
      is_archived: false,
      show_signup_qr: oldEvent.show_signup_qr,
      show_voting_qr: oldEvent.show_voting_qr,
      show_peoples_choice_qr: oldEvent.show_peoples_choice_qr,
      show_checkin_qr: oldEvent.show_checkin_qr,
      checkin_required: oldEvent.checkin_required,
      venue_lat: oldEvent.venue_lat,
      venue_lng: oldEvent.venue_lng,
      checkin_radius_meters: oldEvent.checkin_radius_meters,
      tiebreaker_category: oldEvent.tiebreaker_category,
    })
    .select()
    .single();

  if (newEventError || !newEvent) {
    setMessage(newEventError?.message || 'Could not create duplicated show.');
    return;
  }

  const { data: categories } = await supabase
    .from('vote_categories')
    .select('*')
    .eq('event_id', eventId);

  if (categories && categories.length > 0) {
    const newCategories = categories.map((category) => ({
  event_id: newEvent.id,
  category_name: category.category_name,
}));

    await supabase.from('vote_categories').insert(newCategories);
  }

  setMessage('✅ Show duplicated successfully. Opening dashboard...');

setTimeout(() => {
  window.location.href = `/host/${newEvent.id}`;
}, 800);
}
  
  return (
  <SVShell
    title="Show History"
    subtitle={`${events.length} shows`}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 1180,
        margin: '0 auto',
      }}
    >
      <div
  style={{
    width: '100%',
  }}
>
        <h1>Show History</h1>

        <div
  style={{
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 24,
  }}
>
  <Link
    href="/history/season"
    className="sv-btn sv-btn-primary"
    style={{ textDecoration: 'none' }}
  >
    🏆 Season Leaderboard
  </Link>

  <Link
    href="/account"
    className="sv-btn sv-btn-secondary"
    style={{ textDecoration: 'none' }}
  >
    ← Back to Account
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
  style={{
    margin: 0,
    padding: 20,
    borderRadius: 18,
  }}
>
                <div
  style={{
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
  }}
>
  <div>
    <h2
      style={{
        margin: 0,
        fontSize: 22,
      }}
    >
      {event.name}
    </h2>

    <div
      style={{
        marginTop: 8,
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {event.venue}
    </div>

    <div
      style={{
        marginTop: 6,
        color: '#94a3b8',
        fontSize: 13,
      }}
    >
      {new Date(event.created_at).toLocaleDateString()}
    </div>
  </div>

  <span
    style={{
      flexShrink: 0,
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      color: event.is_archived
        ? '#c4b5fd'
        : event.is_show_ended
          ? '#cbd5e1'
          : '#86efac',
      background: event.is_archived
        ? 'rgba(139,92,246,0.12)'
        : event.is_show_ended
          ? 'rgba(148,163,184,0.10)'
          : 'rgba(34,197,94,0.12)',
      border: event.is_archived
        ? '1px solid rgba(139,92,246,0.25)'
        : event.is_show_ended
          ? '1px solid rgba(148,163,184,0.22)'
          : '1px solid rgba(34,197,94,0.25)',
    }}
  >
    {event.is_archived
      ? 'ARCHIVED'
      : event.is_show_ended
        ? 'ENDED'
        : 'ACTIVE'}
  </span>
</div>

               <div
  style={{
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
  }}
>
  <Link
    href={`/host/${event.id}`}
    style={{ textDecoration: 'none' }}
    className="sv-btn sv-btn-primary"
  >
    Open Dashboard
  </Link>

  <Link
    href={`/display/${event.id}`}
    style={{ textDecoration: 'none' }}
    className="sv-btn sv-btn-secondary"
  >
    Open TV Display
  </Link>

  <Link
    href={`/history/${event.id}`}
    style={{ textDecoration: 'none' }}
    className="sv-btn sv-btn-secondary"
  >
    View Report
  </Link>

  <button
    type="button"
    className="sv-btn sv-btn-secondary"
    onClick={() => {
      setDuplicateEventId(event.id);
      setDuplicateName(`${event.name} (Copy)`);
      setShowDuplicateModal(true);
    }}
  >
    📋 Duplicate Show
  </button>
</div>
              </div>
            ))}
          </div>
        )}
      </div>

{showDuplicateModal && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 20
    }}
  >
    <div
      className="card"
      style={{
        maxWidth: 500,
        width: '100%',
        margin: 0
      }}
    >
      <h2>Duplicate Show</h2>

      <label>New show name</label>
      <input
        value={duplicateName}
        onChange={(e) => setDuplicateName(e.target.value)}
        autoFocus
      />

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
          marginTop: 24
        }}
      >
        <button
          type="button"
          onClick={() => {
            setShowDuplicateModal(false);
            setDuplicateEventId('');
            setDuplicateName('');
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => duplicateShow(duplicateEventId)}
          disabled={!duplicateName.trim()}
        >
          Duplicate
        </button>
      </div>
    </div>
  </div>
)}
      
            </div>
  </SVShell>
  );
}