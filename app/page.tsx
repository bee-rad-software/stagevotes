'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  MapPin,
  Mic2,
  Plus,
  Trophy,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { createStageVotesEvent } from '@/lib/events/createStageVotesEvent';

type Account = {
  id: string;
  name: string;
};

type Venue = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

type RecurringShow = {
  id: string;
  venue_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string | null;
  show_type: string | null;
  description: string | null;
  is_active: boolean;
  venues:
    | {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
      }[]
    | {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
      }
    | null;
};

type TournamentEvent = {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
  advancement_count: number | null;
  expected_judges: number | null;
  event_id: string | null;

  venues:
    | {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
      }[]
    | {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
      }
    | null;

  tournaments:
    | {
        id: string;
        name: string;
      }[]
    | {
        id: string;
        name: string;
      }
    | null;

  tournament_rounds:
    | {
        id: string;
        name: string;
        round_type: string;
      }[]
    | {
        id: string;
        name: string;
        round_type: string;
      }
    | null;
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

function getRelation<T>(
  relation: T | T[] | null
): T | null {
  if (!relation) return null;

  return Array.isArray(relation)
    ? relation[0] || null
    : relation;
}

function formatTime(value: string) {
  if (!value) return '';

  const [hourString, minuteString] =
    value.split(':');

  const hour = Number(hourString);
  const minute = Number(minuteString);

  const date = new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HostHomePage() {
  const router = useRouter();

  const [account, setAccount] =
    useState<Account | null>(null);

  const [venues, setVenues] =
    useState<Venue[]>([]);

  const [
    recurringShows,
    setRecurringShows,
  ] = useState<RecurringShow[]>([]);

  const [
    tournamentEvents,
    setTournamentEvents,
  ] = useState<TournamentEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState('');

  const [
  setupTournamentEvent,
  setSetupTournamentEvent,
] = useState<TournamentEvent | null>(null);

const [
  tournamentJudgingEnabled,
  setTournamentJudgingEnabled,
] = useState(true);

const [
  tournamentExpectedJudges,
  setTournamentExpectedJudges,
] = useState(3);

const [
  tournamentCategories,
  setTournamentCategories,
] = useState([
  'Overall Performance',
  'Vocal Ability',
  'Stage Presence',
]);

const [
  tournamentTiebreaker,
  setTournamentTiebreaker,
] = useState('Overall Performance');

const [
  tournamentPeoplesChoice,
  setTournamentPeoplesChoice,
] = useState(true);

const [
  tournamentJudgeWeight,
  setTournamentJudgeWeight,
] = useState(75);

const [
  tournamentPeopleWeight,
  setTournamentPeopleWeight,
] = useState(25);

const [
  launchingTournament,
  setLaunchingTournament,
] = useState(false);

  useEffect(() => {
    loadHostHome();
  }, []);

  async function loadHostHome() {
    setLoading(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push('/login');
      return;
    }

    const {
      data: accountUser,
      error: accountUserError,
    } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (
      accountUserError ||
      !accountUser?.account_id
    ) {
      setMessage(
        'We could not find your StageVotes account.'
      );

      setLoading(false);
      return;
    }

    const accountId =
      accountUser.account_id;

    const {
      data: accountData,
      error: accountError,
    } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError) {
      setMessage(
        'We could not load your StageVotes account.'
      );

      setLoading(false);
      return;
    }

    setAccount(accountData as Account);

    const {
      data: venueData,
      error: venueError,
    } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        city,
        state
      `)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('name');

    if (venueError) {
      console.error(
        'Unable to load host venues:',
        venueError
      );
    }

    const loadedVenues =
      (venueData || []) as Venue[];

    setVenues(loadedVenues);

    const venueIds =
      loadedVenues.map(
        (venue) => venue.id
      );

    if (venueIds.length > 0) {
      const {
        data: recurringData,
        error: recurringError,
      } = await supabase
        .from('venue_recurring_shows')
        .select(`
          id,
          venue_id,
          title,
          day_of_week,
          start_time,
          end_time,
          show_type,
          description,
          is_active,
          venues (
            id,
            name,
            city,
            state
          )
        `)
        .in('venue_id', venueIds)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (recurringError) {
        console.error(
          'Unable to load recurring shows:',
          recurringError
        );
      } else {
        setRecurringShows(
          (recurringData ||
            []) as RecurringShow[]
        );
      }
    }

    const {
      data: tournamentData,
      error: tournamentError,
    } = await supabase
      .from('tournament_events')
      .select(`
        id,
        name,
        status,
        starts_at,
        advancement_count,
        expected_judges,
        event_id,
        venues (
          id,
          name,
          city,
          state
        ),
        tournaments (
          id,
          name
        ),
        tournament_rounds (
          id,
          name,
          round_type
        )
      `)
      .eq(
        'host_account_id',
        accountId
      )
      .neq('status', 'cancelled')
      .order('starts_at', {
        ascending: true,
      });

    if (tournamentError) {
      console.error(
        'Unable to load tournament assignments:',
        tournamentError
      );
    } else {
      setTournamentEvents(
        (tournamentData ||
          []) as TournamentEvent[]
      );
    }

    setLoading(false);
  }

async function launchAssignedTournament() {
  if (
    !setupTournamentEvent ||
    launchingTournament
  ) {
    return;
  }

  try {
    setLaunchingTournament(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const {
      data: accountUser,
      error: accountUserError,
    } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (
      accountUserError ||
      !accountUser?.account_id
    ) {
      throw (
        accountUserError ||
        new Error(
          'No StageVotes account was found.'
        )
      );
    }

    const accountId =
      accountUser.account_id;

    /*
     * Safety check:
     * make sure this tournament event
     * is actually assigned to this account.
     */
    const {
      data: assignedEvent,
      error: assignedEventError,
    } = await supabase
      .from('tournament_events')
      .select(`
        id,
        event_id,
        venue_id,
        host_account_id,
        name
      `)
      .eq(
        'id',
        setupTournamentEvent.id
      )
      .eq(
        'host_account_id',
        accountId
      )
      .single();

    if (assignedEventError) {
      throw assignedEventError;
    }

    /*
     * If it was already launched somehow,
     * just open the existing show.
     */
    if (assignedEvent.event_id) {
      router.push(
        `/host/${assignedEvent.event_id}`
      );
      return;
    }

    const venue =
      getRelation(
        setupTournamentEvent.venues
      );

    if (!venue) {
      throw new Error(
        'This tournament event does not have a venue assigned.'
      );
    }

    const cleanCategories =
      tournamentCategories
        .map(
          (category) =>
            category.trim()
        )
        .filter(Boolean);

    if (
      tournamentJudgingEnabled &&
      cleanCategories.length === 0
    ) {
      throw new Error(
        'Add at least one judging category.'
      );
    }

    const result =
      await createStageVotesEvent({
        accountId,
        venueName:
          venue.name,
        name:
          setupTournamentEvent.name,

        judgingEnabled:
          tournamentJudgingEnabled,

        categories:
          tournamentJudgingEnabled
            ? cleanCategories
            : [],

        tiebreakerCategory:
          tournamentJudgingEnabled
            ? tournamentTiebreaker ||
              cleanCategories[0] ||
              ''
            : '',

        showSignupQR: true,

        showVotingQR:
          tournamentJudgingEnabled,

        showPeoplesChoiceQR:
          tournamentPeoplesChoice,
      });

    const newEventId =
      result.eventId;

    /*
     * Link the normal StageVotes event
     * back to the tournament assignment.
     */
   const {
  data: linkedEvent,
  error: eventLinkError,
} = await supabase
  .from('events')
.update({
  tournament_event_id:
    setupTournamentEvent.id,

  venue_id:
    assignedEvent.venue_id,

  competition_mode:
    'tournament',

  judge_weight:
    !tournamentJudgingEnabled
      ? 0
      : !tournamentPeoplesChoice
        ? 100
        : tournamentJudgeWeight,

  peoples_choice_weight:
    !tournamentPeoplesChoice
      ? 0
      : !tournamentJudgingEnabled
        ? 100
        : tournamentPeopleWeight,
})
  .eq(
    'id',
    newEventId
  )
  .eq(
    'account_id',
    accountId
  )
  .select(`
    id,
    name,
    competition_mode,
    tournament_event_id,
    account_id
  `)
  .maybeSingle();

    if (eventLinkError) {
      throw eventLinkError;
    }

   const {
  error: currentEventError,
} = await supabase
  .from('venues')
  .update({
    current_event_id: newEventId,
  })
  .eq(
    'id',
    assignedEvent.venue_id
  );

if (currentEventError) {
  throw currentEventError;
} 

    console.log(
  'Tournament event after linking:',
  linkedEvent
);

if (!linkedEvent) {
  throw new Error(
    'The StageVotes event was created, but the tournament link update did not match any event.'
  );
}

if (
  linkedEvent.competition_mode !==
  'tournament'
) {
  throw new Error(
    `Tournament event was linked but competition_mode is "${linkedEvent.competition_mode}".`
  );
}

    /*
     * Link the tournament assignment
     * to the newly created StageVotes event.
     */
    const {
      error: tournamentLinkError,
    } = await supabase
      .from('tournament_events')
      .update({
  event_id:
    newEventId,

  status:
    'registration_open',

  expected_judges:
    tournamentJudgingEnabled
      ? tournamentExpectedJudges
      : null,

      results_reveal_step: 0,
})
      .eq(
        'id',
        setupTournamentEvent.id
      )
      .eq(
        'host_account_id',
        accountId
      );

    if (tournamentLinkError) {
      throw tournamentLinkError;
    }

    const {
  data: qualifiedEntries,
  error: qualifiedEntriesError,
} = await supabase
  .from('tournament_event_entries')
  .select(`
    tournament_entry_id,
    seed,
    tournament_entries!inner (
      singer_profile_id,
      singer_profiles (
        display_name,
        stage_name
      )
    )
  `)
  .eq(
    'tournament_event_id',
    setupTournamentEvent.id
  )
  .eq(
    'status',
    'eligible'
  );

if (qualifiedEntriesError) {
  throw qualifiedEntriesError;
}

const seededPerformances =
  (qualifiedEntries || []).map(
    (entry: any, index: number) => {
      const tournamentEntry =
        Array.isArray(
          entry.tournament_entries
        )
          ? entry.tournament_entries[0] ||
            null
          : entry.tournament_entries ||
            null;

      const singerProfile =
        Array.isArray(
          tournamentEntry?.singer_profiles
        )
          ? tournamentEntry
              .singer_profiles[0] ||
            null
          : tournamentEntry
              ?.singer_profiles ||
            null;

      const singerName =
        singerProfile?.stage_name?.trim() ||
        singerProfile?.display_name?.trim() ||
        'Tournament Singer';

      return {
        event_id: newEventId,
        account_id: accountId,
        singer_profile_id:
          tournamentEntry?.singer_profile_id ||
          null,
        singer_name: singerName,
        song_title: '',
        artist: '',
        queue_order:
          entry.seed || index + 1,
        round: 1,
      };
    }
  )
  .filter(
    (performance) =>
      performance.singer_profile_id
  );

if (seededPerformances.length > 0) {
  const {
    error: seedError,
  } = await supabase
    .from('performances')
    .insert(seededPerformances);

  if (seedError) {
    throw seedError;
  }
}

    /*
     * Update the Host Home state immediately.
     */
    setTournamentEvents(
      (current) =>
        current.map((event) =>
          event.id ===
          setupTournamentEvent.id
            ? {
                ...event,
                event_id:
                  newEventId,
                status:
                  'registration_open',
              }
            : event
        )
    );

    setSetupTournamentEvent(null);

    router.push(
      `/host/${newEventId}`
    );
  } catch (error: any) {
    console.error(
      'Unable to launch assigned tournament:',
      error
    );

    alert(
      error?.message ||
      error?.details ||
      'Unable to launch this tournament event.'
    );
  } finally {
    setLaunchingTournament(false);
  }
}

async function launchRecurringShow(
  show: RecurringShow
) {
  try {
    const venue =
      getRelation(show.venues);

    if (!venue) {
      alert(
        'This recurring show does not have a venue assigned.'
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const {
      data: accountUser,
      error: accountUserError,
    } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (
      accountUserError ||
      !accountUser?.account_id
    ) {
      throw (
        accountUserError ||
        new Error(
          'No StageVotes account was found.'
        )
      );
    }

    const accountId =
      accountUser.account_id;

    /*
     * First make sure this recurring show
     * does not already have an active event.
     */
    const {
      data: activeEvent,
      error: activeEventError,
    } = await supabase
      .from('events')
      .select('id')
      .eq(
        'recurring_show_id',
        show.id
      )
      .eq(
        'account_id',
        accountId
      )
      .eq(
        'is_show_ended',
        false
      )
      .eq(
        'is_archived',
        false
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (activeEventError) {
      throw activeEventError;
    }

    if (activeEvent?.id) {
      router.push(
        `/host/${activeEvent.id}`
      );
      return;
    }

    /*
     * Find the last event launched
     * from this recurring show.
     */
    const {
      data: previousEvent,
      error: previousEventError,
    } = await supabase
      .from('events')
      .select(`
        id,
        judging_enabled,
        tiebreaker_category_name,
        show_signup_qr,
        show_voting_qr,
        show_peoples_choice_qr
      `)
      .eq(
        'recurring_show_id',
        show.id
      )
      .eq(
        'account_id',
        accountId
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (previousEventError) {
      throw previousEventError;
    }

    /*
     * If this is the first time this recurring
     * show has ever run, send the host through
     * the normal setup page.
     */
    if (!previousEvent) {
      router.push(
        `/create?recurringShow=${show.id}`
      );
      return;
    }

    /*
     * Reuse judging categories from
     * the previous show.
     */
    const {
      data: categoryRows,
      error: categoryError,
    } = await supabase
      .from('vote_categories')
      .select('category_name')
      .eq(
        'event_id',
        previousEvent.id
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      );

    if (categoryError) {
      throw categoryError;
    }

    const categories =
      (categoryRows || [])
        .map(
          (row) =>
            row.category_name
        )
        .filter(Boolean);

    const judgingEnabled =
      previousEvent.judging_enabled ??
      false;

    const result =
      await createStageVotesEvent({
        accountId,
        venueName:
          venue.name,
        name:
          show.title,
        judgingEnabled,
        categories:
          judgingEnabled
            ? categories
            : [],
        tiebreakerCategory:
          previousEvent
            .tiebreaker_category_name ||
          categories[0] ||
          '',
        showSignupQR:
          previousEvent
            .show_signup_qr ??
          true,
        showVotingQR:
          previousEvent
            .show_voting_qr ??
          judgingEnabled,
        showPeoplesChoiceQR:
          previousEvent
            .show_peoples_choice_qr ??
          true,
      });

    const newEventId =
      result.eventId;

    /*
     * Mark the new event as belonging to
     * this recurring show and venue.
     */
    const {
      error: linkError,
    } = await supabase
      .from('events')
      .update({
        recurring_show_id:
          show.id,
        venue_id:
          show.venue_id,
      })
      .eq(
        'id',
        newEventId
      )
      .eq(
        'account_id',
        accountId
      );

    if (linkError) {
      throw linkError;
    }

    const {
  error: currentEventError,
} = await supabase
  .from('venues')
  .update({
    current_event_id:
      newEventId,
  })
  .eq(
    'id',
    show.venue_id
  );

if (currentEventError) {
  throw currentEventError;
}

    router.push(
      `/host/${newEventId}`
    );
  } catch (error: any) {
    console.error(
      'Unable to launch recurring show:',
      error
    );

    alert(
      error?.message ||
      'Unable to launch this show.'
    );
  }
}

  const nextTournamentEvent =
    useMemo(() => {
      return tournamentEvents.find(
        (event) =>
          event.status !== 'completed'
      );
    }, [tournamentEvents]);

  if (loading) {

    return (
      <main className="sv-host-home-loading">
        Loading your shows...
      </main>
    );
  }

  const activeTournamentEvents =
  tournamentEvents.filter(
    (event) =>
      event.status !== 'completed'
  );

  return (
    <main className="sv-host-home">
      <div className="sv-host-home-inner">

        <header className="sv-host-home-header">
          <div>
            <span className="sv-host-home-eyebrow">
              Host Home
            </span>

            <h1>
              {account?.name ||
                'StageVotes'}
            </h1>

            <p>
              Your shows, tournament
              assignments, and upcoming
              events in one place.
            </p>
          </div>

          <Link
            href="/create"
            className="sv-host-home-create"
          >
            <Plus size={17} />
            Create One-Time Show
          </Link>
        </header>

        {message && (
          <div className="sv-host-home-message">
            {message}
          </div>
        )}

        {nextTournamentEvent && (
          <section className="sv-host-home-featured">
            <div className="sv-host-home-featured-icon">
              <Trophy size={26} />
            </div>

            <div className="sv-host-home-featured-copy">
              <span>
                Upcoming Tournament Event
              </span>

              <h2>
                {nextTournamentEvent.name}
              </h2>

              <p>
                {getRelation(
                  nextTournamentEvent
                    .tournaments
                )?.name ||
                  'Tournament Event'}
              </p>

              <div className="sv-host-home-meta">
                {nextTournamentEvent.starts_at && (
                  <span>
                    <CalendarDays
                      size={15}
                    />

                    {new Date(
                      nextTournamentEvent
                        .starts_at
                    ).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                )}

                <span>
                  <MapPin size={15} />

                  {getRelation(
                    nextTournamentEvent
                      .venues
                  )?.name ||
                    'Venue not assigned'}
                </span>
              </div>
            </div>

            <button
  type="button"
  onClick={() => {
    if (
      nextTournamentEvent.event_id
    ) {
      router.push(
        `/host/${nextTournamentEvent.event_id}`
      );

      return;
    }

    setSetupTournamentEvent(
      nextTournamentEvent
    );
  }}
>
  {nextTournamentEvent.event_id
    ? 'Open Host Dashboard'
    : 'Set Up Qualifier'}
</button>
          </section>
        )}

        <section className="sv-host-home-section">
          <div className="sv-host-home-section-heading">
            <div>
              <span>
                Regular Schedule
              </span>

              <h2>
                Recurring Shows
              </h2>
            </div>

            <strong>
              {recurringShows.length}
            </strong>
          </div>

          {recurringShows.length > 0 ? (
            <div className="sv-host-home-grid">
              {recurringShows.map(
                (show) => {
                  const venue =
                    getRelation(
                      show.venues
                    );

                  return (
                    <article
                      key={show.id}
                      className="sv-host-home-card"
                    >
                      <div className="sv-host-home-card-icon">
                        <Mic2 size={22} />
                      </div>

                      <div>
                        <span className="sv-host-home-card-type">
                          {dayNames[
                            show.day_of_week
                          ] ||
                            'Recurring Show'}
                        </span>

                        <h3>
                          {show.title}
                        </h3>

                        <p>
                          {formatTime(
                            show.start_time
                          )}

                          {show.end_time
                            ? ` – ${formatTime(
                                show.end_time
                              )}`
                            : ''}
                        </p>

                        <div className="sv-host-home-card-venue">
                          <MapPin
                            size={14}
                          />

                          {venue?.name ||
                            'Venue'}
                        </div>
                      </div>

                      <button
  type="button"
  onClick={() =>
    launchRecurringShow(show)
  }
>
  Start Show
</button>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="sv-host-home-empty">
              No recurring shows are
              configured yet.
            </div>
          )}
        </section>

        <section className="sv-host-home-section">
          <div className="sv-host-home-section-heading">
            <div>
              <span>
                Championships
              </span>

              <h2>
                Tournament Assignments
              </h2>
            </div>

            <strong>
              {activeTournamentEvents.length}
            </strong>
          </div>

          {activeTournamentEvents.length > 0 ? (
            <div className="sv-host-home-grid">
              {activeTournamentEvents.map(
                (event) => {
                  const venue =
                    getRelation(
                      event.venues
                    );

                  const tournament =
                    getRelation(
                      event.tournaments
                    );

                  const round =
                    getRelation(
                      event
                        .tournament_rounds
                    );

                  return (
                    <article
                      key={event.id}
                      className="sv-host-home-card sv-host-home-tournament-card"
                    >
                      <div className="sv-host-home-card-icon">
                        <Trophy size={22} />
                      </div>

                      <div>
                        <span className="sv-host-home-card-type">
                          {round?.name ||
                            'Tournament Event'}
                        </span>

                        <h3>
                          {event.name}
                        </h3>

                        <p>
                          {tournament?.name}
                        </p>

                        <div className="sv-host-home-card-venue">
                          <MapPin
                            size={14}
                          />

                          {venue?.name ||
                            'Venue not assigned'}
                        </div>

                        {event.advancement_count && (
                          <div className="sv-host-home-advance">
                            Top{' '}
                            {
                              event.advancement_count
                            }{' '}
                            advance
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
  if (event.event_id) {
    router.push(
      `/host/${event.event_id}`
    );

    return;
  }

  setSetupTournamentEvent(event);

setTournamentExpectedJudges(
  event.expected_judges || 3
);
}}
                      >
                        {event.event_id
                          ? 'Open Host Dashboard'
                          : 'Set Up Qualifier'}
                      </button>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="sv-host-home-empty">
              No tournament events are
              assigned to this account.
            </div>
          )}
        </section>
      </div>

    {setupTournamentEvent && (
  <div
    className="sv-host-home-modal-backdrop"
    onClick={() =>
      setSetupTournamentEvent(null)
    }
  >
    <div
      className="sv-host-home-modal"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <span className="sv-host-home-modal-eyebrow">
        Tournament Setup
      </span>

      <h2>
        {setupTournamentEvent.name}
      </h2>

      <p>
        Choose how this tournament
        event will be judged before
        launching the Host Dashboard.
      </p>

      <div className="sv-host-home-modal-summary">
        <strong>
          Top{' '}
          {setupTournamentEvent
            .advancement_count || '—'}{' '}
          advance
        </strong>
      </div>

      <label className="sv-host-home-toggle-row">
        <div>
          <strong>
            Judged Competition
          </strong>

          <span>
            Judges score singers using
            categories.
          </span>
        </div>

        <input
          type="checkbox"
          checked={
            tournamentJudgingEnabled
          }
          onChange={(event) =>
            setTournamentJudgingEnabled(
              event.target.checked
            )
          }
        />
      </label>

      {tournamentJudgingEnabled && (
        <div className="sv-host-home-modal-section">
          
        <div className="sv-tournament-judge-confirm">
  <label>
    Judges scoring tonight
  </label>

  <p>
    The tournament director planned for{' '}
    <strong>
      {setupTournamentEvent.expected_judges || 3}
    </strong>{' '}
    judges. Confirm the number actually
    scoring this event.
  </p>

  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    }}
  >
    <button
      type="button"
      onClick={() =>
        setTournamentExpectedJudges(
          (current) =>
            Math.max(1, current - 1)
        )
      }
    >
      −
    </button>

    <strong
      style={{
        minWidth: 40,
        textAlign: 'center',
        fontSize: 24,
      }}
    >
      {tournamentExpectedJudges}
    </strong>

    <button
      type="button"
      onClick={() =>
        setTournamentExpectedJudges(
          (current) =>
            Math.min(20, current + 1)
        )
      }
    >
      +
    </button>
  </div>
</div>
          
          <label>
            Judging categories
          </label>

          {tournamentCategories.map(
            (category, index) => (
              <input
                key={index}
                value={category}
                onChange={(event) =>
                  setTournamentCategories(
                    (current) =>
                      current.map(
                        (
                          item,
                          itemIndex
                        ) =>
                          itemIndex ===
                          index
                            ? event.target
                                .value
                            : item
                      )
                  )
                }
              />
            )
          )}

          <label>
            Tiebreaker category

            <select
              value={
                tournamentTiebreaker
              }
              onChange={(event) =>
                setTournamentTiebreaker(
                  event.target.value
                )
              }
            >
              {tournamentCategories
                .filter(Boolean)
                .map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}

      <label className="sv-host-home-toggle-row">
        <div>
          <strong>
            People’s Choice
          </strong>

          <span>
            Let the audience vote for
            their favorite singer.
          </span>
        </div>

        <input
          type="checkbox"
          checked={
            tournamentPeoplesChoice
          }
          onChange={(event) =>
            setTournamentPeoplesChoice(
              event.target.checked
            )
          }
        />
      </label>

      {tournamentJudgingEnabled &&
  tournamentPeoplesChoice && (
    <div className="sv-host-home-modal-section">
      <label>
        Winner Selection
      </label>

      <p
        style={{
          margin: '4px 0 14px',
          color: '#94a3b8',
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        Choose how much judges and
        People&apos;s Choice contribute to
        the final result.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {[
          {
            label: 'Judges Only',
            judge: 100,
            people: 0,
          },
          {
            label: '75 / 25',
            judge: 75,
            people: 25,
          },
          {
            label: '50 / 50',
            judge: 50,
            people: 50,
          },
          {
            label: "People's Choice Only",
            judge: 0,
            people: 100,
          },
        ].map((option) => {
          const selected =
            tournamentJudgeWeight ===
              option.judge &&
            tournamentPeopleWeight ===
              option.people;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setTournamentJudgeWeight(
                  option.judge
                );

                setTournamentPeopleWeight(
                  option.people
                );
              }}
              style={{
                padding: '12px 10px',
                borderRadius: 12,
                border: selected
                  ? '2px solid #f97316'
                  : '1px solid rgba(148,163,184,0.18)',
                background: selected
                  ? 'rgba(249,115,22,0.12)'
                  : 'rgba(15,23,42,0.55)',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginTop: 12,
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background:
              'rgba(56,189,248,0.08)',
            border:
              '1px solid rgba(56,189,248,0.16)',
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            JUDGES
          </div>

          <strong
            style={{
              display: 'block',
              marginTop: 4,
              fontSize: 22,
            }}
          >
            {tournamentJudgeWeight}%
          </strong>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background:
              'rgba(249,115,22,0.08)',
            border:
              '1px solid rgba(249,115,22,0.16)',
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            PEOPLE&apos;S CHOICE
          </div>

          <strong
            style={{
              display: 'block',
              marginTop: 4,
              fontSize: 22,
            }}
          >
            {tournamentPeopleWeight}%
          </strong>
        </div>
      </div>
    </div>
  )}

      <div className="sv-host-home-modal-actions">
        <button
          type="button"
          onClick={() =>
            setSetupTournamentEvent(null)
          }
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            launchingTournament
          }
          onClick={() =>
            launchAssignedTournament()
          }
        >
          {launchingTournament
            ? 'Launching...'
            : 'Launch Qualifier →'}
        </button>
      </div>
    </div>
  </div>
)}

    </main>
  );
}