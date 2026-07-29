'use client';

import {
  Play,
  Square,
  UserPlus,
  SkipForward,
  Vote,
  Monitor,
  Trophy,
} from 'lucide-react';

type Props = {
  onStartShow?: () => void;
  onEndShow?: () => void;
  onAddSinger?: () => void;
  onNextSinger?: () => void;
  onToggleVoting?: () => void;
  onOpenDisplay?: () => void;
  onAwards?: () => void;

  votingOpen?: boolean;
  hasCurrentSinger?: boolean;
  showStarted?: boolean;

  currentSingerName?: string;
  nextSingerName?: string;
};

export default function SVMissionControl({
  onStartShow,
  onEndShow,
  onAddSinger,
  onNextSinger,
  onToggleVoting,
  onOpenDisplay,
  onAwards,

  votingOpen = false,
  hasCurrentSinger = false,
  showStarted = false,

  currentSingerName,
  nextSingerName,
}: Props) {

  return (
    <section className="sv-mission-control">
      <div className="sv-dashboard-section-heading">
        <div>
          <div className="sv-mobile-kicker">
            Mission Control
          </div>

          <h2>Run the show</h2>
        </div>
      </div>

    <div className="sv-mission-control-primary">

  {!showStarted ? (
    <button
      type="button"
      className="sv-mission-action sv-mission-large"
      onClick={onStartShow}
    >
      <Play size={34} />

      <span>Start Show</span>

      <small>Begin tonight's karaoke event</small>
    </button>
  ) : (
    <button
      type="button"
      className="sv-mission-action sv-mission-large"
      onClick={onNextSinger}
      disabled={!hasCurrentSinger}
      aria-disabled={!hasCurrentSinger}
    >
      <SkipForward size={34} />

      <span>Next Singer</span>

    <small>
  {currentSingerName
    ? `Current: ${currentSingerName} • Next: ${
        nextSingerName || 'No one waiting'
      }`
    : "Advance tonight's rotation"}
</small>
    </button>
  )}

  <button
    type="button"
    className="sv-mission-action sv-mission-large"
    onClick={onAddSinger}
  >
    <UserPlus size={34} />

    <span>Walk-Up Singer</span>

    <small>Manual host signup</small>
  </button>

</div>

      <div className="sv-mission-control-secondary">
        <button
          type="button"
          className={`sv-mission-action ${
            votingOpen
              ? 'sv-mission-active'
              : ''
          }`}
          onClick={onToggleVoting}
          disabled={!hasCurrentSinger}
          aria-disabled={!hasCurrentSinger}
        >
          <Vote size={26} />

          <span>
            {votingOpen
              ? 'Close Voting'
              : 'Open Voting'}
          </span>

          <small>
            {!hasCurrentSinger
              ? 'Select a singer first'
              : votingOpen
              ? 'Voting is live'
              : 'Enable judging'}
          </small>
        </button>

        <button
          type="button"
          className="sv-mission-action"
          onClick={onOpenDisplay}
        >
          <Monitor size={26} />

          <span>TV Display</span>

          <small>Open audience screen</small>
        </button>

        <button
          type="button"
          className="sv-mission-action"
          onClick={onAwards}
        >
          <Trophy size={26} />

          <span>Awards</span>

          <small>View show results</small>
        </button>

{showStarted && (
  <button
    type="button"
    className="sv-mission-action"
    onClick={onEndShow}
  >
    <Square size={26} />

    <span>End Show</span>

    <small>Archive tonight's event</small>
  </button>
)}

      </div>
    </section>
  );
}