import type {SupabaseClient} from '@supabase/supabase-js';

export const venueSettingsDefaults = {
  singa_enabled: false,
  karafun_channel: '',
  tips_enabled: false,
  venmo_url: '',
  cashapp_url: '',
  apple_pay_url: '',
  static_signup_qr: true,
  static_judge_qr: true,
  static_people_qr: true,
  max_songs_per_singer: 3,
};
export type VenueSettings = typeof venueSettingsDefaults;
export const venueSettingsKeys = Object.keys(venueSettingsDefaults) as (keyof VenueSettings)[];

export function parseVenueSettings(input: unknown): VenueSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid venue settings.');
  const value = input as Record<string, unknown>;
  const result = {...venueSettingsDefaults};
  for (const key of venueSettingsKeys) {
    const item = value[key];
    if (item === undefined) continue;
    if (typeof venueSettingsDefaults[key] === 'boolean') {
      if (typeof item !== 'boolean') throw Error('Invalid toggle setting.');
    } else if (key === 'max_songs_per_singer') {
      if (typeof item !== 'number' || !Number.isInteger(item) || item < 1 || item > 20) throw Error('Choose a song limit from 1 to 20.');
    } else {
      if (typeof item !== 'string' || item.length > 500) throw Error('Invalid link.');
      if (key === 'karafun_channel') {
        const channel = item.trim().match(/^(?:https?:\/\/(?:www\.)?karafun\.com\/)?(\d+)\/?(?:\?.*)?$/i);
        if (item.trim() && !channel) throw Error('Enter a KaraFun channel number or remote link.');
        result.karafun_channel = channel?.[1] || '';
        continue;
      }
      if (item.trim()) {
        let url: URL;
        try {url = new URL(item.trim());} catch {throw Error('Use a full payment link starting with https://.');}
        if (url.protocol !== 'https:') throw Error('Payment links must start with https://.');
      }
    }
    (result as Record<string, unknown>)[key] = typeof item === 'string' ? item.trim() : item;
  }
  return result;
}

/** Account settings are only a compatibility fallback for unlinked shows / pre-migration venues. */
export async function settingsForVenue<T extends Record<string, any>>(
  client: SupabaseClient<any>, account: T | null, venueId?: string | null, accountId?: string | null
): Promise<T & Partial<VenueSettings>> {
  const base = account || {} as T;
  if (!venueId || !accountId) return base;
  const {data, error} = await client.from('venues').select('settings,logo_url').eq('id', venueId).eq('account_id', accountId).maybeSingle();
  if (error || !data) return base;
  if (!data.settings) return {...base, ...(data.logo_url ? {logo_url: data.logo_url} : {})};
  // Stored snapshots may contain older payment links; validation belongs at the write boundary.
  const settings = {...venueSettingsDefaults};
  for (const key of venueSettingsKeys) {
    if (typeof data.settings[key] === typeof venueSettingsDefaults[key]) (settings as Record<string, unknown>)[key] = data.settings[key];
  }
  return {...base, ...settings, logo_url: data.logo_url || base.logo_url || ''};
}
