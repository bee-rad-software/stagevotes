'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';

const CURRENT_SHOW_KEY =
  'stagevotes_current_event_id';

type CurrentShow = {
  loading: boolean;
  hasActiveShow: boolean;
  eventId: string | null;
  venueName: string | null;
  showName: string | null;
};

export default function useCurrentShow(): CurrentShow {
  const [loading, setLoading] = useState(true);

  const [eventId, setEventId] =
    useState<string | null>(null);

  const [venueName, setVenueName] =
    useState<string | null>(null);

  const [showName, setShowName] =
    useState<string | null>(null);

  const checkCurrentShow = useCallback(
    async () => {
      if (typeof window === 'undefined') {
        return;
      }

      const savedEventId =
        window.localStorage.getItem(
          CURRENT_SHOW_KEY
        );

      if (!savedEventId) {
        setEventId(null);
        setVenueName(null);
        setShowName(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          venue,
          is_show_ended
        `)
        .eq('id', savedEventId)
        .maybeSingle();

      if (
        error ||
        !data ||
        data.is_show_ended
      ) {
        window.localStorage.removeItem(
          CURRENT_SHOW_KEY
        );

        setEventId(null);
        setVenueName(null);
        setShowName(null);
        setLoading(false);
        return;
      }

      setEventId(data.id);
      setVenueName(data.venue || null);
      setShowName(data.name || null);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    checkCurrentShow();

    function handleStorageChange() {
      checkCurrentShow();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        checkCurrentShow();
      }
    }

    window.addEventListener(
      'storage',
      handleStorageChange
    );

    window.addEventListener(
      'stagevotes-current-show-change',
      handleStorageChange
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange
      );

      window.removeEventListener(
        'stagevotes-current-show-change',
        handleStorageChange
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [checkCurrentShow]);

  return {
    loading,
    hasActiveShow: Boolean(eventId),
    eventId,
    venueName,
    showName,
  };
}