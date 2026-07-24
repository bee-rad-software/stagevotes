type InfoCardProps = {
  icon: string;
  label: string;
  value: string;
};

export default function InfoCard({
  icon,
  label,
  value,
}: InfoCardProps) {
  return (
    <article
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 15,
        padding: 20,
        borderRadius: 22,
        background: 'rgba(15,28,47,0.92)',
        border: '1px solid rgba(148,163,184,0.14)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 16,
          background: 'rgba(249,115,22,0.11)',
          fontSize: 25,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <span
          style={{
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {label}
        </span>

        <strong
          style={{
            display: 'block',
            marginTop: 4,
          }}
        >
          {value}
        </strong>
      </div>
    </article>
  );
}