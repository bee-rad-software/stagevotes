'use client'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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

const [pickerLoading, setPickerLoading] =
  useState(false);

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
loadCheckins()
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
  
  async function endShow() {
  if (!confirm('End the show and show awards?')) return;

  const accountId = await getMyAccountId();
  if (!accountId) return;

  const { error } = await supabase
    .from('events')
    .update({
      is_voting_open: false,
      is_show_ended: true
    })
    .eq('id', eventId)
    .eq('account_id', accountId);

  if (error) {
    alert(error.message);
    return false;
  }

  await loadAll();
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

    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist')
      .or(
        `title.ilike.%${term}%,artist.ilike.%${term}%`
      )
      .limit(20);

    if (error) {
      console.error(
        'Host song search failed:',
        error
      );

      setPickerSongs([]);
      setPickerLoading(false);
      return;
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
    setPickerLoading(false);
  },
  [performances]
);

  async function addPerformance(): Promise<boolean> {
  if (!singerName.trim() || !songTitle.trim()) {
    alert('Singer name and song title are required.');
    return false;
  }
const currentRound = getCurrentActiveRound();

const singerKey = singerName.trim().toLowerCase();

const singerExistingSongs = performances.filter(
  (p: any) =>
    p.singer_name.trim().toLowerCase() === singerKey
);
    
const singerNextRound = singerExistingSongs.length + 1;

const assignedRound = Math.max(currentRound, singerNextRound);

const singerOriginalOrder =
  singerExistingSongs.length > 0
    ? Math.min(...singerExistingSongs.map((p: any) => p.queue_order || 0))
    : null;

const maxOrderInAssignedRound =
  performances
    .filter(
      (p: any) =>
        (p.round || 1) === assignedRound &&
        p.status !== 'completed' &&
        p.status !== 'skipped'
    )
    .reduce((max, p: any) => Math.max(max, p.queue_order || 0), 0);

const nextOrder =
  singerOriginalOrder !== null
    ? singerOriginalOrder
    : maxOrderInAssignedRound + 1;

const accountId = await getMyAccountId();
if (!accountId) return false;

const { error } = await supabase.from('performances').insert({
  event_id: eventId,
  account_id: accountId,
  singer_name: singerName.trim(),
  song_title: songTitle.trim(),
  artist: artist.trim(),
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
  
  async function startShow() {
  const firstSinger = rotatedQueue.find((p) => p.status !== 'completed');

  if (!firstSinger) {
    alert('No singers in the queue yet.');
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

async function skipSinger(performanceId: string) {
 const accountId = await getMyAccountId();
if (!accountId) return;

const { error } = await supabase
  .from('performances')
  .update({ status: 'skipped' })
  .eq('id', performanceId)
  .eq('account_id', accountId);

  if (error) {
    alert(error.message);
    return false;
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
  async function nextSinger() {
  const completedId = event?.current_performance_id;

  if (completedId) {
    await supabase
      .from('performances')
      .update({ status: 'completed' })
      .eq('id', completedId);
  }

  const next = rotatedQueue.find((p) => p.id !== completedId && p.status !== 'completed');

  if (!next) {
    alert('No more singers in the queue.');
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
    return false;
  }

  await loadAll();
}
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

  const rotatedQueue = useMemo(() => {
  return performances
    .filter((p) => p.status !== 'completed' && p.status !== 'skipped')
    .slice()
    .sort((a: any, b: any) => {
      const roundDiff = (a.round || 1) - (b.round || 1);
      if (roundDiff !== 0) return roundDiff;

      return (a.queue_order || 0) - (b.queue_order || 0);
    });
}, [performances]);

const hostQueueItems: SVHostQueueItem[] =
  rotatedQueue.map((performance, index) => {
    const isCurrent =
      performance.id ===
      event?.current_performance_id;

    const firstWaitingIndex =
      rotatedQueue.findIndex(
        (item) =>
          item.id !==
          event?.current_performance_id
      );

    const isNext =
      !isCurrent &&
      index === firstWaitingIndex;

return {
  id: performance.id,
  singerName: performance.singer_name,
  songTitle: performance.song_title,
  artist: performance.artist || undefined,
  photoUrl: performance.singer_profiles?.photo_url || null,
  round: 1,
  status: isCurrent
    ? 'current'
    : isNext
    ? 'next'
    : 'waiting',
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
  startedAt={
    event?.current_performance_started_at ||
    null
  }
/>

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
  onAwards={() =>
    window.open(
      `/awards/${eventId}`,
      '_blank'
    )
  }
  showStarted={!!current}
  votingOpen={!!event?.is_voting_open}
  hasCurrentSinger={!!current}
  currentSingerName={current?.singer_name}
  nextSingerName={upNext?.singer_name}
/>


<SVHostQueue
  items={hostQueueItems}
  completedCount={
    performances.filter(
      (performance) =>
        performance.status === 'completed'
    ).length
  }
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
  onSkip={skipSinger}
  onRemove={removeSinger}
  onReorder={handleQueueReorder}
/>

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

          <input
            id="host-singer-name"
            value={singerName}
            onChange={(event) =>
              setSingerName(event.target.value)
            }
            placeholder="Enter singer name"
            autoFocus
          />
        </div>

    <div>
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
