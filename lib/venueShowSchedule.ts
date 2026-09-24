export type RecurrenceType = 'weekly' | 'biweekly' | 'one_time';

export type VenueShowRule = {
  day_of_week: number;
  start_time: string;
  recurrence_type?: RecurrenceType | null;
  start_date?: string | null;
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function localDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

function localDate(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function scheduleLabel(show: VenueShowRule) {
  if (show.recurrence_type === 'one_time') return 'One night only';
  return `${show.recurrence_type === 'biweekly' ? 'Every other ' : 'Every '}` +
    (dayNames[show.day_of_week] || 'week');
}

export function upcomingShowDates(show: VenueShowRule, now = new Date(), daysAhead = show.recurrence_type === 'one_time' ? 365 : 35) {
  if (!show.start_time) return [];
  const [hour, minute] = show.start_time.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return [];

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(today);
  last.setDate(last.getDate() + daysAhead);
  const recurrence = show.recurrence_type || 'weekly';
  const anchor = show.start_date ? localDate(show.start_date) : null;
  if (recurrence !== 'weekly' && (!anchor || Number.isNaN(anchor.getTime()))) return [];

  const dates: string[] = [];
  for (const date = new Date(today); date <= last; date.setDate(date.getDate() + 1)) {
    const starts = new Date(date);
    starts.setHours(hour, minute, 0, 0);
    if (starts < now) continue;

    if (recurrence === 'one_time') {
      if (show.start_date === localDateKey(date)) dates.push(localDateKey(date));
      continue;
    }

    if (date.getDay() !== show.day_of_week) continue;
    if (recurrence === 'biweekly') {
      const daysSinceAnchor = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(anchor!.getFullYear(), anchor!.getMonth(), anchor!.getDate())) / 86400000);
      if (daysSinceAnchor < 0 || daysSinceAnchor % 14 !== 0) continue;
    }
    dates.push(localDateKey(date));
  }
  return dates;
}
