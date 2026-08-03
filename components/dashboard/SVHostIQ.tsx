'use client';

type HostIQItem = {
  id: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning';
};

type Props = {
  items: HostIQItem[];
};

export default function SVHostIQ({
  items,
}: Props) {
  const top = items[0];

  return (
    <div className="sv-card">
      <div className="sv-card-header">
        <div>
          <div className="sv-card-eyebrow">
            🧠 HOST IQ
          </div>

          <h3>Recommendations</h3>
        </div>
      </div>

      {!top ? (
        <div className="sv-host-iq-empty">
          <div className="sv-host-iq-icon">✅</div>

          <div>
            <strong>
              Everything looks great.
            </strong>

            <p>
              No recommendations at the
              moment.
            </p>
          </div>
        </div>
      ) : (
        <div className="sv-host-iq-item">
          <div className="sv-host-iq-icon">
            {top.severity === 'warning'
              ? '⚠️'
              : '💡'}
          </div>

          <div>
            <strong>{top.title}</strong>

            <p>{top.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}