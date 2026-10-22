type SignupEvent = {
  id: string;
  created_at?: string | null;
  is_archived?: boolean | null;
  is_show_ended?: boolean | null;
};

// Tournament and regular shows use the same singer signup page.
// Prefer a venue's selected active show; otherwise use the latest active show.
// Never update venue pointers from an unauthenticated QR-code redirect.
export function chooseSignupEvent<T extends SignupEvent>(events: T[], pointerIds: (string | null)[]): T | null {
  const active = events.filter(event => event.is_archived !== true && event.is_show_ended !== true)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return active.find(event => pointerIds.includes(event.id)) || active[0] || null;
}
