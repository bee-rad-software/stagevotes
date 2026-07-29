'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  CheckCircle2,
  Crown,
  Mic2,
  Star,
  Trophy,
  Users,
  Vote,
} from 'lucide-react';

import SVShell from '@/components/ui/SVShell';
import {
  supabase,
  EventRow,
  PerformanceRow,
  VoteRow,
} from '@/lib/supabase';

type CategoryRow = {
  id: string;
  category_name: string;
};

type PeoplesChoiceResult = {
  singer_name: string;
  votes: number;
};

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.eventId as string;

  const [event, setEvent] =
    useState<EventRow | null>(null);

  const [performances, setPerformances] =
    useState<PerformanceRow[]>([]);

  const [votes, setVotes] =
    useState<VoteRow[]>([]);

  const [categories, setCategories] =
    useState<CategoryRow[]>([]);

  const [
    peoplesChoiceResults,
    setPeoplesChoiceResults,
  ] = useState<PeoplesChoiceResult[]>([]);

  const [checkinCount, setCheckinCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [eventId]);

  async function loadAnalytics() {
    setLoading(true);

    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      router.push('/login');
      return;
    }

    const {
      data: accountUser,
      error: accountUserError,
    } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userData.user.id)
      .single();

    if (
      accountUserError ||
      !accountUser
    ) {
      console.error(accountUserError);
      alert(
        'No StageVotes account was found.'
      );
      router.push('/');
      return;
    }

    const accountId =
      accountUser.account_id;

    const [
      eventResult,
      performancesResult,
      votesResult,
      categoriesResult,
      peopleResult,
      checkinResult,
    ] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('account_id', accountId)
        .single(),

      supabase
        .from('performances')
        .select('*')
        .eq('event_id', eventId)
        .eq('account_id', accountId)
        .order('queue_order', {
          ascending: true,
        }),

      supabase
        .from('votes')
        .select('*')
        .eq('event_id', eventId)
        .eq('account_id', accountId),

      supabase
        .from('vote_categories')
        .select('id, category_name')
        .eq('event_id', eventId)
        .eq('account_id', accountId),

      supabase
        .from('peoples_choice_votes')
        .select('singer_name')
        .eq('event_id', eventId),

      supabase
        .from('event_checkins')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('event_id', eventId),
    ]);

    if (
      eventResult.error ||
      !eventResult.data
    ) {
      console.error(
        eventResult.error
      );

      alert(
        'You do not have access to this event.'
      );

      router.push('/');
      return;
    }

    setEvent(eventResult.data);

    setPerformances(
      performancesResult.data || []
    );

    setVotes(
      votesResult.data || []
    );

    setCategories(
      categoriesResult.data || []
    );

    setCheckinCount(
      checkinResult.count || 0
    );

    const counts: Record<
      string,
      number
    > = {};

    (
      peopleResult.data || []
    ).forEach((vote) => {
      counts[vote.singer_name] =
        (counts[vote.singer_name] ||
          0) + 1;
    });

    const results =
      Object.entries(counts)
        .map(
          ([
            singer_name,
            voteCount,
          ]) => ({
            singer_name,
            votes: voteCount,
          })
        )
        .sort(
          (a, b) =>
            b.votes - a.votes
        );

    setPeoplesChoiceResults(
      results
    );

    setLoading(false);
  }

  const leaderboard = useMemo(() => {
    const singerScores =
      new Map<
        string,
        {
          singer_name: string;
          totalScore: number;
          performances: number;
          tiebreakerScore: number;
        }
      >();

    performances.forEach(
      (performance) => {
        const performanceVotes =
          votes.filter(
            (vote) =>
              vote.performance_id ===
              performance.id
          );

        if (
          performanceVotes.length === 0
        ) {
          return;
        }

        const performanceAverage =
          performanceVotes.reduce(
            (sum, vote) =>
              sum + vote.score,
            0
          ) /
          performanceVotes.length;

        const singerKey =
          performance.singer_name
            .trim()
            .toLowerCase();

        if (
          !singerScores.has(
            singerKey
          )
        ) {
          singerScores.set(
            singerKey,
            {
              singer_name:
                performance.singer_name,
              totalScore: 0,
              performances: 0,
              tiebreakerScore: 0,
            }
          );
        }

        const singer =
          singerScores.get(
            singerKey
          )!;

        singer.totalScore +=
          performanceAverage;

        singer.performances += 1;

        const tiebreakerCategory =
          categories.find(
            (category) =>
              category.category_name
                .trim()
                .toLowerCase() ===
              event?.tiebreaker_category_name
                ?.trim()
                .toLowerCase()
          );

        const tiebreakerVotes =
          performanceVotes.filter(
            (vote) =>
              (
                vote as VoteRow & {
                  category_id?: string;
                }
              ).category_id ===
              tiebreakerCategory?.id
          );

        if (
          tiebreakerVotes.length > 0
        ) {
          singer.tiebreakerScore +=
            tiebreakerVotes.reduce(
              (sum, vote) =>
                sum + vote.score,
              0
            ) /
            tiebreakerVotes.length;
        }
      }
    );

    return Array.from(
      singerScores.values()
    )
      .map((singer) => ({
        ...singer,
        averageScore:
          singer.totalScore /
          singer.performances,
        averageTiebreaker:
          singer.tiebreakerScore /
          singer.performances,
      }))
      .sort((a, b) => {
        const scoreDifference =
          b.averageScore -
          a.averageScore;

        if (
          Math.abs(
            scoreDifference
          ) > 0.001
        ) {
          return scoreDifference;
        }

        return (
          b.averageTiebreaker -
          a.averageTiebreaker
        );
      });
  }, [
    performances,
    votes,
    categories,
    event,
  ]);

  const uniqueSingerCount =
    new Set(
      performances.map(
        (performance) =>
          performance.singer_name
            .trim()
            .toLowerCase()
      )
    ).size;

  const completedCount =
    performances.filter(
      (performance) =>
        performance.status ===
        'completed'
    ).length;

  const peopleVoteCount =
    peoplesChoiceResults.reduce(
      (sum, result) =>
        sum + result.votes,
      0
    );

  const judgeBallotCount =
    new Set(
      votes.map((vote) => {
        const typedVote =
          vote as VoteRow & {
            device_id?: string;
          };

        return `${vote.performance_id}-${typedVote.device_id}`;
      })
    ).size;

  const participation =
    checkinCount > 0
      ? Math.round(
          (peopleVoteCount /
            checkinCount) *
            100
        )
      : 0;

  if (loading) {
    return (
      <SVShell
        title="Analytics"
        subtitle="Loading show results..."
      >
        <div className="sv-card">
          Loading...
        </div>
      </SVShell>
    );
  }

  const summaryCards = [
    {
      label: 'Singers',
      value: uniqueSingerCount,
      icon: Users,
      accent: '#38bdf8',
    },
    {
      label: 'Songs',
      value: performances.length,
      icon: Mic2,
      accent: '#f97316',
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: CheckCircle2,
      accent: '#4ade80',
    },
    {
      label: 'Judge Ballots',
      value: judgeBallotCount,
      icon: Vote,
      accent: '#c084fc',
    },
    {
      label: "People's Choice Votes",
      value: peopleVoteCount,
      icon: Trophy,
      accent: '#facc15',
    },
    {
      label: 'Participation',
      value: `${participation}%`,
      icon: BarChart3,
      accent: '#2dd4bf',
    },
  ];

  return (
    <SVShell
      title="Analytics"
      subtitle={
        event?.name
          ? `${event.name} performance insights`
          : 'Review show performance and voting results.'
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {summaryCards.map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <section
                key={card.label}
                className="sv-card"
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 14,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems:
                      'center',
                    color:
                      card.accent,
                    background:
                      `${card.accent}1f`,
                  }}
                >
                  <Icon
                    size={22}
                  />
                </div>

                <div>
                  <div
                    style={{
                      opacity: 0.65,
                      fontSize: 12,
                    }}
                  >
                    {card.label}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 26,
                      fontWeight: 900,
                    }}
                  >
                    {card.value}
                  </div>
                </div>
              </section>
            );
          }
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 20,
          marginTop: 20,
        }}
      >
        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Crown
              size={22}
              color="#facc15"
            />

            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              Judge Leaderboard
            </h2>
          </div>

          {leaderboard.length ===
          0 ? (
            <p
              style={{
                opacity: 0.65,
              }}
            >
              No judge scores yet.
            </p>
          ) : (
            leaderboard.map(
              (row, index) => (
                <div
                  key={
                    row.singer_name
                  }
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    gap: 14,
                    padding:
                      '14px 0',
                    borderBottom:
                      index ===
                      leaderboard.length -
                        1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius:
                          10,
                        display:
                          'grid',
                        placeItems:
                          'center',
                        background:
                          index === 0
                            ? 'rgba(250,204,21,0.16)'
                            : 'rgba(255,255,255,0.05)',
                        color:
                          index === 0
                            ? '#facc15'
                            : 'white',
                        fontWeight:
                          900,
                      }}
                    >
                      {index + 1}
                    </div>

                    <strong>
                      {
                        row.singer_name
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      textAlign:
                        'right',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: 5,
                        fontWeight:
                          900,
                      }}
                    >
                      {row.averageScore.toFixed(
                        2
                      )}

                      <Star
                        size={15}
                        fill="currentColor"
                      />
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.55,
                        marginTop: 3,
                      }}
                    >
                      TB{' '}
                      {row.averageTiebreaker.toFixed(
                        2
                      )}
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </section>

        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Trophy
              size={22}
              color="#f97316"
            />

            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              People&apos;s Choice
            </h2>
          </div>

          {peoplesChoiceResults.length ===
          0 ? (
            <p
              style={{
                opacity: 0.65,
              }}
            >
              No audience votes yet.
            </p>
          ) : (
            peoplesChoiceResults.map(
              (row, index) => (
                <div
                  key={
                    row.singer_name
                  }
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    gap: 14,
                    padding:
                      '14px 0',
                    borderBottom:
                      index ===
                      peoplesChoiceResults.length -
                        1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius:
                          10,
                        display:
                          'grid',
                        placeItems:
                          'center',
                        background:
                          index === 0
                            ? 'rgba(249,115,22,0.16)'
                            : 'rgba(255,255,255,0.05)',
                        color:
                          index === 0
                            ? '#f97316'
                            : 'white',
                        fontWeight:
                          900,
                      }}
                    >
                      {index + 1}
                    </div>

                    <strong>
                      {
                        row.singer_name
                      }
                    </strong>
                  </div>

                  <strong>
                    {row.votes}{' '}
                    vote
                    {row.votes !== 1
                      ? 's'
                      : ''}
                  </strong>
                </div>
              )
            )
          )}
        </section>
      </div>
    </SVShell>
  );
}