# Event photo tags and reactions

Apply `supabase/migrations/20261021210000_photo_tags_reactions.sql` after the original event-photo-gallery migration. No existing photos are changed.

Approved gallery photos now include applause, fire, and heart reactions. Sign-in is required; each account has one reaction per photo, replaceable or removable. Counts remain public. These are social reactions, never contest votes.

Signed-in singers who participated in an event may tag themselves or another account-backed singer from that event. A tag of another singer remains private until that singer accepts it. The tagged singer sees Accept/Decline when opening that photo in the existing event gallery or history recap. Accepted tags show the singer's stage/display name. Singers can remove their own tag. A declined/removed tag cannot be proposed again by someone else; singers can tag themselves again. Ten tag records maximum per photo limits repeat requests.

Guests without accounts can still upload through the existing moderated upload flow and browse approved photos. No extra QR or notifications. No global singer search. A tag does not grant access to private/pending photos or create a public profile link. Existing gallery removal/reporting and host moderation remain in place. Only approved photos expose social data or accept changes. Gallery photos already appear in show recaps in My History; this does not create a separate cross-event tagged-photo feed.

Tables have RLS enabled and no client grants. Only the server's service role can read/write them or call the transactional mutation function. The server verifies bearer tokens and passes the verified user ID. Database photo locking serializes tag limits and changes. Removed photos retain inaccessible interaction rows until permanent deletion cascades them.

Validation: focused TypeScript, API tests with mocked auth/database, CSS parsing. Migration requires Supabase execution; no local PostgreSQL integration or real phone verification. After deployment test with two singer accounts: reaction switch/remove, tag proposal, acceptance, removal, denied re-proposal, pending-photo invisibility, host photo removal, ended-show recap access. Reactions and tags remain available for approved photos after the show ends.
