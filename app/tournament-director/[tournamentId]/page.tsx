'use client';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createStageVotesEvent } from '@/lib/events/createStageVotesEvent';
import SVShell from '@/components/ui/SVShell';

type Tournament = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status:
    | 'draft'
    | 'open'
    | 'active'
    | 'completed'
    | 'archived';
  starts_at: string | null;
  ends_at: string | null;
};

type TournamentRound = {
  id: string;
  tournament_id: string;
  name: string;
  round_type:
    | 'local'
    | 'regional'
    | 'state'
    | 'national'
    | 'final'
    | 'custom';
  round_order: number;
  default_advancement_count: number | null;
  starts_at: string | null;
  ends_at: string | null;
};

type RoundType = TournamentRound['round_type'];

type VenueOption = {
  id: string;
  account_id: string | null;
  name: string;
  city: string | null;
  state: string | null;
};

type TournamentEvent = {
  id: string;
  tournament_id: string;
  round_id: string;
  venue_id: string | null;
  event_id: string | null;
  name: string;
  status:
    | 'scheduled'
    | 'registration_open'
    | 'live'
    | 'completed'
    | 'cancelled';
  starts_at: string | null;
  advancement_count: number | null;
  expected_judges: number | null;
  venues:
    | {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
      }
    | null;
};

type TournamentEventPath = {
  id: string;
  tournament_id: string;
  from_tournament_event_id: string;
  to_tournament_event_id: string;
};

type QualifiedSinger = {
  tournament_event_id: string;
  tournament_entry_id: string;
  status:
    | 'eligible'
    | 'confirmed'
    | 'competed'
    | 'advanced'
    | 'eliminated'
    | 'withdrawn'
    | 'alternate';
  seed: number | null;
  placement: number | null;
  average_score: number | null;
  singer_profile_id: string;
  display_name: string | null;
  stage_name: string | null;
  photo_url: string | null;
  source_event_name: string | null;
};

const roundTypeOptions: {
  value: RoundType;
  label: string;
  icon: string;
}[] = [
  {
    value: 'local',
    label: 'Local Qualifiers',
    icon: '📍',
  },
  {
    value: 'regional',
    label: 'Regional',
    icon: '🗺️',
  },
  {
    value: 'state',
    label: 'State',
    icon: '⭐',
  },
  {
    value: 'national',
    label: 'National',
    icon: '🇺🇸',
  },
  {
    value: 'final',
    label: 'Championship Final',
    icon: '🏆',
  },
  {
    value: 'custom',
    label: 'Custom Round',
    icon: '🎤',
  },
];

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);

  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

function getTournamentEventStatusLabel(
  status: TournamentEvent['status']
) {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';

    case 'registration_open':
      return 'Ready';

    case 'live':
      return 'In Progress';

    case 'completed':
      return 'Completed';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status;
  }
}

