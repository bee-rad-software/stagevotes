'use client';

import {
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import SVSingerShell from '@/components/navigation/SVSingerShell';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LiveVenue = {
  eventId: string;
  venueId: string;
  name: string;
  slug: string;
  city: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  showName: string;
  currentSinger: string | null;
  currentSong: string | null;
  waitingCount: number;
};

type UpcomingShow = {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  showType: string;
  venueName: string;
  venueSlug: string;
  city: string;
  logoUrl: string | null;
};

type TrendingSinger = {
  key: string;
  singerName: string;
  averageScore: number;
  voteCount: number;
  performanceCount: number;
};

type RecentShow = {
  id: string;
  name: string;
  venueName: string;
  venueSlug: string;
  city: string;
  endedAt: string;
  coverPhotoUrl: string | null;
};

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatShowTime(time: string) {
  const [hourPart, minutePart = '00'] =
    time.split(':');

  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour)) {
    return time;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, '0')} ${period}`;
}

function formatRecentShowDate(
  dateValue: string
) {
  const date = new Date(dateValue);

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

export default function LiveTonightPage() {

const [liveVenues, setLiveVenues] =
  useState<LiveVenue[]>([]);

const [loading, setLoading] =
  useState(true);

const [error, setError] =
  useState('');

const [upcomingShows, setUpcomingShows] =
  useState<UpcomingShow[]>([]); 

const [trendingSingers, setTrendingSingers] =
  useState<TrendingSinger[]>([]);

const [recentShows, setRecentShows] =
  useState<RecentShow[]>([]);

useEffect(() => {
  loadLiveVenues();
}, []);

async function loadLiveVenues() {
  setLoading(true);
  setError('');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    /*
     * First load public, active venues.
     */
    const {
      data: venueData,
      error: venueError,
    } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        slug,
        city,
        state,
        logo_url,
        cover_photo_url
      `)
      .eq('is_public', true)
      .eq('is_active', true);

    if (venueError) {
      throw venueError;
    }

    if (!venueData?.length) {
      setLiveVenues([]);
      return;
    }

    const venueIds = venueData.map(
      (venue) => venue.id
    );

    const {
  data: recurringShowData,
  error: recurringShowError,
} = await supabase
  .from('venue_recurring_shows')
  .select(`
    id,
    title,
    day_of_week,
    start_time,
    show_type,
    venue_id
  `)
  .in('venue_id', venueIds)
  .eq('is_active', true)
  .order('day_of_week', {
    ascending: true,
  })
  .order('start_time', {
    ascending: true,
  });

if (recurringShowError) {
  console.error(
    'Unable to load upcoming shows:',
    recurringShowError
  );
  setUpcomingShows([]);
} else {
  const venueMap = new Map(
    venueData.map((venue) => [
      venue.id,
      venue,
    ])
  );

  const upcomingRows: UpcomingShow[] =
    (recurringShowData || [])
      .map((show) => {
        const venue = venueMap.get(
          show.venue_id
        );

        if (!venue) {
          return null;
        }

        return {
          id: show.id,
          title: show.title,
          dayOfWeek: show.day_of_week,
          startTime: show.start_time,
          showType: show.show_type,
          venueName: venue.name,
          venueSlug: venue.slug,
          city: [venue.city, venue.state]
            .filter(Boolean)
            .join(', '),
          logoUrl: venue.logo_url || null,
        };
      })
      .filter(
        (
          show
        ): show is UpcomingShow =>
          show !== null
      );

  setUpcomingShows(upcomingRows);
}

/*
 * Load completed events from the last 30 days
 * for the Trending Singers section.
 */
const thirtyDaysAgo = new Date();

thirtyDaysAgo.setDate(
  thirtyDaysAgo.getDate() - 30
);

const {
  data: recentEventData,
  error: recentEventError,
} = await supabase
  .from('events')
  .select(`
    id,
    created_at
  `)
  .eq('is_show_ended', true)
  .gte(
    'created_at',
    thirtyDaysAgo.toISOString()
  );

