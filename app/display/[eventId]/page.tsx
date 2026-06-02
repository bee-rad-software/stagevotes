'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, EventRow, PerformanceRow, VoteRow } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function DisplayPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [performances, setPerformances] = useState<PerformanceRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel(`display-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, loadEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances', filter: `event_id=eq.${eventId}` }, loadPerformances)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` }, loadVotes)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function loadAll() {
    await Promise.all([loadEvent(), loadPerformances(), loadVotes()]);
  }

  async function loadEvent() {
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
    setEvent(data);
  }

  async function loadPerformances() {
    const { data } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)
      .order('queue_order', { ascending: true });

    setPerformances(data || []);
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('*').eq('event_id', eventId);
    setVotes(data || []);
  }

  const current = performances.find((p) => p.id === event?.current_performance_id);

  const activeQueue = performances.filter((p) => p.status !== 'completed');

  const upcoming = activeQueue
    .filter((p) => p.id !== event?.current_performance_id)
    .slice(0, 5);

  const leaderboard = useMemo(() => {
    return performances
      .map((p) => {
        const pv = votes.filter((v) => v.performance_id === p.id);
        const avg = pv.length > 0 ? pv.reduce((sum, v) => sum + v.score, 0) / pv.length : 0;

        return {
          ...p,
          avg,
          voteCount: pv.length
        };
      })
      .filter((p) => p.voteCount > 0)
      .sort((a, b) => b.avg - a.avg || b.voteCount - a.voteCount)
      .slice(0, 5);
  }, [performances, votes]);

  return (
    <main className="container">
      <div className="card">
        <h1 style={{ fontSize: '64px', textAlign: 'center' }}>
          🎤 NOW SINGING
        </h1>

        {current ? (
          <>
            <h2 style={{ fontSize: '72px', textAlign: 'center' }}>
              {current.singer_name}
            </h2>

            <p style={{ fontSize: '44px', textAlign: 'center' }}>
              {current.song_title}
              {current.artist ? ` by ${current.artist}` : ''}
            </p>

            <p style={{ fontSize: '32px', textAlign: 'center' }}>
              Voting is {event?.is_voting_open ? 'OPEN ⭐' : 'CLOSED'}
            </p>
          </>
        ) : (
          <h2 style={{ textAlign: 'center' }}>Waiting for first singer...</h2>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <h2>⏭ Up Next</h2>
          {upcoming.length > 0 ? (
            upcoming.map((p, index) => (
              <div className="leaderboard-row" key={p.id}>
                <strong>{index + 1}. {p.singer_name}</strong>
                <span>{p.song_title}</span>
              </div>
            ))
          ) : (
            <p>No singers waiting.</p>
          )}
        </div>

        <div className="card">
          <h2>🏆 Top Scores</h2>
          {leaderboard.length > 0 ? (
            leaderboard.map((p, index) => (
              <div className="leaderboard-row" key={p.id}>
                <strong>{index + 1}. {p.singer_name}</strong>
                <span>{p.avg.toFixed(2)} ⭐</span>
              </div>
            ))
          ) : (
            <p>No votes yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
