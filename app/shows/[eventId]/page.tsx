'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import { supabase } from '@/lib/supabase';
import {
  getSingerFavoriteSongs,
  saveSingerFavoriteSong,
} from '@/lib/singerSongFavorites';
import styles from './show-recap.module.css';

type Show = {
  id: string;
  name: string;
  created_at: string;
  judging_enabled: boolean | null;
  venue_id: string;
};

type Venue = {
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  cover_photo_url: string | null;
};

type Song = {
  id: string;
  singer_name: string;
  duet_partner_name: string | null;
  singer_profile_id: string | null;
  device_id: string | null;
  song_title: string;
  artist: string | null;
  created_at: string;
  completed_at: string | null;
};

type Badge = { performanceId: string; title: string; icon: string };
type Vote = { performance_id: string; score: number };

function songKey(song: { title: string; artist: string }) {
  return `${song.title.trim().toLowerCase()}|${song.artist.trim().toLowerCase()}`;
}

export default function ShowRecapPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeError, setBadgeError] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setBadgeError(false);

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, name, created_at, judging_enabled, venue_id')
        .eq('id', eventId)
        .eq('is_show_ended', true)
        .maybeSingle();

      if (eventError || !event?.venue_id) {
        if (!cancelled) { setError('This finished show is not available.'); setLoading(false); }
        return;
      }

      const { data: publicVenue, error: venueError } = await supabase
        .from('venues')
        .select('name, slug, city, state, cover_photo_url')
        .eq('id', event.venue_id)
        .eq('is_public', true)
        .eq('is_active', true)
        .maybeSingle();

      if (venueError || !publicVenue) {
        if (!cancelled) { setError('This finished show is not available.'); setLoading(false); }
        return;
      }

      const [performanceResult, resultResult, authResult, badgeResult] = await Promise.all([
        supabase.from('performances')
          .select('id, singer_name, duet_partner_name, singer_profile_id, device_id, song_title, artist, created_at, completed_at')
          .eq('event_id', eventId).eq('status', 'completed'),
        supabase.from('event_results')
          .select('finished_at, judge_winner_name')
          .eq('event_id', eventId).maybeSingle(),
        supabase.auth.getUser(),
        fetch(`/api/shows/${eventId}/badges`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (performanceResult.error) {
        if (!cancelled) { setError('Could not load the show setlist.'); setLoading(false); }
        return;
      }

      const finishedSongs = ((performanceResult.data || []) as Song[]).sort((a, b) =>
        Date.parse(a.completed_at || a.created_at) - Date.parse(b.completed_at || b.created_at)
        || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
      );

      const deviceId = window.localStorage.getItem('karavote_device_id');
      let profileId: string | null = null;
      if (authResult.data.user) {
        const { data: profile } = await supabase.from('singer_profiles')
          .select('id').eq('user_id', authResult.data.user.id).maybeSingle();
        profileId = profile?.id || null;
      }

      const ownSongs = finishedSongs.filter((song) =>
        (profileId && song.singer_profile_id === profileId)
        || (deviceId && song.device_id === deviceId)
      );

      const ownIds = ownSongs.map((song) => song.id);
      let earned: Badge[] = [];
      let badgesAvailable = false;
      if (badgeResult?.ok) {
        const payload: { badges?: Badge[] } = await badgeResult.json().catch(() => ({}));
        badgesAvailable = Array.isArray(payload.badges);
        earned = (payload.badges || []).filter((badge) =>
          finishedSongs.some((song) => song.id === badge.performanceId)
        );
      }

      let judgeVotes: Vote[] = [];
      if (event.judging_enabled && ownIds.length) {
        const { data: voteRows } = await supabase.from('votes')
          .select('performance_id, score').in('performance_id', ownIds);
        judgeVotes = (voteRows || []) as Vote[];
      }

      if (cancelled) return;
      setShow(event as Show);
      setVenue(publicVenue as Venue);
      setSongs(finishedSongs);
      setMyIds(ownIds);
      setBadges(earned);
      setBadgeError(!badgesAvailable);
      setVotes(judgeVotes);
      setFinishedAt(resultResult.data?.finished_at || null);
      setWinnerName(resultResult.data?.judge_winner_name || null);
      setSavedKeys(getSingerFavoriteSongs().map(songKey));
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [eventId]);

  const mySongs = useMemo(() => songs.filter((song) => myIds.includes(song.id)), [songs, myIds]);
  const singerCount = useMemo(() => new Set(songs.flatMap((song) =>
    [song.singer_name, song.duet_partner_name || '']
      .map((name) => name.trim().toLocaleLowerCase())
      .filter(Boolean)
  )).size, [songs]);
  const myBadges = badges.filter((badge) => myIds.includes(badge.performanceId));
  const scoredVotes = votes.filter((vote) => Number.isFinite(Number(vote.score)));
  const averageScore = scoredVotes.length
    ? scoredVotes.reduce((sum, vote) => sum + Number(vote.score), 0) / scoredVotes.length
    : null;
  const singerName = mySongs[0]?.singer_name || 'Singer';
  const showDate = show ? new Date(finishedAt || show.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }) : '';

  function saveSong(song: Song) {
    const favorite = { title: song.song_title, artist: song.artist || '' };
    if (saveSingerFavoriteSong(favorite)) {
      setSavedKeys(getSingerFavoriteSongs().map(songKey));
      setActionMessage(`Saved “${song.song_title}” for your next show on this device.`);
    } else {
      setActionMessage('Could not save this song on this device.');
    }
  }

  async function shareRecap() {
    if (!show || !venue || !mySongs.length) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, '#13243b');
    gradient.addColorStop(1, '#080e1b');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1350);
    context.fillStyle = '#fb923c';
    context.fillRect(72, 78, 16, 90);
    context.fillStyle = '#58c6f8';
    context.font = 'bold 38px system-ui';
    context.fillText('STAGEVOTES  /  MY NIGHT', 114, 137);
    context.fillStyle = '#ffffff';
    context.font = 'bold 78px system-ui';
    context.fillText(singerName.slice(0, 20), 72, 290);
    context.font = 'bold 48px system-ui';
    context.fillText(`${mySongs.length} ${mySongs.length === 1 ? 'song' : 'songs'} sung`, 72, 372);
    context.fillStyle = '#cbd5e1';
    context.font = '34px system-ui';
    context.fillText(venue.name.slice(0, 34), 72, 442);
    context.fillText(showDate, 72, 497);
    context.fillStyle = '#58c6f8';
    context.font = 'bold 32px system-ui';
    context.fillText('MY SETLIST', 72, 610);
    mySongs.slice(0, 5).forEach((song, index) => {
      const y = 690 + index * 112;
      context.fillStyle = '#fb923c';
      context.font = 'bold 36px system-ui';
      context.fillText(`${index + 1}.`, 72, y);
      context.fillStyle = '#ffffff';
      context.font = 'bold 38px system-ui';
      context.fillText(song.song_title.slice(0, 34), 140, y);
      context.fillStyle = '#a8b7cb';
      context.font = '28px system-ui';
      context.fillText((song.artist || '').slice(0, 44), 140, y + 36);
    });
    context.fillStyle = '#93a6bc';
    context.font = '26px system-ui';
    context.fillText('app.stagevotes.com', 72, 1284);

    const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!imageBlob) return;
    const file = new File([imageBlob], 'stagevotes-my-night.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My night at ${venue.name}` });
        return;
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <SVSingerShell title="Show history" subtitle="Relive the night">
      <div className={styles.page}>
        <Link className={styles.back} href="/live">← Back to Atlas</Link>
        {loading && <p className={styles.state}>Loading show history…</p>}
        {error && <p className={styles.state} role="alert">{error}</p>}
        {!loading && !error && show && venue && (
          <>
            <header className={styles.hero}>
              <span className={styles.kicker}>THE NIGHT IN MUSIC</span>
              <h1>{show.name}</h1>
              <p>{venue.name} · {showDate}</p>
              <Link href={`/venues/${venue.slug}`}>Explore {venue.name} →</Link>
            </header>

            {mySongs.length > 0 && (
              <section className={styles.personal}>
                <span className={styles.kicker}>MY NIGHT</span>
                <h2>{singerName}, you were on stage!</h2>
                <p>You sang {mySongs.length} {mySongs.length === 1 ? 'song' : 'songs'} at {venue.name}.</p>
                {show.judging_enabled && averageScore !== null && (
                  <p className={styles.highlight}>Judge average: {averageScore.toFixed(2)} · {scoredVotes.length} ballots</p>
                )}
                {show.judging_enabled && winnerName?.trim().toLowerCase() === singerName.trim().toLowerCase() && (
                  <p className={styles.highlight}>🏆 Judge winner</p>
                )}
                {myBadges.length > 0 && (
                  <div className={styles.badges} aria-label="Badges earned this show">
                    {myBadges.map((badge, index) => (
                      <span key={`${badge.title}-${index}`}>{badge.icon} {badge.title}</span>
                    ))}
                  </div>
                )}
                <ol className={styles.personalSongs}>
                  {mySongs.map((song) => (
                    <li key={song.id}>
                      <div><strong>{song.song_title}</strong><span>{song.artist || 'Karaoke favorite'}</span></div>
                      <button type="button" onClick={() => saveSong(song)}
                        disabled={savedKeys.includes(songKey({ title: song.song_title, artist: song.artist || '' }))}>
                        {savedKeys.includes(songKey({ title: song.song_title, artist: song.artist || '' }))
                          ? '★ Saved on this device' : '☆ Sing it again'}
                      </button>
                    </li>
                  ))}
                </ol>
                {actionMessage && <p className={styles.feedback} role="status">{actionMessage}</p>}
                <button type="button" className={styles.share} onClick={() => void shareRecap()}>
                  Share my night
                </button>
              </section>
            )}

            <section className={styles.setlist}>
              <span className={styles.kicker}>EVERY SONG, IN ORDER</span>
              <h2>The full setlist</h2>
              <div className={styles.scorecard} aria-label="Show scorecard">
                <div><strong>{singerCount}</strong><span>{singerCount === 1 ? 'Singer' : 'Singers'}</span></div>
                <div><strong>{songs.length}</strong><span>{songs.length === 1 ? 'Song sung' : 'Songs sung'}</span></div>
              </div>
              {badgeError && <p className={styles.badgeError}>Badges are unavailable right now.</p>}
              {songs.length === 0 ? <p>No completed songs were recorded for this show.</p> : (
                <ol>
                  {songs.map((song) => {
                    const earnedHere = badges.filter((badge) => badge.performanceId === song.id);
                    return (
                      <li key={song.id}>
                        <span className={styles.number}>♪</span>
                        <div>
                          <strong>{song.song_title}</strong>
                          <span>{song.artist || 'Artist not listed'}</span>
                          {earnedHere.length > 0 && (
                            <div className={styles.songBadges} aria-label="Badges earned for this song">
                              {earnedHere.map((badge, index) => (
                                <span key={`${badge.title}-${index}`}>{badge.icon} {badge.title}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={styles.singer}>
                          {song.singer_name}{song.duet_partner_name ? ` & ${song.duet_partner_name}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            {mySongs.length === 0 && (
              <p className={styles.state}>Sang at this show? Sign in to your singer profile to see your personal recap. Guest songs appear on the device you used to join.</p>
            )}
          </>
        )}
      </div>
    </SVSingerShell>
  );
}
