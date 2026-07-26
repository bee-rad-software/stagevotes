import type { SingerStats } from './types';

type HeroStatsProps = {
  stats: SingerStats;
};

export default function HeroStats({
  stats,
}: HeroStatsProps) {
  const items = [
    {
      label: 'Performances',
      value: stats.performances,
      icon: '🎤',
    },
    {
      label: 'Average Score',
      value: stats.averageScore.toFixed(2),
      icon: '⭐',
    },
    {
      label: 'Wins',
      value: stats.wins,
      icon: '🏆',
    },
    {
      label: 'Venues',
     value: stats.venues,
      icon: '📍',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(2, minmax(120px, 1fr))',
        gap: 12,
        minWidth: 280,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
    style={{
  padding: '18px 10px',
  borderRadius: 16,
  border: '1px solid rgba(148,163,184,.12)',
  background: 'rgba(255,255,255,.03)',
  textAlign: 'center',
}}
        >
          <div
        style={{
  color: '#94a3b8',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
}}
          >
            <div
  style={{
    fontSize: 18,
    marginBottom: 6,
  }}
>
  {item.icon}
</div>

<div>
  {item.label}
</div>
          </div>

          <div
         style={{
  marginTop: 8,
  color: 'white',
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1,
}}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}