type Props = {
  singerName: string;
  songCount: number;
  message?: string;
  onAddSong: () => void;
  onJoin: () => void;
};

export default function SVJoinCard({
  singerName,
  songCount,
  message,
  onAddSong,
  onJoin,
}: Props) {
  const hasName = singerName.trim().length > 0;
  const hasSong = songCount > 0;

  return (
    <section className="sv-mobile-card sv-join-card">
      <div>
        <div className="sv-mobile-kicker">Ready to sing?</div>
       <h2>Ready to sing?</h2>
   <p className="sv-muted">
  Choose a song to join tonight’s rotation.
</p>
      </div>

      {songCount === 0 ? (
        <div className="sv-join-empty">
          <div className="sv-join-empty-icon">♪</div>
          <strong>No songs selected yet</strong>
          <span>Pick your first song to get started.</span>
        </div>
      ) : (
        <div className="sv-join-summary">
          <span>
            {songCount} {songCount === 1 ? 'song' : 'songs'} selected
          </span>
          <strong>Ready to join</strong>
        </div>
      )}

     {songCount === 0 ? (
  <button
    type="button"
    className="sv-song-submit-button"
    onClick={onAddSong}
    disabled={!hasName}
  >
    Choose your first song
  </button>
) : (
  <>
    <button
      type="button"
      className="sv-song-submit-button"
      onClick={onJoin}
      disabled={!hasName}
    >
      Join the show
    </button>

    <button
      type="button"
      className="sv-song-add-button"
      onClick={onAddSong}
    >
      <span className="sv-song-add-icon">+</span>
      Add another song
    </button>
  </>
)}
     {!hasName && (
  <div className="sv-join-help">
    Enter your name above to get started.
  </div>
)}

{hasName && songCount === 0 && (
  <div className="sv-join-help">
    Pick a song, then you’ll be ready to join.
  </div>
)}

      {message && (
        <div className="sv-join-message">
          {message}
        </div>
      )}
    </section>
  );
}