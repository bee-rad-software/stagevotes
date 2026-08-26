'use client'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, EventRow, PerformanceRow, VoteRow } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import AppQRCode from '@/components/AppQRCode';
import AppShell from '@/components/AppShell';
import SVShell from '@/components/ui/SVShell';
import SVHostHero from '@/components/dashboard/SVHostHero';
import SVMissionControl from '@/components/dashboard/SVMissionControl';
import SVSongPicker, {
  SVSongOption,
} from '@/components/singer/SVSongPicker';
import SVHostQueue, {
  SVHostQueueItem,
} from '@/components/dashboard/SVHostQueue';
import SVHostIQ from '@/components/dashboard/SVHostIQ';
import SVFirstShowWelcome from '@/components/dashboard/SVFirstShowWelcome';
import SVEmptyQueueState from '@/components/dashboard/SVEmptyQueueState';
import SVFinishedQueueState from '@/components/dashboard/SVFinishedQueueState';
import {
  getRotationIdentity,
} from '@/lib/rotationIdentity';
import {
  buildRotationQueue,
} from '@/lib/rotationQueue';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

import { GripVertical } from 'lucide-react';

export default function HostPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [performances, setPerformances] = useState<PerformanceRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [singerName, setSingerName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [pickerSongs, setPickerSongs] =
  useState<SVSongOption[]>([]);

  const [
  selectedKaraFunSongId,
  setSelectedKaraFunSongId,
] = useState<number | null>(null);

const [
  selectedKaraFunTitle,
  setSelectedKaraFunTitle,
] = useState('');

const [
  selectedKaraFunArtist,
  setSelectedKaraFunArtist,
] = useState('');

const [pickerLoading, setPickerLoading] =
  useState(false);

const [
  showEditSongPicker,
  setShowEditSongPicker,
] = useState(false);

const [
  showManualSongFields,
  setShowManualSongFields,
] = useState(false);
  const [singerView, setSingerView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
const [editSingerName, setEditSingerName] = useState('');
const [editSongTitle, setEditSongTitle] = useState('');
const [editArtist, setEditArtist] = useState('');
const [peoplesChoiceResults, setPeoplesChoiceResults] = useState<
  { singer_name: string; votes: number }[]
>([]);
  const [categories, setCategories] = useState<
  { id: string; category_name: string }[]
>([]);
  const [checkinCount, setCheckinCount] = useState(0);
  const [account, setAccount] = useState<any>(null);
  const isSubscribed =
  !account?.subscription_status ||
  account.subscription_status === 'active' ||
  account.subscription_status === 'trialing';
  const [showSingerSignup, setShowSingerSignup] = useState(false);
  const [showAudienceAccess, setShowAudienceAccess] = useState(false);
  const [showCheckinStats, setShowCheckinStats] = useState(false);
  const [showCompletedTonight, setShowCompletedTonight] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
const [showPeoplesChoice, setShowPeoplesChoice] = useState(true);
  const [copiedLink, setCopiedLink] = useState('');
  const [accountId, setAccountId] = useState('');
const [staticSignupQr, setStaticSignupQr] = useState(false);
const [staticJudgeQr, setStaticJudgeQr] = useState(false);
const [staticPeopleQr, setStaticPeopleQr] = useState(false);
const [advancingSinger, setAdvancingSinger] =
  useState(false);
const ENABLE_HOST_IQ = false;
const [showFirstWelcome, setShowFirstWelcome] =
  useState(false);
const [karafunChannel, setKarafunChannel] = useState('');
const [karafunConnected, setKarafunConnected] = useState(false);

const [
  karafunQueueSynced,
  setKarafunQueueSynced,
] = useState(false);

const [
  rememberedSingerNames,
  setRememberedSingerNames,
] = useState<string[]>([]);

const [
  showSingerSuggestions,
  setShowSingerSuggestions,
] = useState(false);

const [
  karafunConnecting,
  setKarafunConnecting,
] = useState(false);

const [
  karafunConnectionError,
  setKarafunConnectionError,
] = useState('');

const [
  karafunPlayerOnline,
  setKarafunPlayerOnline,
] = useState(false);

const [
  karafunQueueItems,
  setKarafunQueueItems,
] = useState<any[]>([]);

const [
  karafunAutoAdvance,
  setKarafunAutoAdvance,
] = useState(true);

const [
  karafunSentPerformanceIds,
  setKarafunSentPerformanceIds,
] = useState<Set<string>>(new Set());

const karafunSocketRef = useRef<WebSocket | null>(null);

const karafunSendingPerformanceIdsRef =
  useRef<Set<string>>(new Set());

const karaFunLastAutoAdvancedItemIdRef =
  useRef<string | null>(null);

const karaFunCurrentItemIdRef =
  useRef<string | null>(null);

const karaFunCurrentSingerRef =
  useRef('');

const karaFunCurrentTitleRef =
  useRef('');

const karaFunAutoAdvancingRef =
  useRef(false);

const karaFunSuppressNextAutoAdvanceRef =
  useRef(false);

const karaFunPendingSkipAdvanceRef =
  useRef<string | null>(null);

const karaFunQueueSyncInFlightRef =
  useRef(false);

const karaFunSkipNextSentRef =
  useRef(false);

const nextSingerRef =
  useRef<(() => Promise<void>) | null>(null);

const currentPerformanceRef =
  useRef<PerformanceRow | null>(null);

const rotatedQueueRef =
  useRef<PerformanceRow[]>([]);

const [welcomeAccountId, setWelcomeAccountId] =
  useState<string | null>(null);
const [welcomeDisplayOpened, setWelcomeDisplayOpened] =
  useState(false);

const [welcomeAudienceOpened, setWelcomeAudienceOpened] =
  useState(false);

const [welcomeSingerAdded, setWelcomeSingerAdded] =
  useState(false);

const [welcomeProgressLoaded, setWelcomeProgressLoaded] =
  useState(false);

 const [
  expectedTournamentJudges,
  setExpectedTournamentJudges,
] = useState<number | null>(null);
  
 const voteUrl =
  typeof window !== 'undefined'
    ? staticJudgeQr
      ? `${window.location.origin}/go/${accountId}/vote`
      : `${window.location.origin}/vote/${eventId}`
    : '';

const signupUrl =
  typeof window !== 'undefined'
    ? staticSignupQr
      ? `${window.location.origin}/go/${accountId}/signup`
      : `${window.location.origin}/signup/${eventId}`
    : '';

const peoplesChoiceUrl =
  typeof window !== 'undefined'
    ? staticPeopleQr
      ? `${window.location.origin}/go/${accountId}/people`
      : `${window.location.origin}/peopleschoice/${eventId}`
    : '';

const checkinUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/checkin/${eventId}`
    : '';

  useEffect(() => {
  if (!eventId) return;

  try {
    const saved = window.localStorage.getItem(
      `stagevotes_welcome_progress_${eventId}`
    );

    if (saved) {
      const progress = JSON.parse(saved);

      setWelcomeDisplayOpened(
        progress.displayOpened === true
      );

      setWelcomeAudienceOpened(
        progress.audienceOpened === true
      );

      setWelcomeSingerAdded(
        progress.singerAdded === true
      );
    }
  } catch (error) {
    console.error(
      'Could not restore welcome progress:',
      error
    );
  } finally {
    setWelcomeProgressLoaded(true);
  }
}, [eventId]);

useEffect(() => {
  if (!eventId || !welcomeProgressLoaded) {
    return;
  }

  window.localStorage.setItem(
    `stagevotes_welcome_progress_${eventId}`,
    JSON.stringify({
      displayOpened: welcomeDisplayOpened,
      audienceOpened: welcomeAudienceOpened,
      singerAdded: welcomeSingerAdded,
    })
  );
}, [
  eventId,
  welcomeProgressLoaded,
  welcomeDisplayOpened,
  welcomeAudienceOpened,
  welcomeSingerAdded,
]);

 useEffect(() => {
  if (
    (event as any)?.tournament_event_id
  ) {
    loadTournamentJudgeCount();
  }
}, [
  (event as any)?.tournament_event_id,
]); 

useEffect(() => {

    async function checkAuth() {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    router.push('/login');
    return;
  }

const { data: accountUser } = await supabase
  .from('account_users')
  .select('account_id')
  .eq('user_id', data.user.id)
  .single();

if (!accountUser) {
  loadAll();
  return;
}
      
const { data: account } = await supabase
  .from('accounts')
  .select('id, static_signup_qr, static_judge_qr, static_people_qr')
  .eq('id', accountUser.account_id)
  .single();

if (account) {
  setAccountId(account.id);
  setStaticSignupQr(account.static_signup_qr || false);
  setStaticJudgeQr(account.static_judge_qr || false);
  setStaticPeopleQr(account.static_people_qr || false);
}
      
  loadAll();
}

checkAuth();

    const channel = supabase
      .channel(`host-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        loadEvent
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'performances', filter: `event_id=eq.${eventId}` },
        loadAll
      )
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` },
  loadAll
)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` },
        loadAll
      )
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'peoples_choice_votes', filter: `event_id=eq.${eventId}` },
  loadPeoplesChoice
)
     .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'event_checkins', filter: `event_id=eq.${eventId}` },
  loadCheckins
) 
      .subscribe();

const interval = setInterval(() => {
  if (!showSingerSignup) {
    loadAll();
  }
}, 3000);

    return () => {
  clearInterval(interval);
  supabase.removeChannel(channel);
};
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, router, showSingerSignup]);

async function loadAll() {
  await Promise.all([
    loadEvent(),
    loadPerformances(),
    loadPeoplesChoice(),
    loadVotes(),
    loadCategories(),
    loadCheckins(),
    loadRememberedSingerNames(),
  ]);
}

async function loadCheckins() {
  const { count, error } = await supabase
    .from('event_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) {
  console.error(error);
  return false;
}

  setCheckinCount(count || 0);
}
  
function copyLink(label: string, url: string) {
  navigator.clipboard.writeText(url);
  setCopiedLink(label);

  setTimeout(() => {
    setCopiedLink('');
  }, 2000);
}
  
function downloadQR(url: string, filename: string) {
  const canvas = document.createElement('canvas');
  const size = 1200;
  const margin = 80;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);

 const img = new Image();
