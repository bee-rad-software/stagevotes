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

export default function VenueProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [shows, setShows] = useState<RecurringShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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