type SongDraft = {
  songTitle: string;
  artist: string;
};

type Props = {
  songs: SongDraft[];
  singerName?: string;
  isCurrentSinger: boolean;
  onAddSong: () => void;
  onSubmit: () => void;
  onChangeSong: (index: number) => void;
  message?: string;
};

export default function SVSongsCard({
  songs,
  singerName,
  isCurrentSinger,
  onAddSong,
  onChangeSong,
  message,
}: Props) {
  return (
    <section className="sv-mobile-card">
      <div className="sv-mobile-card-header">
        <div>



<div className="sv-mobile-kicker">
  🎤 {singerName ? `${singerName}'s Setlist` : `Tonight's Setlist`}
</div>

<h2>
  {songs.length === 1
    ? '1 song'
    : `${songs.length} songs`}
</h2>
        </div>
      </div>

      {songs.map((song, index) => {
        const isCurrent = isCurrentSinger && index === 0;

        return (
          <div
            key={index}
            className={isCurrent ? 'sv-song-card active' : 'sv-song-card'}
          >
            <div>
              <div className="sv-song-number">
                {isCurrent ? 'NOW' : `#${index + 1}`}
              </div>

              <div className="sv-song-title">
                {song.songTitle || 'Choose a song'}
              </div>

{song.artist && (
  <div className="sv-song-artist">
    by {song.artist}
  </div>
)}

              <div className="sv-song-status">
                {isCurrent ? 'Currently Performing' : 'Queued'}
              </div>
            </div>

            {!isCurrent && (
          <button
  className="sv-change-song"
  type="button"
  onClick={() => onChangeSong(index)}
>
  Change
</button>
            )}
          </div>
        );
      })}

      <button
  className="sv-song-add-button"
  type="button"
  onClick={onAddSong}
>
  <span className="sv-song-add-icon">+</span>
  Add another song
</button>


      {message && <p>{message}</p>}
    </section>
  );
}