export default function TournamentDirectorDetailPage() {
  const params = useParams<{
    tournamentId: string;
  }>();

  const tournamentId = params.tournamentId;

  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [rounds, setRounds] =
    useState<TournamentRound[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState('');

  const [showRoundForm, setShowRoundForm] =
    useState(false);

  const [roundName, setRoundName] =
    useState('');

  const [roundType, setRoundType] =
    useState<RoundType>('local');

  const [
    defaultAdvancementCount,
    setDefaultAdvancementCount,
  ] = useState('3');

  const [roundStartsAt, setRoundStartsAt] =
    useState('');

  const [roundEndsAt, setRoundEndsAt] =
    useState('');

  const [savingRound, setSavingRound] =
    useState(false);

  const [tournamentEvents, setTournamentEvents] =
  useState<TournamentEvent[]>([]);

const [venueOptions, setVenueOptions] =
  useState<VenueOption[]>([]);

const [eventRound, setEventRound] =
  useState<TournamentRound | null>(null);

const [eventName, setEventName] =
  useState('');

const [eventVenueId, setEventVenueId] =
  useState('');

const [eventStartsAt, setEventStartsAt] =
  useState('');

const [eventPaths, setEventPaths] =
  useState<TournamentEventPath[]>([]);

const [pathSourceEvent, setPathSourceEvent] =
  useState<TournamentEvent | null>(null);

const [pathDestinationId, setPathDestinationId] =
  useState('');

const [savingPath, setSavingPath] =
  useState(false);  

const [
  editingTournamentEvent,
  setEditingTournamentEvent,
] = useState<TournamentEvent | null>(null);

const [qualifiedSingers, setQualifiedSingers] =
  useState<QualifiedSinger[]>([]);

const [
  eventAdvancementCount,
  setEventAdvancementCount,
] = useState('3');

const [
  eventExpectedJudges,
  setEventExpectedJudges,
] = useState('3');

const [savingEvent, setSavingEvent] =
  useState(false);

const [editingRoundId, setEditingRoundId] =
  useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    loadTournament();
  }, [tournamentId]);

  async function loadTournament() {
    setLoading(true);
    setMessage('');

 let loadedTournamentEvents: TournamentEvent[] = [];   

    const {
      data: tournamentData,
      error: tournamentError,
    } = await supabase
      .from('tournaments')
      .select(`
        id,
        name,
        slug,
        description,
        status,
        starts_at,
        ends_at
      `)
      .eq('id', tournamentId)
      .maybeSingle();

    if (tournamentError) {
      console.error(
        'Unable to load tournament:',
        tournamentError
      );

      setMessage(
        'We could not load this tournament.'
      );

      setLoading(false);
      return;
    }

    if (!tournamentData) {
      setMessage(
        'This tournament could not be found.'
      );

      setLoading(false);
      return;
    }

    setTournament(
      tournamentData as Tournament
    );

    const {
      data: roundData,
      error: roundError,
    } = await supabase
      .from('tournament_rounds')
      .select(`
        id,
        tournament_id,
        name,
        round_type,
        round_order,
        default_advancement_count,
        starts_at,
        ends_at
      `)
      .eq(
        'tournament_id',
        tournamentId
      )
      .order('round_order', {
        ascending: true,
      });

    if (roundError) {
      console.error(
        'Unable to load tournament rounds:',
        roundError
      );

      setMessage(
        'The tournament loaded, but its rounds could not be loaded.'
      );

      setRounds([]);
      setLoading(false);
      return;
    }

    setRounds(
      (roundData || []) as TournamentRound[]
    );

   const {
  data: venueData,
  error: venueError,
} = await supabase
  .from('venues')
  .select(`
  id,
  account_id,
  name,
  city,
  state
`)
  .order('name');

if (venueError) {
  console.error(
    'Unable to load tournament venues:',
    venueError
  );

  setVenueOptions([]);
} else {
  setVenueOptions(
    (venueData || []) as VenueOption[]
  );
}

const {
  data: tournamentEventData,
  error: tournamentEventError,
} = await supabase
  .from('tournament_events')
  .select(`
    id,
    tournament_id,
    round_id,
    venue_id,
    event_id,
    name,
    status,
    starts_at,
    advancement_count,
    expected_judges,
    venues (
      id,
      name,
      city,
      state
    )
  `)
  .eq('tournament_id', tournamentId)
  .order('starts_at', {
    ascending: true,
    nullsFirst: false,
  });

if (tournamentEventError) {
  console.error(
    'Unable to load tournament events:',
    tournamentEventError
  );

  setTournamentEvents([]);
} else {
  const normalizedEvents: TournamentEvent[] =
  (tournamentEventData || []).map(
    (item: any) => ({
      ...item,
      venues: Array.isArray(item.venues)
        ? item.venues[0] || null
        : item.venues || null,
    })
  );

loadedTournamentEvents = normalizedEvents;

setTournamentEvents(normalizedEvents);
} 

const {
  data: pathData,
  error: pathError,
} = await supabase
  .from('tournament_event_paths')
  .select(`
    id,
    tournament_id,
    from_tournament_event_id,
    to_tournament_event_id
  `)
  .eq('tournament_id', tournamentId);

if (pathError) {
  console.error(
    'Unable to load tournament event paths:',
    pathError
  );

  setEventPaths([]);
} else {
  setEventPaths(
    (pathData || []) as TournamentEventPath[]
  );
}

const {
  data: eventEntryData,
  error: eventEntryError,
} = await supabase
  .from('tournament_event_entries')
  .select(`
    tournament_event_id,
    tournament_entry_id,
    status,
    seed,
    placement,
    average_score,
    tournament_entries!inner (
      singer_profile_id,
      singer_profiles (
        display_name,
        stage_name,
        photo_url
      )
    )
  `)
  .eq('status', 'eligible');

if (eventEntryError) {
  console.error(
    'Unable to load qualified singers:',
    eventEntryError
  );

  setQualifiedSingers([]);
} else {
  const advancementLookup = new Map<
    string,
    string
  >();

  const {
    data: advancementData,
    error: advancementError,
  } = await supabase
    .from('tournament_advancements')
    .select(`
      tournament_entry_id,
      to_tournament_event_id,
      from_tournament_event_id
    `)
    .eq('tournament_id', tournamentId);

  if (advancementError) {
    console.error(
      'Unable to load advancement sources:',
      advancementError
    );
  } else {
    (advancementData || []).forEach(
      (advancement: any) => {
        advancementLookup.set(
          `${advancement.tournament_entry_id}:${advancement.to_tournament_event_id}`,
          advancement.from_tournament_event_id
        );
      }
    );
  }

  const normalizedQualifiedSingers: QualifiedSinger[] =
    (eventEntryData || []).map(
      (entry: any) => {
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
            tournamentEntry
              ?.singer_profiles
          )
            ? tournamentEntry
                .singer_profiles[0] ||
              null
            : tournamentEntry
                ?.singer_profiles ||
              null;

        const sourceEventId =
          advancementLookup.get(
            `${entry.tournament_entry_id}:${entry.tournament_event_id}`
          ) || null;

        const sourceEvent =
  loadedTournamentEvents.find(
            (item) =>
              item.id === sourceEventId
          );

        return {
          tournament_event_id:
            entry.tournament_event_id,
          tournament_entry_id:
            entry.tournament_entry_id,
          status: entry.status,
          seed: entry.seed,
          placement:
            entry.placement,
          average_score:
            entry.average_score,
          singer_profile_id:
            tournamentEntry
              ?.singer_profile_id || '',
          display_name:
            singerProfile
              ?.display_name || null,
          stage_name:
            singerProfile
              ?.stage_name || null,
          photo_url:
            singerProfile
              ?.photo_url || null,
          source_event_name:
            sourceEvent?.name || null,
        };
      }
    );

  setQualifiedSingers(
    normalizedQualifiedSingers
  );
}

    setLoading(false);
  }

 async function handleAddRound(
  event: FormEvent
) {
  event.preventDefault();

  if (
    !roundName.trim() ||
    !tournamentId ||
    savingRound
  ) {
    return;
  }

  setSavingRound(true);
  setMessage('');

  const advancementNumber =
    defaultAdvancementCount.trim()
      ? Number(
          defaultAdvancementCount
        )
      : null;

  const roundPayload = {
    name: roundName.trim(),
    round_type: roundType,
    default_advancement_count:
      advancementNumber &&
      advancementNumber > 0
        ? advancementNumber
        : null,
    starts_at:
      roundStartsAt || null,
    ends_at:
      roundEndsAt || null,
  };

  if (editingRoundId) {
    const {
      data: updatedRound,
      error,
    } = await supabase
      .from('tournament_rounds')
      .update(roundPayload)
      .eq('id', editingRoundId)
      .eq(
        'tournament_id',
        tournamentId
      )
      .select(`
        id,
        tournament_id,
        name,
        round_type,
        round_order,
        default_advancement_count,
        starts_at,
        ends_at
      `)
      .single();

    if (error) {
      console.error(
        'Unable to update tournament round:',
        error
      );

      setMessage(error.message);
      setSavingRound(false);
      return;
    }

    setRounds((current) =>
      current
        .map((round) =>
          round.id === editingRoundId
            ? (updatedRound as TournamentRound)
            : round
        )
        .sort(
          (a, b) =>
            a.round_order -
            b.round_order
        )
    );
  } else {
    const nextRoundOrder =
      rounds.length > 0
        ? Math.max(
            ...rounds.map(
              (round) =>
                round.round_order
            )
          ) + 1
        : 1;

    const {
      data: createdRound,
      error,
    } = await supabase
      .from('tournament_rounds')
      .insert({
        tournament_id:
          tournamentId,
        ...roundPayload,
        round_order:
          nextRoundOrder,
      })
      .select(`
        id,
        tournament_id,
        name,
        round_type,
        round_order,
        default_advancement_count,
        starts_at,
        ends_at
      `)
      .single();

    if (error) {
      console.error(
        'Unable to create tournament round:',
        error
      );

      setMessage(error.message);
      setSavingRound(false);
      return;
    }

    setRounds((current) =>
      [
        ...current,
        createdRound as TournamentRound,
      ].sort(
        (a, b) =>
          a.round_order -
          b.round_order
      )
    );
  }

  setEditingRoundId(null);
  setRoundName('');
  setRoundType('local');
  setDefaultAdvancementCount('3');
  setRoundStartsAt('');
  setRoundEndsAt('');
  setShowRoundForm(false);
  setSavingRound(false);
}

