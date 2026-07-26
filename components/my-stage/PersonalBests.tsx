import type { PersonalBests as PersonalBestsType } from './types';

type PersonalBestsProps = {
  bests: PersonalBestsType;
};

export default function PersonalBests({
  bests,
}: PersonalBestsProps) {
  const cards = [
    {
      icon: '⭐',
      label: 'Highest Score',
      value:
        bests.highestScore > 0
          ? bests.highestScore.toFixed(2)
          : '—',
      detail:
        bests.highestScoreSong ||
        'No rated performance yet',
    },
    {
      icon: '🏆',
      label: 'Best Finish',
      value: bests.bestFinish || '—',
      detail:
        bests.bestFinish
          ? 'Competition result'
          : 'No wins recorded yet',
    },
    {
      icon: '🎙️',
      label: 'Most Performed Artist',
      value:
        bests.mostPerformedArtist ||
        'Waiting for more songs',
      detail: 'Your most frequent artist',
    },
    {
      icon: '🎵',
      label: 'Signature Song',
      value:
        bests.signatureSong ||
        'Waiting for more songs',
      detail: 'Your most performed song',
    },
  ];

  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ marginBottom: 14 }}>
        <p
          style={{
            margin: 0,
            color: '#f97316',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
          }}
        >
          Highlights
        </p>

        <h2 style={{ margin: '5px 0 0' }}>
          Personal Bests
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(210px,1fr))',
          gap: 14,
        }}
      >
        {cards.map((card) => (
          <article
            key={card.label}
            style={{
              padding: 20,
              borderRadius: 22,
              background: 'rgba(15,28,47,.92)',
              border:
                '1px solid rgba(148,163,184,.14)',
            }}
          >
            <div style={{ fontSize: 28 }}>
              {card.icon}
            </div>

            <p
              style={{
                margin: '14px 0 0',
                color: '#94a3b8',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {card.label}
            </p>

            <strong
              style={{
                display: 'block',
                marginTop: 6,
                fontSize: 21,
                lineHeight: 1.25,
              }}
            >
              {card.value}
            </strong>

            <p
              style={{
                margin: '8px 0 0',
                color: '#64748b',
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {card.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}