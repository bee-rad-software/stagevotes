'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Music2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import SVSingerShell from '@/components/navigation/SVSingerShell';

type HistoryItem = {
  id: string;
  song_title: string;
  artist: string | null;
  created_at: string | null;
  events:
    | {
        venue?: string | null;
        name?: string | null;
      }
    | {
        venue?: string | null;
        name?: string | null;
      }[]
    | null;
};

export default function SongHistoryPage() {
  return (
    <Suspense fallback={<SongHistoryLoading />}>
      <SongHistoryContent />
    </Suspense>
  );
}

function SongHistoryLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#07111f',
        color: 'white',
      }}
    >
      Loading song history...
    </main>
  );
}

function SongHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [searchText, setSearchText] = useState('');
  const [expandedSong, setExpandedSong] =
  useState<string | null>(null);

  const uniqueSongCount = useMemo(() => {
  const uniqueSongs = new Set(
    items.map((item) =>
      `${item.song_title.trim().toLowerCase()}|${
        item.artist?.trim().toLowerCase() || ''
      }`
    )
  );

  return uniqueSongs.size;
}, [items]);

const groupedSongs = useMemo(() => {
  const groups = new Map<
    string,
    {
      key: string;
      songTitle: string;
      artist: string;
      performances: HistoryItem[];
      lastPerformedAt: string | null;
    }
  >();

  items.forEach((item) => {
    const normalizedTitle =
      item.song_title.trim().toLowerCase();

    const normalizedArtist =
      item.artist?.trim().toLowerCase() || '';

    const key =
      `${normalizedTitle}|${normalizedArtist}`;

    const existing = groups.get(key);

    if (existing) {
      existing.performances.push(item);

      const currentDate =
        item.created_at
          ? new Date(item.created_at).getTime()
          : 0;

      const previousDate =
        existing.lastPerformedAt
          ? new Date(
              existing.lastPerformedAt
            ).getTime()
          : 0;

      if (currentDate > previousDate) {
        existing.lastPerformedAt =
          item.created_at;
      }

      return;
    }

    groups.set(key, {
      key,
      songTitle: item.song_title,
      artist:
        item.artist || 'Artist not listed',
      performances: [item],
      lastPerformedAt: item.created_at,
    });
  });

  return Array.from(groups.values()).sort(
    (a, b) => {
      const aDate = a.lastPerformedAt
        ? new Date(
            a.lastPerformedAt
          ).getTime()
        : 0;

      const bDate = b.lastPerformedAt
        ? new Date(
            b.lastPerformedAt
          ).getTime()
        : 0;

      return bDate - aDate;
    }
  );
}, [items]);

