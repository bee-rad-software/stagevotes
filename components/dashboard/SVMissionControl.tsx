'use client';

import {
  UserPlus,
  SkipForward,
  Vote,
  Monitor,
  Trophy,
} from 'lucide-react';

type Props = {
  onAddSinger?: () => void;
  onNextSinger?: () => void;
  onToggleVoting?: () => void;
  onFinishSong?: () => void;
  votingOpen?: boolean;
  hasCurrentSinger?: boolean;
};

export default function SVMissionControl({
  onAddSinger,
  onNextSinger,
  onToggleVoting,
  onFinishSong,
  votingOpen = false,
  hasCurrentSinger = false,
}: Props) {
  return (
    <section className="sv-mission-control">
      <div className="sv-dashboard-section-heading">
        <div>
          <div className="sv-mobile-kicker">Mission Control</div>
          <h2>Run the show</h2>
        </div>
      </div>

      <div className="sv-mission-control-primary">

  <button
    type="button"
    className="sv-mission-action sv-mission-large"
    onClick={onAddSinger}
  >
    <UserPlus size={34} />

    <span>Add Singer</span>

    <small>Walk-up or manual signup</small>
  </button>

  <button
    type="button"
    className="sv-mission-action sv-mission-large"
    onClick={onNextSinger}
  >
    <SkipForward size={34} />

    <span>Next Singer</span>

    <small>Advance tonight's rotation</small>
  </button>

</div>

<div className="sv-mission-control-secondary">

  <button
    type="button"
    className={`sv-mission-action ${
      votingOpen ? 'sv-mission-active' : ''
    }`}
    onClick={onToggleVoting}
  >
    <Vote size={26} />

    <span>
      {votingOpen ? 'Close Voting' : 'Open Voting'}
    </span>

    <small>
      {votingOpen ? 'Voting is live' : 'Enable judging'}
    </small>
  </button>

  <button
    type="button"
    className="sv-mission-action"
  >
    <Monitor size={26} />

    <span>TV Display</span>

    <small>Audience screen</small>
  </button>

  <button
    type="button"
    className="sv-mission-action"
  >
    <Trophy size={26} />

    <span>Awards</span>

    <small>Finish the show</small>
  </button>

</div>
    </section>
  );
}