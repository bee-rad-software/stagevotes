'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import styles from './venue-profile.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Venue = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  personality_tags: string[];
  music_provider: string | null;
  verification_status:
    | 'unverified'
    | 'community_verified'
    | 'verified';
};

type RecurringShow = {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  show_type: string;
};

type LiveEvent = {
  id: string;
  name: string;
  created_at: string;
  current_performance_id: string | null;
  is_show_ended: boolean;
};

type CurrentPerformance = {
  id: string;
  singer_name: string;
  song_title: string;
};

type QueueSinger = {
  id: string;
  singer_name: string;
  song_title: string;
};

type LeaderboardEntry = {
  id: string;
  singer_name: string;
  total_score: number;
};

export default function VenueProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
const [liveEvent, setLiveEvent] =
  useState<LiveEvent | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [shows, setShows] = useState<RecurringShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentPerformance, setCurrentPerformance] =
  useState<CurrentPerformance | null>(null);
  const [upNext, setUpNext] =
  useState<QueueSinger[]>([]);
  const [leaderboard, setLeaderboard] =
  useState<LeaderboardEntry[]>([]);
  

  useEffect(() => {
    async function loadVenue() {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          slug,
          description,
          street_address,
          city,
          state,
          postal_code,
          phone,
          website_url,
          facebook_url,
          instagram_url,
          logo_url,
          cover_photo_url,
          personality_tags,
          music_provider,
          verification_status
        `)
        .eq('slug', slug)
        .eq('is_public', true)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Unable to load venue:', error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setVenue(data as Venue);

      const { data: recurringShows, error: recurringShowsError } =
        await supabase
          .from('venue_recurring_shows')
          .select(`
            id,
            title,
            day_of_week,
            start_time,
            show_type
          `)
          .eq('venue_id', data.id)
          .eq('is_active', true)
          .order('day_of_week')
          .order('start_time');

      if (recurringShowsError) {
        console.error(
          'Unable to load recurring shows:',
          recurringShowsError
        );
      }

      setShows(recurringShows || []);
      const today = new Date();
today.setHours(0, 0, 0, 0);

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const {
  data: activeEventData,
  error: activeEventError,
} = await supabase
  .from('events')
  .select(`
    id,
    name,
    created_at,
    current_performance_id,
    is_show_ended
  `)
  .eq('venue_id', data.id)
  .eq('is_show_ended', false)
  .gte('created_at', today.toISOString())
  .lt('created_at', tomorrow.toISOString())
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (activeEventError) {
  console.error(
    'Unable to load today’s live event:',
    activeEventError
  );
}

setLiveEvent(
  activeEventData
    ? (activeEventData as LiveEvent)
    : null
);

if (activeEventData?.current_performance_id) {
  const { data: performanceData } = await supabase
    .from('performances')
    .select(`
      id,
      singer_name,
      song_title
    `)
    .eq('id', activeEventData.current_performance_id)
    .maybeSingle();

  setCurrentPerformance(
    performanceData
      ? (performanceData as CurrentPerformance)
      : null
  );
} else {
  setCurrentPerformance(null);
}

if (activeEventData) {
  const { data: queueData } = await supabase
    .from('performances')
    .select(`
      id,
      singer_name,
      song_title
    `)
.eq('event_id', activeEventData.id)
.neq(
  'id',
  activeEventData.current_performance_id ||
    '00000000-0000-0000-0000-000000000000'
)

.order('queue_order', { ascending: true })
.limit(3);

  setUpNext((queueData || []) as QueueSinger[]);
}

if (activeEventData) {
  const { data: voteData, error: voteError } = await supabase
    .from('votes')
    .select(`
      performance_id,
      score
    `)
    .eq('event_id', activeEventData.id);

  if (voteError) {
    console.error('Unable to load leaderboard votes:', voteError);
    setLeaderboard([]);
  } else {
    const performanceIds = Array.from(
      new Set(
        (voteData || [])
          .map((vote) => vote.performance_id)
          .filter(Boolean)
      )
    );

    if (performanceIds.length === 0) {
      setLeaderboard([]);
    } else {
      const { data: performanceData, error: performanceError } =
        await supabase
          .from('performances')
          .select(`
            id,
            singer_name
          `)
          .in('id', performanceIds);

      if (performanceError) {
        console.error(
          'Unable to load leaderboard performers:',
          performanceError
        );
        setLeaderboard([]);
      } else {
        const scoreMap = new Map<
          string,
          { total: number; count: number }
        >();

        (voteData || []).forEach((vote) => {
          if (!vote.performance_id || vote.score == null) {
            return;
          }

          const current = scoreMap.get(vote.performance_id) || {
            total: 0,
            count: 0,
          };

          current.total += Number(vote.score);
          current.count += 1;

          scoreMap.set(vote.performance_id, current);
        });

        const leaderboardRows = (performanceData || [])
          .map((performance) => {
            const scoreInfo = scoreMap.get(performance.id);

            return {
              id: performance.id,
              singer_name: performance.singer_name,
              total_score:
                scoreInfo && scoreInfo.count > 0
                  ? scoreInfo.total / scoreInfo.count
                  : 0,
            };
          })
          .filter((entry) => entry.total_score > 0)
          .sort((a, b) => b.total_score - a.total_score)
          .slice(0, 5);

        setLeaderboard(leaderboardRows);
      }
    }
  }
} else {
  setLeaderboard([]);
}

      setLoading(false);
    }

    if (slug) {
      loadVenue();
    }
  }, [slug]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.statusCard}>
          <div className={styles.spinner} />
          <p>Loading venue…</p>
        </div>
      </main>
    );
  }

  if (notFound || !venue) {
    return (
      <main className={styles.page}>
        <div className={styles.statusCard}>
          <div className={styles.statusIcon}>📍</div>
          <h1>Venue not found</h1>
          <p>This venue may not be public yet.</p>
        </div>
      </main>
    );
  }

  const location = [
    venue.street_address,
    venue.city,
    venue.state,
    venue.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  const verificationLabel =
    venue.verification_status === 'verified'
      ? 'Verified Venue'
      : venue.verification_status === 'community_verified'
        ? 'Community Verified'
        : 'Unverified Venue';

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        style={
          venue.cover_photo_url
            ? {
                backgroundImage: `
                  linear-gradient(
                    180deg,
                    rgba(8, 15, 30, 0.18) 0%,
                    rgba(8, 15, 30, 0.94) 100%
                  ),
                  url("${venue.cover_photo_url}")
                `,
              }
            : undefined
        }
      >
        <div className={styles.heroGlow} />

        <div className={styles.heroContent}>
          <div className={styles.logo}>
            {venue.logo_url ? (
              <img src={venue.logo_url} alt={`${venue.name} logo`} />
            ) : (
              <span>🎤</span>
            )}
          </div>

          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>StageVotes Venue</div>

            <div className={styles.titleRow}>
              <h1>{venue.name}</h1>

              <span
                className={`${styles.verification} ${
                  venue.verification_status === 'verified'
                    ? styles.verified
                    : ''
                }`}
              >
                ✓ {verificationLabel}
              </span>
            </div>

            {location && (
              <p className={styles.location}>📍 {location}</p>
            )}
          </div>
        </div>
      </section>

      <div className={styles.content}>
      {liveEvent && (
  <section className={styles.liveTonightCard}>
    <div className={styles.liveTonightTop}>
      <div>
        <div className={styles.liveStatus}>
          <span className={styles.liveStatusDot} />
          Live Tonight
        </div>

        <h2>{liveEvent.name}</h2>

       {currentPerformance ? (
  <>
    <p
      style={{
        fontWeight: 700,
        marginBottom: 8
      }}
    >
      🎤 Currently Singing
    </p>

    <h3
      style={{
        fontSize: '2rem',
        margin: 0
      }}
    >
      {currentPerformance.singer_name}
    </h3>

    <p
      style={{
        marginTop: 6
      }}
    >
      "{currentPerformance.song_title}"
    </p>

{upNext.length > 0 && (
  <div style={{ marginTop: 28 }}>
    <p
      style={{
        fontWeight: 700,
        marginBottom: 12
      }}
    >
      ⏭ Up Next
    </p>

    {upNext.map((singer, index) => (
      <div
        key={singer.id}
      style={{
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
  gap: 16,
  marginBottom: 10,
  opacity: 0.92
}}
      >
        <span>
          {index + 1}. {singer.singer_name}
        </span>

        <span
         style={{
  color: '#94a3b8',
  textAlign: 'right'
}}
        >
          {singer.song_title}
        </span>
      </div>
    ))}
  </div>
)}

  </>
) : (
  <p>
    Karaoke is happening now at {venue.name}.
  </p>
)}
      </div>

      <div className={styles.liveTonightIcon}>
        🎤
      </div>
    </div>

    <div className={styles.liveTonightActions}>
      <a
        href={`/signup/${liveEvent.id}`}
        className={styles.joinShowButton}
      >
        Join This Show
      </a>

      <span className={styles.liveTonightNote}>
        View the queue and submit your song
      </span>
    </div>
  </section>
)}

{leaderboard.length > 0 && (
  <div className={styles.liveLeaderboard}>

    <div className={styles.liveLeaderboardHeader}>
      🏆 Tonight's Leaderboard
    </div>

    {leaderboard.map((entry, index) => (
      <div
        key={entry.id}
        className={styles.liveLeaderboardRow}
      >
        <span>
          {index === 0
            ? '🥇'
            : index === 1
            ? '🥈'
            : index === 2
            ? '🥉'
            : `${index + 1}.`}
        </span>

        <span className={styles.liveLeaderboardName}>
          {entry.singer_name}
        </span>

        <span className={styles.liveLeaderboardScore}>
          {entry.total_score?.toFixed(1) ?? '--'}
        </span>
      </div>
    ))}

  </div>
)}

        <section className={styles.primaryCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>
                Welcome to
              </span>
              <h2>{venue.name}</h2>
            </div>

            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              StageVotes Venue
            </div>
          </div>

          <p className={styles.description}>
            {venue.description ||
              'Discover live karaoke, upcoming shows and more at this StageVotes venue.'}
          </p>

          <div className={styles.actionGrid}>
            <button className={styles.primaryButton}>
              🎤 View Karaoke Nights
            </button>

            <button className={styles.secondaryButton}>
              ♡ Follow Venue
            </button>

            {location && (
              <a
                className={styles.secondaryButton}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  location
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                ↗ Get Directions
              </a>
            )}
          </div>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardIcon}>✨</div>

            <div>
              <span className={styles.cardLabel}>
                Venue Personality
              </span>
              <h3>What it feels like here</h3>
            </div>

            <div className={styles.tags}>
              {(venue.personality_tags || []).length > 0 ? (
                venue.personality_tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <p className={styles.muted}>
                  Venue personality coming soon.
                </p>
              )}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardIcon}>📅</div>

            <div>
              <span className={styles.cardLabel}>
                Weekly Schedule
              </span>
              <h3>Upcoming karaoke</h3>
            </div>

            <div className={styles.scheduleList}>
              {shows.length === 0 ? (
                <div className={styles.placeholder}>
                  <strong>No weekly shows yet.</strong>
                </div>
              ) : (
                shows.map((show) => (
                  <div
                    key={show.id}
                    className={styles.scheduleRow}
                  >
                    <div>
                      <strong>
                        {
                          [
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                          ][show.day_of_week]
                        }
                      </strong>

                      <div>{show.title}</div>
                    </div>

                    <span>
                      {new Date(
                        `1970-01-01T${show.start_time}`
                      ).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardIcon}>🏅</div>

            <div>
              <span className={styles.cardLabel}>
                Venue Badges
              </span>
              <h3>Achievements available here</h3>
            </div>

            <div className={styles.placeholder}>
              <strong>Badges coming soon</strong>
              <p>
                Visit, perform and compete to unlock exclusive
                venue achievements.
              </p>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardIcon}>🏆</div>

            <div>
              <span className={styles.cardLabel}>
                Local Legends
              </span>
              <h3>Top performers</h3>
            </div>

            <div className={styles.placeholder}>
              <strong>Leaderboard coming soon</strong>
              <p>
                Venue rankings will be calculated from StageVotes
                show history.
              </p>
            </div>
          </article>
        </section>

        <section className={styles.detailsCard}>
          <div>
            <span className={styles.sectionEyebrow}>
              Venue Details
            </span>
            <h2>Plan your visit</h2>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detail}>
              <span>Location</span>
              <strong>{location || 'Coming soon'}</strong>
            </div>

            <div className={styles.detail}>
              <span>Music provider</span>
              <strong>{venue.music_provider || 'Not listed'}</strong>
            </div>

            <div className={styles.detail}>
              <span>Phone</span>
              <strong>{venue.phone || 'Not listed'}</strong>
            </div>

            <div className={styles.detail}>
              <span>Venue status</span>
              <strong>{verificationLabel}</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}