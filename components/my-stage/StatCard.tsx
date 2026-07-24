type StatCardProps = {
  icon: string;
  value: string | number;
  label: string;
};

export default function StatCard({
  icon,
  value,
  label,
}: StatCardProps) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 22,
        background: 'rgba(15,28,47,0.92)',
        border: '1px solid rgba(148,163,184,0.14)',
      }}
    >
      <span style={{ fontSize: 25 }}>{icon}</span>

      <strong
        style={{
          display: 'block',
          marginTop: 15,
          fontSize: 30,
          letterSpacing: '-0.04em',
        }}
      >
        {value}
      </strong>

      <span
        style={{
          display: 'block',
          marginTop: 4,
          color: '#94a3b8',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    </article>
  );
}