img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, margin, margin, size - margin * 2, size - margin * 2);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

 img.src = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=${encodeURIComponent(url)}`;
}

async function getMyAccountId() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    router.push('/login');
    return null;
  }

  const { data: accountUser, error } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', userData.user.id)
    .single();

  if (error || !accountUser) {
    console.error(error);
    alert('No account found for this user.');
    return null;
  }

  return accountUser.account_id;
}
  
  async function loadEvent() {
  const accountId = await getMyAccountId();
  if (!accountId) return;

const { data: accountData } = await supabase
  .from('accounts')
  .select('*')
  .eq('id', accountId)
  .single();

if (accountData) {
  setAccount(accountData);

  setWelcomeAccountId(accountData.id);

  setKarafunChannel(
  accountData.karafun_channel || ''
);

  if (!accountData.has_seen_host_welcome) {
    setShowFirstWelcome(true);
  }
}
    
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('account_id', accountId)
    .single();

  if (error) {
    console.error(error.message);
    alert('You do not have access to this event.');
    router.push('/');
    return false;
  }

  setEvent(data);
}

async function dismissFirstWelcome() {
  if (!welcomeAccountId) {
    setShowFirstWelcome(false);
    return;
  }

  // Hide it immediately so the UI feels responsive.
  setShowFirstWelcome(false);

  const { error } = await supabase
    .from('accounts')
    .update({
      has_seen_host_welcome: true,
    })
    .eq('id', welcomeAccountId);

  if (error) {
    console.error(
      'Unable to dismiss welcome card:',
      error
    );

    // Restore it if the update failed.
    setShowFirstWelcome(true);

    alert(
      'We could not save your preference. Please try again.'
    );
  }
}

async function endShow() {
  if (!confirm('End the show and show awards?')) {
    return;
  }

  const accountId = await getMyAccountId();

  if (!accountId) {
    return;
  }

  const judgeWinner = leaderboard[0];
  const peoplesChoiceWinner =
    peoplesChoiceResults[0];

  const uniqueSingerCount = new Set(
    performances.map((performance) =>
      performance.singer_name
        .trim()
        .toLowerCase()
    )
  ).size;

  const totalPeopleVotes =
    peoplesChoiceResults.reduce(
      (sum, singer) => sum + singer.votes,
      0
    );

  const { error: resultError } =
    await supabase
      .from('event_results')
      .upsert(
        {
          event_id: eventId,
          account_id: accountId,
          venue_id: event?.venue_id || null,
          event_name: event?.name || null,
          venue_name: event?.venue || null,

          judge_winner_name:
            judgeWinner?.singer_name || null,

          judge_score:
            judgeWinner?.averageScore || null,

          peoples_choice_name:
            peoplesChoiceWinner?.singer_name ||
            null,

          peoples_choice_votes:
            peoplesChoiceWinner?.votes || 0,

          total_performers:
            uniqueSingerCount,

          total_judge_votes:
            judgeBallotCount,

          total_people_votes:
            totalPeopleVotes,

          finished_at:
            new Date().toISOString(),
        },
        {
          onConflict: 'event_id',
        }
      );

  if (resultError) {
    console.error(
      'Unable to save event results:',
      resultError
    );

    alert(
      `Results could not be saved: ${resultError.message}`
    );

    return;
  }

  const finalPerformanceId =
  event?.current_performance_id;

if (finalPerformanceId) {
  const { error: finalPerformanceError } =
    await supabase
      .from('performances')
      .update({
        status: 'completed',
      })
      .eq('id', finalPerformanceId)
      .eq('event_id', eventId)
      .eq('account_id', accountId);

  if (finalPerformanceError) {
    console.error(
      'Unable to complete final performance:',
      finalPerformanceError
    );

    alert(
      `The final singer could not be completed: ${finalPerformanceError.message}`
    );

    return;
  }
}

  const {
    data: endedEvent,
    error: endError,
  } = await supabase
    .from('events')
    .update({
  is_voting_open: false,
  is_show_ended: true,
  current_performance_id: null,
  current_performance_started_at: null,
})
    .eq('id', eventId)
    .eq('account_id', accountId)
    .select('id, is_show_ended')
    .maybeSingle();

  if (endError) {
    console.error(
      'Unable to end show:',
      endError
    );

    alert(
      `The show could not be ended: ${endError.message}`
    );

    return;
  }

  if (!endedEvent) {
    alert(
      'The show was not updated. The event or account did not match.'
    );

    console.error({
      eventId,
      accountId,
      eventAccountId: event?.account_id,
    });

    return;
  }

  if (!endedEvent.is_show_ended) {
    alert(
      'The update completed, but the show is still marked active.'
    );

    return;
  }

const {
  data: processingResult,
  error: processingError,
} = await supabase.rpc(
  'process_completed_event',
  {
    p_event_id: eventId,
  }
);

if (processingError) {
  console.error(
    'Unable to process completed event:',
    processingError
  );

  alert(
    `The show ended, but post-show processing failed: ${processingError.message}`
  );
} else {
  console.log(
    'Completed event processing:',
    processingResult
  );

}

  await loadAll();

const isTournament =
  (event as any)?.competition_mode ===
  'tournament';

router.push(
  isTournament
    ? `/tournament-results/${eventId}`
    : `/leaderboard/${eventId}`
);
}
 
async function loadRememberedSingerNames() {
  const accountId = await getMyAccountId();

  if (!accountId) {
    return;
  }

  const { data, error } = await supabase
    .from('performances')
    .select('singer_name')
    .eq('account_id', accountId)
    .not('singer_name', 'is', null);

  if (error) {
    console.error(
      'Unable to load remembered singers:',
      error
    );

    return;
  }

  const names = Array.from(
    new Map(
      (data || [])
        .map((performance) =>
          performance.singer_name?.trim()
        )
        .filter(Boolean)
        .map((name) => [
          name!.toLowerCase(),
          name!,
        ])
    ).values()
  ).sort((a, b) =>
    a.localeCompare(b)
  );

  setRememberedSingerNames(names);
}

 async function loadPerformances() {
  const accountId = await getMyAccountId();
  if (!accountId) return;

  const { data, error } = await supabase
    .from('performances')
    .select(`
  *,
  singer_profiles (
    id,
    photo_url
  )
`)
    .eq('event_id', eventId)
    .eq('account_id', accountId)
    .order('queue_order', { ascending: true });

  if (error) {
    console.error(error.message);
    return false;
  }

  setPerformances(data || []);
}

async function loadPeoplesChoice() {
  const { data, error } = await supabase
  .from('peoples_choice_votes')
  .select('singer_name')
  .eq('event_id', eventId);

  if (error) {
    console.error(error.message);
    return false;
  }

  const counts: Record<string, number> = {};

  (data || []).forEach((vote) => {
    counts[vote.singer_name] = (counts[vote.singer_name] || 0) + 1;
  });

  const results = Object.entries(counts)
    .map(([singer_name, votes]) => ({
      singer_name,
      votes
    }))
    .sort((a, b) => b.votes - a.votes);

  setPeoplesChoiceResults(results);
}
  
 async function loadVotes() {
  const accountId = await getMyAccountId();
  if (!accountId) return;

  const { data, error } = await supabase
    .from('votes')
    .select(`
      *,
      vote_categories!votes_category_id_fkey (
        category_name
      )
    `)
    .eq('event_id', eventId)
    .eq('account_id', accountId);

  if (error) {
    console.error(error.message);
    return false;
  }

  setVotes(data || []);
}

async function manageBilling() {
  const accountId = await getMyAccountId();
  if (!accountId) return;

  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accountId })
  });

  const data = await response.json();

  if (data.url) {
    window.location.href = data.url;
  } else {
    alert(data.error || 'Unable to open billing portal');
  }
}
  
async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
  
  async function loadCategories() {
  const accountId = await getMyAccountId();
  if (!accountId) return;

  const { data, error } = await supabase
    .from('vote_categories')
    .select('id, category_name')
    .eq('event_id', eventId)
    .eq('account_id', accountId);

  if (error) {
    console.error(error.message);
    return false;
  }

  setCategories(data || []);
}

function getCurrentActiveRound() {
  const active = performances.filter(
    (p: any) => p.status !== 'completed' && p.status !== 'skipped'
  );

  if (active.length === 0) return 1;

  return Math.min(...active.map((p: any) => p.round || 1));
}
  
const searchPickerSongs = useCallback(
  async (searchText: string) => {
    const term = searchText.trim();

    if (term.length < 2) {
      setPickerSongs([]);
      setPickerLoading(false);
      return;
    }

    setPickerLoading(true);

    try {
      /*
       * If this venue has KaraFun configured,
       * use KaraFun as the authoritative catalog.
       */
      if (karafunChannel) {
        const response = await fetch(
          `https://www.karafun.com/${karafunChannel}/` +
            `?type=search` +
            `&q=${encodeURIComponent(term)}` +
            `&types=karaoke`
        );

        if (!response.ok) {
          throw new Error(
            `KaraFun search failed: ${response.status}`
          );
        }

        const data = await response.json();

        const results: SVSongOption[] =
          (Array.isArray(data) ? data : [])
            .slice(0, 20)
            .map((result: any) => {
              const alreadyQueued =
                performances.some(
                  (performance) =>
                    performance.song_title
                      .trim()
                      .toLowerCase() ===
                      String(
                        result.title || ''
                      )
                        .trim()
                        .toLowerCase() &&
                    performance.status !==
                      'completed'
                );

              return {
                title: result.title || '',
                artist: result.artist || '',
                status: alreadyQueued
                  ? 'queued'
                  : 'available',

                // temporary extra metadata
                karafunSongId:
                  Number(result.songId) || null,
              } as SVSongOption & {
                karafunSongId: number | null;
              };
            });

        setPickerSongs(results);
        setPickerLoading(false);
        return;
      }

      /*
       * No KaraFun configured:
       * fall back to the existing StageVotes catalog.
       */
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist')
        .or(
          `title.ilike.%${term}%,artist.ilike.%${term}%`
        )
        .limit(20);

      if (error) {
        throw error;
      }

      const results: SVSongOption[] =
        (data || []).map((result) => {
          const alreadyQueued =
            performances.some(
              (performance) =>
                performance.song_title
                  .trim()
                  .toLowerCase() ===
                  result.title
                    .trim()
                    .toLowerCase() &&
                performance.status !==
                  'completed'
            );

          return {
            title: result.title,
            artist: result.artist || '',
            status: alreadyQueued
              ? 'queued'
              : 'available',
          };
        });

      setPickerSongs(results);
    } catch (error) {
      console.error(
        'Host song search failed:',
        error
      );

      setPickerSongs([]);
    } finally {
      setPickerLoading(false);
    }
  },
  [
    performances,
    karafunChannel,
  ]
);

  async function addPerformance(): Promise<boolean> {
  if (!singerName.trim() || !songTitle.trim()) {
    alert('Singer name and song title are required.');
    return false;
  }

const newPerformanceIdentity =
  getRotationIdentity({
    singer_name: singerName,
    singer_profile_id: null,
    device_id: null,
  });

const singerExistingSongs = performances.filter(
  (p: any) =>
    getRotationIdentity(p) ===
    newPerformanceIdentity
);

const currentRound =
  getCurrentActiveRound();

const singerHighestRound =
  singerExistingSongs.length > 0
    ? Math.max(
        ...singerExistingSongs.map(
          (performance: any) =>
            performance.round || 1
        )
      )
    : null;

const assignedRound =
  singerHighestRound === null
    ? currentRound
    : Math.max(
        currentRound,
        singerHighestRound + 1
      );
    

const singerOriginalOrder =
  singerExistingSongs.length > 0
    ? Math.min(...singerExistingSongs.map((p: any) => p.queue_order || 0))
    : null;

const maxQueueOrder =
  performances.reduce(
    (max, p: any) =>
      Math.max(
        max,
        p.queue_order || 0
      ),
    0
  );

const nextOrder =
  singerOriginalOrder !== null
    ? singerOriginalOrder
    : maxQueueOrder + 1;

const accountId = await getMyAccountId();
if (!accountId) return false;

const { error } = await supabase.from('performances').insert({
  event_id: eventId,
  account_id: accountId,
  singer_name: singerName.trim(),
  song_title: songTitle.trim(),
  artist: artist.trim(),

  karafun_song_id:
    selectedKaraFunSongId,

  karafun_title:
    selectedKaraFunSongId
      ? selectedKaraFunTitle
      : null,

  karafun_artist:
    selectedKaraFunSongId
      ? selectedKaraFunArtist
      : null,

  queue_order: nextOrder,
  round: assignedRound
});

if (error) {
  alert(error.message);
  return false;
}

    setSingerName('');
    setSongTitle('');
    setArtist('');
    setPickerSongs([]);
    setSelectedKaraFunSongId(null);
setSelectedKaraFunTitle('');
setSelectedKaraFunArtist('');
setShowManualSongFields(false);
    await loadPerformances();

    return true;
  }

  async function setCurrent(performanceId: string) {
    const { error } = await supabase
      .from('events')
    .update({
  current_performance_id: performanceId,
  current_performance_started_at:
    new Date().toISOString(),
  is_voting_open: false,
})
      .eq('id', eventId);

    if (error) {
      alert(error.message);
      return false;
    }

    await loadAll();
  }

