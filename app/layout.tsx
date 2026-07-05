import './globals.css';
import type { Metadata } from 'next';

export const metadata = {
  title: 'StageVotes',
  description: 'Live karaoke voting and queue management',
  manifest: '/manifest.json',
  themeColor: '#38bdf8',
  icons: {
    icon: '/icon.jpg',
    apple: '/icon.jpg'
  },
  appleWebApp: {
    capable: true,
    title: 'StageVotes',
    statusBarStyle: 'black-translucent'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
