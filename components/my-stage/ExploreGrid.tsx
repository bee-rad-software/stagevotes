import Link from 'next/link';

type ExploreItem = {
  icon: string;
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
};

export default function ExploreGrid() {
  const items: ExploreItem[] = [
    {
      icon: '📖',
      title: 'Song History',
      description: 'See every song you have performed.',
      href: '/singer-history',
    },
    {
      icon: '🌎',
      title: 'Karaoke Passport',
      description: 'Track venues, cities, and places you have sung.',
      href: '#',
      disabled: true,
    },
    {
      icon: '🥇',
      title: 'League Rankings',
      description: 'See how you rank at your venue and beyond.',
      href: '#',
      disabled: true,
    },
    {
      icon: '🏆',
      title: 'All Achievements',
      description: 'View your unlocked badges and next goals.',
      href: '#',
      disabled: true,
    },
  ];

  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ marginBottom: 14 }}>
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
          Keep Exploring
        </p>

        <h2 style={{ margin: '5px 0 0' }}>
          Your StageVotes Journey
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
  'repeat(4, minmax(0, 1fr))',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        {items.map((item) => {
          const card = (
            <article
              style={{
                height: '100%',
                padding: 20,
                borderRadius: 22,
                background: 'rgba(15,28,47,.92)',
                border: '1px solid rgba(148,163,184,.14)',
                opacity: item.disabled ? 0.55 : 1,
                cursor: item.disabled ? 'default' : 'pointer',
              }}
            >
              <div style={{ fontSize: 30 }}>
                {item.icon}
              </div>

              <h3 style={{ margin: '14px 0 0' }}>
                {item.title}
              </h3>

              <p
                style={{
                  margin: '8px 0 0',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  fontSize: 14,
                }}
              >
                {item.description}
              </p>

              <div
                style={{
                  marginTop: 16,
                  color: item.disabled
                    ? '#64748b'
                    : '#38bdf8',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {item.disabled ? 'Coming Soon' : 'Open →'}
              </div>
            </article>
          );

          return item.disabled ? (
            <div key={item.title}>{card}</div>
          ) : (
            <Link
              key={item.title}
              href={item.href}
              style={{
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}