'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, PerformanceRow, VoteRow } from '@/lib/supabase';

export default function LeaderboardPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [performances, setPerformances] = useState<PerformanceRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [event, setEvent] = useState<{
  name: string;
  venue: string | null;
} | null>(null);

const [peoplesChoice, setPeoplesChoice] = useState<{
  singerName: string;
  votes: number;
} | null>(null);

  useEffect(() => {
    load();

    const channel = supabase.channel(`leaderboard-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` }, loadVotes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances', filter: `event_id=eq.${eventId}` }, loadPerformances)
     .on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'peoples_choice_votes',
    filter: `event_id=eq.${eventId}`,
  },
  loadPeoplesChoice
)
     
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function load() {
  await Promise.all([
    loadEvent(),
    loadPerformances(),
    loadVotes(),
    loadPeoplesChoice(),
  ]);
}

async function loadEvent() {
  const { data, error } = await supabase
    .from('events')
    .select('name, venue')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    console.error(
      'Unable to load event:',
      error
    );
    return;
  }

  setEvent(data);
}

  async function loadPerformances() {
    const { data } = await supabase.from('performances').select('*').eq('event_id', eventId);
    setPerformances(data || []);
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('*').eq('event_id', eventId);
    setVotes(data || []);
  }

async function loadPeoplesChoice() {
  const { data, error } = await supabase
    .from('peoples_choice_votes')
    .select('singer_name')
    .eq('event_id', eventId);

  if (error) {
    console.error(
      'Unable to load People’s Choice:',
      error
    );

    setPeoplesChoice(null);
    return;
  }

  const counts = new Map<string, number>();

  (data || []).forEach((vote) => {
    const name =
      vote.singer_name?.trim();

    if (!name) return;

    counts.set(
      name,
      (counts.get(name) || 0) + 1
    );
  });

  const winner = Array.from(
    counts.entries()
  ).sort(
    (a, b) => b[1] - a[1]
  )[0];

  setPeoplesChoice(
    winner
      ? {
          singerName: winner[0],
          votes: winner[1],
        }
      : null
  );
}

  const leaderboard = useMemo(() => {
    return performances.map(p => {
      const pv = votes.filter(v => v.performance_id === p.id);
      const avg = pv.length ? pv.reduce((sum, v) => sum + v.score, 0) / pv.length : 0;
      return { ...p, avg, voteCount: pv.length };
    }).sort((a, b) => b.avg - a.avg || b.voteCount - a.voteCount);
  }, [performances, votes]);

const champion = leaderboard[0];
const runnerUp = leaderboard[1];
const thirdPlace = leaderboard[2];

const totalJudgeVotes = votes.length;

const uniqueSingerCount = new Set(
  performances.map((performance) =>
    performance.singer_name
      .trim()
      .toLowerCase()
  )
).size;

  return (
  <main className="sv-results-page">
    <section className="sv-results-hero">
      <div className="sv-results-eyebrow">
        Official Results
      </div>

      <h1>
        {event?.name || 'Karaoke Results'}
      </h1>

      {event?.venue && (
        <p>{event.venue}</p>
      )}

      {champion ? (
        <div className="sv-results-champion">
          <div className="sv-results-crown">
            🏆
          </div>

          <div className="sv-results-label">
            Champion
          </div>

          <h2>{champion.singer_name}</h2>

          <div className="sv-results-song">
            ♪ {champion.song_title}
            {champion.artist
              ? ` by ${champion.artist}`
              : ''}
          </div>

          <div className="sv-results-score">
            {champion.avg.toFixed(2)}
            <span> / 5</span>
          </div>

          <div className="sv-results-votes">
            {champion.voteCount}{' '}
            {champion.voteCount === 1
              ? 'judge vote'
              : 'judge votes'}
          </div>
        </div>
      ) : (
        <div className="sv-results-empty">
          No judged results yet.
        </div>
      )}
    </section>

    {(runnerUp || thirdPlace) && (
      <section className="sv-results-podium">
        {runnerUp && (
          <article className="sv-results-podium-card">
            <div className="sv-results-medal">
              🥈
            </div>

            <div>
              <span>Runner-Up</span>
              <h3>{runnerUp.singer_name}</h3>

              <p>
                ♪ {runnerUp.song_title}
              </p>

              <strong>
                {runnerUp.avg.toFixed(2)} / 5
              </strong>
            </div>
          </article>
        )}

        {thirdPlace && (
          <article className="sv-results-podium-card">
            <div className="sv-results-medal">
              🥉
            </div>

            <div>
              <span>Third Place</span>
              <h3>{thirdPlace.singer_name}</h3>

              <p>
                ♪ {thirdPlace.song_title}
              </p>

              <strong>
                {thirdPlace.avg.toFixed(2)} / 5
              </strong>
            </div>
          </article>
        )}
      </section>
    )}

    <section className="sv-results-highlights">
      <article className="sv-results-highlight-card">
        <span>People’s Choice</span>

        <strong>
          {peoplesChoice?.singerName ||
            'No votes yet'}
        </strong>

        <p>
          {peoplesChoice
            ? `${peoplesChoice.votes} audience ${
                peoplesChoice.votes === 1
                  ? 'vote'
                  : 'votes'
              }`
            : 'Audience voting results will appear here.'}
        </p>
      </article>

      <article className="sv-results-highlight-card">
        <span>Performers</span>

        <strong>{uniqueSingerCount}</strong>

        <p>
          {performances.length}{' '}
          {performances.length === 1
            ? 'song performed'
            : 'songs performed'}
        </p>
      </article>

      <article className="sv-results-highlight-card">
        <span>Judge Activity</span>

        <strong>{totalJudgeVotes}</strong>

        <p>Total category scores submitted</p>
      </article>
    </section>

    <section className="sv-results-leaderboard">
      <div className="sv-results-section-heading">
        <div>
          <span>Complete Standings</span>
          <h2>Full Leaderboard</h2>
        </div>
      </div>

      <div className="sv-results-list">
        {leaderboard.map((performance, index) => (
          <article
            key={performance.id}
            className="sv-results-row"
          >
            <div className="sv-results-rank">
              #{index + 1}
            </div>

            <div className="sv-results-row-copy">
              <strong>
                {performance.singer_name}
              </strong>

              <span>
                ♪ {performance.song_title}
                {performance.artist
                  ? ` by ${performance.artist}`
                  : ''}
              </span>
            </div>

            <div className="sv-results-row-score">
              <strong>
                {performance.avg.toFixed(2)}
              </strong>

              <span>
                {performance.voteCount}{' '}
                {performance.voteCount === 1
                  ? 'vote'
                  : 'votes'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  </main>
);
}