function openEventForm(
  round: TournamentRound,
  tournamentEvent?: TournamentEvent
) {
  setEventRound(round);

  if (tournamentEvent) {
    setEditingTournamentEvent(
      tournamentEvent
    );

    setEventName(
      tournamentEvent.name
    );

    setEventVenueId(
      tournamentEvent.venue_id || ''
    );

    setEventStartsAt(
      tournamentEvent.starts_at
        ? toDateTimeLocalValue(
            tournamentEvent.starts_at
          )
        : ''
    );

    setEventAdvancementCount(
      tournamentEvent.advancement_count
        ? String(
            tournamentEvent.advancement_count
          )
        : ''
    );

    setEventExpectedJudges(
  tournamentEvent.expected_judges
    ? String(
        tournamentEvent.expected_judges
      )
    : '3'
);

    return;
  }

  setEditingTournamentEvent(null);
  setEventName('');
  setEventVenueId('');
  setEventStartsAt('');

  setEventAdvancementCount(
    round.default_advancement_count
      ? String(
          round.default_advancement_count
        )
      : ''
  );

  setEventExpectedJudges('3');
}

function openEditRound(round: TournamentRound) {
  setEditingRoundId(round.id);
  setRoundName(round.name);
  setRoundType(round.round_type);
  setDefaultAdvancementCount(
    String(round.default_advancement_count || 3)
  );
  setRoundStartsAt(
    round.starts_at
      ? round.starts_at.slice(0, 16)
      : ''
  );
  setRoundEndsAt(
    round.ends_at
      ? round.ends_at.slice(0, 16)
      : ''
  );

  setShowRoundForm(true);
}

