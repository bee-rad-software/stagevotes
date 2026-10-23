import {
  Trophy,
  LayoutDashboard,
  Users,
  Monitor,
  ChartColumn,
  History,
  Settings,
  LifeBuoy,
} from 'lucide-react';

export const navigation = [
  {
    title: 'SHOW',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/',
      },
      {
        icon: Users,
        label: 'Audience',
        href: '/audience',
      },
      {
        icon: Monitor,
        label: 'Displays',
        href: '/displays',
      },
      {
        icon: Trophy,
        label: 'Tournaments',
        href: '/tournament-director',
      },
      {
        icon: Trophy,
        label: 'Leagues',
        href: '/league-director',
      },
    ],
  },
  {
    title: 'INSIGHTS',
    items: [
      {
        icon: ChartColumn,
        label: 'Analytics',
        href: '/analytics',
      },
      {
        icon: History,
        label: 'History',
        href: '/history',
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        icon: Settings,
        label: 'Account',
        href: '/account',
      },
      {
        icon: LifeBuoy,
        label: 'Help & Support',
        href: '/contact',
      },
    ],
  },
];