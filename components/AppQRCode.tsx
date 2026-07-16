'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type AppQRCodeProps = {
  value?: string | null;
  size?: number;
};

export default function AppQRCode({ value, size = 96 }: AppQRCodeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !value) return null;

  return <QRCodeSVG value={value} size={size} />;
}