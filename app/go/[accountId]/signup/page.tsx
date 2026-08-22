'use client';

import { useEffect } from 'react';
import {
  useParams,
  useRouter,
} from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StaticSignupRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    loadCurrentEvent();
  }, []);

  async function loadCurrentEvent() {
    const accountId =
      params.accountId as string;

    /*
     * First check the venue's saved current event.
     */
    const {
      data: venue,
      error: venueError,
    } = await supabase
      .from('venues')
      .select('current_event_id')
      .eq('account_id', accountId)
      .not('current_event_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (venueError) {
      console.error(
        'Unable to resolve static signup venue:',
        venueError
      );
    }

    /*
     * Use the saved event ONLY if it is:
     *
     * 1. Active
     * 2. Not archived
     * 3. Not ended
     * 4. NOT a tournament
     */
    if (venue?.current_event_id) {
      const {
        data: currentEvent,
      } = await supabase
        .from('events')
        .select(
          'id, is_archived, is_show_ended, competition_mode'
        )
        .eq(
          'id',
          venue.current_event_id
        )
        .eq('account_id', accountId)
        .maybeSingle();

      const isRegularShow =
        currentEvent &&
        !currentEvent.is_archived &&
        !currentEvent.is_show_ended &&
        currentEvent.competition_mode !==
          'tournament';

      if (isRegularShow) {
        router.replace(
          `/signup/${currentEvent.id}`
        );

        return;
      }
    }

    /*
     * The venue pointer is stale or points
     * at a tournament.
     *
     * Find the newest ACTIVE REGULAR karaoke
     * event for this account.
     */
    const {
      data: activeEvents,
      error: eventError,
    } = await supabase
      .from('events')
      .select(
        'id, name, competition_mode, created_at'
      )
      .eq('account_id', accountId)
      .eq('is_archived', false)
      .eq('is_show_ended', false)
      .order('created_at', {
        ascending: false,
      })
      .limit(20);

    if (eventError) {
      console.error(
        'Unable to find active signup event:',
        eventError
      );

      return;
    }

    /*
     * Ignore tournament events.
     */
    const activeEvent =
      (activeEvents || []).find(
        (event) =>
          event.competition_mode !==
          'tournament'
      );

    if (!activeEvent) {
      console.warn(
        'No active regular karaoke show found.'
      );

      return;
    }

    console.log(
      'Static signup routing to:',
      activeEvent.name,
      activeEvent.id
    );

    /*
     * Repair the venue pointer.
     */
    await supabase
      .from('venues')
      .update({
        current_event_id:
          activeEvent.id,
      })
      .eq('account_id', accountId);

    router.replace(
      `/signup/${activeEvent.id}`
    );
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Loading Signup...</h1>
        <p>Please wait.</p>
      </div>
    </main>
  );
}