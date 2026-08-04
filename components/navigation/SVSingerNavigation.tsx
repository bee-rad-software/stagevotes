'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Mic2,
  Star,
  Trophy,
} from 'lucide-react';
import useCurrentShow from '@/hooks/useCurrentShow';

function getNavigationItems(
  tonightHref: string
) {
  return [
    {
      label: 'Atlas',
      href: '/live',
      icon: Compass,
    },
    {
      label: 'Tonight',
      href: tonightHref,
      icon: Mic2,
    },
    {
      label: 'My Stage',
      href: '/my-stage',
      icon: Star,
    },
    {
      label: 'Leagues',
      href: '/leagues',
      icon: Trophy,
    },
  ];
}

export default function SVSingerNavigation() {
  const pathname = usePathname();
  const currentShow = useCurrentShow();

const tonightHref =
  currentShow.eventId
    ? `/signup/${currentShow.eventId}`
    : '/live';

const navigationItems =
  getNavigationItems(tonightHref);

  return (
    <nav
      className="sv-singer-navigation"
      aria-label="Singer navigation"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;

        const active =
  item.label === 'Tonight'
    ? Boolean(
        currentShow.eventId &&
        pathname.startsWith(
          `/signup/${currentShow.eventId}`
        )
      )
    : pathname === item.href ||
      pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'sv-singer-navigation-item',
              active
                ? 'sv-singer-navigation-active'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Icon size={21} />

            {item.label === 'Tonight' &&
  currentShow.hasActiveShow && (
    <span
      className="sv-singer-navigation-live-dot"
      aria-label="Active show"
    />
  )}

            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}