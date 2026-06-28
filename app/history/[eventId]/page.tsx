'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

import { useParams } from 'next/navigation';

export default function EventReportPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any>(null);
  const [performances, setPerformances] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [peopleVotes, setPeopleVotes] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      setMessage(eventError.message);
      return;
    }

    setEvent(eventData);

    const { data: performanceData } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    setPerformances(performanceData || []);

    const { data: voteData } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId);

    setVotes(voteData || []);

    const { data: peopleVoteData } = await supabase
      .from('peoples_choice_votes')
      .select('*')
      .eq('event_id', eventId);

    setPeopleVotes(peopleVoteData || []);
  }

  const uniqueSingers = new Set(
    performances.map((p) => p.singer_name).filter(Boolean)
  );

  const peopleChoiceCounts: Record<string, number> = {};

  peopleVotes.forEach((vote) => {
    const singer = vote.singer_name || vote.performer_name || vote.singer || 'Unknown';
    peopleChoiceCounts[singer] = (peopleChoiceCounts[singer] || 0) + 1;
  });

  const peopleChoiceWinner =
    Object.entries(peopleChoiceCounts).sort((a, b) => b[1] - a[1])[0];

  const peopleChoiceResults = Object.entries(peopleChoiceCounts)
  .map(([singer, count]) => ({
    singer,
    count,
  }))
  .sort((a, b) => b.count - a.count);

  const scoreTotals: Record<string, { singer: string; total: number; count: number }> = {};

  votes.forEach((vote) => {
    const performance = performances.find((p) => p.id === vote.performance_id);
    if (!performance) return;

    const singer = performance.singer_name || 'Unknown';

    if (!scoreTotals[performance.id]) {
      scoreTotals[performance.id] = {
        singer,
        total: 0,
        count: 0,
      };
    }

    scoreTotals[performance.id].total += Number(vote.score || 0);
    scoreTotals[performance.id].count += 1;
  });

  const leaderboard = Object.values(scoreTotals)
    .map((entry) => ({
      singer: entry.singer,
      average: entry.count > 0 ? entry.total / entry.count : 0,
      total: entry.total,
    }))
    .sort((a, b) => b.total - a.total);

  const overallWinner = leaderboard[0];

  return (
    <main className="container">
      <div className="card">
        <h1>Event Report</h1>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <Link href="/history">
            <button type="button">← Back to History</button>
          </Link>

<button type="button" onClick={() => window.print()}>
  Download PDF
</button>
          
          {event && (
            <Link href={`/host/${event.id}`}>
              <button type="button">Open Dashboard</button>
            </Link>
          )}
        </div>

        {message && <p>{message}</p>}

        {event && (
          <>
            <h2>{event.name}</h2>
            <p>{event.venue}</p>
            <p>{new Date(event.created_at).toLocaleString()}</p>

            <h2>Show Summary</h2>

            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="card">
                <h3>Singers</h3>
                <p>{uniqueSingers.size}</p>
              </div>

              <div className="card">
                <h3>Songs</h3>
                <p>{performances.length}</p>
              </div>

              <div className="card">
                <h3>Judge Votes</h3>
                <p>{votes.length}</p>
              </div>

              <div className="card">
                <h3>People's Choice Votes</h3>
                <p>{peopleVotes.length}</p>
              </div>
            </div>

            <h2>Winners</h2>

            <div className="card">
              <p>
                <strong>Overall Winner:</strong>{' '}
                {overallWinner ? overallWinner.singer : 'No judge scores yet'}
              </p>

              <p>
                <strong>People's Choice Winner:</strong>{' '}
                {peopleChoiceWinner
                  ? `${peopleChoiceWinner[0]} (${peopleChoiceWinner[1]} votes)`
                  : 'No People’s Choice votes yet'}
              </p>
            </div>

          <h2>People's Choice Results</h2>

{peopleChoiceResults.length === 0 ? (
  <p>No People's Choice votes yet.</p>
) : (
  <div className="card">
    {peopleChoiceResults.map((entry, index) => (
      <p key={entry.singer}>
        #{index + 1} {entry.singer} — {entry.count} vote{entry.count === 1 ? '' : 's'}
      </p>
    ))}
  </div>
)}
            
            <h2>Leaderboard</h2>

            {leaderboard.length === 0 ? (
              <p>No judge scores yet.</p>
            ) : (
              <div className="card">
                {leaderboard.map((entry, index) => (
                  <p key={index}>
                    #{index + 1} {entry.singer} — Total: {entry.total.toFixed(2)}
                  </p>
                ))}
              </div>
            )}

            <h2>Performances</h2>

            <div className="card">
              {performances.length === 0 ? (
                <p>No performances.</p>
              ) : (
                performances.map((p, index) => (
                  <p key={p.id}>
                    #{index + 1} {p.singer_name} — {p.song_title}
                    {p.artist ? ` by ${p.artist}` : ''}
                  </p>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
