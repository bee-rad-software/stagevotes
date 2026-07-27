'use client';

import { useState } from 'react';

import FlipCard from './FlipCard';
import StageCardFront from './StageCardFront';
import StageCardBack from './StageCardBack';

import type {
  StageCardData,
  StageCardTheme,
} from './types';

type StageCardProps = {
  data: StageCardData;
  theme?: StageCardTheme;
};

export default function StageCard({
  data,
  theme = 'regular',
}: StageCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div>
<FlipCard
  flipped={flipped}
  onFlip={() =>
    setFlipped((current) => !current)
  }
  front={
    <StageCardFront
      data={data}
      theme={theme}
    />
  }
  back={
    <StageCardBack
      data={data}
      theme={theme}
    />
  }
/>

      <div
        style={{
          marginTop: 12,
          color: '#94a3b8',
          fontSize: 12,
          fontWeight: 800,
          textAlign: 'center',
        }}
      >
        Tap the card to flip
      </div>
    </div>
  );
}