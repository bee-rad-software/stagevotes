'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import { supabase } from '@/lib/supabase';
import styles from '../my-schedule/schedule.module.css';

type FinishedNight = {
  eventId: string;
  name: string;
  date: string;
  venueName: string;
  venueSlug: string;
  city: string;
  songCount: number;
};

export default function MyHistoryPage() {
  const [nights, setNights] = useState<FinishedNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceId = window.localStorage.getItem('karavote_device_id');
      const { data: profile } = user ? await supabase.from('singer_profiles')
        .select('id').eq('user_id', user.id).maybeSingle() : { data: null };

      if (!profile?.id && !deviceId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const queries = [];
      if (profile?.id) queries.push(supabase.from('performances')
        .select('id, event_id').eq('singer_profile_id', profile.id).eq('status', 'completed'));
      if (deviceId) queries.push(supabase.from('performances')
        .select('id, event_id').eq('device_id', deviceId).eq('status', 'completed'));
      const performances = await Promise.all(queries);
      if (cancelled) return;
      if (performances.some((result) => result.error)) {
        setError('Could not load your show history. Please try again.');
        setLoading(false);
        return;
      }

      const byEvent = new Map<string, Set<string>>();
      performances.flatMap((result) => result.data || []).forEach((performance) => {
        const ids = byEvent.get(performance.event_id) || new Set<string>();
        ids.add(performance.id);
        byEvent.set(performance.event_id, ids);
      });
      if (!byEvent.size) {
        setLoading(false);
        return;
      }

      const { data: events, error: eventError } = await supabase.from('events')
        .select('id, name, created_at, venue_id')
        .in('id', [...byEvent.keys()]).eq('is_show_ended', true);
      if (cancelled) return;
      if (eventError) {
        setError('Could not load your show history. Please try again.');
        setLoading(false);
        return;
      }

      const venueIds = [...new Set((events || []).map((event) => event.venue_id).filter(Boolean))];
      if (venueIds.length) {
        const { data: venues, error: venueError } = await supabase.from('venues')
          .select('id, name, slug, city, state')
          .in('id', venueIds).eq('is_public', true).eq('is_active', true);
        if (cancelled) return;
        if (venueError) {
          setError('Could not load your show history. Please try again.');
        } else {
          const venueById = new Map((venues || []).map((venue) => [venue.id, venue]));
          setNights((events || []).flatMap((event) => {
            const venue = venueById.get(event.venue_id);
            if (!venue) return [];
            return [{
              eventId: event.id, name: event.name, date: event.created_at,
              venueName: venue.name, venueSlug: venue.slug,
              city: [venue.city, venue.state].filter(Boolean).join(', '),
              songCount: byEvent.get(event.id)?.size || 0,
            }];
          }).sort((a, b) => b.date.localeCompare(a.date)));
        }
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <SVSingerShell title="My History" subtitle="Relive the nights you sang">
      <div className={styles.page}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>YOUR KARAOKE STORY</span>
          <h1>My History</h1>
          <p>Every finished show where you sang, with your songs, badges, and the full setlist.</p>
          <Link href="/my-schedule">Plan your next night →</Link>
        </header>

        {loading ? <p className={styles.message}>Finding your past shows…</p> : error ?
          <p className={styles.message} role="alert">{error}</p> : (
            <section className={styles.section}>
              <div className={styles.heading}><h2>Nights on stage</h2><span>{nights.length}</span></div>
              {nights.length ? <div className={styles.grid}>{nights.map((night) => (
                <article className={styles.card} key={night.eventId}>
                  <span className={styles.date}>{new Date(night.date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })}</span>
                  <h3>{night.name}</h3>
                  <p>{night.venueName}{night.city ? ` · ${night.city}` : ''}</p>
                  <span className={styles.songCount}>{night.songCount} {night.songCount === 1 ? 'song sung' : 'songs sung'}</span>
                  <div className={styles.actions}>
                    <Link className={styles.primaryLink} href={`/shows/${night.eventId}`}>See my recap →</Link>
                    <Link href={`/venues/${night.venueSlug}`}>Venue details →</Link>
                  </div>
                </article>
              ))}</div> : <p className={styles.empty}>Your history will appear here after you sing at a finished show. Guest performances show on the device you used to join; sign in to see songs linked to your singer profile.</p>}
            </section>
          )}
      </div>
    </SVSingerShell>
  );
}
