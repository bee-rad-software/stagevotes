import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export type EventRow = {
  id: string;
  name: string;
  venue: string | null;
  host_pin: string;
  is_voting_open: boolean;
  is_show_ended: boolean;
  current_performance_id: string | null;
  created_at: string;
  venue_lat: number | null;
venue_lng: number | null;
checkin_radius_meters: number | null;
checkin_required: boolean | null;
  show_signup_qr?: boolean;
show_voting_qr?: boolean;
show_peoples_choice_qr?: boolean;
  show_checkin_qr?: boolean;
};

export type PerformanceRow = {
  id: string;
  account_id: string;
  event_id: string;
  singer_name: string;
  song_title: string;
  artist: string | null;
  queue_order: number;
  status: string;
  created_at: string;
};

export type VoteRow = {
  id: string;
  event_id: string;
  performance_id: string;
  voter_key: string;
  score: number;
  created_at: string;
};
