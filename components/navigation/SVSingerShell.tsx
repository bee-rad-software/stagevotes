'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import SVSingerNavigation from './SVSingerNavigation';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export default function SVSingerShell({
  children,
  title,
  subtitle,
}: Props) {
  return (
    <div className="sv-singer-shell">
      <header className="sv-singer-shell-header">
        <Link
          href="/live"
          className="sv-singer-shell-brand"
        >
          <img
            src="/stagevotes-logo.png"
            alt="StageVotes"
          />

          <div>
            <strong>StageVotes</strong>
            <span>Find your stage</span>
          </div>
        </Link>

        {(title || subtitle) && (
          <div className="sv-singer-shell-heading">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
      </header>

      <main className="sv-singer-shell-content">
        {children}
      </main>

      <SVSingerNavigation />
    </div>
  );
}