const filteredSongs = useMemo(() => {
  const term =
    searchText.trim().toLowerCase();

  if (!term) {
    return groupedSongs;
  }

  return groupedSongs.filter((song) => {
    const venueMatch =
      song.performances.some(
        (performance) => {
          const event = Array.isArray(
            performance.events
          )
            ? performance.events[0]
            : performance.events;

          const venue =
            event?.venue ||
            event?.name ||
            '';

          return venue
            .toLowerCase()
            .includes(term);
        }
      );

    return (
      song.songTitle
        .toLowerCase()
        .includes(term) ||
      song.artist
        .toLowerCase()
        .includes(term) ||
      venueMatch
    );
  });
}, [groupedSongs, searchText]);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.href =
        eventId
          ? `/singer-login?event=${eventId}`
          : '/singer-login';

      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('singer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (profileError || !profile) {
      setMessage(
        'We could not find your singer profile.'
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('performances')
      .select(`
        id,
        song_title,
        artist,
        created_at,
        events (
          venue,
          name
        )
      `)
      .eq('singer_profile_id', profile.id)
      .eq('status', 'completed')
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        'Unable to load song history:',
        error
      );

      setMessage(
        'We could not load your song history.'
      );
      setLoading(false);
      return;
    }

    setItems((data || []) as HistoryItem[]);
    setLoading(false);
  }

  return (
    <SVSingerShell
      title="Song History"
      subtitle="Every song you’ve performed"
    >
      <main
        style={{
          minHeight: '100vh',
          padding: '24px 16px 90px',
          color: '#f8fafc',
          background:
            'radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 30rem), radial-gradient(circle at top right, rgba(249,115,22,0.1), transparent 28rem), #07111f',
        }}
      >
        <div
          style={{
            width: 'min(920px, 100%)',
            margin: '0 auto',
          }}
        >
          <button
            type="button"
            onClick={() => {
              const suffix = eventId
                ? `?event=${eventId}`
                : '';

              router.push(
                `/my-stage${suffix}`
              );
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
              padding: 0,
              border: 0,
              color: '#7dd3fc',
              background: 'transparent',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} />
            Back to My Stage
          </button>

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Your karaoke history
            </p>

            <h1
              style={{
                margin: '6px 0 8px',
                fontSize:
                  'clamp(2rem, 7vw, 3.2rem)',
                letterSpacing: '-0.045em',
              }}
            >
              Songs You&apos;ve Sung
            </h1>

            <p
  style={{
    margin: 0,
    color: '#94a3b8',
  }}
>
  {items.length}{' '}
  {items.length === 1
    ? 'performance'
    : 'performances'}
  {' • '}
  {uniqueSongCount}{' '}
  {uniqueSongCount === 1
    ? 'unique song'
    : 'unique songs'}
</p>

<div
  style={{
    marginTop: 18,
  }}
>
  <input
    type="search"
    value={searchText}
    onChange={(event) =>
      setSearchText(event.target.value)
    }
    placeholder="Search songs, artists, or venues"
    style={{
      width: '100%',
      minHeight: 48,
      padding: '0 15px',
      borderRadius: 14,
      border:
        '1px solid rgba(148,163,184,0.18)',
      background:
        'rgba(15,23,42,0.72)',
      color: '#f8fafc',
      fontSize: 14,
      outline: 'none',
    }}
  />
</div>

          </div>

          {loading && (
            <section className="sv-mobile-card">
              Loading your performances...
            </section>
          )}

          {!loading &&
            items.length === 0 &&
            !message && (
              <section className="sv-mobile-card">
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    padding: '30px 10px',
                  }}
                >
                  <Music2
                    size={36}
                    color="#38bdf8"
                  />

                  <h2>
                    Your song history starts here
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: '#94a3b8',
                    }}
                  >
                    Completed performances will
                    appear here automatically.
                  </p>
                </div>
              </section>
            )}

         {!loading &&
  filteredSongs.length > 0 && (
    <div
      style={{
        display: 'grid',
        gap: 12,
      }}
    >
      {filteredSongs.map((song) => {
        const isExpanded =
          expandedSong === song.key;

        const lastDate =
          song.lastPerformedAt
            ? new Date(
                song.lastPerformedAt
              ).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '';

        return (
          <article
            key={song.key}
            style={{
              borderRadius: 18,
              border:
                '1px solid rgba(148,163,184,0.14)',
              background:
                'rgba(15,23,42,0.72)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setExpandedSong(
                  isExpanded
                    ? null
                    : song.key
                )
              }
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns:
                  '52px minmax(0, 1fr) auto',
                gap: 14,
                alignItems: 'center',
                padding: 16,
                border: 0,
                background: 'transparent',
                color: '#f8fafc',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  width: 48,
                  height: 48,
                  placeItems: 'center',
                  borderRadius: 15,
                  color: '#f97316',
                  background:
                    'rgba(249,115,22,0.1)',
                  border:
                    '1px solid rgba(249,115,22,0.22)',
                }}
              >
                <Music2 size={22} />
              </div>

              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: 17,
                  }}
                >
                  {song.songTitle}
                </strong>

                <span
                  style={{
                    display: 'block',
                    marginTop: 3,
                    color: '#cbd5e1',
                  }}
                >
                  {song.artist}
                </span>

                <span
                  style={{
                    display: 'block',
                    marginTop: 7,
                    color: '#64748b',
                    fontSize: 12,
                  }}
                >
                  Sung{' '}
                  {song.performances.length}{' '}
                  {song.performances.length === 1
                    ? 'time'
                    : 'times'}

                  {lastDate &&
                    ` • Last sung ${lastDate}`}
                </span>
              </div>

              {isExpanded ? (
                <ChevronUp
                  size={20}
                  color="#94a3b8"
                />
              ) : (
                <ChevronDown
                  size={20}
                  color="#94a3b8"
                />
              )}
            </button>

            {isExpanded && (
              <div
                style={{
                  padding:
                    '0 16px 16px 82px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    paddingTop: 12,
                    borderTop:
                      '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  {song.performances.map(
                    (performance) => {
                      const event =
                        Array.isArray(
                          performance.events
                        )
                          ? performance.events[0]
                          : performance.events;

                      const venue =
                        event?.venue ||
                        event?.name ||
                        'StageVotes venue';

                      const date =
                        performance.created_at
                          ? new Date(
                              performance.created_at
                            ).toLocaleDateString(
                              [],
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )
                          : '';

                      return (
                        <div
                          key={performance.id}
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            gap: 12,
                            padding:
                              '10px 0',
                          }}
                        >
                          <span
                            style={{
                              color:
                                '#cbd5e1',
                              fontSize: 13,
                            }}
                          >
                            {venue}
                          </span>

                          <span
                            style={{
                              color:
                                '#64748b',
                              fontSize: 12,
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {date}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  )}

           {!loading &&
  items.length > 0 &&
  filteredSongs.length === 0 && (
    <section className="sv-mobile-card">
      <div
        style={{
          padding: '26px 10px',
          textAlign: 'center',
        }}
      >
        <Music2
          size={30}
          color="#38bdf8"
        />

        <h2>No matches</h2>

        <p
          style={{
            margin: 0,
            color: '#94a3b8',
          }}
        >
          Try a different song, artist,
          or venue.
        </p>
      </div>
    </section>
  )} 

          {message && (
            <p
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                color: '#fecaca',
                background:
                  'rgba(239,68,68,0.1)',
                border:
                  '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {message}
            </p>
          )}
        </div>
      </main>
    </SVSingerShell>
  );
}