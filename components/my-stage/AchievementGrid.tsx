import type {
  AchievementCollectionItem,
} from '@/components/my-stage/types';

type Props = {
  achievements: AchievementCollectionItem[];
  performances: number;
  venues: number;
  averageScore: number;
  wins: number;
};

type Progress = {
  current: number;
  target: number;
  label: string;
};

function getProgress(
  achievement: AchievementCollectionItem,
  stats: Omit<Props, 'achievements'>
): Progress | null {
  const target = Number(
    achievement.criteriaConfig.count ||
    achievement.criteriaConfig.minimum ||
    0
  );

  if (
    achievement.criteriaType ===
    'performance_count'
  ) {
    return {
      current: stats.performances,
      target,
      label: `${Math.min(
        stats.performances,
        target
      )} / ${target} performances`,
    };
  }

  if (
    achievement.criteriaType ===
    'venue_count'
  ) {
    return {
      current: stats.venues,
      target,
      label: `${Math.min(
        stats.venues,
        target
      )} / ${target} venues`,
    };
  }

  if (
    achievement.criteriaType ===
    'average_score'
  ) {
    return {
      current: stats.averageScore,
      target,
      label:
        stats.averageScore > 0
          ? `${stats.averageScore.toFixed(
              2
            )} / ${target.toFixed(2)} average`
          : 'No rated performances yet',
    };
  }

  if (
    achievement.criteriaType ===
    'win_count'
  ) {
    return {
      current: stats.wins,
      target,
      label: `${Math.min(
        stats.wins,
        target
      )} / ${target} wins`,
    };
  }

  return null;
}

function getRarity(percentage: number) {
  if (percentage <= 1) {
    return {
      name: 'Legendary',
      color: '#facc15',
      background: 'rgba(250,204,21,.12)',
      border: 'rgba(250,204,21,.3)',
    };
  }

  if (percentage <= 5) {
    return {
      name: 'Epic',
      color: '#c084fc',
      background: 'rgba(192,132,252,.12)',
      border: 'rgba(192,132,252,.3)',
    };
  }

  if (percentage <= 20) {
    return {
      name: 'Rare',
      color: '#38bdf8',
      background: 'rgba(56,189,248,.12)',
      border: 'rgba(56,189,248,.3)',
    };
  }

  if (percentage <= 50) {
    return {
      name: 'Uncommon',
      color: '#4ade80',
      background: 'rgba(74,222,128,.12)',
      border: 'rgba(74,222,128,.3)',
    };
  }

  return {
    name: 'Common',
    color: '#cbd5e1',
    background: 'rgba(203,213,225,.1)',
    border: 'rgba(203,213,225,.22)',
  };
}

function formatEarnedCount(count: number) {
  if (count === 1) {
    return '1 singer has this badge';
  }

  return `${count.toLocaleString()} singers have this badge`;
}

function formatEarnedDate(value: string | null) {
  if (!value) return '';

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(new Date(value));
}

