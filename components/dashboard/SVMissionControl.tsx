'use client';

import {
  Play,
  Square,
  UserPlus,
  SkipForward,
  Vote,
  Monitor,
  Trophy,
  Radio,
} from 'lucide-react';

import { useEffect, useState } from 'react';

type Props = {
  onStartShow?: () => void;
  onEndShow?: () => void;
  onAddSinger?: () => void;
  onNextSinger?: () => void;
  onToggleVoting?: () => void;
  onOpenDisplay?: () => void;
  onAwards?: () => void;
  onConnectKaraFun?: () => void;
  karafunDisplayOpen?: boolean;
  onOpenKaraFunDisplay?: () => void;
  karafunConnecting?: boolean;
karafunConnectionError?: string;
karafunPlayerOnline?: boolean;

  votingOpen?: boolean;
  hasCurrentSinger?: boolean;
  showStarted?: boolean;
  advancingSinger?: boolean;
  karafunConnected?: boolean;

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
  onConnectKaraFun,
  karafunDisplayOpen,
  onOpenKaraFunDisplay,

  votingOpen = false,
  hasCurrentSinger = false,
  showStarted = false,
  advancingSinger = false,
  karafunConnected = false,
  karafunConnecting = false,
karafunConnectionError = '',
karafunPlayerOnline = false,

  currentSingerName,
  nextSingerName,
}: Props) {

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const votingDisabled =
    !mounted || !hasCurrentSinger;

  const getBadge = (
  type:
    | 'next'
    | 'walkup'
    | 'voting'
    | 'display'
    | 'karafunDisplay'
   | 'awards'
| 'karafun'
| 'end'
) => {
  switch (type) {
    case 'next':
      return {
        label: hasCurrentSinger
          ? 'READY'
          : 'WAITING',
        className: hasCurrentSinger
          ? 'success'
          : 'neutral',
      };

    case 'walkup':
      return {
        label: 'READY',
        className: 'info',
      };

    case 'voting':
      return {
        label: votingOpen
          ? 'LIVE'
          : 'OFF',
        className: votingOpen
          ? 'success'
          : 'neutral',
      };

    case 'karafun':
  return {
    label:
  karafunConnected && karafunPlayerOnline
    ? 'CONNECTED'
    : 'OFFLINE',
    className:
  karafunConnected && karafunPlayerOnline
    ? 'success'
    : 'neutral',
  };

    case 'display':
      return {
        label: 'CONNECTED',
        className: 'info',
      };

    case 'karafunDisplay':
  return {
    label: karafunDisplayOpen
      ? 'OPEN'
      : 'READY',
    className: karafunDisplayOpen
      ? 'success'
      : 'info',
  };

    case 'awards':
      return {
        label: showStarted
          ? 'READY'
          : 'LOCKED',
        className: showStarted
          ? 'warning'
          : 'neutral',
      };

    case 'end':
      return {
        label: showStarted
          ? 'READY'
          : 'LOCKED',
        className: showStarted
          ? 'danger'
          : 'neutral',
      };
  }
};

const StatusBadge = ({
  type,
}: {
  type:
    | 'next'
    | 'walkup'
    | 'voting'
    | 'display'
    | 'karafunDisplay'
    | 'awards'
    | 'karafun'
    | 'end';
}) => {
  const badge = getBadge(type);


  return (
    <span
      className={`sv-action-badge sv-action-badge-${badge.className}`}
    >
      {badge.label}
    </span>
  );
};

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
      disabled={!hasCurrentSinger || advancingSinger}
      aria-disabled={!hasCurrentSinger}
    >

<StatusBadge type="next" />

      {advancingSinger ? (
  <div className="sv-spinner" />
) : (
  <SkipForward size={34} />
)}

      <span>
  {advancingSinger
    ? 'Advancing...'
    : 'Next Singer'}
</span>

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

    <StatusBadge type="walkup" />

    <UserPlus size={34} />

    <span>Walk-Up Singer</span>

    <small>
Add singer directly to tonight's queue
</small>
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
          disabled={votingDisabled}
aria-disabled={votingDisabled}
        >

          <StatusBadge type="voting" />

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

          <StatusBadge type="display" />

          <Monitor size={26} />

          <span>TV Display</span>

          <small>
Launch audience display
</small>
        </button>

        <button
  type="button"
  className="sv-mission-action"
  onClick={onOpenKaraFunDisplay}
>
 <StatusBadge type="karafunDisplay" />

  <Monitor size={26} />

  <span>KaraFun Display</span>

  <small>
  {karafunDisplayOpen
    ? "Click to close singer queue display"
    : "Launch singer queue display"}
</small>
</button>

        <button
  type="button"
  className={`sv-mission-action ${
    karafunConnected
      ? 'sv-mission-active'
      : ''
  }`}
  onClick={onConnectKaraFun}
  disabled={karafunConnecting}
>
  <StatusBadge type="karafun" />

  <Radio size={26} />

 <span>
  {karafunConnected && karafunPlayerOnline
    ? 'KaraFun Connected'
    : karafunConnecting
    ? 'Connecting KaraFun...'
    : 'Connect KaraFun'}
</span>

<small>
  {karafunConnected && karafunPlayerOnline
    ? 'StageVotes bridge is ready'
    : karafunConnected && !karafunPlayerOnline
    ? 'Start the KaraFun player'
    : karafunConnecting
    ? 'Opening KaraFun bridge'
    : karafunConnectionError ||
      'Connect tonight’s KaraFun session'}
</small>
</button>

        <button
          type="button"
          className="sv-mission-action"
          onClick={onAwards}
        >

          <StatusBadge type="awards" />

          <Trophy size={26} />

          <span>Awards</span>

          <small>
View winners & rankings
</small>
        </button>

{showStarted && (
  <button
    type="button"
    className="sv-mission-action"
    onClick={onEndShow}
  >

    <StatusBadge type="end" />

    <Square size={26} />

    <span>End Show</span>

    <small>
Close tonight's show
</small>
  </button>
)}

      </div>
    </section>
  );
}