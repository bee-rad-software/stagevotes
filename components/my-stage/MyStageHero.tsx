import type { SingerProfile } from './types';

type MyStageHeroProps = {
  profile: SingerProfile;
  level: string;
};

export default function MyStageHero({
  profile,
  level,
}: MyStageHeroProps) {
  const name =
    profile.stage_name ||
    profile.display_name ||
    'StageVotes Singer';

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section
      style={{
        padding: 26,
        borderRadius: 28,
        background:
          'linear-gradient(135deg,rgba(23,37,84,.96),rgba(15,23,42,.96))',
        border: '1px solid rgba(56,189,248,.18)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: '50%',
            background:
              'linear-gradient(135deg,#38bdf8,#f97316)',
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            initials
          )}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
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
            My Stage
          </p>

          <h1
            style={{
              margin: '6px 0 0',
              fontSize: 'clamp(30px,6vw,48px)',
              letterSpacing: '-.04em',
            }}
          >
            {name}
          </h1>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 14,
            }}
          >
            <span
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                background: 'rgba(249,115,22,.14)',
                color: '#fdba74',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              ⭐ {level}
            </span>

            {profile.home_venue && (
              <span
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: 'rgba(56,189,248,.12)',
                  color: '#7dd3fc',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                📍 {profile.home_venue}
              </span>
            )}
          </div>

          {profile.bio && (
            <p
              style={{
                maxWidth: 650,
                margin: '16px 0 0',
                color: '#cbd5e1',
                lineHeight: 1.6,
              }}
            >
              {profile.bio}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}