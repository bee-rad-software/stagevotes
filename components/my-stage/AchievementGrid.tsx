type Achievement = {
  icon: string;
  title: string;
  unlocked: boolean;
  progressText: string;
  progressPercent: number;
};

type Props = {
  performances: number;
  venues: number;
  averageScore: number;
  wins: number;
};

export default function AchievementGrid({
  performances,
  venues,
  averageScore,
  wins,
}: Props) {
  const achievements: Achievement[] = [
  {
    icon: '🎤',
    title: 'First Performance',
    unlocked: performances >= 1,
    progressText: `${Math.min(performances, 1)} / 1 performance`,
    progressPercent: Math.min((performances / 1) * 100, 100),
  },
  {
    icon: '⭐',
    title: 'Regular Performer',
    unlocked: performances >= 25,
    progressText: `${Math.min(performances, 25)} / 25 performances`,
    progressPercent: Math.min((performances / 25) * 100, 100),
  },
  {
    icon: '📍',
    title: 'Explorer',
    unlocked: venues >= 5,
    progressText: `${Math.min(venues, 5)} / 5 venues`,
    progressPercent: Math.min((venues / 5) * 100, 100),
  },
  {
    icon: '🏆',
    title: 'Champion',
    unlocked: wins >= 1,
    progressText: `${Math.min(wins, 1)} / 1 win`,
    progressPercent: Math.min((wins / 1) * 100, 100),
  },
  {
    icon: '💯',
    title: 'Crowd Favorite',
    unlocked: averageScore >= 4.5,
    progressText:
      averageScore > 0
        ? `${averageScore.toFixed(2)} / 4.50 average`
        : 'No rated performances yet',
    progressPercent: Math.min((averageScore / 4.5) * 100, 100),
  },
];

  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ marginBottom: 14 }}>
        <p
          style={{
            margin: 0,
            color: "#facc15",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          Milestones
        </p>

        <h2 style={{ margin: "5px 0 0" }}>
          Achievements
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
        }}
      >
        {achievements.map((a) => (
          <div
            key={a.title}
            style={{
              padding: 20,
              borderRadius: 20,
              textAlign: "center",
              background: a.unlocked
                ? "rgba(249,115,22,.12)"
                : "rgba(15,23,42,.55)",
              border: a.unlocked
                ? "1px solid rgba(249,115,22,.35)"
                : "1px solid rgba(148,163,184,.12)",
              opacity: a.unlocked ? 1 : .45,
            }}
          >
            <div style={{ fontSize: 34 }}>
              {a.icon}
            </div>

            <div
              style={{
                marginTop: 10,
                fontWeight: 700,
              }}
            >
              {a.title}
            </div>

<div
  style={{
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 700,
  }}
>
  {a.unlocked ? 'Unlocked' : a.progressText}
</div>

<div
  style={{
    height: 6,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 999,
    background: 'rgba(148,163,184,.16)',
  }}
>
  <div
    style={{
      width: `${a.progressPercent}%`,
      height: '100%',
      borderRadius: 999,
      background: a.unlocked
        ? 'linear-gradient(90deg,#f97316,#facc15)'
        : 'rgba(56,189,248,.65)',
      transition: 'width .3s ease',
    }}
  />
</div>

          </div>
        ))}
      </div>
    </section>
  );
}