'use client';

import type { ReactNode } from 'react';

type FlipCardProps = {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  onFlip: () => void;
};

export default function FlipCard({
  flipped,
  front,
  back,
  onFlip,
}: FlipCardProps) {
  return (
    <div
      style={{
        width: '100%',
        perspective: 1400,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={
          flipped
            ? 'Show the front of the card'
            : 'Show the back of the card'
        }
        onClick={onFlip}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();
            onFlip();
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          transformStyle: 'preserve-3d',
          transition:
            'transform 700ms cubic-bezier(.2,.75,.25,1)',
          transform: flipped
            ? 'rotateY(180deg)'
            : 'rotateY(0deg)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          {front}
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}