'use client';

import { useEffect, useState } from 'react';
import { supabase, EventRow, PerformanceRow } from '@/lib/supabase';
import Image from 'next/image';
import styles from './vote.module.css';
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
  <main className={styles.page}>
    <div className={styles.backgroundGlowOne} />
    <div className={styles.backgroundGlowTwo} />

    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <Image
            src="/stagevotes-logo.png"
            alt="StageVotes"
            width={190}
            height={95}
            priority
            className={styles.stageVotesLogo}
          />

          {logoUrl && (
            <div className={styles.venueLogoWrap}>
              <img
                src={logoUrl}
                alt="Venue logo"
                className={styles.venueLogo}
              />
            </div>
          )}
        </div>

        <span className={styles.eyebrow}>Official Judge Ballot</span>
        <h1>Judge Voting</h1>

        <p className={styles.eventName}>
          {event?.name || 'StageVotes Event'}
        </p>
      </header>

      {!current ? (
        <section className={styles.waitingCard}>
          <div className={styles.waitingIcon}>🎤</div>
          <h2>Waiting for the next singer</h2>
          <p>
            The ballot will appear automatically when the host
            starts the next performance.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.performerCard}>
            <div>
              <span className={styles.sectionLabel}>
                Now Performing
              </span>

              <h2>{current.singer_name}</h2>

              <p className={styles.song}>
                {current.song_title}
                {current.artist ? (
                  <span> by {current.artist}</span>
                ) : null}
              </p>
            </div>

            <div
              className={`${styles.votingStatus} ${
                event?.is_voting_open
                  ? styles.votingOpen
                  : styles.votingClosed
              }`}
            >
              <span className={styles.statusDot} />
              Voting {event?.is_voting_open ? 'Open' : 'Closed'}
            </div>
          </section>

          <section className={styles.progressCard}>
            <div className={styles.progressTop}>
              <div>
                <span className={styles.sectionLabel}>
                  Ballot Progress
                </span>

                <strong>
                  {completed} of {categories.length} categories
                </strong>
              </div>

              <span className={styles.progressPercent}>
                {categories.length > 0
                  ? Math.round(
                      (completed / categories.length) * 100
                    )
                  : 0}
                %
              </span>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${
                    categories.length > 0
                      ? (completed / categories.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </section>

          <section className={styles.categoryList}>
            {categories.map((category, categoryIndex) => {
              const selectedScore = scores[category.id];

              return (
                <article
                  key={category.id}
                  className={`${styles.categoryCard} ${
                    selectedScore
                      ? styles.categoryCompleted
                      : ''
                  }`}
                >
                  <div className={styles.categoryHeading}>
                    <div className={styles.categoryNumber}>
                      {categoryIndex + 1}
                    </div>

                    <div>
                      <span className={styles.sectionLabel}>
                        Judging Category
                      </span>

                      <h3>{category.category_name}</h3>
                    </div>

                    {selectedScore && (
                      <span className={styles.completedBadge}>
                        ✓ Scored
                      </span>
                    )}
                  </div>

                  <div className={styles.scoreButtons}>
                    {[1, 2, 3, 4, 5].map((score) => {
                      const isSelected =
                        selectedScore === score;

                      const isFilled =
                        selectedScore &&
                        selectedScore >= score;

                      return (
                        <button
                          type="button"
                          key={score}
                          className={`${styles.scoreButton} ${
                            isFilled
                              ? styles.scoreButtonFilled
                              : ''
                          } ${
                            isSelected
                              ? styles.scoreButtonSelected
                              : ''
                          }`}
                          disabled={!event?.is_voting_open}
                          onClick={() =>
                            setScores((currentScores) => ({
                              ...currentScores,
                              [category.id]: score,
                            }))
                          }
                          aria-label={`${score} stars for ${category.category_name}`}
                        >
                          <span className={styles.star}>★</span>
                          <span>{score}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.scoreGuide}>
                    <span>1 — Needs work</span>
                    <span>3 — Solid performance</span>
                    <span>5 — Karaoke legend</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className={styles.submitCard}>
            {!allCategoriesScored && (
              <div className={styles.incompleteMessage}>
                <span>⚠️</span>
                Score every category to unlock your ballot.
              </div>
            )}

            <button
              type="button"
              onClick={submitCategoryVotes}
              disabled={
                !allCategoriesScored ||
                !event?.is_voting_open
              }
              className={styles.submitButton}
            >
              {allCategoriesScored
                ? 'Submit Official Ballot'
                : `${categories.length - completed} ${
                    categories.length - completed === 1
                      ? 'Category'
                      : 'Categories'
                  } Remaining`}
            </button>

            <p className={styles.ballotNote}>
              Your completed ballot counts as one judge vote for
              this performance.
            </p>

            {message && (
              <div
                className={`${styles.message} ${
                  message.toLowerCase().includes('thanks')
                    ? styles.successMessage
                    : styles.errorMessage
                }`}
              >
                {message}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  </main>
);
}