function openPathForm(
  tournamentEvent: TournamentEvent
) {
  setPathSourceEvent(tournamentEvent);
  setPathDestinationId('');
}

function closePathForm() {
  if (savingPath) return;

  setPathSourceEvent(null);
  setPathDestinationId('');
}

async function handleAddPath(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (
    !pathSourceEvent ||
    !pathDestinationId ||
    savingPath
  ) {
    return;
  }

  setSavingPath(true);

  const {
    data: createdPath,
    error,
  } = await supabase
    .from('tournament_event_paths')
    .insert({
      tournament_id: tournamentId,
      from_tournament_event_id:
        pathSourceEvent.id,
      to_tournament_event_id:
        pathDestinationId,
    })
    .select(`
      id,
      tournament_id,
      from_tournament_event_id,
      to_tournament_event_id
    `)
    .single();

  if (error) {
    console.error(
      'Unable to create event path:',
      error
    );

    alert(error.message);
    setSavingPath(false);
    return;
  }

  setEventPaths((current) => [
    ...current,
    createdPath as TournamentEventPath,
  ]);

  setSavingPath(false);
  closePathForm();
}

async function deleteEventPath(
  path: TournamentEventPath
) {
  const { error } = await supabase
    .from('tournament_event_paths')
    .delete()
    .eq('id', path.id);

  if (error) {
    console.error(
      'Unable to delete event path:',
      error
    );

    alert(error.message);
    return;
  }

  setEventPaths((current) =>
    current.filter(
      (item) => item.id !== path.id
    )
  );
}

function closeEventForm() {
  if (savingEvent) return;

  setEventRound(null);
  setEditingTournamentEvent(null);
  setEventName('');
  setEventVenueId('');
  setEventStartsAt('');
  setEventAdvancementCount('');
}

async function handleAddEvent(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (
    !eventRound ||
    !eventName.trim() ||
    savingEvent
  ) {
    return;
  }

  setSavingEvent(true);
  setMessage('');

  const advancementNumber =
    eventAdvancementCount.trim()
      ? Number(eventAdvancementCount)
      : null;

  const selectedVenue =
  venueOptions.find(
    (venue) =>
      venue.id === eventVenueId
  );

const hostAccountId =
  selectedVenue?.account_id || null;

  const expectedJudgesNumber =
  eventExpectedJudges.trim()
    ? Number(eventExpectedJudges)
    : 3;
  
  const eventValues = {
  tournament_id: tournamentId,
  round_id: eventRound.id,
  venue_id: eventVenueId || null,
  host_account_id: hostAccountId,
  name: eventName.trim(),
  status:
    editingTournamentEvent?.status ||
    'scheduled',
  starts_at: eventStartsAt
    ? new Date(
        eventStartsAt
      ).toISOString()
    : null,
  advancement_count:
    advancementNumber &&
    advancementNumber > 0
      ? advancementNumber
      : eventRound
          .default_advancement_count,

  expected_judges:
  expectedJudgesNumber > 0
    ? expectedJudgesNumber
    : 3,
};

const query =
  editingTournamentEvent
    ? supabase
        .from('tournament_events')
        .update(eventValues)
        .eq(
          'id',
          editingTournamentEvent.id
        )
    : supabase
        .from('tournament_events')
        .insert(eventValues);

const {
  data: savedEvent,
  error,
} = await query
  .select(`
    id,
    tournament_id,
    round_id,
    venue_id,
    event_id,
    name,
    status,
    starts_at,
    advancement_count,
    expected_judges,
    venues (
      id,
      name,
      city,
      state
    )
  `)
  .single();

  if (error) {
    console.error(
      'Unable to create tournament event:',
      error
    );

    setMessage(error.message);
    setSavingEvent(false);
    return;
  }

  const normalizedEvent: TournamentEvent = {
  ...(savedEvent as any),

    venues: Array.isArray(
      (savedEvent as any).venues
    )
      ? (savedEvent as any).venues[0] ||
        null
      : (savedEvent as any).venues ||
        null,
  };

  setTournamentEvents((current) =>
  editingTournamentEvent
    ? current.map((item) =>
        item.id === normalizedEvent.id
          ? normalizedEvent
          : item
      )
    : [
        ...current,
        normalizedEvent,
      ]
);

  setSavingEvent(false);
  closeEventForm();
}

