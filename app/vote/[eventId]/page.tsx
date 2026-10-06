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

function getPerformanceName(
  performance: any
) {
  const singerName =
    performance?.singer_name?.trim() ||
    'Singer';

  const partnerName =
    performance?.duet_partner_name?.trim();

  return partnerName
    ? `${singerName} & ${partnerName}`
    : singerName;
}

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
  const [judgeName, setJudgeName] = useState('');
  const [judgeReady, setJudgeReady] = useState(false);
  const [judgeFeatures, setJudgeFeatures] = useState(false);
  const [judgeNotice, setJudgeNotice] = useState('');
  const [judgeNote, setJudgeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setJudgeName(localStorage.getItem(`stagevotes_judge_name_${eventId}`) || '');
    let cancelled = false;
    supabase.from('judge_sessions').select('event_id').limit(0).then(({ error }) => {
      if (!cancelled) setJudgeFeatures(!error || error.code === '42501');
    });
    return () => { cancelled = true; };
  }, [eventId]);

  async function checkInJudge() {
    if (!judgeName.trim()) { setJudgeNotice('Enter your name to check in.'); return; }
    const { error } = await supabase.rpc('check_in_judge', {
      p_event_id: eventId, p_device_id: getDeviceId(), p_token: getVoterKey(), p_name: judgeName.trim()
    });
    if (error) { setJudgeNotice(error.message); return; }
    localStorage.setItem(`stagevotes_judge_name_${eventId}`, judgeName.trim());
    setJudgeReady(true);
    setJudgeNotice('Checked in. Keep this page open while judging.');
  }

  useEffect(() => {
    if (!judgeReady) return;
    const heartbeat = setInterval(() => {
      supabase.rpc('check_in_judge', { p_event_id: eventId, p_device_id: getDeviceId(),
        p_token: getVoterKey(), p_name: localStorage.getItem(`stagevotes_judge_name_${eventId}`) || judgeName
      }).then(({ error }) => { if (error) setJudgeNotice(error.message); });
    }, 20000);
    return () => clearInterval(heartbeat);
  }, [judgeReady, eventId]);

  useEffect(() => {
    setJudgeNote('');
    setSubmitted(false);
    if (!current?.id) return;
    let cancelled = false;
    supabase.from('votes').select('category_id,score').eq('performance_id', current.id)
      .eq('device_id', getDeviceId()).then(({ data }) => {
        if (!cancelled && data?.length) {
          setSubmitted(true);
          setScores(Object.fromEntries(data.filter(v => v.category_id).map(v => [v.category_id, v.score])));
          setMessage('Thanks. Your ballot was already submitted.');
        }
      });
    return () => { cancelled = true; };
  }, [current?.id]);

 const [currentCategoryIndex, setCurrentCategoryIndex] =
  useState(0); 

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
  setCurrentCategoryIndex(0);
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
  .select(`
    *,
    singer_profiles (
      photo_url
    )
  `)
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
  if (submitting || submitted) return;
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

  if (judgeFeatures) {
    if (!judgeReady) { setMessage('Check in with your judge name first.'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_judge_ballot', {
        p_event_id: eventId, p_performance_id: current.id, p_device_id: getDeviceId(),
        p_token: getVoterKey(), p_scores: scores, p_note: judgeNote.trim()
      });
      if (error) throw error;
      setSubmitted(true);
      setMessage('Thanks. Your complete ballot and notes were saved.');
    } catch (error: any) {
      setMessage(error.message || 'Unable to submit. Please try again.');
    } finally { setSubmitting(false); }
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

const singerProfile = Array.isArray(
  (current as any)?.singer_profiles
)
  ? (current as any)?.singer_profiles[0] || null
  : (current as any)?.singer_profiles || null;

const singerPhotoUrl =
  singerProfile?.photo_url || null;

const activeCategory =
  categories[currentCategoryIndex] || null;

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

      {judgeFeatures && (
        <section className={styles.waitingCard}>
          <h2>Judge check-in</h2>
          <label htmlFor="judge-name">Your name</label>
          <input id="judge-name" value={judgeName} maxLength={80} disabled={judgeReady}
            onChange={(e) => setJudgeName(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 12, margin: '12px 0', borderRadius: 12, background: '#0f172a', color: '#fff', border: '1px solid #64748b' }} />
          {!judgeReady && <button type="button" className={styles.submitButton} onClick={checkInJudge}>Check in as judge</button>}
          {judgeNotice && <p role="status">{judgeNotice}</p>}
        </section>
      )}

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
         <section className={styles.performerHero}>
  <div className={styles.performerHeroGlow} />

  <div className={styles.performerHeroTop}>
    <div className={styles.liveIndicator}>
      <span className={styles.liveDot} />
      LIVE PERFORMANCE
    </div>

    <div
      className={`${styles.votingStatus} ${
        event?.is_voting_open
          ? styles.votingOpen
          : styles.votingClosed
      }`}
    >
      <span className={styles.statusDot} />

      {event?.is_voting_open
        ? 'Ballot Open'
        : 'Voting Closed'}
    </div>
  </div>

  <div className={styles.performerHeroContent}>
    <div className={styles.performerIcon}>
  {singerPhotoUrl ? (
    <img
      src={singerPhotoUrl}
      alt={getPerformanceName(current)}
      className={styles.performerPhoto}
    />
  ) : (
    <span>🎤</span>
  )}
