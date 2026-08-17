type QueueState = 'waiting' | 'soon' | 'next' | 'performing';

type Props = {
  queueState: QueueState;
  singerName?: string;
  currentSingerName?: string;
  currentSongTitle?: string;
  currentArtist?: string;
  nextSingerName?: string;
  estimatedWaitMinutes?: number;
  position?: number | null;
};

export default function SVQueueStatusCard({
  queueState,
  singerName = 'Singer',
  currentSingerName = 'Current singer',
  currentSongTitle = '',
  currentArtist = '',
  nextSingerName = 'Next singer',
  estimatedWaitMinutes = 11,
  position = null,
}: Props) {
  return (
    <section
      className={`sv-queue-status-card ${
  queueState === 'performing'
    ? 'sv-queue-performing'
    : queueState === 'next'
    ? 'sv-queue-next'
    : queueState === 'soon'
    ? 'sv-queue-soon'
    : 'sv-queue-waiting'
}`}
    >
      {queueState === 'waiting' && (
  <>
    <div className="sv-mobile-kicker">
      Queue Position
    </div>

    <div className="sv-away-number">
      {position ?? '—'} Away
    </div>

    <div className="sv-estimate-pill">
      ≈ {estimatedWaitMinutes} minutes
    </div>

    <div className="sv-queue-context">
      Relax and enjoy the show!
    </div>
  </>
)}

      {queueState === 'soon' && (
        <>
          <div className="sv-mobile-kicker">You're Up Soon</div>
          <div className="sv-away-number">
  {position ?? 2} Away
</div>
          <div className="sv-estimate-pill">≈ {estimatedWaitMinutes} minutes</div>

          <div className="sv-queue-context">
            <span>Now singing: {currentSingerName}</span>
            <span>Next up: {nextSingerName}</span>
            <strong>Get ready, {singerName}!</strong>
          </div>
        </>
      )}

      {queueState === 'next' && (
        <>
          <div className="sv-mobile-kicker">🎤 You're Next!</div>
          <div className="sv-away-number">GO!</div>
          <div className="sv-estimate-pill">Walk toward the stage</div>
          <div className="sv-queue-context">
            Your performance begins shortly.
          </div>
        </>
      )}
     {queueState === 'performing' && (
  <>
    <div className="sv-stage-orb">🎤</div>

    <div className="sv-mobile-kicker">
      Now Performing
    </div>

    <div className="sv-performing-name">
      {currentSingerName}
    </div>

    {currentSongTitle && (
      <div className="sv-performing-song">
        ♪ {currentSongTitle}
      </div>
    )}

    {currentArtist && (
      <div className="sv-performing-artist">
        {currentArtist}
      </div>
    )}

    <div className="sv-estimate-pill">
      Voting is open now
    </div>

    <div className="sv-stage-message">
      Own the stage.
    </div>
  </>
)}
    </section>
  );
}