async function deleteTournamentEvent(
  tournamentEvent: TournamentEvent
) {
  const confirmed = window.confirm(
    `Delete "${tournamentEvent.name}"?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('tournament_events')
    .delete()
    .eq('id', tournamentEvent.id);

  if (error) {
    console.error(
      'Unable to delete tournament event:',
      error
    );

    alert(error.message);
    return;
  }

  setTournamentEvents((current) =>
    current.filter(
      (item) =>
        item.id !== tournamentEvent.id
    )
  );
}

  async function deleteRound(
    round: TournamentRound
  ) {
    const confirmed = window.confirm(
      `Delete "${round.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('tournament_rounds')
      .delete()
      .eq('id', round.id);

    if (error) {
      console.error(
        'Unable to delete tournament round:',
        error
      );

      alert(error.message);
      return;
    }

    setRounds((current) =>
      current.filter(
        (item) => item.id !== round.id
      )
    );
  }

  if (loading) {
    return (
      <main className="sv-director-detail-page">
        <div className="sv-director-empty">
          Loading tournament...
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="sv-director-detail-page">
        <div className="sv-director-empty">
          {message ||
            'Tournament not found.'}
        </div>
      </main>
    );
  }

  return (
    <SVShell
  title="Tournament Director"
  subtitle="Manage tournament"
>
    <main className="sv-director-detail-page">
      <header className="sv-tournament-builder-hero">
        <div>
          <Link
            href="/tournament-director"
            className="sv-tournament-builder-back"
          >
            ← Tournament Director
          </Link>

          <div className="sv-director-eyebrow">
            Championship Builder
          </div>

          <h1>{tournament.name}</h1>

          <p>
            {tournament.description ||
              'Build the rounds, qualifier venues, and championship path.'}
          </p>
        </div>

        <div className="sv-tournament-builder-hero-actions">
          <span className="sv-tournament-builder-status">
            {tournament.status}
          </span>

          <button
            type="button"
            onClick={() =>
              setShowRoundForm(true)
            }
            className="sv-director-create"
          >
            {rounds.length === 0
  ? '+ Add Qualifier'
  : '+ Add Round'}
          </button>
        </div>
      </header>

      {message && (
        <div className="sv-director-form-error sv-tournament-builder-message">
          {message}
        </div>
      )}

      <section className="sv-tournament-builder-layout">
        <div className="sv-tournament-rounds-panel">
          <div className="sv-tournament-builder-heading">
            <div>
              <span>
                Tournament Structure
              </span>

              <h2>Tournament Builder</h2>

              <p>
                Each round can contain multiple
                venue-hosted tournament events.
              </p>
            </div>

            <strong>
              {rounds.length}{' '}
              {rounds.length === 1
                ? 'round'
                : 'rounds'}
            </strong>
          </div>

          {rounds.length > 0 ? (
            <div className="sv-tournament-round-list">
              {rounds.map(
                (round, index) => {
                  const roundOption =
                    roundTypeOptions.find(
                      (option) =>
                        option.value ===
                        round.round_type
                    );

                  return (
                    <article
                      key={round.id}
                      className="sv-tournament-round-card"
                    >
                      <div className="sv-tournament-round-number">
                        {index + 1}
                      </div>

                      <div className="sv-tournament-round-icon">
                        {roundOption?.icon ||
                          '🎤'}
                      </div>

                      <div className="sv-tournament-round-copy">
                        <span>
                          {roundOption?.label ||
                            round.round_type}
                        </span>

                        <h3>{round.name}</h3>

                        <p>
                          {round.default_advancement_count
                            ? `${round.default_advancement_count} advance by default`
                            : 'Advancement configured per event'}
                        </p>
                      </div>

                     <div className="sv-tournament-round-actions">
  <button
    type="button"
    onClick={() =>
      openEventForm(round)
    }
  >
    + Add Event
  </button>

  <button
    type="button"
    onClick={() =>
      openEditRound(round)
    }
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() =>
      deleteRound(round)
    }
    className="sv-tournament-round-delete"
  >
    Delete
  </button>
</div>

                    <div className="sv-tournament-round-events">
  {tournamentEvents
    .filter(
      (tournamentEvent) =>
        tournamentEvent.round_id === round.id
    )
    .map((tournamentEvent) => (
      <div
        key={tournamentEvent.id}
        className="sv-tournament-event-card"
      >
       <div className="sv-tournament-event-status">
  {getTournamentEventStatusLabel(
    tournamentEvent.status
  )}
</div>

        <strong>
          {tournamentEvent.name}
        </strong>

        <span>
          📍{' '}
          {tournamentEvent.venues?.name ||
            'Venue not assigned'}
        </span>

        <span>
          📅{' '}
          {tournamentEvent.starts_at
  ? new Date(
      tournamentEvent.starts_at
    ).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Chicago',
    })
  : 'Date not scheduled'}
        </span>

        <span>
          🎟️ Top{' '}
          {tournamentEvent.advancement_count ||
            round.default_advancement_count ||
            '—'}{' '}
          advance
        </span>

{eventPaths
  .filter(
    (path) =>
      path.from_tournament_event_id ===
      tournamentEvent.id
  )
  .map((path) => {
    const destination =
      tournamentEvents.find(
        (item) =>
          item.id ===
          path.to_tournament_event_id
      );

    if (!destination) return null;

    return (
      <div
        key={path.id}
        className="sv-tournament-event-path"
      >
        <span>
          Feeds into →
          {' '}
          {destination.name}
        </span>

        <button
          type="button"
          onClick={() =>
            deleteEventPath(path)
          }
        >
          ×
        </button>
      </div>
    );
  })}

{!tournamentEvent.event_id &&
  tournamentEvent.venue_id && (
    <div className="sv-tournament-event-status sv-tournament-event-status-assigned">
      ✓ Assigned to Host
    </div>
  )}

{!tournamentEvent.event_id &&
  !tournamentEvent.venue_id && (
    <div className="sv-tournament-event-status sv-tournament-event-status-unassigned">
      Venue / Host Needed
    </div>
  )}

<button
  type="button"
  className="sv-tournament-event-connect"
  onClick={() =>
    openPathForm(tournamentEvent)
  }
>
  Set Advancement
</button>

{qualifiedSingers.filter(
  (singer) =>
    singer.tournament_event_id ===
    tournamentEvent.id
).length > 0 && (
  <div className="sv-tournament-qualified-list">
    <div className="sv-tournament-qualified-heading">
      Qualified Singers
    </div>

    {qualifiedSingers
      .filter(
        (singer) =>
          singer.tournament_event_id ===
          tournamentEvent.id
      )
      .sort(
        (a, b) =>
          (a.seed || 999) -
          (b.seed || 999)
      )
      .map((singer) => {
        const singerName =
          singer.stage_name?.trim() ||
          singer.display_name?.trim() ||
          'Tournament Singer';

        return (
          <div
            key={
              singer.tournament_entry_id
            }
            className="sv-tournament-qualified-row"
          >
            <div className="sv-tournament-qualified-seed">
              {singer.seed
                ? `#${singer.seed}`
                : '—'}
            </div>

            <div className="sv-tournament-qualified-avatar">
              {singer.photo_url ? (
                <img
                  src={singer.photo_url}
                  alt={singerName}
                />
              ) : (
                singerName
                  .split(/\s+/)
                  .map(
                    (word) => word[0]
                  )
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>

            <div className="sv-tournament-qualified-copy">
              <strong>
                {singerName}
              </strong>

              <span>
                {singer.source_event_name
                  ? `From ${singer.source_event_name}`
                  : 'Qualified singer'}
              </span>
            </div>

            <div className="sv-tournament-qualified-status">
  Qualified
</div>
          </div>
        );
      })}
  </div>
)}

        <button
  type="button"
  className="sv-tournament-event-edit"
  onClick={() =>
    openEventForm(
      round,
      tournamentEvent
    )
  }
>
  Edit
</button>

       <button
  type="button"
  className="sv-tournament-event-remove"
  onClick={() =>
    deleteTournamentEvent(
      tournamentEvent
    )
  }
>
  Remove
</button>
      </div>
    ))}

  {tournamentEvents.filter(
    (tournamentEvent) =>
      tournamentEvent.round_id === round.id
  ).length === 0 && (
    <div className="sv-tournament-round-no-events">
      No hosted events in this round yet.
    </div>
  )}
</div>

                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="sv-director-empty sv-tournament-builder-empty">
             
             <div
  style={{
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: 10,
  }}
>
  STEP 2 OF 4 · QUALIFIERS
</div>
             
              <div>🏆</div>

              <h2>Where does the road to the championship begin?</h2>

             <p>
  Add the venues hosting qualifying events.
  Each qualifier can advance its top singers
  to the next stage.
</p>

              <button
                type="button"
                onClick={() =>
                  setShowRoundForm(true)
                }
              >
                + Add First Qualifier
              </button>
            </div>
          )}
        </div>

        <aside className="sv-tournament-builder-preview">
          <div className="sv-tournament-builder-heading">
            <div>
              <span>Bracket Preview</span>
              <h2>Championship Path</h2>
            </div>
          </div>

          {rounds.length > 0 ? (
  <div className="sv-tournament-path-preview">
    {rounds.map((round, roundIndex) => {
      const roundEvents =
        tournamentEvents.filter(
          (item) =>
            item.round_id === round.id
        );

      return (
        <div
          key={round.id}
          className="sv-tournament-path-round"
        >
          <div className="sv-tournament-path-round-header">
            <span>
              {round.round_type}
            </span>

            <strong>
              {round.name}
            </strong>
          </div>

          {roundEvents.length > 0 ? (
            <div className="sv-tournament-path-events">
              {roundEvents.map(
                (tournamentEvent) => {
                  const outgoingPaths =
                    eventPaths.filter(
                      (path) =>
                        path.from_tournament_event_id ===
                        tournamentEvent.id
                    );

                  const incomingPaths =
  eventPaths.filter(
    (path) =>
      path.to_tournament_event_id ===
      tournamentEvent.id
  );

const incomingCount =
  incomingPaths.length;

const incomingSingerCount =
  incomingPaths.reduce(
    (total, path) => {
      const sourceEvent =
        tournamentEvents.find(
          (item) =>
            item.id ===
            path.from_tournament_event_id
        );

      return (
        total +
        Number(
          sourceEvent?.advancement_count || 0
        )
      );
    },
    0
  );

                  const destinationNames =
                    outgoingPaths
                      .map((path) => {
                        const destination =
                          tournamentEvents.find(
                            (item) =>
                              item.id ===
                              path.to_tournament_event_id
                          );

                        return destination?.name || null;
                      })
                      .filter(Boolean);

                  const venueName =
                    tournamentEvent.venues?.name ||
                    'Venue not assigned';

                  return (
                    <div
                      key={tournamentEvent.id}
                      className="sv-tournament-path-event"
                    >
                      <strong>
                        {tournamentEvent.name}
                      </strong>

                      <span>
                        📍 {venueName}
                      </span>

                      {tournamentEvent.advancement_count && (
                        <span>
                          🏆 Top{' '}
                          {tournamentEvent.advancement_count}{' '}
                          advance
                        </span>
                      )}

                      {incomingCount > 0 && (
  <span className="sv-tournament-path-incoming">
    {incomingCount}{' '}
    {incomingCount === 1
      ? 'qualifier feeds here'
      : 'qualifiers feed here'}

    {incomingSingerCount > 0 && (
      <>
        {' · '}
        {incomingSingerCount}{' '}
        {incomingSingerCount === 1
          ? 'singer incoming'
          : 'singers incoming'}
      </>
    )}
  </span>
)}

                      {destinationNames.length > 0 && (
                        <div className="sv-tournament-path-feeds">
                          Feeds into →
                          {' '}
                          {destinationNames.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="sv-tournament-path-empty">
              No events added yet.
            </div>
          )}

          {roundIndex < rounds.length - 1 && (
            <div className="sv-tournament-path-arrow">
              ↓
            </div>
          )}
        </div>
      );
    })}
  </div>
) : (
  <p className="sv-league-sidebar-empty">
    Your bracket path will appear as
    rounds are added.
  </p>
)}
        </aside>
      </section>

    {eventRound && (
  <div className="sv-tournament-modal-backdrop">
    <form
      onSubmit={handleAddEvent}
      className="sv-tournament-modal"
    >
      <div className="sv-director-eyebrow">
        {eventRound.name}
      </div>

      <h2>
  {editingTournamentEvent
    ? 'Edit hosted event'
    : 'Add a hosted event'}
</h2>

      <p className="sv-tournament-modal-copy">
        Create a venue-hosted competition
        inside this tournament round.
      </p>

      <label>
        Event name

        <input
          value={eventName}
          onChange={(event) =>
            setEventName(
              event.target.value
            )
          }
          placeholder="Rogers Qualifier"
          required
          autoFocus
        />
      </label>

      <label>
        Host venue

        <select
          value={eventVenueId}
          onChange={(event) =>
            setEventVenueId(
              event.target.value
            )
          }
        >
          <option value="">
            Venue not assigned yet
          </option>

          {venueOptions.map((venue) => (
            <option
              key={venue.id}
              value={venue.id}
            >
              {venue.name}
              {venue.city
                ? ` — ${venue.city}`
                : ''}
            </option>
          ))}
        </select>
      </label>

      <label>
        Event date and time

        <input
          type="datetime-local"
          value={eventStartsAt}
          onChange={(event) =>
            setEventStartsAt(
              event.target.value
            )
          }
        />
      </label>

      <label>
        Number advancing

        <input
          type="number"
          min="1"
          value={eventAdvancementCount}
          onChange={(event) =>
            setEventAdvancementCount(
              event.target.value
            )
          }
        />
      </label>

      <label>
  Number of judges

  <input
    type="number"
    min="1"
    max="20"
    value={eventExpectedJudges}
    onChange={(event) =>
      setEventExpectedJudges(
        event.target.value
      )
    }
  />

  <span
    style={{
      display: 'block',
      marginTop: 6,
      color: '#94a3b8',
      fontSize: 12,
      lineHeight: 1.4,
    }}
  >
    StageVotes will use this to track
    when scoring is complete for each
    competitor.
  </span>
</label>

      <div className="sv-director-form-actions">
        <button
          type="button"
          onClick={closeEventForm}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={savingEvent}
        >
          {savingEvent
  ? 'Saving...'
  : editingTournamentEvent
    ? 'Save Changes'
    : 'Add Event'}
        </button>
      </div>
    </form>
  </div>
)}

      {showRoundForm && (
        <div className="sv-tournament-modal-backdrop">
          <form
            onSubmit={handleAddRound}
            className="sv-tournament-modal"
          >
            <div className="sv-director-modal-eyebrow">
  {editingRoundId
  ? 'EDIT TOURNAMENT STAGE'
  : 'STEP 2 OF 4 · QUALIFIERS'}
</div>

<h2>Set up your qualifiers</h2>

            <label>
              Qualifier stage name

              <input
                value={roundName}
                onChange={(event) =>
                  setRoundName(
                    event.target.value
                  )
                }
                placeholder="Local Qualifiers"
                required
                autoFocus
              />
            </label>

            <label>
              Stage type

              <select
                value={roundType}
                onChange={(event) =>
                  setRoundType(
                    event.target
                      .value as RoundType
                  )
                }
              >
                {roundTypeOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.icon}{' '}
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Singers advancing per qualifier

              <input
                type="number"
                min="1"
                value={
                  defaultAdvancementCount
                }
                onChange={(event) =>
                  setDefaultAdvancementCount(
                    event.target.value
                  )
                }
              />
            </label>

            <p
  style={{
    margin: '8px 0 0',
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 1.5,
  }}
>
  The top{' '}
  <strong style={{ color: '#f8fafc' }}>
    {defaultAdvancementCount || 0}
  </strong>{' '}
  {Number(defaultAdvancementCount) === 1
    ? 'singer'
    : 'singers'}{' '}
  from each qualifier will advance to the next stage.
</p>

            <div className="sv-director-form-grid">
              <label>
                Starts

                <input
                  type="datetime-local"
                  value={roundStartsAt}
                  onChange={(event) =>
                    setRoundStartsAt(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Ends

                <input
                  type="datetime-local"
                  value={roundEndsAt}
                  onChange={(event) =>
                    setRoundEndsAt(
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <div className="sv-director-form-actions">
              <button
                type="button"
               onClick={() => {
  setEditingRoundId(null);
  setShowRoundForm(false);
}}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingRound}
              >
                {savingRound
  ? 'Saving...'
  : editingRoundId
  ? 'Save Changes'
  : 'Create Qualifier Stage →'}
              </button>
            </div>
          </form>
        </div>
      )}

{pathSourceEvent && (
  <div className="sv-tournament-modal-backdrop">
    <form
      onSubmit={handleAddPath}
      className="sv-tournament-modal"
    >
      <div className="sv-director-eyebrow">
        Advancement Path
      </div>

      <h2>
        Connect {pathSourceEvent.name}
      </h2>

      <p className="sv-tournament-modal-copy">
        Choose the tournament event that receives
        this qualifier’s advancing singers.
      </p>

      <label>
        Destination event

        <select
          value={pathDestinationId}
          onChange={(event) =>
            setPathDestinationId(
              event.target.value
            )
          }
          required
        >
          <option value="">
            Select destination
          </option>

          {tournamentEvents
            .filter((item) => {
  const sourceRoundOrder =
    rounds.find(
      (round) =>
        round.id ===
        pathSourceEvent.round_id
    )?.round_order ?? 0;

  const destinationRoundOrder =
    rounds.find(
      (round) =>
        round.id === item.round_id
    )?.round_order ?? 0;

  return (
    item.id !== pathSourceEvent.id &&
    destinationRoundOrder >
      sourceRoundOrder
  );
})
            .map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
        </select>
      </label>

      <div className="sv-director-form-actions">
        <button
          type="button"
          onClick={closePathForm}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={savingPath}
        >
          {savingPath
            ? 'Connecting...'
            : 'Create Path'}
        </button>
      </div>
    </form>
  </div>
)}

       </main>
  </SVShell>
);
}