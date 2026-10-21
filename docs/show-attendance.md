# Going / Interested

Run `supabase/migrations/20261021230000_show_attendance.sql`, then use My Schedule. No changes to existing saved personal plans or auth metadata.

Each schedule card has Going, Interested, Clear, an opt-in name/photo visibility checkbox, public plan counts, a collapsed singer list, and Share. Plans start private. Private attendance never appears in other users' counts or lists. Public attendee names/photos are returned only to signed-in users; anonymous users see public counts. No email, user ID, private plan, or contact information is returned in that list. No follower relationship or invitations are created.

RSVP is stored for the exact recurring-show ID and date; biweekly and one-time dates are validated server-side. Marking either status also adds the occurrence to the existing personal schedule. Clearing attendance does not remove the saved personal bookmark. Saved bookmarks from before this feature are not converted to public attendance. The Share button opens the device share sheet or copies event title, venue, date, and venue-page link. The link is to the venue page, not a newly created RSVP landing page.

The server verifies bearer tokens, checks the public active venue and show, and rejects invalid recurrence dates. New attendance is limited to upcoming dates within a year; date boundary uses America/Chicago, consistent with the initial venue market. Existing venue-local time display is unchanged. Removal is allowed even if a show was subsequently unpublished. Schedule changes invalidate the old occurrence in lookup; old RSVP rows are not copied to new dates. Singers choose attendance again for changed dates.

RLS enabled; client grants revoked. Server service role handles reads/writes. Composite primary key ensures one choice per account/date, upserts remain idempotent, and writes ignore caller-supplied user identities. Only opted-in rows are counted or listed. The list shows at most 30 recent public plans. Refresh on focus and after mutations; no messages, emails, or notifications are sent.

Verification: focused TypeScript; ten mocked API/helper tests cover recurrence, invalid dates, authentication, explicit privacy, identity spoofing, scoped deletion, origin, public-only counts. SQL must be applied in Supabase; actual multi-account/phone testing remains after deployment. Test a private Going entry with a second account (no count/name), opt in (appears), switch to Interested, clear, and verify adjacent biweekly dates stay independent.