</div>

    <div className={styles.performerCopy}>
      <span className={styles.sectionLabel}>
        Now Performing
      </span>

      <h2>{getPerformanceName(current)}</h2>

      <p className={styles.songTitle}>
        {current.song_title}
      </p>

      {current.artist && (
        <p className={styles.artistName}>
          {current.artist}
        </p>
      )}
    </div>
  </div>

  <div className={styles.judgePrompt}>
    <span>Official Judge Ballot</span>

    <strong>
      Score the performance below
    </strong>
  </div>
</section>

          <section className={styles.progressCard}>
            <div className={styles.progressTop}>
              <div>
                <span className={styles.sectionLabel}>
                  Ballot Progress
                </span>

               <strong>
  {allCategoriesScored
    ? 'Ballot Complete'
    : `${completed} of ${categories.length} scored`}
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

            <div className={styles.progressSteps}>
  {categories.map((category) => (
    <span
      key={category.id}
      className={
        scores[category.id]
          ? styles.progressStepComplete
          : ''
      }
    >
      {scores[category.id] ? '✓' : '•'}
    </span>
  ))}
</div>
          </section>

         <section className={styles.categoryList}>
  {activeCategory && !allCategoriesScored && (
    <article
      className={styles.categoryCard}
    >
      <div className={styles.categoryHeading}>
        <div className={styles.categoryNumber}>
          <span>
            {currentCategoryIndex + 1}
          </span>
        </div>

        <div>
          <span className={styles.sectionLabel}>
            Category {currentCategoryIndex + 1} of{' '}
            {categories.length}
          </span>

          <h3>
            {activeCategory.category_name}
          </h3>

          <p className={styles.categoryInstruction}>
            Score this part of the performance.
          </p>
        </div>
      </div>

      <div className={styles.scoreButtons}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            type="button"
            key={score}
            className={styles.scoreButton}
            disabled={!event?.is_voting_open}
            onClick={() => {
              setScores((currentScores) => ({
                ...currentScores,
                [activeCategory.id]: score,
              }));

              if (
                currentCategoryIndex <
                categories.length - 1
              ) {
                setTimeout(() => {
                  setCurrentCategoryIndex(
                    (currentIndex) =>
                      currentIndex + 1
                  );
                }, 220);
              }
            }}
            aria-label={`${score} stars for ${activeCategory.category_name}`}
          >
            <span className={styles.scoreValue}>
              {score}
            </span>

            <span className={styles.star}>
              ★
            </span>

            <span className={styles.scoreWord}>
              {score === 1
                ? 'Needs Work'
                : score === 2
                  ? 'Fair'
                  : score === 3
                    ? 'Solid'
                    : score === 4
                      ? 'Great'
                      : 'Legend'}
            </span>
          </button>
        ))}
      </div>

      {currentCategoryIndex > 0 && (
        <button
          type="button"
          className={styles.backCategoryButton}
          onClick={() =>
            setCurrentCategoryIndex(
              (currentIndex) =>
                Math.max(0, currentIndex - 1)
            )
          }
        >
          ← Previous Category
        </button>
      )}
    </article>
  )}

  {allCategoriesScored && (
  <article className={styles.ballotCompleteCard}>
    <div className={styles.ballotCompleteHeader}>
      <div className={styles.ballotCompleteIcon}>
        ✓
      </div>

      <div>
        <span className={styles.sectionLabel}>
          Ballot Complete
        </span>

        <h2>Ready to submit</h2>

        <p>
          Review your scores for{' '}
          <strong>{getPerformanceName(current)}</strong>.
        </p>
      </div>
    </div>

    <div className={styles.ballotReview}>
      {categories.map((category) => (
        <div
          key={category.id}
          className={styles.ballotReviewRow}
        >
          <span>
            {category.category_name}
          </span>

          <strong>
            ★ {scores[category.id]} / 5
          </strong>
        </div>
      ))}
    </div>

    <div className={styles.ballotAverage}>
      <span>Judge Average</span>

      <strong>
        {(
          Object.values(scores).reduce(
            (sum, score) => sum + score,
            0
          ) / categories.length
        ).toFixed(2)}
        {' / 5'}
      </strong>
    </div>
  </article>
)}
</section>

          {allCategoriesScored && (
  <section className={styles.submitCard}>
            {!allCategoriesScored && (
              <div className={styles.incompleteMessage}>
                <span>⚠️</span>
                Score every category to unlock your ballot.
              </div>
            )}

            {judgeFeatures && !submitted && (
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="judge-note"><strong>Judge notes (optional)</strong></label>
                <p>Feedback on this performance. Visible to the host; does not affect the score.</p>
                <textarea id="judge-note" rows={4} maxLength={2000} value={judgeNote}
                  onChange={(e) => setJudgeNote(e.target.value)}
                  style={{ width: '100%', padding: 14, borderRadius: 12, background: '#0f172a', color: '#fff', border: '1px solid #64748b' }} />
              </div>
            )}
            <button
              type="button"
              onClick={submitCategoryVotes}
              disabled={
                submitting || submitted || (judgeFeatures && !judgeReady) || !allCategoriesScored ||
                !event?.is_voting_open
              }
              className={styles.submitButton}
            >
              {submitted ? '✓ Ballot submitted' : submitting ? 'Submitting…' : allCategoriesScored
  ? '✓ Submit Official Ballot'
  : `${categories.length - completed} ${
      categories.length - completed === 1
        ? 'Score Remaining'
        : 'Scores Remaining'
    }`}
            </button>

            <p className={styles.ballotNote}>
              Once submitted, this ballot is locked and counts as
one official judge score for {getPerformanceName(current)}.
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
          )}
        </>
      )}
    </div>
  </main>
);
}
