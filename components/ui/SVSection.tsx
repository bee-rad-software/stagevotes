import React from 'react';

type SVSectionProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function SVSection({
  title,
  subtitle,
  actions,
  children,
}: SVSectionProps) {
  return (
    <section className="sv-section">
      <div className="sv-section-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {actions && (
          <div className="sv-section-actions">
            {actions}
          </div>
        )}
      </div>

      {children}
    </section>
  );
}