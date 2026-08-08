type PerformanceSummaryProps = {
  performances: number;
  venues: number;
  averageScore: number;
  championshipStory?: string | null;
};

export default function PerformanceSummary({
  performances,
  venues,
  averageScore,
  championshipStory,
}: PerformanceSummaryProps) {
  return (
    <section
      style={{
        marginTop: 28,
        padding: 24,
        borderRadius: 24,
        background: 'linear-gradient(135deg,#172554,#0f172a)',
        border: '1px solid rgba(56,189,248,.15)',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#38bdf8',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
        }}
      >
        Career Summary
      </p>

      <h2 style={{ marginTop: 10 }}>
        Your Karaoke Journey
      </h2>

     {championshipStory ? (
  championshipStory
) : (
  <>
    You've performed <strong>{performances}</strong> songs
    across <strong>{venues}</strong> venues with an average
    judge score of{' '}
    <strong>
      {averageScore > 0
        ? averageScore.toFixed(2)
        : '--'}
    </strong>
    .
  </>
)}
<div
  style={{
    marginTop: 14,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 700,
  }}
>
  <span>{performances} performances</span>

  <span>•</span>

  <span>{venues} venues</span>

  <span>•</span>

  <span>
    {averageScore > 0
      ? `${averageScore.toFixed(2)} career average`
      : 'No scores yet'}
  </span>
</div>
    </section>
  );
}