export default function AchievementGrid({
  achievements,
  performances,
  venues,
  averageScore,
  wins,
}: Props) {
  const earnedCount = achievements.filter(
    (achievement) => achievement.earned
  ).length;

  const totalCount = achievements.length;

  const collectionPercent =
    totalCount > 0
      ? Math.round(
          (earnedCount / totalCount) * 100
        )
      : 0;

  const categories = Array.from(
    new Set(
      achievements.map(
        (achievement) =>
          achievement.category
      )
    )
  );

  const stats = {
    performances,
    venues,
    averageScore,
    wins,
  };

  return (
    <section style={{ marginTop: 30 }}>
      <div
        style={{
          padding: 22,
          borderRadius: 24,
          border:
            '1px solid rgba(249,115,22,.28)',
          background:
            'linear-gradient(145deg,rgba(249,115,22,.12),rgba(15,23,42,.78) 55%)',
          boxShadow:
            '0 20px 60px rgba(2,6,23,.28)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: '#facc15',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
              }}
            >
              Badge Collection
            </p>

            <h2
              style={{
                margin: '6px 0 0',
                fontSize: 28,
              }}
            >
              Your Achievements
            </h2>

            <p
              style={{
                margin: '7px 0 0',
                color: '#94a3b8',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Keep singing, exploring, and
              competing to complete your
              collection.
            </p>
          </div>

          <div
            style={{
              minWidth: 140,
              padding: '13px 17px',
              borderRadius: 18,
              textAlign: 'center',
              border:
                '1px solid rgba(56,189,248,.25)',
              background:
                'rgba(2,132,199,.1)',
            }}
          >
            <div
              style={{
                color: '#7dd3fc',
                fontSize: 26,
                fontWeight: 950,
              }}
            >
              {earnedCount} of {totalCount}
            </div>

            <div
              style={{
                marginTop: 2,
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              Badges earned
            </div>
          </div>
        </div>

        <div
          style={{
            height: 10,
            marginTop: 20,
            overflow: 'hidden',
            borderRadius: 999,
            background:
              'rgba(148,163,184,.16)',
          }}
        >
          <div
            style={{
              width: `${collectionPercent}%`,
              height: '100%',
              borderRadius: 999,
              background:
                'linear-gradient(90deg,#f97316,#facc15)',
              boxShadow:
                '0 0 18px rgba(249,115,22,.45)',
              transition: 'width .4s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span>{collectionPercent}% complete</span>

          <span>
            {Math.max(
              totalCount - earnedCount,
              0
            )}{' '}
            remaining
          </span>
        </div>
      </div>

      {categories.map((category) => {
        const categoryAchievements =
          achievements.filter(
            (achievement) =>
              achievement.category ===
              category
          );

        const categoryEarned =
          categoryAchievements.filter(
            (achievement) =>
              achievement.earned
          ).length;

        return (
          <div
            key={category}
            style={{ marginTop: 26 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                }}
              >
                {category === 'Secret'
                  ? 'Mystery Badges'
                  : category}
              </h3>

              <span
                style={{
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {categoryEarned} of{' '}
                {categoryAchievements.length}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(210px,1fr))',
                gap: 14,
              }}
            >
              {categoryAchievements.map(
                (achievement) => {
                  const hidden =
                    achievement.isSecret &&
                    !achievement.earned;

                  const progress =
                    getProgress(
                      achievement,
                      stats
                    );

                  const progressPercent =
                    progress &&
                    progress.target > 0
                      ? Math.min(
                          (
                            progress.current /
                            progress.target
                          ) * 100,
                          100
                        )
                      : 0;

                  const rarity = getRarity(
                    achievement.earnedPercentage
                  );

                  return (
                    <article
                      key={achievement.id}
                      style={{
                        position: 'relative',
                        minHeight: 250,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 20,
                        overflow: 'hidden',
                        borderRadius: 22,
                        border:
                          achievement.earned
                            ? '1px solid rgba(249,115,22,.4)'
                            : hidden
                              ? '1px solid rgba(139,92,246,.2)'
                              : '1px solid rgba(148,163,184,.14)',
                        background:
                          achievement.earned
                            ? 'linear-gradient(150deg,rgba(249,115,22,.16),rgba(15,23,42,.78) 55%)'
                            : hidden
                              ? 'linear-gradient(150deg,rgba(88,28,135,.16),rgba(15,23,42,.72))'
                              : 'rgba(15,23,42,.58)',
                        boxShadow:
                          achievement.earned
                            ? '0 15px 40px rgba(249,115,22,.08)'
                            : 'none',
                        opacity:
                          achievement.earned ||
                          hidden
                            ? 1
                            : 0.62,
                      }}
                    >
                      {achievement.earned && (
                        <div
                          style={{
                            position:
                              'absolute',
                            top: 14,
                            right: 14,
                            width: 27,
                            height: 27,
                            display: 'grid',
                            placeItems:
                              'center',
                            borderRadius:
                              '50%',
                            color: '#052e16',
                            background:
                              '#4ade80',
                            fontSize: 15,
                            fontWeight: 950,
                          }}
                        >
                          ✓
                        </div>
                      )}

                      <div
                        style={{
                          width: 62,
                          height: 62,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 19,
                          border:
                            achievement.earned
                              ? '1px solid rgba(249,115,22,.38)'
                              : hidden
                                ? '1px solid rgba(192,132,252,.25)'
                                : '1px solid rgba(148,163,184,.14)',
                          background:
                            achievement.earned
                              ? 'rgba(249,115,22,.14)'
                              : hidden
                                ? 'rgba(126,34,206,.12)'
                                : 'rgba(15,23,42,.6)',
                          fontSize: 31,
                          filter:
                            hidden
                              ? 'grayscale(1)'
                              : 'none',
                        }}
                      >
                        {hidden
                          ? '❓'
                          : achievement.icon}
                      </div>

                      <h4
                        style={{
                          margin:
                            '15px 0 0',
                          paddingRight: 30,
                          fontSize: 17,
                        }}
                      >
                        {hidden
                          ? 'Secret Achievement'
                          : achievement.title}
                      </h4>

                      <p
                        style={{
                          margin: '7px 0 0',
                          color: '#94a3b8',
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {hidden
                          ? 'Keep singing to discover this hidden badge.'
                          : achievement.earned
                            ? achievement
                                .unlockedDescription
                            : achievement.description}
                      </p>

                      <div
                        style={{
                          flex: 1,
                        }}
                      />

                      {!hidden &&
                        !achievement.earned &&
                        progress && (
                          <div
                            style={{
                              marginTop: 18,
                            }}
                          >
                            <div
                              style={{
                                marginBottom: 7,
                                color:
                                  '#94a3b8',
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {progress.label}
                            </div>

                            <div
                              style={{
                                height: 6,
                                overflow:
                                  'hidden',
                                borderRadius:
                                  999,
                                background:
                                  'rgba(148,163,184,.16)',
                              }}
                            >
                              <div
                                style={{
                                  width: `${progressPercent}%`,
                                  height: '100%',
                                  borderRadius:
                                    999,
                                  background:
                                    'rgba(56,189,248,.75)',
                                }}
                              />
                            </div>
                          </div>
                        )}

                      {achievement.earned && (
                        <div
                          style={{
                            marginTop: 18,
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'space-between',
                              gap: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                padding:
                                  '5px 9px',
                                borderRadius:
                                  999,
                                color:
                                  rarity.color,
                                background:
                                  rarity.background,
                                border: `1px solid ${rarity.border}`,
                                fontSize: 10,
                                fontWeight: 950,
                                letterSpacing:
                                  '.08em',
                                textTransform:
                                  'uppercase',
                              }}
                            >
                              {rarity.name}
                            </span>

                            <span
                              style={{
                                color:
                                  '#facc15',
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              +{achievement.points}{' '}
                              points
                            </span>
                          </div>

                          <div
                            style={{
                              color: '#cbd5e1',
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {formatEarnedCount(
                              achievement.earnedCount
                            )}
                          </div>

                          <div
                            style={{
                              color: '#64748b',
                              fontSize: 11,
                            }}
                          >
                            Earned{' '}
                            {formatEarnedDate(
                              achievement.earnedAt
                            )}
                            {' · '}
                            {achievement
                              .earnedPercentage.toFixed(
                                1
                              )}
                            % of singers
                          </div>
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}