async function newShow() {
  if (
    !confirm(
      'Start a new show? This event will be archived.'
    )
  ) return;

  await supabase
    .from('events')
    .update({
      is_archived: true,
      is_show_ended: true
    })
    .eq('id', eventId);

  window.location.href = '/';
}
  
function isTournamentPerformanceReady(
  performance: any
) {
  const isTournament =
    (event as any)?.competition_mode ===
    'tournament';

  if (!isTournament) {
    return true;
  }

  return Boolean(
    performance.checked_in_at &&
    performance.song_title?.trim()
  );
}

  async function connectKaraFun() {
  if (!karafunChannel) {
    setKarafunConnected(false);
    setKarafunConnectionError(
      'No KaraFun channel is configured.'
    );
    return;
  }

  if (
    karafunSocketRef.current &&
    karafunSocketRef.current.readyState === WebSocket.OPEN &&
    karafunConnected
  ) {
    return;
  }

  setKarafunConnecting(true);
  setKarafunConnected(false);
  setKarafunConnectionError('');

  try {
    const response = await fetch(
      `https://www.karafun.com/${karafunChannel}/`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(
        `KaraFun returned ${response.status}`
      );
    }

    const html = await response.text();

    const socketMatch =
      html.match(/"kcs_url":\s*"([^"]+)"/);

    if (!socketMatch) {
      throw new Error(
        'KaraFun is not currently available. Start KaraFun and try again.'
      );
    }

    const socketUrl =
      socketMatch[1].replaceAll('\\/', '/');

    const ws = new WebSocket(
      socketUrl,
      'kcpj~v3+emuping'
    );

    karafunSocketRef.current = ws;

    ws.onopen = () => {
      console.log(
        'KaraFun socket connected.'
      );
    };

    ws.onmessage = (event) => {
      let message;

try {
  message = JSON.parse(event.data);
} catch {
  return;
}

console.log(
  '🔥 KARAFUN RAW MESSAGE:',
  message
);

      if (
        message.type ===
        'core.AuthenticatedEvent'
      ) {
        const bridgeUsername =
          `STAGEVOTES-${Date.now()}`;

        ws.send(
          JSON.stringify({
            id: 1,
            type:
              'remote.UpdateUsernameRequest',
            payload: {
              username: bridgeUsername,
            },
          })
        );

        setKarafunConnecting(false);
setKarafunConnectionError('');
setKarafunConnected(true);
setKarafunPlayerOnline(false);

        console.log(
          'StageVotes KaraFun bridge authenticated.'
        );

        return;
      }

if (message.type === 'remote.QueueEvent') {
  const items =
    message.payload?.queue?.items || [];

  const karaFunEntries = items.map(
  (item: any, index: number) => ({
    queueItemId: item.id,
    index,

    singer:
      item.song?.options?.singer
        ?.trim()
        .toLowerCase() || '',

    title:
      item.song?.title
        ?.trim()
        .toLowerCase() || '',
  })
);

setKarafunQueueItems(karaFunEntries);

  setKarafunSentPerformanceIds(() => {
  const next = new Set<string>();

  performances.forEach((performance) => {
    const singer =
      performance.singer_name
        ?.trim()
        .toLowerCase();

    const title =
      performance.song_title
        ?.trim()
        .toLowerCase();

    const actuallyInKaraFun =
      karaFunEntries.some(
        (entry: any) =>
          entry.singer === singer &&
          entry.title === title
      );

    if (actuallyInKaraFun) {
      next.add(performance.id);
    }
  });

  return next;
});

  setKarafunQueueSynced(true);

  return;
}

if (message.type === 'remote.StatusEvent') {
  setKarafunPlayerOnline(true);
  setKarafunConnectionError('');

  const status =
    message.payload?.status;

  const karaFunState =
    status?.state;

  const karaFunCurrentId =
    status?.current?.id || null;

  const karaFunSinger =
    status?.current?.song
      ?.options?.singer || '';

  const karaFunTitle =
    status?.current?.song
      ?.title || '';

  karaFunCurrentSingerRef.current =
  karaFunSinger.trim().toLowerCase();

karaFunCurrentTitleRef.current =
  karaFunTitle.trim().toLowerCase();

  if (
    karaFunState !== 3 ||
    !karaFunCurrentId
  ) {
    return;
  }

  const previousPlayingId =
    karaFunCurrentItemIdRef.current;

  if (!previousPlayingId) {
  karaFunCurrentItemIdRef.current =
    karaFunCurrentId;

  console.log(
    'KaraFun playing:',
    karaFunSinger,
    karaFunTitle
  );

  /*
   * We now know which KaraFun song is truly
   * CURRENT. The QueueEvent may have arrived
   * before this StatusEvent, so force one
   * fresh queue read. That lets normal sync
   * populate the StageVotes UP NEXT singer.
   */
  const socket =
    karafunSocketRef.current;

  if (
    socket &&
    socket.readyState === WebSocket.OPEN
  ) {
    karaFunQueueSyncInFlightRef.current =
      false;
  }

  return;
}

  if (
    previousPlayingId === karaFunCurrentId
  ) {
    return;
  }

  karaFunCurrentItemIdRef.current =
    karaFunCurrentId;

if (
  karaFunSuppressNextAutoAdvanceRef.current
) {
  const pendingSkipId =
    karaFunPendingSkipAdvanceRef.current;

  const pendingSkipPerformance =
    pendingSkipId
      ? performances.find(
          (performance) =>
            performance.id === pendingSkipId
        ) || null
      : null;

  const normalize = (
    value?: string | null
  ) =>
    (value || '')
      .trim()
      .toLowerCase();

  const skipTargetIsNowPlaying =
    Boolean(
      pendingSkipPerformance &&
      normalize(karaFunSinger) ===
        normalize(
          pendingSkipPerformance.singer_name
        ) &&
      normalize(karaFunTitle) ===
        normalize(
          pendingSkipPerformance.song_title
        )
    );

  if (
  pendingSkipPerformance &&
  skipTargetIsNowPlaying
) {
  const confirmedSkipPerformance =
    pendingSkipPerformance;

  console.log(
    '✅ KaraFun confirmed skipped target is now playing:',
    karaFunSinger,
    karaFunTitle
  );

    karaFunPendingSkipAdvanceRef.current =
      null;

    karaFunSkipNextSentRef.current =
      false;

    karaFunSuppressNextAutoAdvanceRef.current =
      false;

  } else {
    console.log(
      '⏳ Waiting for KaraFun to confirm skipped target...'
    );
  }

  return;
}

  if (
    karaFunLastAutoAdvancedItemIdRef.current ===
    karaFunCurrentId
  ) {
    return;
  }

  if (!karafunAutoAdvance) {
    console.log(
      'KaraFun changed songs, but Auto Advance is OFF.'
    );

    return;
  }

  if (karaFunAutoAdvancingRef.current) {
    return;
  }

  karaFunLastAutoAdvancedItemIdRef.current =
    karaFunCurrentId;

  karaFunAutoAdvancingRef.current = true;

  console.log(
    'KaraFun is now playing:',
    karaFunSinger,
    karaFunTitle
  );

const normalize = (
  value?: string | null
) =>
  (value || '')
    .trim()
    .toLowerCase();

const latestCurrent =
  currentPerformanceRef.current;

const latestQueue =
  rotatedQueueRef.current;

const expectedNext =
  latestQueue.find(
    (performance) =>
      performance.id !==
        latestCurrent?.id &&
      performance.status !==
        'completed' &&
      performance.status !==
        'skipped'
  ) || null;

if (!expectedNext) {
  console.log(
    'KaraFun changed songs, but StageVotes has no expected next singer.'
  );

  karaFunAutoAdvancingRef.current = false;
  return;
}

const karaFunMatchesExpectedNext =
  normalize(karaFunSinger) ===
    normalize(expectedNext.singer_name) &&
  normalize(karaFunTitle) ===
    normalize(expectedNext.song_title);

if (!karaFunMatchesExpectedNext) {
  console.log(
    '⚠️ KaraFun changed to an unexpected song — StageVotes will not advance:',
    {
      karaFunSinger,
      karaFunTitle,
      expectedSinger:
        expectedNext.singer_name,
      expectedTitle:
        expectedNext.song_title,
    }
  );

  karaFunAutoAdvancingRef.current = false;
  return;
}

const advanceSinger =
  nextSingerRef.current;

if (!advanceSinger) {
  karaFunAutoAdvancingRef.current = false;
  return;
}

console.log(
  '✅ KaraFun started the expected next singer — advancing StageVotes:',
  expectedNext.singer_name,
  expectedNext.song_title
);

void advanceSinger().finally(() => {
  setTimeout(() => {
    karaFunAutoAdvancingRef.current = false;
  }, 750);
});

  return;
}

      if (message.type === 'remote.AppJoinEvent') {
  setKarafunPlayerOnline(true);

  setKarafunConnectionError('');

  console.log(
    'KaraFun desktop player joined.'
  );

  return;
}

if (message.type === 'remote.AppLeftEvent') {
  setKarafunPlayerOnline(false);

  setKarafunConnectionError(
    'KaraFun is connected, but the player is not running.'
  );

  console.log(
    'KaraFun desktop player left.'
  );

  return;
}

      if (
        message.type ===
        'core.PingRequest'
      ) {
        ws.send(
          JSON.stringify({
            id: message.id,
            type: 'core.PingResponse',
            payload: {},
          })
        );
      }
    };

    ws.onerror = (error) => {
      console.error(
        'KaraFun WebSocket error:',
        error
      );

      setKarafunConnecting(false);
      setKarafunConnected(false);
      setKarafunConnectionError(
        'KaraFun connection error. Start KaraFun and try again.'
      );
    };

    ws.onclose = () => {
      karafunSocketRef.current = null;
      karaFunCurrentItemIdRef.current = null;
      karaFunAutoAdvancingRef.current = false;
      karaFunLastAutoAdvancedItemIdRef.current = null;

      setKarafunConnecting(false);
      setKarafunConnected(false);
      setKarafunPlayerOnline(false);
      setKarafunQueueSynced(false);
      setKarafunConnectionError(
        'KaraFun disconnected. Start KaraFun and reconnect.'
      );

      console.log(
        'KaraFun bridge disconnected.'
      );
    };
  } catch (error) {
    console.error(
      'Unable to connect to KaraFun:',
      error
    );

    karafunSocketRef.current = null;

    setKarafunConnecting(false);
    setKarafunConnected(false);

    setKarafunConnectionError(
      error instanceof Error
        ? error.message
        : 'Unable to connect to KaraFun.'
    );
  }
}

