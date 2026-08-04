'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import styles from './venue-profile.module.css';
import SVSingerShell from '@/components/navigation/SVSingerShell';

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

type LiveActivityItem = {
  id: string;
  icon: string;
  title: string;
  detail?: string;
};

type RecentVenueResult = {
  id: string;
  event_id: string;
  event_name: string | null;
  judge_winner_name: string | null;
  judge_score: number | null;
  peoples_choice_name: string | null;
  peoples_choice_votes: number;
  total_performers: number;
  finished_at: string;
};

type TopLocalSinger = {
  id: string;
  singer_name: string;
  average_score: number;
  performance_count: number;
  score_count: number;
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
  const [isFollowing, setIsFollowing] = useState(false);
const [followLoading, setFollowLoading] = useState(false);
  const [currentPerformance, setCurrentPerformance] =
  useState<CurrentPerformance | null>(null);
  const [upNext, setUpNext] =
  useState<QueueSinger[]>([]);
  const [leaderboard, setLeaderboard] =
  useState<LeaderboardEntry[]>([]);
const [myVenueStats, setMyVenueStats] = useState<{
  performances: number;
  averageScore: number | null;
}>({
  performances: 0,
  averageScore: null,
});
const [recentResults, setRecentResults] =
  useState<RecentVenueResult[]>([]);
const [topLocalSingers, setTopLocalSingers] =
  useState<TopLocalSinger[]>([]);
  

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

      const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  const {
    data: singerProfileData,
    error: singerProfileError,
  } = await supabase
    .from('singer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (singerProfileError) {
    console.error(
      'Unable to load singer profile for venue follow:',
      singerProfileError
    );
  }

  if (singerProfileData?.id) {
    const {
      data: followData,
      error: followError,
    } = await supabase
      .from('venue_follows')
      .select('id')
      .eq('venue_id', data.id)
      .eq(
        'singer_profile_id',
        singerProfileData.id
      )
      .maybeSingle();

    if (followError) {
      console.error(
        'Unable to load venue follow status:',
        followError
      );
    }

    setIsFollowing(Boolean(followData));

    const {
  data: performanceData,
  error: performanceError,
} = await supabase
  .from('performances')
  .select(`
    id,
    events!inner (
      venue_id
    )
  `)
  .eq(
    'singer_profile_id',
    singerProfileData.id
  )
  .eq(
    'events.venue_id',
    data.id
  );

if (performanceError) {
  console.error(
    'Unable to load personal venue performances:',
    performanceError
  );

  setMyVenueStats({
    performances: 0,
    averageScore: null,
  });
} else {
  const performanceIds = (
    performanceData || []
  ).map((performance) => performance.id);

  let averageScore: number | null = null;

  if (performanceIds.length > 0) {
    const {
      data: voteData,
      error: voteError,
    } = await supabase
      .from('votes')
      .select('performance_id, score')
      .in(
        'performance_id',
        performanceIds
      );

    if (voteError) {
      console.error(
        'Unable to load personal venue scores:',
        voteError
      );
    } else {
      const scoredVotes = (voteData || []).filter(
        (vote) => vote.score != null
      );

      if (scoredVotes.length > 0) {
        averageScore =
          scoredVotes.reduce(
            (sum, vote) =>
              sum + Number(vote.score),
            0
          ) / scoredVotes.length;
      }
    }
  }

  setMyVenueStats({
    performances: performanceIds.length,
    averageScore,
  });
}

  } else {
    setIsFollowing(false);
  }
} else {
  setIsFollowing(false);
}

const {
  data: recentResultData,
  error: recentResultError,
} = await supabase
  .from('event_results')
  .select(`
    id,
    event_id,
    event_name,
    judge_winner_name,
    judge_score,
    peoples_choice_name,
    peoples_choice_votes,
    total_performers,
    finished_at
  `)
  .eq('venue_id', data.id)
  .order('finished_at', {
    ascending: false,
  })
  .limit(3);

if (recentResultError) {
  console.error(
    'Unable to load recent venue results:',
    recentResultError
  );

  setRecentResults([]);
} else {
  setRecentResults(
    (recentResultData || []) as RecentVenueResult[]
  );
}

