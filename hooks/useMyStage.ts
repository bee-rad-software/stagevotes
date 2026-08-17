'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import type {
  PersonalBests,
  SingerProfile,
  SingerStats,
  TimelineEntry,
} from '@/components/my-stage/types';

function isTestEntry(value?: string | null) {
  if (!value) return true;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  return (
    normalized === 'test' ||
    normalized.startsWith('test') ||
    normalized === 'song1' ||
    normalized === 'song2' ||
    normalized === 'artist1' ||
    normalized === 'artist2'
  );
}

export default function useMyStage() {
  const [profile, setProfile] =
    useState<SingerProfile | null>(null);

  const [stats, setStats] = useState<SingerStats>({
    performances: 0,
    averageScore: 0,
    wins: 0,
    venues: 0,
  });

  const [monthlyStats, setMonthlyStats] = useState({
  shows: 0,
  songs: 0,
  newVenues: 0,
});

  const [personalBests, setPersonalBests] =
    useState<PersonalBests>({
      highestScore: 0,
      highestScoreSong: '',
      bestFinish: '',
      mostPerformedArtist: '',
      signatureSong: '',
    });

    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [championshipData, setChampionshipData] =
  useState<any[]>([]);

  const loadMyStage = useCallback(async () => {
    setLoading(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.href = '/login';
      return;
    }

    let { data: profileData, error: profileError } =
      await supabase
        .from('singer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        'Unable to load singer profile:',
        profileError
      );

      setMessage(
        'We could not load your singer profile.'
      );

      setLoading(false);
      return;
    }

    const fallbackName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Singer';

    if (!profileData) {
      const {
        data: newProfile,
        error: createProfileError,
      } = await supabase
        .from('singer_profiles')
        .insert({
          user_id: user.id,
          display_name: fallbackName,
          stage_name: fallbackName,
          profile_visibility: 'public',
        })
        .select('*')
        .single();

      if (createProfileError) {
        console.error(
          'Unable to create singer profile:',
          createProfileError
        );

        setMessage(
          `Unable to create your singer profile: ${createProfileError.message}`
        );

        setLoading(false);
        return;
      }

      profileData = newProfile;
    }

    setProfile(profileData);

    const {
  data: tournamentEntries,
  error: tournamentError,
} = await supabase
  .from('tournament_entries')
  .select(`
    id,
    status,
    singer_profile_id,
    tournaments (
      id,
      name,
      slug,
      status,
      starts_at,
      ends_at
    ),
    tournament_event_entries (
      status,
      seed,
      placement,
      average_score,
      tournament_events (
        id,
        name,
        status,
        starts_at,
        event_id,
        venues (
          id,
          name,
          slug,
          city,
          state
        ),
        tournament_rounds (
          id,
          name,
          round_type,
          round_order
        )
      )
    )
  `)
  .eq(
  'singer_profile_id',
  profileData.id
);

  if (tournamentError) {
  console.error(
    'Unable to load singer championship data:',
    tournamentError
  );

  setChampionshipData([]);
} else {
  const normalizedChampionships =
    (tournamentEntries || []).map(
      (entry: any) => ({
        ...entry,

        tournaments: Array.isArray(
          entry.tournaments
        )
          ? entry.tournaments[0] || null
          : entry.tournaments || null,

        tournament_event_entries:
          (
            entry.tournament_event_entries ||
            []
          ).map((eventEntry: any) => ({
            ...eventEntry,

            tournament_events:
              Array.isArray(
                eventEntry.tournament_events
              )
                ? eventEntry
                    .tournament_events[0] ||
                  null
                : eventEntry
                    .tournament_events ||
                  null,
          })),
      })
    );

  setChampionshipData(
    normalizedChampionships
  );
}

    let completedPerformanceCount = 0;
    let venuesVisitedCount = 0;
    let averageJudgeScore = 0;
    let totalWins = 0;

    let favoriteArtist =
      'Waiting for more performances';

    let favoriteSong =
      'Waiting for more performances';

    if (profileData?.id) {
      const {
        data: completedPerformances,
        error: performanceError,
      } = await supabase
        .from('performances')
       .select(`
  id,
  event_id,
  song_title,
  artist,
  created_at,
  events (
    venue,
    venue_id
  )
`)
        .eq(
          'singer_profile_id',
          profileData.id
        )
        .eq('status', 'completed');

      if (performanceError) {
        console.error(
          'Unable to load completed performances:',
          performanceError
        );
      } else {
        completedPerformanceCount =
          completedPerformances?.length || 0;

        const completedPerformanceIds =
          completedPerformances?.map(
            (performance: any) =>
              performance.id
          ) || [];

        const performanceScoreMap =
  new Map<string, number[]>();
        
          if (
          completedPerformanceIds.length > 0
        ) {
     const {
  data: voteRows,
  error: voteError,
} = await supabase
  .from('votes')
  .select('performance_id, score')
  .in(
    'performance_id',
    completedPerformanceIds
  );

          if (voteError) {
            console.error(
              'Unable to load judge scores:',
              voteError
            );
          } else {
            voteRows?.forEach((vote) => {
  const numericScore = Number(vote.score);

  if (
    !vote.performance_id ||
    !Number.isFinite(numericScore)
  ) {
    return;
  }

  const existingScores =
    performanceScoreMap.get(
      vote.performance_id
    ) || [];

  existingScores.push(numericScore);

  performanceScoreMap.set(
    vote.performance_id,
    existingScores
  );
});
            const validScores =
              voteRows
                ?.map((vote) =>
                  Number(vote.score)
                )
                .filter((score) =>
                  Number.isFinite(score)
                ) || [];

            if (validScores.length > 0) {
              const scoreTotal =
                validScores.reduce(
                  (sum, score) =>
                    sum + score,
                  0
                );

              averageJudgeScore =
                scoreTotal /
                validScores.length;
            }
          }
        }

        const artistCounts =
          new Map<string, number>();

        const songCounts =
          new Map<string, number>();

        completedPerformances?.forEach(
          (performance: any) => {
            const artist =
              performance.artist?.trim();

            const songTitle =
              performance.song_title?.trim();

            if (
              artist &&
              !isTestEntry(artist)
            ) {
              const normalizedArtist =
                artist.toLowerCase();

              artistCounts.set(
                normalizedArtist,
                (artistCounts.get(
                  normalizedArtist
                ) || 0) + 1
              );
            }

            if (
              songTitle &&
              !isTestEntry(songTitle)
            ) {
              const normalizedSong =
                songTitle.toLowerCase();

              songCounts.set(
                normalizedSong,
                (songCounts.get(
                  normalizedSong
                ) || 0) + 1
              );
            }
          }
        );

        const topArtist = [
          ...artistCounts.entries(),
        ].sort(
          (a, b) => b[1] - a[1]
        )[0];

        const topSong = [
          ...songCounts.entries(),
        ].sort(
          (a, b) => b[1] - a[1]
        )[0];

        if (topArtist) {
          const matchingPerformance =
            completedPerformances?.find(
              (performance: any) =>
                performance.artist
                  ?.trim()
                  .toLowerCase() ===
                topArtist[0]
            );

          favoriteArtist =
            matchingPerformance?.artist?.trim() ||
            topArtist[0];
        }

        if (topSong) {
          const matchingPerformance =
            completedPerformances?.find(
              (performance: any) =>
                performance.song_title
                  ?.trim()
                  .toLowerCase() ===
                topSong[0]
            );

          favoriteSong =
            matchingPerformance?.song_title?.trim() ||
            topSong[0];
        }

        const uniqueVenues =
          new Set<string>();

        completedPerformances?.forEach(
          (performance: any) => {
            const event = Array.isArray(
              performance.events
            )
              ? performance.events[0]
              : performance.events;

            if (event?.venue_id) {
              uniqueVenues.add(
                `id:${event.venue_id}`
              );
            } else if (event?.venue) {
              uniqueVenues.add(
                `name:${event.venue
                  .trim()
                  .toLowerCase()}`
              );
            }
          }
        );

        venuesVisitedCount =
          uniqueVenues.size;

        const now = new Date();

const monthStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  1
);

const thisMonthPerformances =
  (completedPerformances || []).filter(
    (performance: any) => {
      const performanceDate =
  performance.created_at;

      if (!performanceDate) {
        return false;
      }

      return (
        new Date(performanceDate) >= monthStart
      );
    }
  );

const monthlyShowIds = new Set<string>();

const monthlyVenueIds = new Set<string>();

thisMonthPerformances.forEach(
  (performance: any) => {
    if (performance.event_id) {
      monthlyShowIds.add(
        performance.event_id
      );
    }

    const event = Array.isArray(
      performance.events
    )
      ? performance.events[0]
      : performance.events;

    if (event?.venue_id) {
      monthlyVenueIds.add(
        `id:${event.venue_id}`
      );
    } else if (event?.venue) {
      monthlyVenueIds.add(
        `name:${event.venue
          .trim()
          .toLowerCase()}`
      );
    }
  }
);

setMonthlyStats({
  shows: monthlyShowIds.size,
  songs: thisMonthPerformances.length,
  newVenues: monthlyVenueIds.size,
});

          const timelineEntries: TimelineEntry[] =
  (completedPerformances || [])
    .map((performance: any) => {
      const event = Array.isArray(
        performance.events
      )
        ? performance.events[0]
        : performance.events;

      const performanceScores =
        performanceScoreMap.get(
          performance.id
        ) || [];

      const performanceAverage =
        performanceScores.length > 0
          ? performanceScores.reduce(
              (sum, score) => sum + score,
              0
            ) / performanceScores.length
          : null;

      return {
        id: performance.id,
        songTitle:
          performance.song_title ||
          'Untitled Performance',
        artist:
          performance.artist ||
          'Artist not listed',
        venue:
          event?.venue ||
          'Venue unavailable',
        performedAt:
  performance.created_at || '',
        averageScore:
          performanceAverage,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.performedAt).getTime() -
        new Date(a.performedAt).getTime()
    );

setTimeline(timelineEntries);
      }
    }

    const nextStats: SingerStats = {
      performances:
        completedPerformanceCount,
      averageScore:
        averageJudgeScore,
      wins: totalWins,
      venues: venuesVisitedCount,
    };

    setStats(nextStats);

    setPersonalBests({
      highestScore: 0,
      highestScoreSong: '',
      bestFinish:
        totalWins > 0
          ? '1st Place'
          : '',
      mostPerformedArtist:
        favoriteArtist,
      signatureSong: favoriteSong,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMyStage();
  }, [loadMyStage]);

  const performerLevel =
    stats.performances >= 250
      ? 'Karaoke Legend'
      : stats.performances >= 100
        ? 'Headliner'
        : stats.performances >= 50
          ? 'Veteran'
          : stats.performances >= 25
            ? 'Regular'
            : 'Rookie';

     const handlePhotoUpload = async (file: File) => {
  try {
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('You must be signed in to upload a profile photo.');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file.');
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      throw new Error('Profile photos must be smaller than 5 MB.');
    }

    const fileExtension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const filePath =
      `${user.id}/avatar-${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: profileError } = await supabase
      .from('singer_profiles')
      .update({
        photo_url: publicUrl,
      })
      .eq('user_id', user.id);

    if (profileError) {
      throw profileError;
    }

    await loadMyStage();
    setMessage('Profile photo updated.');
  } catch (error) {
    console.error('Profile photo upload failed:', error);

    setMessage(
      error instanceof Error
        ? error.message
        : 'Unable to upload your profile photo.'
    );
  }
};       

return {
  profile,
  stats,
  monthlyStats,
  personalBests,
  performerLevel,
  timeline,
  championshipData,
  loading,
  message,
  reload: loadMyStage,
  handlePhotoUpload,
};
}