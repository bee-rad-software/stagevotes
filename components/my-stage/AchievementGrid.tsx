import styles from './MyStage.module.css';
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

export default function AchievementGrid(props: Props) {
  const earned = props.achievements.filter(a => a.earned).sort((a,b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''));
  const locked = props.achievements.filter(a => !a.earned);
  function badge(a: AchievementCollectionItem) {
    const hidden = a.isSecret && !a.earned;
    const progress = getProgress(a, props);
    return <details key={a.id} className={`${styles.badge} ${!a.earned ? styles.locked : ''}`}>
      <summary>
        <span className={styles.medallion} aria-hidden="true">{hidden ? '🔒' : a.icon || '🏅'}</span>
        <strong>{hidden ? 'Mystery badge' : a.title}</strong>
        <small>{a.earned ? 'Earned · Tap for details' : 'Not earned yet'}</small>
      </summary>
      <div className={styles.badgeDetails}>
        <p>{hidden ? 'Keep singing to discover this badge.' : a.earned ? a.unlockedDescription || a.description : a.description}</p>
        {a.earned && <><p>Earned {formatEarnedDate(a.earnedAt)}</p><p>{a.points} points · {getRarity(a.earnedPercentage).name}</p></>}
        {!hidden && !a.earned && progress && <p>{progress.label}</p>}
      </div>
    </details>;
  }
  return <section id="my-badges" className={styles.collection}>
    <div className={styles.sectionHead}><h2>My badges</h2><span>{earned.length} earned</span></div>
    {earned.length ? <div className={styles.badges}>{earned.map(badge)}</div> : <p className={styles.empty}>Your earned badges will appear here. Sing your first song to get started!</p>}
    <details className={styles.disclosure}><summary>Explore {locked.length} more badges</summary><div className={styles.badges}>{locked.map(badge)}</div></details>
  </section>;
}