const {
  data: venuePerformanceData,
  error: venuePerformanceError,
} = await supabase
  .from('performances')
  .select(`
    id,
    singer_name,
    singer_profile_id,
    events!inner (
      venue_id
    )
  `)
  .eq('events.venue_id', data.id);

if (venuePerformanceError) {
  console.error(
    'Unable to load venue performers:',
    venuePerformanceError
  );

  setTopLocalSingers([]);
} else {
  const venuePerformances =
    venuePerformanceData || [];

  const performanceIds =
    venuePerformances.map(
      (performance) => performance.id
    );

  if (performanceIds.length === 0) {
    setTopLocalSingers([]);
  } else {
    const {
      data: venueVoteData,
      error: venueVoteError,
    } = await supabase
      .from('votes')
      .select(`
        performance_id,
        score
      `)
      .in(
        'performance_id',
        performanceIds
      );

    if (venueVoteError) {
      console.error(
        'Unable to load venue performer scores:',
        venueVoteError
      );

      setTopLocalSingers([]);
    } else {
      const performanceMap = new Map(
        venuePerformances.map(
          (performance) => [
            performance.id,
            performance,
          ]
        )
      );

      const singerStats = new Map<
        string,
        {
          id: string;
          singer_name: string;
          total_score: number;
          score_count: number;
          performance_ids: Set<string>;
        }
      >();

      (venueVoteData || []).forEach((vote) => {
        if (
          !vote.performance_id ||
          vote.score == null
        ) {
          return;
        }

        const performance =
          performanceMap.get(
            vote.performance_id
          );

        if (!performance) return;

        const normalizedName =
          performance.singer_name
            ?.trim()
            .toLowerCase();

        if (!normalizedName) return;

        const singerKey =
          performance.singer_profile_id ||
          normalizedName;

        const current =
          singerStats.get(singerKey) || {
            id: singerKey,
            singer_name:
              performance.singer_name,
            total_score: 0,
            score_count: 0,
            performance_ids:
              new Set<string>(),
          };

        current.total_score +=
          Number(vote.score);

        current.score_count += 1;

        current.performance_ids.add(
          performance.id
        );

        singerStats.set(
          singerKey,
          current
        );
      });

      const rankedSingers =
        Array.from(
          singerStats.values()
        )
          .filter(
            (singer) =>
              singer.score_count >= 3
          )
          .map((singer) => ({
            id: singer.id,
            singer_name:
              singer.singer_name,
            average_score:
              singer.total_score /
              singer.score_count,
            performance_count:
              singer.performance_ids.size,
            score_count:
              singer.score_count,
          }))
          .sort(
            (a, b) =>
              b.average_score -
                a.average_score ||
              b.performance_count -
                a.performance_count
          )
          .slice(0, 5);

      setTopLocalSingers(
        rankedSingers
      );
    }
  }
}

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

    const singersTonightCount =
  (currentPerformance ? 1 : 0) + upNext.length;

const waitingCount = upNext.length;

const liveActivity: LiveActivityItem[] = [];

if (currentPerformance) {
  liveActivity.push({
    id: `current-${currentPerformance.id}`,
    icon: '🎤',
    title: `${currentPerformance.singer_name} is performing`,
    detail: currentPerformance.song_title,
  });
}

upNext.forEach((singer, index) => {
  liveActivity.push({
    id: `waiting-${singer.id}`,
    icon: index === 0 ? '⏭' : '🎶',
    title:
      index === 0
        ? `${singer.singer_name} is up next`
        : `${singer.singer_name} is waiting`,
    detail: singer.song_title,
  });
});

if (liveEvent) {
  liveActivity.push({
    id: `event-${liveEvent.id}`,
    icon: '🟢',
    title: `${liveEvent.name} is live tonight`,
    detail: venue.name,
  });
}

