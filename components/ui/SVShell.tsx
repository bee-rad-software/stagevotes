import React from 'react';
import SVSidebar from '@/components/layout/SVSidebar';

type SVShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

export default function SVShell({ children, title, subtitle }: SVShellProps) {
  return (
    <div className="sv-app">
      <SVSidebar />

      <main className="sv-workspace">
        <header className="sv-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <span className="sv-live-pill">● Live Show</span>
        </header>

        <div className="sv-page">{children}</div>
      </main>
    </div>
  );
}