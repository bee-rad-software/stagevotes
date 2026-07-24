import StatCard from './StatCard';
import type { SingerStats } from './types';

type LifetimeStatsProps = {
  stats: SingerStats;
};

export default function LifetimeStats({
  stats,
}: LifetimeStatsProps) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <p
          style={{
            margin: 0,
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Career
        </p>

        <h2 style={{ margin: '5px 0 0' }}>
          Lifetime Stats
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 14,
        }}
      >
        <StatCard
          icon="🎤"
          value={stats.performances}
          label="Performances"
        />

        <StatCard
          icon="⭐"
          value={
            stats.averageScore > 0
              ? stats.averageScore.toFixed(2)
              : '—'
          }
          label="Average Score"
        />

        <StatCard
          icon="🏆"
          value={stats.wins}
          label="Wins"
        />

        <StatCard
          icon="📍"
          value={stats.venues}
          label="Venues Visited"
        />
      </div>
    </section>
  );
}