async function syncKaraFunQueueOrder() {
  const ws = karafunSocketRef.current;

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN ||
    !karafunConnected ||
    !karafunPlayerOnline ||
    !karafunQueueSynced ||
    karaFunQueueSyncInFlightRef.current
  ) {
    return;
  }

const normalize = (
  value?: string | null
) =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const desiredQueue = [
    ...(current ? [current] : []),
    ...rotatedQueue.filter(
      (performance) =>
        performance.id !== current?.id &&
        performance.status !==
          'completed' &&
        performance.status !==
          'skipped'
    ),
  ].filter((performance) =>
    performance.song_title?.trim()
  );

  const stageVotesCurrentSinger =
  normalize(current?.singer_name);

const stageVotesCurrentTitle =
  normalize(current?.song_title);

const karaFunIsPlayingStageVotesCurrent =
  Boolean(
    current &&
    karaFunCurrentSingerRef.current ===
      stageVotesCurrentSinger &&
    karaFunCurrentTitleRef.current ===
      stageVotesCurrentTitle
  );

const desiredNext =
  current && karaFunIsPlayingStageVotesCurrent
    ? desiredQueue[1] || null
    : desiredQueue[0] || null;
  /*
   * If the host just skipped the current
   * singer, the performance we need KaraFun
   * to place NEXT is the new StageVotes
   * current singer.
   */
  const pendingSkipId =
    karaFunPendingSkipAdvanceRef.current;

  const pendingSkipPerformance =
    pendingSkipId
      ? performances.find(
          (performance) =>
            performance.id === pendingSkipId
        ) || null
      : null;

  const desiredKaraFunNext =
    pendingSkipPerformance ||
    desiredNext;

  if (!desiredKaraFunNext) {
    return;
  }

  const desiredNextSinger =
    normalize(
      desiredKaraFunNext.singer_name
    );

  const desiredNextTitle =
    normalize(
      desiredKaraFunNext.song_title
    );

  /*
   * What KaraFun is actually playing.
   */
  const currentKaraFunItemId =
    karaFunCurrentItemIdRef.current;

  const currentKaraFunItem =
  karafunQueueItems.find(
    (item: any) =>
      (
        currentKaraFunItemId &&
        item.queueItemId ===
          currentKaraFunItemId
      ) ||
      (
        normalize(item.singer) ===
          normalize(
            karaFunCurrentSingerRef.current
          ) &&
        normalize(item.title) ===
          normalize(
            karaFunCurrentTitleRef.current
          )
      )
  ) || null;

  /*
   * Find the singer/song that StageVotes
   * wants immediately after KaraFun's
   * currently playing item.
   */
  const desiredNextKaraFunItem =
  karafunQueueItems.find(
    (item: any) =>
      normalize(item.singer) ===
        desiredNextSinger &&
      normalize(item.title) ===
        desiredNextTitle
  );

  /*
   * If the correct target already exists,
   * remove stale buffer items.
   *
   * StageVotes intentionally keeps KaraFun
   * only two songs deep.
   */
  if (
    currentKaraFunItemId &&
    desiredNextKaraFunItem?.queueItemId
  ) {
    const staleItems =
      karafunQueueItems.filter(
        (item: any) =>
          item.queueItemId !==
            currentKaraFunItemId &&
          item.queueItemId !==
            desiredNextKaraFunItem.queueItemId
      );

    if (staleItems.length > 0) {
      karaFunQueueSyncInFlightRef.current =
        true;

      staleItems.forEach(
        (item: any) => {
          console.log(
            'Removing stale KaraFun buffer item:',
            item.singer,
            item.title
          );

          ws.send(
            JSON.stringify({
              id:
                Date.now() +
                Math.floor(
                  Math.random() * 1000
                ),
              type:
                'remote.RemoveFromQueueRequest',
              payload: {
                queueItemId:
                  item.queueItemId,
              },
            })
          );
        }
      );

     setTimeout(() => {
  karaFunQueueSyncInFlightRef.current =
    false;
}, 750);

return;
    }
  }

  /*
   * Determine KaraFun's physical next item.
   */
  /*
 * KaraFun's QueueEvent contains the songs
 * WAITING to play. The currently playing
 * song is reported separately by StatusEvent.
 *
 * Therefore StageVotes' desired UP NEXT
 * singer should always be KaraFun queue[0].
 */
const currentIndex =
  currentKaraFunItem?.index ?? -1;

const karaFunNextItem =
  currentIndex >= 0
    ? karafunQueueItems[currentIndex + 1]
    : karafunQueueItems[0];

 const karaFunNextIsCorrect =
  Boolean(
    karaFunNextItem &&
      normalize(karaFunNextItem.singer) ===
        desiredNextSinger &&
      normalize(karaFunNextItem.title) ===
        desiredNextTitle
  );

  /*
   * The queue is finally correct.
   *
   * If this correction was caused by
   * Skip Current Singer, NOW tell KaraFun
   * to advance exactly once.
   */
  if (karaFunNextIsCorrect) {
    if (
      pendingSkipId &&
      pendingSkipPerformance
    ) {
      console.log(
  '✅ KaraFun skip target is ready:',
  pendingSkipPerformance.singer_name,
  pendingSkipPerformance.song_title,
);

      /*
       * Clear this BEFORE sending Next
       * so another QueueEvent cannot send
       * a duplicate NextRequest.
       */
      if (!karaFunSkipNextSentRef.current) {
  karaFunSkipNextSentRef.current = true;

  karaFunSuppressNextAutoAdvanceRef.current =
    true;

  ws.send(
    JSON.stringify({
      id: Date.now(),
      type: 'remote.NextRequest',
      payload: {},
    })
  );

  console.log(
    '⏭️ KaraFun advancing to skipped target:',
    pendingSkipPerformance.singer_name
  );
}

return;

      /*
       * KaraFun emits several StatusEvents
       * while changing songs. Ignore those
       * briefly so StageVotes does not
       * auto-advance a second time.
       */
      setTimeout(() => {
        karaFunSuppressNextAutoAdvanceRef.current =
          false;
      }, 3000);
    }

    return;
  }

  karaFunQueueSyncInFlightRef.current =
    true;

  try {
    /*
     * CASE 1:
     * The correct target already exists in
     * KaraFun, just in the wrong position.
     */
    if (
      desiredNextKaraFunItem?.queueItemId
    ) {
      const targetPosition = 1;

      console.log(
        'Moving KaraFun next singer:',
        desiredKaraFunNext.singer_name,
        desiredKaraFunNext.song_title,
        'to position',
        targetPosition
      );

      ws.send(
        JSON.stringify({
          id: Date.now(),
          type:
            'remote.MoveInQueueRequest',
          payload: {
            queueItemId:
              desiredNextKaraFunItem.queueItemId,
            to: targetPosition,
          },
        })
      );

      return;
    }

    /*
     * CASE 2:
     * The correct target is not in KaraFun.
     * Remove KaraFun's incorrect next item.
     */
    const karaFunNextIsActuallyCurrent =
  Boolean(
    karaFunNextItem &&
      normalize(karaFunNextItem.singer) ===
        normalize(
          karaFunCurrentSingerRef.current
        ) &&
      normalize(karaFunNextItem.title) ===
        normalize(
          karaFunCurrentTitleRef.current
        )
  );

if (
  karaFunNextItem?.queueItemId &&
  karaFunNextItem.queueItemId !==
    currentKaraFunItemId &&
  !karaFunNextIsActuallyCurrent
) {
      console.log(
        'Removing stale KaraFun next singer:',
        karaFunNextItem.singer,
        karaFunNextItem.title
      );

      ws.send(
        JSON.stringify({
          id: Date.now(),
          type:
            'remote.RemoveFromQueueRequest',
          payload: {
            queueItemId:
              karaFunNextItem.queueItemId,
          },
        })
      );
    }

    /*
     * Add the exact StageVotes target
     * immediately after the currently
     * playing KaraFun song.
     */
   const targetPosition =
  karaFunCurrentItemIdRef.current
    ? 1
    : 0;

    console.log(
      'Adding correct KaraFun next singer:',
      desiredKaraFunNext.singer_name,
      desiredKaraFunNext.song_title,
      'at position',
      targetPosition
    );

    await sendPerformanceToKaraFun(
      desiredKaraFunNext,
      targetPosition
    );
  } 
  
