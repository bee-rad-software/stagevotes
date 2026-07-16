'use client';

import {
  Bell,
  Vote,
  Trophy,
  History,
} from 'lucide-react';

type Props = {
  onNotify?: () => void;
  onVote?: () => void;
  onLeaderboard?: () => void;
  onHistory?: () => void;
  notificationsEnabled?: boolean;
};

export default function SVSingerActions({
  onNotify,
  onVote,
  onLeaderboard,
  onHistory,
  notificationsEnabled = false,
}: Props) {
  return (
    <section className="sv-singer-actions">
      <button type="button" onClick={onNotify}>
        <Bell size={23} />
        <span>
          {notificationsEnabled ? 'Notifications On' : 'Notify Me'}
        </span>
      </button>

      <button type="button" onClick={onVote}>
        <Vote size={23} />
        <span>Vote</span>
      </button>

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