'use client';

import { useState } from 'react';
import type { TimelineEntry } from './types';

type CareerTimelineProps = {
  entries: TimelineEntry[];
};

function formatTimelineDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function CareerTimeline({
  entries,
}: CareerTimelineProps) {

const [showAll, setShowAll] = useState(false);

const visibleEntries = showAll
  ? entries
  : entries.slice(0, 5);

const hasMoreEntries = entries.length > 5;
    
  return (
    <section>
      <div
        style={{
          marginBottom: 14,
        }}
      >
        <div
          style={{
            color: '#38bdf8',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Career
        </div>

        <h2
          style={{
            margin: '4px 0 0',
            color: 'white',
            fontSize: 24,
          }}
        >
          Career Timeline
        </h2>
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: 24,
            borderRadius: 18,
            border: '1px solid rgba(148, 163, 184, 0.16)',
            background: '#101c31',
            color: '#94a3b8',
          }}
        >
          Your completed performances will appear here.
        </div>
     ) : (
  <>
    <div
          style={{
            position: 'relative',
            display: 'grid',
            gap: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 18,
              bottom: 18,
              left: 17,
              width: 2,
              background:
                'linear-gradient(#38bdf8, rgba(56, 189, 248, 0.08))',
            }}
          />

         {visibleEntries.map((entry) => (
            <article
              key={entry.id}
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '36px minmax(0, 1fr)',
                gap: 14,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'grid',
                  placeItems: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1px solid rgba(56, 189, 248, 0.55)',
                  background: '#0f1d32',
                  fontSize: 17,
                }}
              >
                🎤
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  background: '#101c31',
                }}
              >
                <div
                  style={{
                    color: '#38bdf8',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {formatTimelineDate(entry.performedAt)}
                </div>

                <h3
                  style={{
                    margin: '7px 0 2px',
                    color: 'white',
                    fontSize: 18,
                  }}
                >
                  {entry.songTitle}
                </h3>

                <div
                  style={{
                    color: '#cbd5e1',
                    fontSize: 14,
                  }}
                >
                  {entry.artist || 'Artist not listed'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 12,
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  <span>📍 {entry.venue || 'Venue unavailable'}</span>

                  {entry.averageScore !== null && (
                    <span>
                      ⭐ {entry.averageScore.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
                {hasMoreEntries && (
          <div
            style={{
              marginTop: 18,
              paddingLeft: 50,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setShowAll((current) => !current)
              }
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border:
                  '1px solid rgba(56, 189, 248, 0.35)',
                background:
                  'rgba(56, 189, 248, 0.08)',
                color: '#7dd3fc',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {showAll
                ? 'Show less'
                : `View all ${entries.length} performances`}
            </button>
          </div>
        )}
      </>
      )}
    </section>
  );
}