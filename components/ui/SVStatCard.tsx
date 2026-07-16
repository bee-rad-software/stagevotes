import type { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  color?: string;
  icon?: LucideIcon;
};

export default function SVStatCard({
  title,
  value,
  subtitle,
  trend,
  color = 'var(--sv-blue)',
  icon: Icon,
}: Props) {
  return (
    <div className="sv-stat-card" style={{ ['--stat-color' as string]: color }}>
      <div className="sv-stat-glow" />

      <div className="sv-stat-top">
        <span>{title}</span>

        {Icon && (
          <div className="sv-stat-icon">
            <Icon size={22} strokeWidth={2.4} />
          </div>
        )}
      </div>

      <div className="sv-stat-value">{value}</div>

      {subtitle && <div className="sv-stat-subtitle">{subtitle}</div>}

      {trend && (
        <div className="sv-stat-trend">
          <span className="sv-pulse-dot" />
          {trend}
        </div>
      )}
    </div>
  );
}