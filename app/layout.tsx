import SVFunnelAnalytics from '@/components/SVFunnelAnalytics';
import './globals.css';
import type { Metadata } from 'next';
import '../styles/theme.css';

export const metadata: Metadata = {
  title: 'StageVotes',
  description: 'Live karaoke voting and queue management',
  manifest: '/manifest.json',
  icons: {
    icon: '/singer-icon?size=192&v=3',
    apple: [{ url: '/singer-icon?size=180&v=3', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: {
    capable: true,
    title: 'StageVotes',
    statusBarStyle: 'black-translucent'
  }
};

export const viewport = {
  themeColor: '#38bdf8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
  <head>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#38bdf8" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="StageVotes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  </head>
  <body>{children}<SVFunnelAnalytics /></body>
</html>
  );
}

