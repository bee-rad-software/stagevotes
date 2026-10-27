import React from 'react';
import SVTrialReminder from '@/components/billing/SVTrialReminder';
import SVSidebar from '@/components/layout/SVSidebar';

type SVShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showLive?: boolean;
};

export default function SVShell({ children, title, subtitle, showLive = true }: SVShellProps) {
  return (
    <div className="sv-app">
      <SVSidebar />

      <main className="sv-workspace">
        <header
  className="sv-topbar"
  style={{
    WebkitAppRegion: 'drag',
    userSelect: 'none',
  } as React.CSSProperties}
>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          {showLive && <span
  className="sv-live-pill"
  style={{
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties}
>
  ● Live Show
</span>}
        </header>

        <div className="sv-page"><SVTrialReminder />{children}</div>
      </main>
    </div>
  );
}