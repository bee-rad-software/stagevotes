'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import { supabase } from '@/lib/supabase';

type LeagueSeason = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status:
    | 'upcoming'
    | 'active'
    | 'completed'
    | 'archived';
};

type LeaguePointRow = {
  id: string;
  singer_profile_id: string;
  event_id: string;
  venue_id: string | null;
  points: number;
  placement: number | null;
  average_score: number | null;
  peoples_choice_winner: boolean;
  event_type:
    | 'league'
    | 'qualifier'
    | 'regional'
    | 'state'
    | 'national';
  created_at: string;
  singer_profiles:
  | {
      id: string;
      stage_name: string | null;
      display_name: string | null;
      photo_url: string | null;
    }
  | null;
events:
  | {
      id: string;
      name: string;
      venue: string | null;
    }
  | null;
 venues:
  | {
      id: string;
      name: string;
      slug: string;
      city: string | null;
      state: string | null;
    }
  | null;
};

type RankedSinger = {
  singerProfileId: string;
  singerName: string;
  photoUrl: string | null;
  points: number;
  events: number;
  wins: number;
  peoplesChoiceWins: number;
  averageScore: number | null;
};

type Division = {
  name: string;
  icon: string;
  minimum: number;
  nextMinimum: number | null;
};

const divisions: Division[] = [
  {
    name: 'Bronze',
    icon: '🥉',
    minimum: 0,
    nextMinimum: 500,
  },
  {
    name: 'Silver',
    icon: '🥈',
    minimum: 500,
    nextMinimum: 1200,
  },
  {
    name: 'Gold',
    icon: '🥇',
    minimum: 1200,
    nextMinimum: 2500,
  },
  {
    name: 'Platinum',
    icon: '💠',
    minimum: 2500,
    nextMinimum: 4500,
  },
  {
    name: 'Diamond',
    icon: '💎',
    minimum: 4500,
    nextMinimum: 7500,
  },
  {
    name: 'Legend',
    icon: '👑',
    minimum: 7500,
    nextMinimum: null,
  },
];

function getDivision(points: number) {
  return (
    [...divisions]
      .reverse()
      .find(
        (division) =>
          points >= division.minimum
      ) || divisions[0]
  );
}

