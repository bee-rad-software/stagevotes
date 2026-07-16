'use client';

import Image from 'next/image';
import Link from 'next/link';
import { navigation } from '@/lib/navigation';
import { usePathname } from 'next/navigation';

export default function SVSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sv-sidebar">
      <div className="sv-logo-area">
        <Image
          src="/icon.jpg"
          alt="StageVotes"
          width={60}
          height={60}
          className="sv-app-logo"
          priority
        />

        <div className="sv-brand-text">
          <strong>StageVotes</strong>
          <small>Professional</small>
        </div>
      </div>

      <nav className="sv-nav">
        {navigation.map((section) => (
          <div key={section.title} className="sv-nav-section">
            <div className="sv-nav-title">{section.title}</div>

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
  pathname === item.href
    ? 'sv-nav-item sv-nav-item-active'
    : 'sv-nav-item'
}
                >
                  <Icon size={20} strokeWidth={2.25} />

                  <span className="sv-nav-label">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sv-current-show">
        <div className="label">Current Show</div>
        <strong>Friday Night Karaoke</strong>
        <div className="live">● LIVE</div>
      </div>
    </aside>
  );
}