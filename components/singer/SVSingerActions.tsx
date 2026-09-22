'use client';

import {
  Trophy,
  History,
} from 'lucide-react';

type Props = {
  onLeaderboard?: () => void;
  onHistory?: () => void;
};

export default function SVSingerActions({
  onLeaderboard,
  onHistory,
}: Props) {
  return (
    <section className="sv-singer-actions">
      <button type="button" onClick={onLeaderboard}>
        <Trophy size={23} />
        <span>Leaderboard</span>
      </button>

      <button type="button" onClick={onHistory}>
        <History size={23} />
        <span>My History</span>
      </button>
    </section>
  );
}
