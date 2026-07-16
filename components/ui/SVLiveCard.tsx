import type { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  activity?: string;
  icon?: LucideIcon;
  color?: string;
};

export default function SVLiveCard({
  title,
  value,
  subtitle,
  activity,
  icon: Icon,
  color = 'var(--sv-blue)',
}: Props) {
  return (
    <div
      className="sv-live-card"
      style={{ ['--live-color' as string]: color }}
    >
      <div className="sv-live-gradient" />

      <div className="sv-live-header">
        <span>{title}</span>

        {Icon && (
          <div className="sv-live-icon">
            <Icon size={22} strokeWidth={2.4} />
          </div>
        )}
      </div>

      <div className="sv-live-value">
        {value}
      </div>

      {subtitle && (
        <div className="sv-live-subtitle">
          {subtitle}
        </div>
      )}

      {activity && (
        <div className="sv-live-activity">
          <span className="sv-live-pulse" />
          {activity}
        </div>
      )}
    </div>
  );
}