finally {
  setTimeout(() => {
    karaFunQueueSyncInFlightRef.current =
      false;
  }, 750);
}
}

  async function sendPerformanceToKaraFun(
  performance: PerformanceRow,
  position?: number
) {
  const normalizeKaraFunText = (
  value?: string | null
) =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const performanceAlreadyInKaraFun =
  karafunQueueItems.some(
    (item: any) =>
      normalizeKaraFunText(item.singer) ===
        normalizeKaraFunText(
          performance.singer_name
        ) &&
      normalizeKaraFunText(item.title) ===
        normalizeKaraFunText(
          performance.song_title
        )
  );

if (
  performanceAlreadyInKaraFun ||
  karafunSendingPerformanceIdsRef.current.has(
    performance.id
  )
) {
  return;
}

karafunSendingPerformanceIdsRef.current.add(
  performance.id
);
  const ws = karafunSocketRef.current;

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN ||
    !karafunConnected
  ) {
    alert('Connect KaraFun first.');
    return;
  }

  const singer = performance.singer_name?.trim();
  const title = performance.song_title?.trim();
  const performanceArtist =
    performance.artist?.trim() || '';

  if (!singer || !title) {
    alert('This performance is missing a singer or song.');
    return;
  }

  try {
  /*
   * If StageVotes already knows the exact
   * KaraFun catalog ID, use it directly.
   *
   * Older/manual performances fall back to
   * the existing KaraFun text search.
   */
  const savedKaraFunSongId =
    Number(
      (performance as any).karafun_song_id
    ) || null;

  let selectedSong: any = null;

  if (savedKaraFunSongId) {
    selectedSong = {
      songId: savedKaraFunSongId,
      title:
        (performance as any).karafun_title ||
        title,
      artist:
        (performance as any).karafun_artist ||
        performanceArtist,
    };

    console.log(
      '🎯 Using saved KaraFun catalog song:',
      selectedSong
    );
  } else {
    /*
     * Legacy/manual fallback:
     * search KaraFun using the StageVotes
     * title and artist.
     */
    const searchQuery = performanceArtist
      ? `${title} ${performanceArtist}`
      : title;

    const response = await fetch(
      `https://www.karafun.com/${karafunChannel}/` +
        `?type=search` +
        `&q=${encodeURIComponent(searchQuery)}` +
        `&types=karaoke`
    );

    if (!response.ok) {
      throw new Error(
        `KaraFun search failed: ${response.status}`
      );
    }

    const songs = await response.json();

    if (
      !Array.isArray(songs) ||
      songs.length === 0
    ) {
      alert(
        `KaraFun could not find "${title}".`
      );
      return;
    }

    const normalize = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[’']/g, "'");

    /*
     * Prefer exact title + artist.
     * Then exact title.
     * Finally use KaraFun's first result.
     */
    const exactMatch = songs.find(
      (song: any) =>
        normalize(song.title || '') ===
          normalize(title) &&
        (
          !performanceArtist ||
          normalize(song.artist || '') ===
            normalize(performanceArtist)
        )
    );

    const titleMatch = songs.find(
      (song: any) =>
        normalize(song.title || '') ===
        normalize(title)
    );

    selectedSong =
      exactMatch || titleMatch || songs[0];
  }

    if (!selectedSong?.songId) {
      alert(
        'KaraFun returned a song without a valid song ID.'
      );
      return;
    }

    /*
     * Send the KaraFun song while attaching the
     * StageVotes singer directly to the song.
     */
    const requestId = Date.now();

    ws.send(
      JSON.stringify({
        id: requestId,
        type: 'remote.AddToQueueRequest',
        payload: {
  song: {
    type: 1,
    id: Number(selectedSong.songId),
  },

  ...(typeof position === 'number'
    ? { position }
    : {}),

  options: {
    singer,
  },
},
      })
    );

    console.log(
      'Sent performance to KaraFun:',
      {
        singer,
        stageVotesSong: title,
        stageVotesArtist: performanceArtist,
        karaFunSong: selectedSong.title,
        karaFunArtist: selectedSong.artist,
        karaFunSongId: selectedSong.songId,
      }
    );

  } catch (error) {
    console.error(
      'Unable to send performance to KaraFun:',
      error
    );

    alert(
      'StageVotes could not send this song to KaraFun.'
    );
  }finally {
  karafunSendingPerformanceIdsRef.current.delete(
    performance.id
  );
}
}

  async function startShow() {
  const firstSinger =
  rotatedQueue.find(
    (performance) =>
      performance.status !==
        'completed' &&
      performance.status !==
        'skipped' &&
      isTournamentPerformanceReady(
        performance
      )
  );

 if (!firstSinger) {
  const isTournament =
    (event as any)?.competition_mode ===
    'tournament';

  alert(
    isTournament
      ? 'No competitors are ready yet. Check that at least one singer is checked in and has selected a song.'
      : 'No singers in the queue yet.'
  );

  return;
}

  const { error } = await supabase
    .from('events')
.update({
  current_performance_id: firstSinger.id,
  current_performance_started_at:
    new Date().toISOString(),
  is_voting_open: true,
})
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return false;
  }

  window.open(`/display/${eventId}`, '_blank');

  await loadAll();
}

async function toggleCheckinRequired(required: boolean) {
  const { error } = await supabase
    .from('events')
    .update({ checkin_required: required })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return false;
  }

  await loadEvent();
}
  
  function startEditing(p: PerformanceRow) {
  setEditingId(p.id);
  setEditSingerName(p.singer_name);
  setEditSongTitle(p.song_title);
  setEditArtist(p.artist || '');
}

function cancelEditing() {
  setEditingId(null);
  setEditSingerName('');
  setEditSongTitle('');
  setEditArtist('');
}

function useCurrentLocationForCheckin() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by this browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      const { error } = await supabase
        .from('events')
        .update({
          venue_lat: latitude,
          venue_lng: longitude,
          checkin_radius_meters: event?.checkin_radius_meters || 150
        })
        .eq('id', eventId);

      if (error) {
        alert(error.message);
        return false;
      }

      alert('Venue location saved.');
      await loadEvent();
    },
    () => {
      alert('Unable to get your location.');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}
  
async function saveEdit(performanceId: string) {
  if (!editSingerName.trim() || !editSongTitle.trim()) {
    alert('Singer name and song title are required.');
    return;
  }

  const accountId = await getMyAccountId();
if (!accountId) return;

const { error } = await supabase
  .from('performances')
  .update({
    singer_name: editSingerName.trim(),
    song_title: editSongTitle.trim(),
    artist: editArtist.trim()
  })
  .eq('id', performanceId)
  .eq('account_id', accountId);

  if (error) {
    alert(error.message);
    return false;
  }

  cancelEditing();
  await loadAll();
}
  
  async function removeSinger(performanceId: string) {
  if (!confirm('Remove this singer from the queue?')) return;

 const accountId = await getMyAccountId();
if (!accountId) return;

const { error } = await supabase
  .from('performances')
  .update({ status: 'completed' })
  .eq('id', performanceId)
  .eq('account_id', accountId);
  if (error) {
    alert(error.message);
    return false;
  }

  await loadAll();
}

async function skipSinger(
  performanceId: string
) {
  const accountId = await getMyAccountId();

  if (!accountId) return;

  const activeQueue = rotatedQueue.filter(
    (p) =>
      p.status !== 'completed' &&
      p.status !== 'skipped'
  );

  const currentIndex =
    activeQueue.findIndex(
      (p) => p.id === performanceId
    );

  if (currentIndex < 0) {
    alert('Performance not found.');
    return;
  }

  const performance =
    activeQueue[currentIndex];

  const nextSinger =
    activeQueue[currentIndex + 1];

  if (!nextSinger) {
    alert(
      'There is no singer after this one to skip behind.'
    );
    return;
  }

  const isCurrent =
    performance.id ===
    event?.current_performance_id;

  const nextRound =
    nextSinger.round || 1;

  const nextSingerOrder =
    nextSinger.manual_queue_order ??
    nextSinger.queue_order ??
    0;

  // Find the performance immediately after
  // nextSinger in the SAME round.
  const followingSinger =
    activeQueue
      .slice(currentIndex + 2)
      .find(
        (p) =>
          (p.round || 1) === nextRound
      );

  const followingOrder =
    followingSinger
      ? followingSinger.manual_queue_order ??
        followingSinger.queue_order ??
        null
      : null;

  // Put the skipped singer directly AFTER
  // nextSinger without changing permanent queue_order.
  const temporaryOrder =
    followingOrder !== null &&
    followingOrder > nextSingerOrder
      ? (nextSingerOrder +
          followingOrder) /
        2
      : nextSingerOrder + 0.5;

  const { error: moveError } =
    await supabase
      .from('performances')
      .update({
        round: nextRound,
        manual_queue_order:
          temporaryOrder,
      })
      .eq('id', performance.id)
      .eq('event_id', eventId)
      .eq('account_id', accountId);

  if (moveError) {
    console.error(
      'Unable to skip singer:',
      moveError
    );

    alert(
      `Could not skip singer: ${moveError.message}`
    );

    return;
  }

  // If we skipped the current singer,
  // immediately make the next person current.
  if (isCurrent) {
    const { error: currentError } =
      await supabase
        .from('events')
        .update({
          current_performance_id:
            nextSinger.id,
          current_performance_started_at:
            new Date().toISOString(),
          is_voting_open: false,
        })
        .eq('id', eventId)
        .eq('account_id', accountId);

    if (currentError) {
      console.error(
        'Unable to advance after skip:',
        currentError
      );

      alert(
        `Singer was moved, but the next singer could not be made current: ${currentError.message}`
      );

      return;
    }

    karaFunPendingSkipAdvanceRef.current =
  nextSinger.id;

karaFunSuppressNextAutoAdvanceRef.current =
  true;

console.log(
  '⏭️ KaraFun skip pending for:',
  nextSinger.singer_name,
  nextSinger.song_title
);
}

await loadAll();
}

