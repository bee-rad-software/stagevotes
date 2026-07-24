import InfoCard from './InfoCard';
import type { SingerFavorites } from './types';

type SignatureSongsProps = {
  favorites: SingerFavorites;
};

export default function SignatureSongs({
  favorites,
}: SignatureSongsProps) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <p
          style={{
            margin: 0,
            color: '#f97316',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Your Sound
        </p>

        <h2 style={{ margin: '5px 0 0' }}>
          Signature Songs
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        <InfoCard
          icon="🎙️"
          label="Signature Artist"
          value={favorites.artist}
        />

        <InfoCard
          icon="🎵"
          label="Signature Song"
          value={favorites.song}
        />
      </div>
    </section>
  );
}