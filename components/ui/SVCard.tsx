import React from 'react';

type SVCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
};

export default function SVCard({
  title,
  subtitle,
  className = '',
  children,
  ...props
}: SVCardProps) {
  return (
    <section className={`sv-card ${className}`} {...props}>
      {(title || subtitle) && (
        <div className="sv-card-header">
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}

      {children}
    </section>
  );
}