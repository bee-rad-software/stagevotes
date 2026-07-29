'use client';

import { useParams } from 'next/navigation';
import {
  ExternalLink,
  Maximize2,
  Monitor,
  Music2,
  Trophy,
} from 'lucide-react';

import SVShell from '@/components/ui/SVShell';

export default function DisplaysPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  function launchDisplay(path: string) {
    window.open(
      path,
      '_blank',
      'noopener,noreferrer'
    );
  }

  const displays = [
    {
      key: 'main',
      title: 'Main TV Display',
      description:
        'Show the current singer, upcoming performer, leaderboard, and audience QR codes.',
      icon: Monitor,
      status: 'Live Ready',
      path: `/display/${eventId}`,
      accent: '#38bdf8',
    },
    {
      key: 'karafun',
      title: 'KaraFun Display',
      description:
        'Launch the karaoke-focused sidebar layout designed to complement KaraFun.',
      icon: Music2,
      status: 'Ready',
      path: `/karafun-display/${eventId}`,
      accent: '#f97316',
    },
    {
      key: 'awards',
      title: 'Awards Screen',
      description:
        'Present contest winners, final rankings, and People’s Choice results.',
      icon: Trophy,
      status: 'Ready',
      path: `/awards/${eventId}`,
      accent: '#facc15',
    },
  ];

  return (
    <SVShell
      title="Displays"
      subtitle="Control everything shown on your venue screens."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}
      >
        {displays.map((display) => {
          const Icon = display.icon;

          return (
            <section
              key={display.key}
              className="sv-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 310,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: display.accent,
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${display.accent}1f`,
                    color: display.accent,
                  }}
                >
                  <Icon
                    size={24}
                    strokeWidth={2.25}
                  />
                </div>

                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background:
                      'rgba(34,197,94,0.14)',
                    border:
                      '1px solid rgba(74,222,128,0.18)',
                    color: '#4ade80',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  ● {display.status}
                </span>
              </div>

              <div style={{ marginTop: 22 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 22,
                  }}
                >
                  {display.title}
                </h2>

                <p
                  style={{
                    margin: '8px 0 0',
                    opacity: 0.7,
                    lineHeight: 1.5,
                    fontSize: 14,
                  }}
                >
                  {display.description}
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  placeItems: 'center',
                  margin: '22px 0',
                  minHeight: 90,
                  borderRadius: 14,
                  background:
                    'rgba(255,255,255,0.035)',
                  border:
                    '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: 0.7,
                    fontSize: 13,
                  }}
                >
                  <Maximize2 size={18} />
                  Opens in a new window
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  launchDisplay(display.path)
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  background: display.accent,
                  color:
                    display.key === 'awards'
                      ? '#111827'
                      : 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <ExternalLink size={17} />
                Launch Display
              </button>
            </section>
          );
        })}
      </div>

      <section
        className="sv-card"
        style={{
          marginTop: 20,
          display: 'grid',
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            Display Tips
          </h2>

          <p
            style={{
              margin: '6px 0 0',
              opacity: 0.7,
              fontSize: 14,
            }}
          >
            Open the display on the computer
            connected to your venue television,
            then place the browser into full-screen
            mode.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background:
                'rgba(255,255,255,0.04)',
              border:
                '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <strong>Main Display</strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                opacity: 0.65,
              }}
            >
              Best for televisions facing the
              audience.
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background:
                'rgba(255,255,255,0.04)',
              border:
                '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <strong>KaraFun Display</strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                opacity: 0.65,
              }}
            >
              Best for the host or karaoke control
              monitor.
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background:
                'rgba(255,255,255,0.04)',
              border:
                '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <strong>Awards Screen</strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                opacity: 0.65,
              }}
            >
              Launch when voting is finished and
              winners are ready.
            </div>
          </div>
        </div>
      </section>
    </SVShell>
  );
}