export default function LeaguesPage() {
  const [season, setSeason] =
    useState<LeagueSeason | null>(null);

  const [pointRows, setPointRows] =
    useState<LeaguePointRow[]>([]);

  const [myProfileId, setMyProfileId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    async function loadLeague() {
      setLoading(true);
      setMessage('');

      const {
        data: activeSeason,
        error: seasonError,
      } = await supabase
        .from('league_seasons')
        .select(`
          id,
          name,
          starts_at,
          ends_at,
          status
        `)
        .eq('status', 'active')
        .order('starts_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (seasonError) {
        console.error(
          'Unable to load league season:',
          seasonError
        );

        setMessage(
          'We could not load the current league season.'
        );

        setLoading(false);
        return;
      }

      if (!activeSeason) {
        setMessage(
          'There is no active StageVotes season yet.'
        );

        setLoading(false);
        return;
      }

      setSeason(activeSeason as LeagueSeason);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } =
          await supabase
            .from('singer_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        setMyProfileId(
          profileData?.id || null
        );
      }

      const {
        data: pointsData,
        error: pointsError,
      } = await supabase
        .from('league_points')
        .select(`
          id,
          singer_profile_id,
          event_id,
          venue_id,
          points,
          placement,
          average_score,
          peoples_choice_winner,
          event_type,
          created_at,
          singer_profiles!league_points_singer_profile_id_fkey (
  id,
  stage_name,
  display_name,
  photo_url
),
events!league_points_event_id_fkey (
  id,
  name,
  venue
),
venues!league_points_venue_id_fkey (
  id,
  name,
  slug,
  city,
  state
)
        `)
        .eq('season_id', activeSeason.id)
        .order('created_at', {
          ascending: false,
        });

      if (pointsError) {
        console.error(
          'Unable to load league points:',
          pointsError
        );

        setMessage(
          'We could not load the current standings.'
        );

        setLoading(false);
        return;
      }

      const normalizedRows: LeaguePointRow[] =
  (pointsData || []).map((row: any) => ({
    ...row,

    singer_profiles:
      Array.isArray(row.singer_profiles)
        ? row.singer_profiles[0] || null
        : row.singer_profiles || null,

    events:
      Array.isArray(row.events)
        ? row.events[0] || null
        : row.events || null,

    venues:
      Array.isArray(row.venues)
        ? row.venues[0] || null
        : row.venues || null,
  }));

setPointRows(normalizedRows);

      setLoading(false);
    }

    loadLeague();
  }, []);

  const standings = useMemo(() => {
    const singerMap = new Map<
      string,
      {
        singerProfileId: string;
        singerName: string;
        photoUrl: string | null;
        points: number;
        eventIds: Set<string>;
        wins: number;
        peoplesChoiceWins: number;
        totalScore: number;
        scoreCount: number;
      }
    >();

    pointRows.forEach((row) => {
     const profile =
  row.singer_profiles || null;

      const singerName =
        profile?.stage_name?.trim() ||
        profile?.display_name?.trim() ||
        'StageVotes Singer';

      const existing =
        singerMap.get(
          row.singer_profile_id
        ) || {
          singerProfileId:
            row.singer_profile_id,
          singerName,
          photoUrl:
            profile?.photo_url || null,
          points: 0,
          eventIds: new Set<string>(),
          wins: 0,
          peoplesChoiceWins: 0,
          totalScore: 0,
          scoreCount: 0,
        };

      existing.points += Number(
        row.points || 0
      );

      existing.eventIds.add(
        row.event_id
      );

      if (row.placement === 1) {
        existing.wins += 1;
      }

      if (
        row.peoples_choice_winner
      ) {
        existing.peoplesChoiceWins += 1;
      }

      if (
        row.average_score !== null
      ) {
        existing.totalScore += Number(
          row.average_score
        );

        existing.scoreCount += 1;
      }

      singerMap.set(
        row.singer_profile_id,
        existing
      );
    });

    return Array.from(
      singerMap.values()
    )
      .map(
        (singer): RankedSinger => ({
          singerProfileId:
            singer.singerProfileId,
          singerName:
            singer.singerName,
          photoUrl:
            singer.photoUrl,
          points:
            singer.points,
          events:
            singer.eventIds.size,
          wins:
            singer.wins,
          peoplesChoiceWins:
            singer.peoplesChoiceWins,
          averageScore:
            singer.scoreCount > 0
              ? singer.totalScore /
                singer.scoreCount
              : null,
        })
      )
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          (b.averageScore || 0) -
            (a.averageScore || 0)
      );
  }, [pointRows]);

  const myStandingIndex =
    standings.findIndex(
      (singer) =>
        singer.singerProfileId ===
        myProfileId
    );

  const myStanding =
    myStandingIndex >= 0
      ? standings[myStandingIndex]
      : null;

  const myPoints =
    myStanding?.points || 0;

  const myDivision =
    getDivision(myPoints);

  const nextDivision =
    divisions.find(
      (division) =>
        division.minimum >
        myDivision.minimum
    ) || null;

  const divisionProgress =
    myDivision.nextMinimum
      ? Math.max(
          0,
          Math.min(
            100,
            ((myPoints -
              myDivision.minimum) /
              (myDivision.nextMinimum -
                myDivision.minimum)) *
              100
          )
        )
      : 100;

  const myRecentEvents =
    myProfileId
      ? pointRows
          .filter(
            (row) =>
              row.singer_profile_id ===
              myProfileId
          )
          .slice(0, 5)
      : [];

  return (
    <SVSingerShell
      title="Leagues"
      subtitle="Compete, earn points, and rise"
    >
      <main className="sv-league-page">
        <section className="sv-league-hero">
          <div>
            <div className="sv-league-eyebrow">
              StageVotes League
            </div>

            <h1>
              {season?.name ||
                'Current Season'}
            </h1>

            <p>
              Every completed judged show
              moves the rankings.
            </p>
          </div>

          <div className="sv-league-season-status">
            <span />
            Active Season
          </div>
        </section>

        {loading ? (
          <div className="sv-league-empty">
            Loading league standings...
          </div>
        ) : message ? (
          <div className="sv-league-empty">
            {message}
          </div>
        ) : (
          <>
            <section className="sv-league-my-progress">
              <div className="sv-league-division-card">
                <div className="sv-league-division-icon">
                  {myDivision.icon}
                </div>

                <div>
                  <span>Current Division</span>

                  <h2>
                    {myDivision.name}
                  </h2>

                  <p>
                    {myPoints.toLocaleString()}{' '}
                    league points
                  </p>
                </div>
              </div>

              <div className="sv-league-progress-card">
                <div className="sv-league-progress-top">
                  <div>
                    <span>Your Rank</span>

                    <strong>
                      {myStandingIndex >= 0
                        ? `#${myStandingIndex + 1}`
                        : 'Unranked'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      {nextDivision
                        ? `Next: ${nextDivision.name}`
                        : 'Top Division'}
                    </span>

                    <strong>
                      {nextDivision
                        ? `${Math.max(
                            0,
                            nextDivision.minimum -
                              myPoints
                          ).toLocaleString()} pts`
                        : 'Legend'}
                    </strong>
                  </div>
                </div>

                <div className="sv-league-progress-track">
                  <div
                    style={{
                      width:
                        `${divisionProgress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="sv-league-summary-card">
                <div>
                  <strong>
                    {standings.length}
                  </strong>

                  <span>Competitors</span>
                </div>

                <div>
                  <strong>
                    {myStanding?.wins || 0}
                  </strong>

                  <span>League Wins</span>
                </div>

                <div>
                  <strong>
                    {myStanding
                      ?.peoplesChoiceWins ||
                      0}
                  </strong>

                  <span>Crowd Wins</span>
                </div>
              </div>
            </section>

            <section className="sv-league-content-grid">
              <div className="sv-league-standings">
                <div className="sv-league-section-heading">
                  <div>
                    <span>Season Rankings</span>
                    <h2>Leaderboard</h2>
                  </div>
                </div>

                {standings.length > 0 ? (
                  <div className="sv-league-list">
                    {standings
                      .slice(0, 25)
                      .map(
                        (
                          singer,
                          index
                        ) => {
                          const division =
                            getDivision(
                              singer.points
                            );

                          return (
                            <article
                              key={
                                singer.singerProfileId
                              }
                              className={[
                                'sv-league-row',
                                singer.singerProfileId ===
                                myProfileId
                                  ? 'sv-league-row-me'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <div className="sv-league-rank">
                                {index === 0
                                  ? '🥇'
                                  : index === 1
                                    ? '🥈'
                                    : index === 2
                                      ? '🥉'
                                      : `#${index + 1}`}
                              </div>

                              <div className="sv-league-avatar">
                                {singer.photoUrl ? (
                                  <img
                                    src={
                                      singer.photoUrl
                                    }
                                    alt={
                                      singer.singerName
                                    }
                                  />
                                ) : (
                                  singer.singerName
                                    .split(/\s+/)
                                    .map(
                                      (word) =>
                                        word[0]
                                    )
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()
                                )}
                              </div>

                              <div className="sv-league-singer">
                                <strong>
                                  {
                                    singer.singerName
                                  }
                                </strong>

                                <span>
                                  {
                                    division.icon
                                  }{' '}
                                  {
                                    division.name
                                  }{' '}
                                  ·{' '}
                                  {
                                    singer.events
                                  }{' '}
                                  events
                                </span>
                              </div>

                              <div className="sv-league-points">
                                <strong>
                                  {singer.points.toLocaleString()}
                                </strong>

                                <span>Points</span>
                              </div>
                            </article>
                          );
                        }
                      )}
                  </div>
                ) : (
                  <div className="sv-league-empty">
                    The rankings will appear
                    after the first judged show
                    awards league points.
                  </div>
                )}
              </div>

              <aside className="sv-league-sidebar">
                <section className="sv-league-sidebar-card">
                  <div className="sv-league-section-heading">
                    <div>
                      <span>
                        Your Activity
                      </span>

                      <h2>
                        Recent Points
                      </h2>
                    </div>
                  </div>

                  {myRecentEvents.length >
                  0 ? (
                    <div className="sv-league-recent-list">
                      {myRecentEvents.map(
                        (row) => (
                          <Link
                            key={row.id}
                            href={`/leaderboard/${row.event_id}`}
                            className="sv-league-recent-row"
                          >
                            <div>
                              <strong>
                                {row.events?.name || 'League Event'}
                              </strong>

                              <span>
                                {row.venues?.name ||
row.events?.venue ||
  'StageVotes Venue'}
                              </span>
                            </div>

                            <strong>
                              +
                              {Number(
                                row.points
                              ).toLocaleString()}
                            </strong>
                          </Link>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="sv-league-sidebar-empty">
                      Complete a judged show to
                      begin earning league
                      points.
                    </p>
                  )}
                </section>

                <section className="sv-league-sidebar-card">
                  <div className="sv-league-section-heading">
                    <div>
                      <span>
                        Championship Path
                      </span>

                      <h2>
                        Tournaments
                      </h2>
                    </div>
                  </div>

                  <p className="sv-league-sidebar-empty">
                    Qualifiers, regional finals,
                    state championships, and
                    national events are coming
                    next.
                  </p>
                </section>
              </aside>
            </section>
          </>
        )}
      </main>
    </SVSingerShell>
  );
}