async function toggleFollowVenue() {
  if (!venue?.id || followLoading) return;

  setFollowLoading(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('Please sign in to follow venues.');
      return;
    }

    const {
      data: singerProfileData,
      error: singerProfileError,
    } = await supabase
      .from('singer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (singerProfileError) {
      throw singerProfileError;
    }

    if (!singerProfileData?.id) {
      alert(
        'Create your My Stage profile before following venues.'
      );
      return;
    }

    if (isFollowing) {
      const { error } = await supabase
        .from('venue_follows')
        .delete()
        .eq('venue_id', venue.id)
        .eq(
          'singer_profile_id',
          singerProfileData.id
        );

      if (error) throw error;

      setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from('venue_follows')
        .insert({
          venue_id: venue.id,
          singer_profile_id:
            singerProfileData.id,
        });

      if (error) throw error;

      setIsFollowing(true);
    }
  } catch (error) {
    console.error(
      'Unable to update venue follow:',
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : 'Unable to update this venue.'
    );
  } finally {
    setFollowLoading(false);
  }
}

  return (
  <SVSingerShell
    title={venue.name}
    subtitle={
      [venue.city, venue.state]
        .filter(Boolean)
        .join(', ') || 'StageVotes Venue'
    }
  >
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
      <div className={styles.liveTonightHeader}>
        <div>
          <div className={styles.liveStatus}>
            <span className={styles.liveStatusDot} />
            Live Tonight
          </div>

          <h2>{liveEvent.name}</h2>
        </div>

        <div className={styles.liveTonightIcon}>
          🎤
        </div>
      </div>

      <div className={styles.liveTonightGrid}>
        <div className={styles.nowPerformingPanel}>
          {currentPerformance ? (
            <>
              <div className={styles.liveSectionLabel}>
                🎤 Now Performing
              </div>

              <h3 className={styles.currentSingerName}>
                {currentPerformance.singer_name}
              </h3>

              <div className={styles.currentSongTitle}>
                ♪ {currentPerformance.song_title}
              </div>
            </>
          ) : (
            <>
              <div className={styles.liveSectionLabel}>
                Show Status
              </div>

              <h3 className={styles.currentSingerName}>
                Karaoke is live
              </h3>

              <div className={styles.currentSongArtist}>
                Join tonight’s show at {venue.name}.
              </div>
            </>
          )}
        </div>

        <div className={styles.upNextPanel}>
          <div className={styles.liveSectionLabel}>
            ⏭ Up Next
          </div>

          {upNext.length > 0 ? (
            <div className={styles.upNextList}>
              {upNext.map((singer, index) => (
                <div
                  key={singer.id}
                  className={styles.upNextCard}
                >
                  <div className={styles.upNextPosition}>
                    {index + 1}
                  </div>

                  <div className={styles.upNextCopy}>
                    <strong>
                      {singer.singer_name}
                    </strong>

                    <span>
                      ♪ {singer.song_title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.upNextEmpty}>
              No singers are waiting yet.
            </div>
          )}
        </div>
      </div>

<div className={styles.liveStats}>
  <div className={styles.liveStat}>
    <strong>{singersTonightCount}</strong>

    <span>
      {singersTonightCount === 1
        ? 'Singer tonight'
        : 'Singers tonight'}
    </span>
  </div>

  <div className={styles.liveStat}>
    <strong>{waitingCount}</strong>

    <span>
      {waitingCount === 1
        ? 'Waiting'
        : 'Waiting'}
    </span>
  </div>

</div>

      <div className={styles.liveTonightFooter}>
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

{liveEvent && (
  <section className={styles.liveActivityCard}>
    <div className={styles.liveActivityHeader}>
      <div>
        <div className={styles.liveActivityEyebrow}>
          Current Show
        </div>

        <h2>What’s happening now</h2>
      </div>

      <span className={styles.liveActivityPulse}>
        <span />
        Live
      </span>
    </div>

    <div className={styles.liveActivityList}>
      {liveActivity.map((item) => (
        <div
          key={item.id}
          className={styles.liveActivityItem}
        >
          <div className={styles.liveActivityIcon}>
            {item.icon}
          </div>

          <div className={styles.liveActivityCopy}>
            <strong>{item.title}</strong>

            {item.detail && (
              <span>{item.detail}</span>
            )}
          </div>
        </div>
      ))}
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

           <button
  type="button"
  onClick={toggleFollowVenue}
  disabled={followLoading}
>
  {followLoading
    ? 'Saving...'
    : isFollowing
      ? '♥ Following'
      : '♡ Follow Venue'}
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

        <section className={styles.myVenueHistoryCard}>
  <div>
    <div className={styles.myVenueHistoryEyebrow}>
      Your History Here
    </div>

    <h2>
      Your karaoke story at {venue.name}
    </h2>

    <p>
      See how much time you have spent on this
      stage.
    </p>
  </div>

  <div className={styles.myVenueHistoryStats}>
    <div>
      <strong>
        {myVenueStats.performances}
      </strong>

      <span>Performances</span>
    </div>

    <div>
      <strong>
        {myVenueStats.averageScore !== null
          ? myVenueStats.averageScore.toFixed(2)
          : '—'}
      </strong>

      <span>Average Score</span>
    </div>

    <div>
      <strong>
        {isFollowing ? 'Yes' : 'No'}
      </strong>

      <span>Following</span>
    </div>
  </div>
</section>

{recentResults.length > 0 && (
  <section className={styles.recentResultsSection}>
    <div className={styles.sectionHeading}>
      <div>
        <div className={styles.sectionEyebrow}>
          Recent Results
        </div>

        <h2>Recently finished shows</h2>

        <p>
          Winners and crowd favorites from recent
          nights at {venue.name}.
        </p>
      </div>
    </div>

    <div className={styles.recentResultsGrid}>
      {recentResults.map((result) => (
        <article
          key={result.id}
          className={styles.recentResultCard}
        >
          <div className={styles.recentResultDate}>
            {new Date(
              result.finished_at
            ).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>

          <h3>
            {result.event_name ||
              'Karaoke Results'}
          </h3>

          <div className={styles.resultWinner}>
            <span>🏆 Judge Winner</span>

            <strong>
              {result.judge_winner_name ||
                'No judged winner'}
            </strong>

            {result.judge_score !== null && (
              <small>
                {Number(
                  result.judge_score
                ).toFixed(2)}{' '}
                average
              </small>
            )}
          </div>

          <div className={styles.resultPeopleChoice}>
            <span>❤️ People’s Choice</span>

            <strong>
              {result.peoples_choice_name ||
                'No audience winner'}
            </strong>

            {result.peoples_choice_name && (
              <small>
                {result.peoples_choice_votes}{' '}
                {result.peoples_choice_votes === 1
                  ? 'vote'
                  : 'votes'}
              </small>
            )}
          </div>

          <div className={styles.resultFooter}>
            <span>
              {result.total_performers}{' '}
              {result.total_performers === 1
                ? 'performer'
                : 'performers'}
            </span>

            <a
              href={`/leaderboard/${result.event_id}`}
            >
              View Results →
            </a>
          </div>
        </article>
      ))}
    </div>
  </section>
)}

<section className={styles.topSingersSection}>
  <div className={styles.sectionHeading}>
    <div>
      <div className={styles.topSingersEyebrow}>
        Local Standouts
      </div>

      <h2>Top singers at {venue.name}</h2>

      <p>
        Ranked by judged scores from performances
        at this venue.
      </p>
    </div>
  </div>

  {topLocalSingers.length > 0 ? (
    <div className={styles.topSingersList}>
      {topLocalSingers.map(
        (singer, index) => (
          <article
            key={singer.id}
            className={styles.topSingerRow}
          >
            <div className={styles.topSingerRank}>
              {index === 0
                ? '🥇'
                : index === 1
                  ? '🥈'
                  : index === 2
                    ? '🥉'
                    : `#${index + 1}`}
            </div>

            <div className={styles.topSingerCopy}>
              <strong>
                {singer.singer_name}
              </strong>

              <span>
                {singer.performance_count}{' '}
                {singer.performance_count === 1
                  ? 'scored performance'
                  : 'scored performances'}
              </span>
            </div>

            <div className={styles.topSingerScore}>
              <strong>
                {singer.average_score.toFixed(2)}
              </strong>

              <span>Average</span>
            </div>
          </article>
        )
      )}
    </div>
  ) : (
    <div className={styles.topSingersEmpty}>
      <div>🏆</div>

      <strong>
        Venue rankings are warming up
      </strong>

      <p>
        Top singers will appear after judged
        performances are completed here.
      </p>
    </div>
  )}
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
  </SVSingerShell>
  );
}