async function moveSingerToNextRound(
  performanceId: string
) {
  const accountId = await getMyAccountId();

  if (!accountId) return;

  const performance = performances.find(
    (p) => p.id === performanceId
  );

  if (!performance) {
    alert('Performance not found.');
    return;
  }

  // Don't allow the currently performing song
  // to be moved into another round.
  if (
    performance.id ===
    event?.current_performance_id
  ) {
    alert(
      'The current singer cannot be moved to another round.'
    );
    return;
  }

  const currentRound =
    performance.round || 1;

  const nextRound =
    currentRound + 1;

  const { error } = await supabase
    .from('performances')
    .update({
      round: nextRound,
    })
    .eq('id', performanceId)
    .eq('event_id', eventId)
    .eq('account_id', accountId);

  if (error) {
    console.error(
      'Unable to move performance to next round:',
      error
    );

    alert(
      `Could not move singer to the next round: ${error.message}`
    );

    return;
  }

  await loadAll();
}

async function moveSinger(performanceId: string, direction: 'up' | 'down') {
  const visibleQueue = rotatedQueue.filter(
    (p) => p.status !== 'completed' && p.status !== 'skipped'
  );

  const index = visibleQueue.findIndex((p) => p.id === performanceId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || swapWith < 0 || swapWith >= visibleQueue.length) return;

  const currentItem = visibleQueue[index];
  const otherItem = visibleQueue[swapWith];

  await supabase
    .from('performances')
    .update({ queue_order: otherItem.queue_order })
    .eq('id', currentItem.id);

  await supabase
    .from('performances')
    .update({ queue_order: currentItem.queue_order })
    .eq('id', otherItem.id);

  await loadAll();
}

async function checkInSinger(
  performanceId: string
) {
  const accountId =
    await getMyAccountId();

  if (!accountId) return;

  const { error } = await supabase
    .from('performances')
    .update({
      checked_in_at:
        new Date().toISOString(),
      checked_in_by: 'host',
    })
    .eq(
      'id',
      performanceId
    )
    .eq(
      'account_id',
      accountId
    );

  if (error) {
    alert(error.message);
    return;
  }

  await loadAll();
}

async function loadTournamentJudgeCount() {
  const tournamentEventId =
    (event as any)?.tournament_event_id;

  if (!tournamentEventId) {
    setExpectedTournamentJudges(null);
    return;
  }

  const { data, error } = await supabase
    .from('tournament_events')
    .select('expected_judges')
    .eq('id', tournamentEventId)
    .maybeSingle();

  if (error) {
    console.error(
      'Unable to load tournament judge count:',
      error
    );
    return;
  }

  setExpectedTournamentJudges(
    data?.expected_judges || null
  );
}

async function nextSinger() {
  if (advancingSinger) return;

  setAdvancingSinger(true);

  try {
    const completedId = event?.current_performance_id;

    const isTournament =
  (event as any)?.competition_mode ===
  'tournament';

if (
  isTournament &&
  completedId &&
  !expectedTournamentJudges
) {
  alert(
    'This tournament does not have an expected judge count configured. Set the judge count before advancing competitors.'
  );

  return;
}

if (
  isTournament &&
  completedId &&
  expectedTournamentJudges &&
  !currentScoringComplete
) {
  // your existing incomplete-ballot warning / override logic
}

if (
  isTournament &&
  completedId &&
  expectedTournamentJudges &&
  !currentScoringComplete
) {
  const remaining =
    expectedTournamentJudges -
    currentJudgeBallotCount;

  const shouldAdvance =
    window.confirm(
      `${current?.singer_name || 'This competitor'} has only received ${currentJudgeBallotCount} of ${expectedTournamentJudges} judge ballots. ${
        remaining > 0
          ? `${remaining} ${remaining === 1 ? 'judge is' : 'judges are'} still outstanding.`
          : ''
      }\n\nAdvance anyway?`
    );

  if (!shouldAdvance) {
    return;
  }
}

    if (completedId) {
      const { error: completeError } =
        await supabase
          .from('performances')
          .update({
            status: 'completed',
          })
          .eq('id', completedId);

      if (completeError) {
        alert(completeError.message);
        return;
      }
    }

    const next =
  rotatedQueue.find(
    (performance) =>
      performance.id !==
        completedId &&
      performance.status !==
        'completed' &&
      performance.status !==
        'skipped' &&
      isTournamentPerformanceReady(
        performance
      )
  );

    if (!next) {
  const isTournament =
    (event as any)?.competition_mode ===
    'tournament';

  alert(
    isTournament
      ? 'No other competitors are ready. Check in the remaining singers and make sure they have selected songs.'
      : 'No more singers in the queue.'
  );

  return;
}

    const { error } = await supabase
      .from('events')
      .update({
        current_performance_id: next.id,
        current_performance_started_at:
          new Date().toISOString(),
        is_voting_open: true,
      })
      .eq('id', eventId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAll();
  } finally {
    setAdvancingSinger(false);
  }
}

nextSingerRef.current = nextSinger;

  async function toggleVoting(open: boolean) {
    const { error } = await supabase
      .from('events')
      .update({ is_voting_open: open })
      .eq('id', eventId);

    if (error) {
      alert(error.message);
      return false;
    }

    await loadEvent();
  }

async function toggleQrSetting(
  field: 'show_signup_qr' | 'show_voting_qr' | 'show_peoples_choice_qr' | 'show_checkin_qr',
  value: boolean
) {
  const { error } = await supabase
    .from('events')
    .update({ [field]: value })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return false;
  }

  await loadEvent();
}
  
  const current = performances.find((p) => p.id === event?.current_performance_id);

 const rotatedQueue = useMemo(
  () =>
    buildRotationQueue(
      performances,
      event?.current_performance_id
    ),
  [
    performances,
    event?.current_performance_id,
  ]
);

useEffect(() => {
  currentPerformanceRef.current =
    current || null;

  rotatedQueueRef.current =
    rotatedQueue;
}, [current, rotatedQueue]);

// useEffect(() => {
//   if (
//     !karafunConnected ||
//     !karafunPlayerOnline ||
//     !karafunQueueSynced
//   ) {
//     return;
//   }

//   const topTwo = rotatedQueue
//     .filter(
//       (performance) =>
//         performance.song_title?.trim()
//     )
//     .slice(0, 2);

//   topTwo.forEach((performance) => {
//     if (
//       karafunSentPerformanceIds.has(
//         performance.id
//       )
//     ) {
//       return;
//     }

//     if (
//       karafunSendingPerformanceIdsRef.current.has(
//         performance.id
//       )
//     ) {
//       return;
//     }

//     void sendPerformanceToKaraFun(
//       performance
//     );
//   });
// }, [
//   rotatedQueue,
//   karafunConnected,
//   karafunPlayerOnline,
//   karafunSentPerformanceIds,
//   karafunQueueSynced,
// ]);

useEffect(() => {
  if (
    !karafunConnected ||
    !karafunPlayerOnline ||
    !karafunQueueSynced
  ) {
    return;
  }

  syncKaraFunQueueOrder();
}, [
  rotatedQueue,
  current,
  karafunQueueItems,
  karafunConnected,
  karafunPlayerOnline,
  karafunQueueSynced,
]);

const completedPerformanceCount = performances.filter(
  (performance) => performance.status === 'completed'
).length;

const isBrandNewEmptyShow =
  rotatedQueue.length === 0 &&
  completedPerformanceCount === 0;

const isFinishedEmptyShow =
  rotatedQueue.length === 0 &&
  completedPerformanceCount > 0;

const hostQueueItems: SVHostQueueItem[] =
  rotatedQueue.map((performance, index) => {
    const isCurrent =
      performance.id ===
      event?.current_performance_id;

    const firstWaitingIndex =
  rotatedQueue.findIndex(
    (item) =>
      item.id !==
        event?.current_performance_id &&
      item.status !== 'completed' &&
      item.status !== 'skipped' &&
      isTournamentPerformanceReady(item)
  );

    const isNext =
      !isCurrent &&
      index === firstWaitingIndex;

    const needsSong =
      !performance.song_title?.trim();

    const isTournament =
  (event as any)?.competition_mode ===
  'tournament';

    const checkedInAt =
      (performance as any)
        .checked_in_at || null;

    const tournamentReadiness =
      !isTournament
        ? null
        : checkedInAt &&
          !needsSong
        ? 'ready'
        : checkedInAt
        ? 'song_needed'
        : 'not_checked_in';

    return {
      id: performance.id,
      singerName:
        performance.singer_name,

      songTitle: needsSong
        ? 'Song Needed'
        : performance.song_title,

      artist: needsSong
        ? undefined
        : performance.artist ||
          undefined,

      photoUrl:
        performance.singer_profiles
          ?.photo_url || null,

      round: 1,

      status: isCurrent
        ? 'current'
        : isNext
        ? 'next'
        : 'waiting',

      tournamentReadiness,

      performance,
    };
  });

