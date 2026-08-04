'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import { supabase } from '@/lib/supabase';

type MyVenue = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  followed_at: string;
  performanceCount: number;
  averageScore: number | null;
  liveEventId: string | null;
};

export default function MyVenuesPage() {
  const [venues, setVenues] = useState<MyVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadMyVenues() {
      setLoading(true);
      setMessage('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage(
          'Sign in to see the venues you follow.'
        );
        setLoading(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('singer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          'Unable to load singer profile:',
          profileError
        );

        setMessage(
          'We could not load your singer profile.'
        );
        setLoading(false);
        return;
      }

      if (!profile?.id) {
        setMessage(
          'Create your My Stage profile to follow venues.'
        );
        setLoading(false);
        return;
      }

      const {
        data: followData,
        error: followError,
      } = await supabase
        .from('venue_follows')
        .select(`
          created_at,
          venues (
            id,
            name,
            slug,
            city,
            state,
            logo_url,
            cover_photo_url
          )
        `)
        .eq('singer_profile_id', profile.id)
        .order('created_at', {
          ascending: false,
        });

      if (followError) {
        console.error(
          'Unable to load followed venues:',
          followError
        );

        setMessage(
          'We could not load your venues.'
        );
        setLoading(false);
        return;
      }

      const venueIds = (followData || [])
        .map((follow: any) => follow.venues?.id)
        .filter(Boolean);

      const liveEventMap = new Map<string, string>();

if (venueIds.length > 0) {
  const { data: liveEventData, error: liveEventError } =
    await supabase
      .from('events')
      .select('id, venue_id')
      .in('venue_id', venueIds)
      .eq('is_show_ended', false);

  if (liveEventError) {
    console.error(
      'Unable to load live venue shows:',
      liveEventError
    );
  } else {
    (liveEventData || []).forEach((event) => {
      if (event.venue_id) {
        liveEventMap.set(
          event.venue_id,
          event.id
        );
      }
    });
  }
}

const performanceCounts =
  new Map<string, number>();

const venueScoreStats = new Map<
  string,
  {
    total: number;
    count: number;
  }
>();

if (venueIds.length > 0) {
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
      profile.id
    )
    .in(
      'events.venue_id',
      venueIds
    );

  if (performanceError) {
    console.error(
      'Unable to load venue performances:',
      performanceError
    );
  } else {
    const performanceVenueMap =
      new Map<string, string>();

    (performanceData || []).forEach(
      (performance: any) => {
        const venueId =
          performance.events?.venue_id;

        if (!venueId) return;

        performanceVenueMap.set(
          performance.id,
          venueId
        );

        performanceCounts.set(
          venueId,
          (performanceCounts.get(venueId) || 0) +
            1
        );
      }
    );

    const performanceIds = Array.from(
      performanceVenueMap.keys()
    );

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
          'Unable to load venue scores:',
          voteError
        );
      } else {
        (voteData || []).forEach((vote) => {
          if (
            !vote.performance_id ||
            vote.score == null
          ) {
            return;
          }

          const venueId =
            performanceVenueMap.get(
              vote.performance_id
            );

          if (!venueId) return;

          const current =
            venueScoreStats.get(venueId) || {
              total: 0,
              count: 0,
            };

          current.total += Number(vote.score);
          current.count += 1;

          venueScoreStats.set(
            venueId,
            current
          );
        });
      }
    }
  }
}

      const rows: MyVenue[] =
        (followData || [])
          .map((follow: any) => {
            const venue = follow.venues;

            if (!venue) return null;

            return {
              id: venue.id,
              name: venue.name,
              slug: venue.slug,
              city: venue.city,
              state: venue.state,
              logo_url: venue.logo_url,
              cover_photo_url:
                venue.cover_photo_url,
              followed_at:
                follow.created_at,
              performanceCount:
  performanceCounts.get(venue.id) || 0,

averageScore: (() => {
  const scoreStats =
    venueScoreStats.get(venue.id);

  if (
    !scoreStats ||
    scoreStats.count === 0
  ) {
    return null;
  }

  return (
    scoreStats.total /
    scoreStats.count
  );
})(),

liveEventId:
  liveEventMap.get(venue.id) || null,
            };
          })
          .filter(
            (venue): venue is MyVenue =>
              venue !== null
          );

      setVenues(rows);
      setLoading(false);
    }

    loadMyVenues();
  }, []);

  return (
    <SVSingerShell
      title="My Venues"
      subtitle="The places you follow"
    >
      <main className="sv-my-venues-page">
        <section className="sv-my-venues-hero">
          <div>
            <span>My Karaoke Map</span>
            <h1>My Venues</h1>
            <p>
             Your favorite karaoke venues,
all in one place.
            </p>
          </div>

          <Link
            href="/live"
            className="sv-my-venues-discover"
          >
            Discover Venues
          </Link>
        </section>

        {loading ? (
          <div className="sv-my-venues-empty">
            Loading your venues...
          </div>
        ) : venues.length > 0 ? (
          <section className="sv-my-venues-grid">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
                className="sv-my-venue-card"
              >
                <div
                  className="sv-my-venue-photo"
                  style={
                    venue.cover_photo_url
                      ? {
                          backgroundImage: `
                            linear-gradient(
                              180deg,
                              rgba(2, 6, 23, 0.08),
                              rgba(2, 6, 23, 0.92)
                            ),
                            url("${venue.cover_photo_url}")
                          `,
                        }
                      : undefined
                  }
                >
                  <div className="sv-my-venue-logo">
                    {venue.logo_url ? (
                      <img
                        src={venue.logo_url}
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
                  </div>
                </div>

                <div className="sv-my-venue-content">
                 <div className="sv-my-venue-card-status">
  <div className="sv-my-venue-following">
    ♥ Following
  </div>

  {venue.liveEventId && (
    <div className="sv-my-venue-live">
      <span />
      Live Now
    </div>
  )}
</div>

                  <h2>{venue.name}</h2>

                  <p>
                    📍{' '}
                    {[venue.city, venue.state]
                      .filter(Boolean)
                      .join(', ') ||
                      'Location not listed'}
                  </p>

                  <div className="sv-my-venue-stats">
  <div>
    <strong>
      {venue.performanceCount}
    </strong>

    <span>
      {venue.performanceCount === 1
        ? 'Performance'
        : 'Performances'}
    </span>
  </div>

  <div>
    <strong>
      {venue.averageScore !== null
        ? venue.averageScore.toFixed(2)
        : '—'}
    </strong>

    <span>Average Score</span>
  </div>
</div>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <div className="sv-my-venues-empty">
            <div>📍</div>

            <h2>No followed venues yet</h2>

            <p>
              Follow venues from Atlas to build
              your personal karaoke map.
            </p>

            <Link href="/live">
              Explore Atlas
            </Link>
          </div>
        )}

        {message && (
          <div className="sv-my-venues-empty">
            {message}
          </div>
        )}
      </main>
    </SVSingerShell>
  );
}