if (recentEventError) {
  console.error(
    'Unable to load recent shows:',
    recentEventError
  );

  setTrendingSingers([]);
} else {
  const recentEventIds =
    (recentEventData || []).map(
      (event) => event.id
    );

  if (recentEventIds.length === 0) {
    setTrendingSingers([]);
  } else {
    const {
      data: recentPerformanceData,
      error: recentPerformanceError,
    } = await supabase
      .from('performances')
      .select(`
        id,
        event_id,
        singer_name
      `)
      .in('event_id', recentEventIds)
      .eq('status', 'completed');

    if (recentPerformanceError) {
      console.error(
        'Unable to load recent performances:',
        recentPerformanceError
      );

      setTrendingSingers([]);
    } else {
      const performanceIds =
        (recentPerformanceData || []).map(
          (performance) => performance.id
        );

      if (performanceIds.length === 0) {
        setTrendingSingers([]);
      } else {
        const {
          data: recentVoteData,
          error: recentVoteError,
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

        if (recentVoteError) {
          console.error(
            'Unable to load recent votes:',
            recentVoteError
          );

          setTrendingSingers([]);
        } else {
          const performanceSingerMap =
            new Map(
              (recentPerformanceData || []).map(
                (performance) => [
                  performance.id,
                  performance.singer_name,
                ]
              )
            );

          const singerStats = new Map<
            string,
            {
              singerName: string;
              totalScore: number;
              voteCount: number;
              performanceIds: Set<string>;
            }
          >();

          (recentVoteData || []).forEach(
            (vote) => {
              if (
                !vote.performance_id ||
                vote.score == null
              ) {
                return;
              }

              const singerName =
                performanceSingerMap.get(
                  vote.performance_id
                );

              if (!singerName) {
                return;
              }

              const normalizedName =
                singerName
                  .trim()
                  .toLowerCase();

              const existing =
                singerStats.get(
                  normalizedName
                ) || {
                  singerName,
                  totalScore: 0,
                  voteCount: 0,
                  performanceIds:
                    new Set<string>(),
                };

              existing.totalScore +=
                Number(vote.score);

              existing.voteCount += 1;

              existing.performanceIds.add(
                vote.performance_id
              );

              singerStats.set(
                normalizedName,
                existing
              );
            }
          );

          const trendingRows =
            Array.from(
              singerStats.entries()
            )
              .map(([key, stats]) => ({
                key,
                singerName:
                  stats.singerName,
                averageScore:
                  stats.voteCount > 0
                    ? stats.totalScore /
                      stats.voteCount
                    : 0,
                voteCount:
                  stats.voteCount,
                performanceCount:
                  stats.performanceIds
                    .size,
              }))
              // Avoid ranking someone from
              // only one or two individual votes.
              .filter(
                (singer) =>
                  singer.voteCount >= 3
              )
              .sort(
                (a, b) =>
                  b.averageScore -
                    a.averageScore ||
                  b.voteCount -
                    a.voteCount ||
                  b.performanceCount -
                    a.performanceCount
              )
              .slice(0, 5);

          setTrendingSingers(
            trendingRows
          );
        }
      }
    }
  }
}

/*
 * Load recently finished public venue shows.
 */
const {
  data: finishedEventData,
  error: finishedEventError,
} = await supabase
  .from('events')
  .select(`
    id,
    name,
    venue_id,
    created_at
  `)
  .in('venue_id', venueIds)
  .eq('is_show_ended', true)
  .order('created_at', {
    ascending: false,
  })
  .limit(6);

if (finishedEventError) {
  console.error(
    'Unable to load recently finished shows:',
    finishedEventError
  );

  setRecentShows([]);
} else {
  const recentShowRows: RecentShow[] =
    (finishedEventData || [])
      .map((event) => {
        const venue = venueData.find(
          (item) =>
            item.id === event.venue_id
        );

        if (!venue) {
          return null;
        }

        return {
          id: event.id,
          name: event.name,
          venueName: venue.name,
          venueSlug: venue.slug,
          city:
            [venue.city, venue.state]
              .filter(Boolean)
              .join(', ') ||
            'Location not listed',
          endedAt: event.created_at,
          coverPhotoUrl:
            venue.cover_photo_url || null,
        };
      })
      .filter(
        (
          show
        ): show is RecentShow =>
          show !== null
      );

  setRecentShows(recentShowRows);
}

    /*
     * Load today's active events for those venues.
     */
    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from('events')
      .select(`
        id,
        name,
        venue_id,
        current_performance_id,
        created_at
      `)
      .in('venue_id', venueIds)
      .eq('is_show_ended', false)
      .gte(
        'created_at',
        today.toISOString()
      )
      .lt(
        'created_at',
        tomorrow.toISOString()
      )
      .order('created_at', {
        ascending: false,
      });

    if (eventError) {
      throw eventError;
    }

    if (!eventData?.length) {
      setLiveVenues([]);
      return;
    }

    /*
     * Keep only the newest active event
     * for each venue.
     */
    const newestEventByVenue =
      new Map<string, typeof eventData[number]>();

    eventData.forEach((event) => {
      if (
        event.venue_id &&
        !newestEventByVenue.has(
          event.venue_id
        )
      ) {
        newestEventByVenue.set(
          event.venue_id,
          event
        );
      }
    });

    const activeEvents = Array.from(
      newestEventByVenue.values()
    );

    const eventIds = activeEvents.map(
      (event) => event.id
    );

    /*
     * Load every active performance for
     * the live events.
     */
    const {
      data: performanceData,
      error: performanceError,
    } = await supabase
      .from('performances')
      .select(`
        id,
        event_id,
        singer_name,
        song_title,
        status,
        queue_order
      `)
      .in('event_id', eventIds)
      .neq('status', 'completed')
      .order('queue_order', {
        ascending: true,
      });

    if (performanceError) {
      throw performanceError;
    }

    const venueMap = new Map(
      venueData.map((venue) => [
        venue.id,
        venue,
      ])
    );

    const performanceMap = new Map(
      (performanceData || []).map(
        (performance) => [
          performance.id,
          performance,
        ]
      )
    );

    const performancesByEvent =
      new Map<string, typeof performanceData>();

    (performanceData || []).forEach(
      (performance) => {
        const existing =
          performancesByEvent.get(
            performance.event_id
          ) || [];

        performancesByEvent.set(
          performance.event_id,
          [...existing, performance]
        );
      }
    );

    const directoryRows =
  activeEvents
    .map<LiveVenue | null>((event) => {
          const venue = venueMap.get(
            event.venue_id
          );

          if (!venue) {
            return null;
          }

          const currentPerformance =
            event.current_performance_id
              ? performanceMap.get(
                  event.current_performance_id
                )
              : null;

          const eventPerformances =
            performancesByEvent.get(
              event.id
            ) || [];

          const waitingPerformances =
            eventPerformances.filter(
              (performance) =>
                performance.id !==
                event.current_performance_id
            );

          const city = [
            venue.city,
            venue.state,
          ]
            .filter(Boolean)
            .join(', ');

          return {
            eventId: event.id,
            venueId: venue.id,
            name: venue.name,
            slug: venue.slug,
            city:
              city || 'Location not listed',
            logoUrl:
              venue.logo_url || null,
            coverPhotoUrl:
              venue.cover_photo_url || null,
            showName: event.name,
            currentSinger:
              currentPerformance
                ?.singer_name || null,
            currentSong:
              currentPerformance
                ?.song_title || null,
            waitingCount:
              waitingPerformances.length,
          };
        })
        .filter(
          (
            venue
          ): venue is LiveVenue =>
            venue !== null
        );

    setLiveVenues(directoryRows);
  } catch (loadError) {
    console.error(
      'Unable to load live venues:',
      loadError
    );

    setError(
      'Unable to load tonight’s live shows.'
    );
  } finally {
    setLoading(false);
  }
}

