import type {
  SingerProfile,
  SingerStats,
} from './types';
import ProfilePhotoUploader from './ProfilePhotoUploader';
import HeroStats from './HeroStats';
import HeroIdentity from './HeroIdentity';

type MyStageHeroProps = {
  profile: SingerProfile;
  stats: SingerStats;
  level: string;
  onPhotoUpload: (file: File) => void;
};

export default function MyStageHero({
  profile,
  stats,
  level,
  onPhotoUpload,
}: MyStageHeroProps) {
const rawName =
  profile.stage_name ||
  profile.display_name ||
  'Singer';

const name = toTitleCase(rawName);

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

    const badge = getPerformerBadge(level);

    function getPerformerBadge(level: string) {
  switch (level) {
    case 'Rookie':
      return {
        icon: '🌱',
        color: '#22c55e',
        background: 'rgba(34,197,94,.15)',
        border: 'rgba(34,197,94,.35)',
        label: 'Rookie Performer',
      };

    case 'Regular':
      return {
        icon: '⭐',
        color: '#facc15',
        background: 'rgba(250,204,21,.15)',
        border: 'rgba(250,204,21,.35)',
        label: 'Regular Performer',
      };

    case 'Gold':
      return {
        icon: '🥇',
        color: '#f59e0b',
        background: 'rgba(245,158,11,.15)',
        border: 'rgba(245,158,11,.35)',
        label: 'Gold Performer',
      };

    case 'Legend':
      return {
        icon: '👑',
        color: '#a855f7',
        background: 'rgba(168,85,247,.15)',
        border: 'rgba(168,85,247,.35)',
        label: 'Legend',
      };

    default:
      return {
        icon: '🎤',
        color: '#38bdf8',
        background: 'rgba(56,189,248,.15)',
        border: 'rgba(56,189,248,.35)',
        label: level,
      };
  }
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.charAt(0).toUpperCase() +
      word.slice(1).toLowerCase()
    )
    .join(' ');
}

  return (
<section
  style={{
    position: 'relative',
    overflow: 'hidden',
    padding: 32,
    borderRadius: 28,
    background:
      'radial-gradient(circle at 18% 45%, rgba(56,189,248,.18), transparent 32%), radial-gradient(circle at 78% 18%, rgba(249,115,22,.10), transparent 28%), linear-gradient(135deg, rgba(23,37,84,.98), rgba(15,23,42,.98))',
    border: '1px solid rgba(56,189,248,.22)',
    boxShadow: '0 24px 60px rgba(0,0,0,.22)',
  }}
>

<div
  aria-hidden="true"
  style={{
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.03,
    backgroundImage:
      'radial-gradient(circle, white 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  }}
/>

<div
  aria-hidden="true"
  style={{
    position: 'absolute',
    width: 340,
    height: 340,
    left: 5,
    top: '50%',
    transform: 'translateY(-50%)',
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(56,189,248,.16), transparent 68%)',
    filter: 'blur(10px)',
    pointerEvents: 'none',
  }}
/>

 <div
  style={{
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 24,
  }}
>
<ProfilePhotoUploader
  imageUrl={profile?.photo_url}
  initials={initials}
  onSelect={onPhotoUpload}
/>

    <HeroIdentity
  profile={profile}
  name={name}
  badge={badge}
  current={stats.performances}
  target={50}
  nextTitle="Veteran Performer"
  averageScore={stats.averageScore}
wins={stats.wins}
venues={stats.venues}
/>

<HeroStats stats={stats} />

      </div>
    </section>
  );
}