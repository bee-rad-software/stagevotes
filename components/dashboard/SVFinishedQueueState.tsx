'use client';

type SVFinishedQueueStateProps = {
  onAddSinger: () => void;
  onOpenAwards: () => void;
  onEndShow: () => void;
};

export default function SVFinishedQueueState({
  onAddSinger,
  onOpenAwards,
  onEndShow,
}: SVFinishedQueueStateProps) {
  return (
    <section
      style={{
        marginTop: 20,
        padding: '30px 24px',
        textAlign: 'center',
        borderRadius: 24,
        border:
          '1px solid rgba(249,115,22,0.2)',
        background:
          'linear-gradient(145deg, rgba(18,31,56,0.9), rgba(12,23,43,0.96))',
        boxShadow:
          '0 20px 50px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          display: 'grid',
          width: 64,
          height: 64,
          placeItems: 'center',
          margin: '0 auto 18px',
          borderRadius: 20,
          fontSize: 30,
          background:
            'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(56,189,248,0.08))',
          border:
            '1px solid rgba(249,115,22,0.22)',
        }}
      >
        🎤
      </div>

      <div
        style={{
          color: '#f97316',
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        Queue complete
      </div>

      <h2
        style={{
          margin: '7px 0 8px',
          fontSize: 28,
          color: '#f8fafc',
        }}
      >
        That&apos;s a wrap
      </h2>

      <p
        style={{
          maxWidth: 560,
          margin: '0 auto',
          color: '#94a3b8',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Everyone in the queue has performed. You can
        add another singer, open Awards, or end the
        show.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 22,
        }}
      >
        <button
          type="button"
          onClick={onAddSinger}
          style={{
            minHeight: 46,
            padding: '0 18px',
            borderRadius: 13,
            border:
              '1px solid rgba(56,189,248,0.24)',
            color: '#bae6fd',
            background:
              'rgba(56,189,248,0.08)',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Add Singer
        </button>

        <button
          type="button"
          onClick={onOpenAwards}
          style={{
            minHeight: 46,
            padding: '0 18px',
            borderRadius: 13,
            border:
              '1px solid rgba(249,115,22,0.24)',
            color: '#fdba74',
            background:
              'rgba(249,115,22,0.08)',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Open Awards
        </button>

        <button
          type="button"
          onClick={onEndShow}
          style={{
            minHeight: 46,
            padding: '0 20px',
            border: 0,
            borderRadius: 13,
            color: '#ffffff',
            background:
              'linear-gradient(135deg, #f97316, #ea580c)',
            boxShadow:
              '0 12px 26px rgba(249,115,22,0.22)',
            fontWeight: 950,
            cursor: 'pointer',
          }}
        >
          End Show
        </button>
      </div>
    </section>
  );
}