const fairQueue = useMemo(() => {
  const sorted = [...performances].sort((a, b) => a.queue_order - b.queue_order);
  const singerCounts = new Map<string, number>();
  const firstSeen = new Map<string, number>();

  return sorted
    .map((p) => {
      const singer = p.singer_name.trim().toLowerCase();

      if (!firstSeen.has(singer)) {
        firstSeen.set(singer, p.queue_order);
      }

      const round = (singerCounts.get(singer) || 0) + 1;
      singerCounts.set(singer, round);

      return {
        ...p,
        round,
        firstOrder: firstSeen.get(singer) || p.queue_order
      };
    })
    .sort((a, b) => a.round - b.round || a.firstOrder - b.firstOrder);
}, [performances]);
 const upNext = rotatedQueue.find(
  p =>
    p.id !== event?.current_performance_id &&
    p.status !== 'completed'
);
  const leaderboard = useMemo(() => {
  const singerScores = new Map<
    string,
    {
      singer_name: string;
      totalScore: number;
      totalVotes: number;
      performances: number;
      tiebreakerScore: number;
    }
  >();

  performances.forEach((p) => {
    const pv = votes.filter((v) => v.performance_id === p.id);

    if (pv.length === 0) return;

    const performanceAverage =
      pv.reduce((sum, v) => sum + v.score, 0) / pv.length;

    const key = p.singer_name.trim().toLowerCase();

    if (!singerScores.has(key)) {
      singerScores.set(key, {
  singer_name: p.singer_name,
  totalScore: 0,
  totalVotes: 0,
  performances: 0,
  tiebreakerScore: 0
      });
    }

    const singer = singerScores.get(key)!;

    singer.totalScore += performanceAverage;

   const tiebreakerCategory = categories.find(
  (c) =>
    c.category_name.trim().toLowerCase() ===
    (event as any)?.tiebreaker_category_name?.trim().toLowerCase()
);

const tiebreakerVotes = pv.filter(
  (v) => (v as any).category_id === tiebreakerCategory?.id
);
    
if (tiebreakerVotes.length > 0) {
  const tiebreakerAverage =
    tiebreakerVotes.reduce((sum, v) => sum + v.score, 0) / tiebreakerVotes.length;

  singer.tiebreakerScore += tiebreakerAverage;
}

    singer.totalVotes += pv.length;
    singer.performances += 1;
  });

  return Array.from(singerScores.values())
    .map((s) => ({
      ...s,
      averageScore: s.totalScore / s.performances
    }))
  .sort((a, b) => {
  const scoreDiff = b.averageScore - a.averageScore;

  if (Math.abs(scoreDiff) > 0.001) {
    return scoreDiff;
  }

  return (b.tiebreakerScore / b.performances || 0) - (a.tiebreakerScore / a.performances || 0);
})
}, [performances, votes, categories, event]);
 
  const singers = Array.from(
  new Set(
    rotatedQueue
      .filter((p) => p.status !== 'completed')
      .map((p) => p.singer_name)
  )
);
  
  const activeQueue = performances
  .filter((p) => p.status !== 'completed' && p.status !== 'skipped')
  .sort((a: any, b: any) => {
    const roundDiff = (a.round || 1) - (b.round || 1);
    if (roundDiff !== 0) return roundDiff;

    return a.queue_order - b.queue_order;
  });
  
const judgeBallotCount = new Set(
  votes.map((v: any) => `${v.performance_id}-${v.device_id}`)
).size;

const currentJudgeBallotCount =
  current
    ? new Set(
        votes
          .filter(
            (vote: any) =>
              vote.performance_id ===
              current.id
          )
          .map(
            (vote: any) =>
              vote.device_id
          )
      ).size
    : 0;

const currentScoringComplete =
  Boolean(
    expectedTournamentJudges &&
    currentJudgeBallotCount >=
      expectedTournamentJudges
  );
  
const currentPerformanceVotes =
  current
    ? votes.filter(
        (vote: any) =>
          vote.performance_id ===
          current.id
      )
    : [];

const currentAverageScore =
  currentPerformanceVotes.length > 0
    ? currentPerformanceVotes.reduce(
        (sum, vote: any) =>
          sum + Number(vote.score || 0),
        0
      ) /
      currentPerformanceVotes.length
    : null;

const singerGroups = activeQueue.reduce((groups, p) => {
  const singer = p.singer_name.trim();

  if (!groups[singer]) {
    groups[singer] = [];
  }

  groups[singer].push(p);

  return groups;
}, {} as Record<string, typeof activeQueue>);

async function handleQueueReorder(
  draggedId: string,
  targetId: string
) {
  const currentId =
    event?.current_performance_id;

  const movableQueue = rotatedQueue.filter(
    (performance) =>
      performance.id !== currentId
  );

  const oldIndex = movableQueue.findIndex(
    (performance) =>
      performance.id === draggedId
  );

  const newIndex = movableQueue.findIndex(
    (performance) =>
      performance.id === targetId
  );

  if (
    oldIndex === -1 ||
    newIndex === -1 ||
    oldIndex === newIndex
  ) {
    return;
  }

  const reordered = [...movableQueue];

  const [movedPerformance] =
    reordered.splice(oldIndex, 1);

  reordered.splice(
    newIndex,
    0,
    movedPerformance
  );

  const updates = reordered.map(
    (performance, index) => ({
      id: performance.id,
      queue_order: index + 1,
    })
  );

  setPerformances((current) =>
    current.map((performance) => {
      const update = updates.find(
        (item) =>
          item.id === performance.id
      );

      return update
        ? {
            ...performance,
            queue_order:
              update.queue_order,
          }
        : performance;
    })
  );

  const results = await Promise.all(
    updates.map((update) =>
      supabase
        .from('performances')
        .update({
          queue_order:
            update.queue_order,
        })
        .eq('id', update.id)
    )
  );

  const failedUpdate = results.find(
    (result) => result.error
  );

  if (failedUpdate?.error) {
    console.error(
      'Queue reorder failed:',
      failedUpdate.error
    );

    await loadAll();
  }
}

const hostIQ = ENABLE_HOST_IQ
  ? [
      {
        id: 'duplicates',
        title: 'Duplicate song detected',
        message:
          '"Tennessee Whiskey" appears twice tonight.',
        severity: 'warning' as const,
      },
    ]
  : [];

if (
account?.subscription_status &&
!isSubscribed
) {


  return (
  <div
    style={{
      minHeight: '100vh',
      background: '#020c2b',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      padding: 24
    }}
  >
    
      <h1>Subscription Required</h1>

      <p style={{ maxWidth: 500 }}>
        Your StageVotes subscription is inactive.
        Please update your billing information to continue.
      </p>

      <button
        onClick={() => router.push('/account')}
        style={{
          marginTop: 20,
          background: '#38bdf8',
          color: '#0f172a',
          border: 'none',
          borderRadius: 999,
          padding: '12px 24px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Account
      </button>
    </div>
  );
}
  
  return (
<SVShell
  title={event?.name || 'Host Dashboard'}
  subtitle={event?.venue || 'Live show control center'}
>
      
<SVHostHero
  singerName={
    current?.singer_name || 'No current singer'
  }
  songTitle={
    current?.song_title || 'Waiting to begin'
  }
  artist={current?.artist || ''}
  votingOpen={!!event?.is_voting_open}
  showName={
    event?.name || 'Tonight’s Karaoke'
  }
  photoUrl={
  current?.singer_profiles?.photo_url || null
}
  startedAt={
    event?.current_performance_started_at ||
    null
  }
/>

{(event as any)?.competition_mode ===
  'tournament' &&
  current &&
  expectedTournamentJudges && (
    <div className="sv-card sv-tournament-scoring-status">
      <div>
        <div className="sv-mobile-kicker">
          Competition Scoring
        </div>

        <strong>
          {current.singer_name}
        </strong>

        <div
          style={{
            marginTop: 4,
            color: '#94a3b8',
            fontSize: 13,
          }}
        >
          Judge ballots received
        </div>
      </div>

      <div
        style={{
          textAlign: 'right',
        }}
      >
        <div
  style={{
    fontSize: 26,
    fontWeight: 900,
  }}
>
  {currentJudgeBallotCount}
  {' / '}
  {expectedTournamentJudges}
</div>

<div
  style={{
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 13,
  }}
>
  Judges submitted
</div>

{currentAverageScore !== null && (
  <div
    style={{
      marginTop: 10,
      fontSize: 16,
      fontWeight: 800,
    }}
  >
    {currentScoringComplete
      ? 'Final Score'
      : 'Current Average'}
    {': '}
    {currentAverageScore.toFixed(2)} / 5
  </div>
)}

<div
  style={{
    marginTop: 6,
    fontWeight: 800,
  }}
>
  {currentScoringComplete
    ? '✓ Scoring Complete'
    : `Waiting for ${
        expectedTournamentJudges -
        currentJudgeBallotCount
      } ${
        expectedTournamentJudges -
          currentJudgeBallotCount ===
        1
          ? 'judge'
          : 'judges'
      }`}
</div>
      </div>
    </div>
)}

{showFirstWelcome && (
  <SVFirstShowWelcome
    onDismiss={dismissFirstWelcome}

    onOpenDisplay={() => {
      setWelcomeDisplayOpened(true);

      window.open(
        `/display/${eventId}`,
        '_blank'
      );
    }}

    onShareSignupQr={() => {
      setWelcomeAudienceOpened(true);

      window.open(
        `/audience/${eventId}`,
        '_blank'
      );
    }}

    onAddSinger={() =>
      setShowSingerSignup(true)
    }

    displayComplete={welcomeDisplayOpened}
    audienceComplete={welcomeAudienceOpened}
    singerComplete={welcomeSingerAdded}
  />
)}

<SVMissionControl
  onStartShow={startShow}
  onEndShow={endShow}
  onAddSinger={() =>
    setShowSingerSignup(true)
  }
  onNextSinger={nextSinger}
  onToggleVoting={() =>
    toggleVoting(!event?.is_voting_open)
  }
  onOpenDisplay={() =>
    window.open(
      `/display/${eventId}`,
      '_blank'
    )
  }
onOpenKaraFunDisplay={() =>
  window.open(
    `/karafun-display/${eventId}`,
    '_blank'
  )
}

  onAwards={() =>
    window.open(
      `/awards/${eventId}`,
      '_blank'
    )
  }
  onConnectKaraFun={connectKaraFun}
  karafunConnected={karafunConnected}
  karafunConnecting={karafunConnecting}
karafunConnectionError={karafunConnectionError}
karafunPlayerOnline={karafunPlayerOnline}
  showStarted={!!current}
  votingOpen={!!event?.is_voting_open}
  hasCurrentSinger={!!current}
  advancingSinger={advancingSinger}
  currentSingerName={current?.singer_name}
  nextSingerName={upNext?.singer_name}
/>

{ENABLE_HOST_IQ && (
  <SVHostIQ items={hostIQ} />
)}

{isBrandNewEmptyShow ? (
  <SVEmptyQueueState
    onAudienceAccess={() =>
      window.open(
        `/audience/${eventId}`,
        '_blank'
      )
    }
    onAddSinger={() =>
      setShowSingerSignup(true)
    }
  />
) : isFinishedEmptyShow ? (
  <SVFinishedQueueState
    onAddSinger={() =>
      setShowSingerSignup(true)
    }
    onOpenAwards={() =>
      window.open(
        `/awards/${eventId}`,
        '_blank'
      )
    }
    onEndShow={endShow}
  />
) : (
  <SVHostQueue
    items={hostQueueItems}
    completedCount={completedPerformanceCount}
    singerView={singerView}
    editingId={editingId}
    editSingerName={editSingerName}
    editSongTitle={editSongTitle}
    editArtist={editArtist}
    onToggleSingerView={() =>
      setSingerView((current) => !current)
    }
    onEditSingerName={setEditSingerName}
    onEditSongTitle={setEditSongTitle}
    onEditArtist={setEditArtist}
    onStartEdit={(item) =>
      startEditing(item.performance)
    }
    onSaveEdit={saveEdit}
    onCancelEdit={cancelEditing}
    onChooseEditSong={() => {
    setPickerSongs([]);
    setShowEditSongPicker(true);
    }}
    onSkip={skipSinger}
    onMoveToNextRound={
    moveSingerToNextRound
    }
    onRemove={removeSinger}
    onCheckIn={checkInSinger}
    onReorder={handleQueueReorder}
    onSendToKaraFun={(item) =>
    sendPerformanceToKaraFun(item.performance)
    }
    karafunSentPerformanceIds={
    karafunSentPerformanceIds
    }
    karafunConnected={
    karafunConnected && karafunPlayerOnline
    }
/>
)}


{showEditSongPicker && (
  <div
    role="dialog"
    aria-modal="true"
    onClick={() =>
      setShowEditSongPicker(false)
    }
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1200,
      display: 'grid',
      placeItems: 'center',
      padding: 20,
      background:
        'rgba(2, 6, 23, 0.78)',
      backdropFilter: 'blur(8px)',
    }}
  >
    <section
      className="sv-card"
      onClick={(event) =>
        event.stopPropagation()
      }
      style={{
        width: 'min(100%, 700px)',
        maxHeight:
          'calc(100vh - 40px)',
        overflowY: 'auto',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <div className="sv-mobile-kicker">
            Competition Song
          </div>

          <h2
            style={{
              margin: '4px 0 0',
            }}
          >
            Choose Song
          </h2>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowEditSongPicker(false)
          }
        >
          ×
        </button>
      </div>

      <SVSongPicker
        songs={pickerSongs}
        loading={pickerLoading}
        onSearch={searchPickerSongs}
        onSelect={(selected) => {
          setEditSongTitle(
            selected.title
          );

          setEditArtist(
            selected.artist || ''
          );

          setPickerSongs([]);
          setShowEditSongPicker(false);
        }}
      />
    </section>
  </div>
)}

<h2 style={{ color: '#38bdf8', marginTop: 24 }}>
  📊 Show Summary
</h2>
      
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 16,
    marginBottom: 24
  }}
