'use client';

import Link from 'next/link';
import { useState } from 'react';

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function AppShell({
  children,
  title = 'Dashboard',
  subtitle = 'Manage your live karaoke show',
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="sv-shell">
      <aside className={collapsed ? 'sv-sidebar collapsed' : 'sv-sidebar'}>
        <div className="sv-brand">
          <div className="sv-logo">SV</div>
          {!collapsed && <div className="sv-brand-text">StageVotes</div>}
        </div>

        <nav className="sv-nav">
          <Link href="/" className="sv-nav-item">🏠 {!collapsed && 'Home'}</Link>
          <Link href="/account" className="sv-nav-item">👤 {!collapsed && 'Account'}</Link>
          <Link href="/history" className="sv-nav-item">🏆 {!collapsed && 'History'}</Link>
        </nav>

        <button
          className="sv-collapse"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '→' : '←'}
        </button>
      </aside>

      <section className="sv-main">
        <header className="sv-topbar">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="sv-status-pill">Live Show</div>
        </header>

        <div className="sv-content">
          {children}
        </div>
      </section>
    </div>
  );
}