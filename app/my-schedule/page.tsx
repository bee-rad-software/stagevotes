'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import { supabase } from '@/lib/supabase';
import {
  mergeShowPlans,
  parseShowPlans,
  readLocalShowPlans,
  showPlansMetadataKey,
  writeLocalShowPlans,
  type SingerShowPlan,
} from '@/lib/singerShowPlans';
import styles from './schedule.module.css';

type ScheduledShow = {
  id: string;
  title: string;
  showType: string | null;
  startTime: string;
  dayOfWeek: number;
  date: string;
  venueName: string;
  venueSlug: string;
  city: string;
  logoUrl: string | null;
};

function nextDate(dayOfWeek: number, startTime: string) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + (dayOfWeek - date.getDay() + 7) % 7);
  const [hour, minute] = startTime.split(':').map(Number);
  if (date.getTime() + hour * 3600000 + minute * 60000 < now.getTime()) {
    date.setDate(date.getDate() + 7);
  }
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

function displayTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

export default function MySchedulePage() {
  const [shows, setShows] = useState<ScheduledShow[]>([]);
  const [plans, setPlans] = useState<SingerShowPlan[]>([]);
  const [identity, setIdentity] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const accountId = user?.id || 'guest';
      const cloudPlans = parseShowPlans(user?.user_metadata?.[showPlansMetadataKey]);
      const guestPlans = user ? readLocalShowPlans('guest') : [];
      const savedPlans = mergeShowPlans(cloudPlans, readLocalShowPlans(accountId), guestPlans);

      if (user && guestPlans.length) {
        const { error } = await supabase.auth.updateUser({
          data: { [showPlansMetadataKey]: savedPlans },
        });
        if (!error) {
          writeLocalShowPlans('guest', []);
        }
      }

      const { data: venues, error: venueError } = await supabase.from('venues')
        .select('id, name, slug, city, state, logo_url')
        .eq('is_public', true).eq('is_active', true);
      if (cancelled) return;
      setIdentity(accountId);
      setPlans(savedPlans);
      if (user) writeLocalShowPlans(accountId, savedPlans);
      if (venueError) {
        setMessage('Could not load upcoming shows. Please try again.');
        setLoading(false);
        return;
      }

      if (venues?.length) {
        const { data: recurring, error } = await supabase.from('venue_recurring_shows')
          .select('id, title, show_type, day_of_week, start_time, venue_id')
          .in('venue_id', venues.map((venue) => venue.id)).eq('is_active', true);
        if (cancelled) return;
        if (error) {
          setMessage('Could not load upcoming shows. Please try again.');
        } else {
          const byVenue = new Map(venues.map((venue) => [venue.id, venue]));
          setShows((recurring || []).flatMap((show) => {
            const venue = byVenue.get(show.venue_id);
            if (!venue || show.day_of_week == null || !show.start_time) return [];
            return [{
              id: show.id, title: show.title, showType: show.show_type,
              startTime: show.start_time, dayOfWeek: show.day_of_week,
              date: nextDate(show.day_of_week, show.start_time),
              venueName: venue.name, venueSlug: venue.slug,
              city: [venue.city, venue.state].filter(Boolean).join(', '),
              logoUrl: venue.logo_url,
            }];
          }).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)));
        }
      }
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const selectedShows = useMemo(() => {
    const today = new Date();
    const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')].join('-');
    return plans.filter((plan) => plan.date >= todayKey).flatMap((plan) => {
      const show = shows.find((entry) => entry.id === plan.showId);
      return show ? [{ ...show, date: plan.date }] : [];
    }).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [shows, plans]);

  async function togglePlan(show: ScheduledShow) {
    const key = `${show.id}:${show.date}`;
    if (busy) return;
    setBusy(key);
    setMessage('');
    const selected = plans.some((plan) => `${plan.showId}:${plan.date}` === key);
    const updated = selected
      ? plans.filter((plan) => `${plan.showId}:${plan.date}` !== key)
      : mergeShowPlans(plans, [{ showId: show.id, date: show.date }]);

    try {
      writeLocalShowPlans(identity, updated);
      setPlans(updated);
      if (identity !== 'guest') {
        const { error } = await supabase.auth.updateUser({
          data: { [showPlansMetadataKey]: updated },
        });
        if (error) setMessage('Saved on this device, but your account did not sync. Try again later.');
      }
    } catch {
      setMessage('Could not save your choice on this device.');
    } finally {
      setBusy('');
    }
  }

  function showCard(show: ScheduledShow) {
    const selected = plans.some((plan) => plan.showId === show.id && plan.date === show.date);
    const date = new Date(`${show.date}T12:00:00`);
    return (
      <article className={`${styles.card} ${selected ? styles.selected : ''}`} key={`${show.id}:${show.date}`}>
        <div className={styles.cardTop}>
          <span className={styles.date}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span className={styles.time}>{displayTime(show.startTime)}</span>
        </div>
        <div className={styles.cardBody}>
          {show.logoUrl && <img className={styles.logo} src={show.logoUrl} alt="" />}
          <div>
            <span className={styles.type}>{show.showType || 'Karaoke night'}</span>
            <h3>{show.title}</h3>
            <p>{show.venueName}{show.city ? ` · ${show.city}` : ''}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" disabled={Boolean(busy)} onClick={() => void togglePlan(show)}
            aria-pressed={selected}>
            {busy === `${show.id}:${show.date}` ? 'Saving…' : selected ? '✓ Saved · Remove' : '+ Add to My Schedule'}
          </button>
          <Link href={`/venues/${show.venueSlug}`}>Venue details →</Link>
        </div>
      </article>
    );
  }

  return (
    <SVSingerShell title="My Schedule" subtitle="Plan your next karaoke night">
      <div className={styles.page}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>YOUR NEXT NIGHT OUT</span>
          <h1>My Schedule</h1>
          <p>Find an upcoming show and choose the nights you plan to attend.</p>
          <Link href="/live">See what’s live tonight →</Link>
        </header>

        {message && <p className={styles.message} role="status">{message}</p>}
        {loading ? <p className={styles.message}>Loading upcoming shows…</p> : (
          <>
            <section className={styles.section}>
              <div className={styles.heading}><h2>My upcoming nights</h2><span>{selectedShows.length}</span></div>
              {selectedShows.length ? <div className={styles.grid}>{selectedShows.map(showCard)}</div> :
                <p className={styles.empty}>Nothing planned yet. Add a show below to keep it here.</p>}
            </section>
            <section className={styles.section}>
              <div className={styles.heading}><h2>Explore upcoming shows</h2><span>{shows.length}</span></div>
              {shows.length ? <div className={styles.grid}>{shows.filter((show) =>
                !selectedShows.some((selected) => selected.id === show.id && selected.date === show.date)
              ).map(showCard)}</div> :
                <p className={styles.empty}>No upcoming shows are listed yet. Check back soon or see what’s live tonight.</p>}
            </section>
            <p className={styles.note}>Your schedule is a personal plan; joining a show still happens on the night. Recurring shows display their next date, and saving one date does not save every week. {identity === 'guest'
              ? 'Sign in to keep your plans across devices.' : 'Your plans are saved to your singer account.'}</p>
          </>
        )}
      </div>
    </SVSingerShell>
  );
}
