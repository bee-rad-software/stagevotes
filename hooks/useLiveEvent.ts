'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type LiveQueueState =
  | 'waiting'
  | 'soon'
  | 'next'
  | 'performing';

type EventData = {
  id: string;
  name?: string | null;
  venue?: string | null;
  venue_name?: string | null;
  is_show_ended?: boolean | null;
};

export type LivePerformance = {
  id: string;
  event_id: string;
  singer_name: string;
  song_title: string;
  artist?: string | null;
  queue_order?: number | null;
  round?: number | null;
  status?: string | null;
  singer_profile_id?: string | null;
  device_id?: string | null;
};

type SingerProfile = {
  id: string;
  stage_name?: string | null;
  display_name?: string | null;
};

type UseLiveEventResult = {
  loading: boolean;
  error: string;

  event: EventData | null;
  eventId: string | null;
  venueName: string;

  queue: LivePerformance[];
  currentPerformance: LivePerformance | null;
  onDeckPerformance: LivePerformance | null;

  singerProfile: SingerProfile | null;
  singerName: string;

  myPerformances: LivePerformance[];
  myPosition: number | null;

  queueState: LiveQueueState;
  isCurrentSinger: boolean;
  isOnDeckSinger: boolean;
  estimatedWaitMinutes: number;

  hasActiveEvent: boolean;
  returnUrl: string | null;

  refresh: () => Promise<void>;
};

function getSavedSingerName() {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    window.localStorage.getItem(
      'karavote_singer_name'
    ) || ''
  );
}

function getDeviceId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    window.localStorage.getItem(
      'karavote_device_id'
    ) || ''
  );
}

export default function useLiveEvent(
  eventId: string | null
): UseLiveEventResult {
  const [loading, setLoading] = useState(
    Boolean(eventId)
  );

  const [error, setError] = useState('');

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [queue, setQueue] = useState<
    LivePerformance[]
  >([]);

  const [singerProfile, setSingerProfile] =
    useState<SingerProfile | null>(null);

  const [savedSingerName, setSavedSingerName] =
    useState('');

  const loadSingerProfile =
    useCallback(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSingerProfile(null);
        return;
      }

      const { data, error: profileError } =
        await supabase
          .from('singer_profiles')
          .select(
            `
            id,
            stage_name,
            display_name
            `
          )
          .eq('user_id', user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          'Unable to load singer profile:',
          profileError.message
        );

        return;
      }

      setSingerProfile(
        data as SingerProfile | null
      );
    }, []);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    const { data, error: eventError } =
      await supabase
        .from('events')
        .select(
          `
          id,
          name,
          venue,
          is_show_ended
          `
        )
        .eq('id', eventId)
        .maybeSingle();

    if (eventError) {
      throw new Error(eventError.message);
    }

    setEvent(data as EventData | null);
  }, [eventId]);

  const loadQueue = useCallback(async () => {
    if (!eventId) {
      setQueue([]);
      return;
    }

    const { data, error: queueError } =
      await supabase
        .from('performances')
        .select(
          `
          id,
          event_id,
          singer_name,
          song_title,
          artist,
          queue_order,
          round,
          status,
          singer_profile_id,
          device_id
          `
        )
        .eq('event_id', eventId)
        .neq('status', 'completed')
        .neq('status', 'skipped')
        .order('queue_order', {
          ascending: true,
        });

    if (queueError) {
      throw new Error(queueError.message);
    }

    setQueue(
      (data || []) as LivePerformance[]
    );
  }, [eventId]);

  const refresh = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      setSavedSingerName(
        getSavedSingerName()
      );

      await Promise.all([
        loadEvent(),
        loadQueue(),
        loadSingerProfile(),
      ]);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to load the live event.';

      console.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    eventId,
    loadEvent,
    loadQueue,
    loadSingerProfile,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const channel = supabase
      .channel(`live-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performances',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadQueue().catch(
            (realtimeError) => {
              console.error(
                'Unable to refresh live queue:',
                realtimeError
              );
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        () => {
          loadEvent().catch(
            (realtimeError) => {
              console.error(
                'Unable to refresh event:',
                realtimeError
              );
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, loadEvent, loadQueue]);

  const singerName =
    singerProfile?.stage_name?.trim() ||
    singerProfile?.display_name?.trim() ||
    savedSingerName.trim();

  const deviceId = getDeviceId();

  const performanceBelongsToSinger =
    useCallback(
      (performance: LivePerformance) => {
        if (
          singerProfile?.id &&
          performance.singer_profile_id ===
            singerProfile.id
        ) {
          return true;
        }

        if (
          deviceId &&
          performance.device_id === deviceId
        ) {
          return true;
        }

        return Boolean(
          singerName &&
            performance.singer_name
              .trim()
              .toLowerCase() ===
              singerName.toLowerCase()
        );
      },
      [
        deviceId,
        singerName,
        singerProfile?.id,
      ]
    );

  const myPerformances = useMemo(
    () =>
      queue.filter(
        performanceBelongsToSinger
      ),
    [queue, performanceBelongsToSinger]
  );

  const myPositionIndex = queue.findIndex(
    performanceBelongsToSinger
  );

  const myPosition =
    myPositionIndex >= 0
      ? myPositionIndex + 1
      : null;

  const currentPerformance =
    queue[0] || null;

  const onDeckPerformance =
    queue[1] || null;

  const isCurrentSinger = Boolean(
    currentPerformance &&
      performanceBelongsToSinger(
        currentPerformance
      )
  );

  const isOnDeckSinger = Boolean(
    onDeckPerformance &&
      performanceBelongsToSinger(
        onDeckPerformance
      )
  );

  const queueState: LiveQueueState =
    isCurrentSinger
      ? 'performing'
      : isOnDeckSinger
        ? 'next'
        : myPosition !== null &&
            myPosition <= 4
          ? 'soon'
          : 'waiting';

  const estimatedWaitMinutes =
    myPosition && myPosition > 1
      ? (myPosition - 1) * 4
      : 0;

  const venueName =
    event?.venue?.trim() ||
    event?.name?.trim() ||
    "Tonight's Show";

  const hasActiveEvent = Boolean(
    eventId &&
      event &&
      !event.is_show_ended
  );

  return {
    loading,
    error,

    event,
    eventId,
    venueName,

    queue,
    currentPerformance,
    onDeckPerformance,

    singerProfile,
    singerName,

    myPerformances,
    myPosition,

    queueState,
    isCurrentSinger,
    isOnDeckSinger,
    estimatedWaitMinutes,

    hasActiveEvent,
    returnUrl: eventId
      ? `/signup/${eventId}`
      : null,

    refresh,
  };
}