>
  <div className="card">
    <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🎤 Singers</h3>
    <div style={{ fontSize: 28, fontWeight: 900 }}>
      {new Set(performances.map((p) => p.singer_name.trim().toLowerCase())).size}
    </div>
  </div>

  <div className="card">
    <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🎵 Songs</h3>
    <div style={{ fontSize: 28, fontWeight: 900 }}>
      {performances.length}
    </div>
  </div>

  <div className="card">
   <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🧑‍⚖️ Judge Ballots</h3>
<div style={{ fontSize: 28, fontWeight: 900 }}>
  {judgeBallotCount}
</div>
  </div>

  <div className="card">
    <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🏆 Leader</h3>
    <div style={{ fontSize: 28, fontWeight: 900, color: '#c2410c' }}>
      {leaderboard[0]?.singer_name || 'No votes yet'}
    </div>
  </div>
</div>
  
{showSingerSignup && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="add-singer-title"
    onClick={() => setShowSingerSignup(false)}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'grid',
      placeItems: 'center',
      padding: 20,
      background: 'rgba(2, 6, 23, 0.78)',
      backdropFilter: 'blur(8px)',
    }}
  >
    <section
      className="sv-card"
      onClick={(event) =>
        event.stopPropagation()
      }
      style={{
        width: 'min(100%, 760px)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        padding: 24,
        border:
          '1px solid rgba(56,189,248,0.24)',
        boxShadow:
          '0 28px 80px rgba(0,0,0,0.55)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Manual Signup
          </div>

          <h2
            id="add-singer-title"
            style={{
              margin: 0,
              fontSize: 26,
            }}
          >
            Add Singer
          </h2>

          <p
            style={{
              margin: '7px 0 0',
              opacity: 0.65,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Add a walk-up singer directly to the
            live queue.
          </p>
        </div>

        <button
          type="button"
          aria-label="Close signup"
          onClick={() =>
            setShowSingerSignup(false)
          }
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            background:
              'rgba(255,255,255,0.06)',
            border:
              '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontSize: 20,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 18,
        }}
      >
        <div>
          <label
            htmlFor="host-singer-name"
            style={{
              display: 'block',
              marginBottom: 7,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Singer name
          </label>

         <div style={{ position: 'relative' }}>
  <input
    id="host-singer-name"
    value={singerName}
    onChange={(event) => {
      setSingerName(event.target.value);
      setShowSingerSuggestions(true);
    }}
    onFocus={() =>
      setShowSingerSuggestions(true)
    }
    placeholder="Search or enter singer name"
    autoComplete="off"
    autoFocus
  />

  {showSingerSuggestions &&
    singerName.trim() && (
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 50,
          maxHeight: 220,
          overflowY: 'auto',
          background: '#071126',
          border:
            '1px solid rgba(148,163,184,0.25)',
          borderRadius: 12,
          boxShadow:
            '0 16px 40px rgba(0,0,0,0.4)',
        }}
      >
        {rememberedSingerNames
          .filter((name) =>
            name
              .toLowerCase()
              .includes(
                singerName
                  .trim()
                  .toLowerCase()
              )
          )
          .slice(0, 8)
          .map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSingerName(name);
                setShowSingerSuggestions(
                  false
                );
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '11px 13px',
                textAlign: 'left',
                background: 'transparent',
                border: 0,
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
      </div>
    )}
</div>
  <label
    style={{
      display: 'block',
      marginBottom: 8,
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    Find a song
  </label>

  <SVSongPicker
    songs={pickerSongs}
    onSearch={searchPickerSongs}
    loading={pickerLoading}
    onSelect={(selected) => {
  setSongTitle(selected.title);
  setArtist(selected.artist);

  setSelectedKaraFunSongId(
    selected.karafunSongId ?? null
  );

  setSelectedKaraFunTitle(
    selected.karafunSongId
      ? selected.title
      : ''
  );

  setSelectedKaraFunArtist(
    selected.karafunSongId
      ? selected.artist
      : ''
  );

  setPickerSongs([]);
  setShowManualSongFields(false);
}}
    onSurpriseMe={async () => {
      setPickerLoading(true);

      const { data, error } =
        await supabase
          .from('songs')
          .select('id, title, artist')
          .limit(100);

      if (error || !data?.length) {
        console.error(
          'Surprise song search failed:',
          error
        );

        alert(
          'We could not find a surprise song. Try again.'
        );

        setPickerLoading(false);
        return;
      }

      const availableSongs =
        data.filter((result) => {
          return !performances.some(
            (performance) =>
              performance.song_title
                .trim()
                .toLowerCase() ===
                result.title
                  .trim()
                  .toLowerCase() &&
              performance.status !==
                'completed'
          );
        });

      if (availableSongs.length === 0) {
        alert(
          'No available surprise songs were found.'
        );

        setPickerLoading(false);
        return;
      }

      const randomSong =
        availableSongs[
          Math.floor(
            Math.random() *
              availableSongs.length
          )
        ];

      setSongTitle(randomSong.title);
      setArtist(randomSong.artist || '');
      setPickerLoading(false);
      setShowManualSongFields(false);
    }}
  />

  {songTitle && (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        background:
          'rgba(56,189,248,0.08)',
        border:
          '1px solid rgba(56,189,248,0.2)',
      }}
    >
      <div
        style={{
          color: '#38bdf8',
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 5,
        }}
      >
        Selected song
      </div>

      <strong>{songTitle}</strong>

      {artist && (
        <div
          style={{
            marginTop: 4,
            opacity: 0.65,
            fontSize: 13,
          }}
        >
          {artist}
        </div>
      )}
    </div>
  )}

  <button
    type="button"
    className="secondary"
    onClick={() =>
      setShowManualSongFields(
        (current) => !current
      )
    }
    style={{
      marginTop: 12,
      width: '100%',
    }}
  >
    {showManualSongFields
      ? 'Hide Manual Entry'
      : 'Can’t Find It? Enter Manually'}
  </button>

  {showManualSongFields && (
    <div
      style={{
        display: 'grid',
        gap: 14,
        marginTop: 14,
      }}
    >
      <div>
        <label
          htmlFor="host-song-title"
          style={{
            display: 'block',
            marginBottom: 7,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Song title
        </label>

        <input
          id="host-song-title"
          value={songTitle}
          onChange={(event) =>
            setSongTitle(
              event.target.value
            )
          }
          placeholder="Enter song title"
        />
      </div>

      <div>
        <label
          htmlFor="host-song-artist"
          style={{
            display: 'block',
            marginBottom: 7,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Artist
        </label>

        <input
          id="host-song-artist"
          value={artist}
          onChange={(event) =>
            setArtist(
              event.target.value
            )
          }
          placeholder="Enter artist"
        />
      </div>
    </div>
  )}
</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 24,
          paddingTop: 20,
          borderTop:
            '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          type="button"
          className="secondary"
          onClick={() =>
            setShowSingerSignup(false)
          }
        >
          Cancel
        </button>

<button
  type="button"
  onClick={async () => {
    const added = await addPerformance();

if (added) {
  setWelcomeSingerAdded(true);
  setShowSingerSignup(false);
}
  }}
  style={{
    background: '#f97316',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
  }}
>
  Add to Queue
</button>

      </div>
    </section>
  </div>
)}

</SVShell>
  );
    }
