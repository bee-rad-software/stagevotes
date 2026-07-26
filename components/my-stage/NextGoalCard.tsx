type NextGoalCardProps = {
  performances: number;
  venues: number;
  averageScore: number;
  wins: number;
};

type Goal = {
  icon: string;
  eyebrow: string;
  title: string;
  current: number;
  target: number;
  unit: string;
};

export default function NextGoalCard({
  performances,
  venues,
  averageScore,
  wins,
}: NextGoalCardProps) {
  const goals: Goal[] = [
    {
      icon: '🎤',
      eyebrow: 'Next Goal',
      title:
        performances < 25
          ? 'Regular Performer'
          : performances < 50
            ? 'Veteran Performer'
            : 'Headliner',
      current:
        performances < 25
          ? performances
          : performances < 50
            ? performances
            : Math.min(performances, 100),
      target:
        performances < 25
          ? 25
          : performances < 50
            ? 50
            : 100,
      unit: 'performances',
    },
    {
      icon: '🌎',
      eyebrow: 'Next Badge',
      title:
        venues < 5
          ? 'Explorer'
          : venues < 15
            ? 'Regional Explorer'
            : 'Road Warrior',
      current:
        venues < 5
          ? venues
          : venues < 15
            ? venues
            : Math.min(venues, 25),
      target:
        venues < 5
          ? 5
          : venues < 15
            ? 15
            : 25,
      unit: 'venues',
    },
    {
      icon: '⭐',
      eyebrow: 'Rating Goal',
      title: 'Crowd Favorite',
      current: Math.min(averageScore, 4.5),
      target: 4.5,
      unit: 'average score',
    },
    {
      icon: '🏆',
      eyebrow: 'Competition Goal',
      title: 'First Win',
      current: Math.min(wins, 1),
      target: 1,
      unit: 'win',
    },
  ];

  const nextGoal =
    goals.find((goal) => goal.current < goal.target) ??
    goals[0];

  const progressPercent = Math.min(
    (nextGoal.current / nextGoal.target) * 100,
    100
  );

  const currentText =
    nextGoal.unit === 'average score'
      ? nextGoal.current.toFixed(2)
      : nextGoal.current;

  const targetText =
    nextGoal.unit === 'average score'
      ? nextGoal.target.toFixed(2)
      : nextGoal.target;

  return (
    <section
      style={{
        marginTop: 28,
        padding: 24,
        borderRadius: 24,
        background:
          'linear-gradient(135deg,rgba(124,45,18,.92),rgba(30,41,59,.96))',
        border: '1px solid rgba(249,115,22,.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            borderRadius: 17,
            background: 'rgba(255,255,255,.09)',
            fontSize: 28,
          }}
        >
          {nextGoal.icon}
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              color: '#fdba74',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
            }}
          >
            {nextGoal.eyebrow}
          </p>

          <h2 style={{ margin: '6px 0 0' }}>
            {nextGoal.title}
          </h2>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 18,
              color: '#cbd5e1',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <span>
              {currentText} / {targetText} {nextGoal.unit}
            </span>

            <span>{Math.round(progressPercent)}%</span>
          </div>

          <div
            style={{
              height: 10,
              marginTop: 10,
              overflow: 'hidden',
              borderRadius: 999,
              background: 'rgba(255,255,255,.12)',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                borderRadius: 999,
                background:
                  'linear-gradient(90deg,#f97316,#facc15)',
                transition: 'width .3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}