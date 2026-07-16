import {
  LayoutDashboard,
  Mic2,
  Vote,
  Monitor,
  ChartColumn,
  History,
  Settings,
} from 'lucide-react';

export const navigation = [
  {
    title: 'LIVE',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Dashboard',
        href: '/',
      },
      {
        icon: Mic2,
        label: 'Queue',
        href: '/queue',
      },
      {
        icon: Vote,
        label: 'Voting',
        href: '/voting',
      },
      {
        icon: Monitor,
        label: 'Displays',
        href: '/displays',
      },
    ],
  },
  {
    title: 'MANAGE',
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
      {
        icon: Settings,
        label: 'Account',
        href: '/account',
      },
    ],
  },
];