const featuredVenue = liveVenues[0];

const otherVenues = liveVenues.slice(1);

  return (
  <SVSingerShell
    title="Atlas"
    subtitle="Discover karaoke near you"
  >
    <main className="atlas-page">
      <section className="atlas-live-hero">


        <h1>Live Tonight</h1>

        <p>
          Find a StageVotes venue, see who is
          singing, and join the queue.
        </p>
      </section>

        {loading && (
  <section className="atlas-live-state">
    <div className="atlas-live-loader" />

    <strong>
      Finding live karaoke…
    </strong>
  </section>
)}

{!loading && error && (
  <section className="atlas-live-state">
    <span>⚠️</span>

    <strong>{error}</strong>
  </section>
)}

{!loading &&
  !error &&
  liveVenues.length === 0 && (
    <section className="atlas-live-state">
      <span>🎤</span>

      <strong>
        No StageVotes shows are live yet.
      </strong>

      <p>
        Check back later tonight.
      </p>
    </section>
  )}

    {!loading &&
  !error &&
  featuredVenue && (
    <>
      <section
  className={[
    'atlas-featured-live',
    featuredVenue.coverPhotoUrl
      ? 'atlas-featured-live-has-photo'
      : '',
  ]
    .filter(Boolean)
    .join(' ')}
  style={
    featuredVenue.coverPhotoUrl
      ? {
          backgroundImage: `
  linear-gradient(
    90deg,
    rgba(2, 6, 23, 0.98) 0%,
    rgba(2, 6, 23, 0.9) 34%,
    rgba(2, 6, 23, 0.64) 62%,
    rgba(2, 6, 23, 0.32) 100%
  ),
  url("${featuredVenue.coverPhotoUrl}")
`,
        }
      : undefined
  }
>
        <div className="atlas-featured-pill">
          ⭐ Featured Live
        </div>

        <div className="atlas-featured-header">
          <div>
            <div className="atlas-live-show-name">
              {featuredVenue.showName}
            </div>

            <h2>
  <Link
    href={`/venues/${featuredVenue.slug}`}
    className="atlas-featured-venue-link"
  >
    {featuredVenue.name}
  </Link>
</h2>

            <p>{featuredVenue.city}</p>
          </div>

          <div className="atlas-live-pill">
            <span />
            Live
          </div>
        </div>

        <div className="atlas-featured-now">
          <div className="atlas-live-label">
            Now Performing
          </div>

          <h3>
            {featuredVenue.currentSinger ||
              'Show is getting started'}
          </h3>

          {featuredVenue.currentSong && (
            <p>
              ♪ {featuredVenue.currentSong}
            </p>
          )}
        </div>

        <div className="atlas-featured-footer">
          <div className="atlas-featured-meta">
  <span>
    👥 {featuredVenue.waitingCount}{' '}
    {featuredVenue.waitingCount === 1
      ? 'singer waiting'
      : 'singers waiting'}
  </span>

  <span>
    📍 {featuredVenue.city}
  </span>

  <span>
    🟢 Live right now
  </span>
</div>

          <div className="atlas-featured-actions">
            <Link
              href={`/venues/${featuredVenue.slug}`}
              className="atlas-live-secondary"
            >
              View Venue
            </Link>

            <Link
              href={`/signup/${featuredVenue.eventId}`}
              className="atlas-featured-button"
            >
              Join Live Show
            </Link>
          </div>
        </div>
      </section>

      {otherVenues.length > 0 && (
        <>
          <div className="atlas-live-section-heading">
            <h2>More Live Shows</h2>

            <span>
              {otherVenues.length}{' '}
              {otherVenues.length === 1
                ? 'venue'
                : 'venues'}
            </span>
          </div>

          <section className="atlas-live-grid">
            {otherVenues.map((venue) => (
              <article
                key={venue.eventId}
                className="atlas-live-card"
              >
                <div className="atlas-live-card-header">
                  <div className="atlas-live-venue-logo">
                   <Link
  href={`/venues/${venue.slug}`}
  className="atlas-live-venue-logo"
  aria-label={`View ${venue.name}`}
>
  {venue.logoUrl ? (
    <img
      src={venue.logoUrl}
      alt={`${venue.name} logo`}
    />
  ) : (
    venue.name
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  )}
</Link>
                  </div>

                  <div className="atlas-live-pill">
                    <span />
                    Live
                  </div>
                </div>

                <div className="atlas-live-card-copy">
                  <div className="atlas-live-show-name">
                    {venue.showName}
                  </div>

                 <h2>
  <Link
    href={`/venues/${venue.slug}`}
    className="atlas-live-venue-name-link"
  >
    {venue.name}
  </Link>
</h2>

                  <p>{venue.city}</p>
                </div>

                <div className="atlas-live-now">
                  <div className="atlas-live-label">
                    Now Performing
                  </div>

                  <strong>
                    {venue.currentSinger ||
                      'Show is getting started'}
                  </strong>

                  {venue.currentSong && (
                    <span>
                      ♪ {venue.currentSong}
                    </span>
                  )}
                </div>

                <div className="atlas-live-waiting">
                  <strong>{venue.waitingCount}</strong>

                  <span>
                    {venue.waitingCount === 1
                      ? 'Singer waiting'
                      : 'Singers waiting'}
                  </span>
                </div>

                <div className="atlas-live-actions">
                  <Link
                    href={`/venues/${venue.slug}`}
                    className="atlas-live-secondary"
                  >
                    View Venue
                  </Link>

                  <Link
                    href={`/signup/${venue.eventId}`}
                    className="atlas-live-primary"
                  >
                    Join Live Show
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </>
  )}

{!loading &&
  !error &&
  upcomingShows.length > 0 && (
    <section className="atlas-upcoming-section">
      <div className="atlas-upcoming-heading">
        <div>
          <div className="atlas-upcoming-eyebrow">
            This Week
          </div>

          <h2>Upcoming Karaoke Nights</h2>

          <p>
            Plan your next night out at a
            StageVotes venue.
          </p>
        </div>

        <span>
          {upcomingShows.length}{' '}
          {upcomingShows.length === 1
            ? 'show'
            : 'shows'}
        </span>
      </div>

      <div className="atlas-upcoming-grid">
        {upcomingShows.map((show) => (
          <article
            key={show.id}
            className="atlas-upcoming-card"
          >
            <div className="atlas-upcoming-card-top">
              <div className="atlas-upcoming-logo">
                {show.logoUrl ? (
                  <img
                    src={show.logoUrl}
                    alt={`${show.venueName} logo`}
                  />
                ) : (
                  show.venueName
                    .split(/\s+/)
                    .map((word) => word[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>

              <div className="atlas-upcoming-type">
                {show.showType ||
                  'Karaoke Night'}
              </div>
            </div>

            <div className="atlas-upcoming-date">
              <strong>
                {dayNames[show.dayOfWeek] ||
                  'Upcoming'}
              </strong>

              <span>
                {formatShowTime(show.startTime)}
              </span>
            </div>

            <h3>{show.title}</h3>

            <div className="atlas-upcoming-venue">
              {show.venueName}
            </div>

            <div className="atlas-upcoming-city">
              📍 {show.city ||
                'Location not listed'}
            </div>

            <Link
              href={`/venues/${show.venueSlug}`}
              className="atlas-upcoming-link"
            >
              View Venue
            </Link>
          </article>
        ))}
      </div>
    </section>
  )}

  {!loading && !error && (
    <section className="atlas-trending-section">
      <div className="atlas-trending-heading">
        <div>
          <div className="atlas-trending-eyebrow">
            Recent Momentum
          </div>

          <h2>Trending Singers</h2>

          <p>
            Top recent performers across
            completed StageVotes shows.
          </p>
        </div>

        <span>
          Last 30 days
        </span>
      </div>

      {trendingSingers.length > 0 ? (
  <div className="atlas-trending-grid">
    {trendingSingers.map(
      (singer, index) => (
        <article
          key={singer.key}
          className={[
            'atlas-trending-card',
            index === 0
              ? 'atlas-trending-card-top'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="atlas-trending-rank">
            {index === 0
              ? '🔥'
              : `#${index + 1}`}
          </div>

          <div className="atlas-trending-avatar">
            {singer.singerName
              .split(/\s+/)
              .map((word) => word[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="atlas-trending-copy">
            <h3>{singer.singerName}</h3>

            <div className="atlas-trending-score">
              {singer.averageScore.toFixed(2)}
              <span> / 5</span>
            </div>

            <div className="atlas-trending-meta">
              <span>
                {singer.performanceCount}{' '}
                performances
              </span>

              <span>
                {singer.voteCount} votes
              </span>
            </div>
          </div>
        </article>
      )
    )}
  </div>
) : (
  <div className="atlas-trending-empty">
    <div className="atlas-trending-empty-icon">
      🔥
    </div>

    <div>
      <strong>
        Rankings are warming up
      </strong>

      <p>
        Trending singers will appear after
        your first judged karaoke shows.
      </p>
    </div>
  </div>
)}
    </section>
  )}

{!loading &&
  !error &&
  recentShows.length > 0 && (
    <section className="atlas-results-section">
      <div className="atlas-results-heading">
        <div>
          <div className="atlas-results-eyebrow">
            Recent Results
          </div>

          <h2>Recently Finished Shows</h2>

          <p>
            Catch up on recent StageVotes
            karaoke nights.
          </p>
        </div>

        <span>
          {recentShows.length}{' '}
          {recentShows.length === 1
            ? 'show'
            : 'shows'}
        </span>
      </div>

      <div className="atlas-results-grid">
        {recentShows.map((show) => (
          <article
            key={show.id}
            className="atlas-results-card"
          >
            {show.coverPhotoUrl && (
              <div
                className="atlas-results-photo"
                style={{
                  backgroundImage: `
                    linear-gradient(
                      180deg,
                      rgba(2, 6, 23, 0.08),
                      rgba(2, 6, 23, 0.9)
                    ),
                    url("${show.coverPhotoUrl}")
                  `,
                }}
              />
            )}

            <div className="atlas-results-content">
              <div className="atlas-results-date">
                {formatRecentShowDate(
                  show.endedAt
                )}
              </div>

              <h3>{show.name}</h3>

              <strong>
                {show.venueName}
              </strong>

              <span>
                📍 {show.city}
              </span>

              <div className="atlas-results-actions">
                <Link
                  href={`/awards/${show.id}`}
                  className="atlas-results-primary"
                >
                  View Results
                </Link>

                <Link
                  href={`/venues/${show.venueSlug}`}
                  className="atlas-results-secondary"
                >
                  Venue
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )}

       </main>
  </SVSingerShell>
);
}