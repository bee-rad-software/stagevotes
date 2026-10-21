# Event photos and captions

## Enable
Run supabase/migrations/20261021180000_event_photo_gallery.sql in Supabase SQL Editor, then deploy the app. The migration is repeatable and leaves photo sharing off on all existing/new events. No new environment variables or desktop installer are required; the existing server-only Supabase service role key is used.

On the host dashboard, open Show photos & captions near Singer text alerts / Song history. Enable Accept photo uploads for this show. Guests use the existing singer signup page and open Tonight's Photos. No new QR code or event picker is involved.

## Guest flow
Choose a photo, optionally enter a caption (150 characters) and display name (40), confirm permission, and send it to the host. Guests do not need an account or a queued song. Photos/captions are pending until approved together. The page remembers upload-removal secrets on that browser, allowing removal before or after approval. Approved photos also have Report / request removal; report reasons are visible only to the host.

## Host and history
The host sees Review and Approved tabs, report counts/reasons, and approval/rejection/removal actions. Approved photos stay attached to the original event and appear in /shows/[eventId], /history/[eventId], and singer history. Ending the show closes new uploads. Turning uploads off does not hide approved photos; remove an individual photo to withdraw it.

## Storage and access
The new event-photos bucket is private. Table access and reservation/report RPCs are restricted to service_role. A restrictive Storage policy prevents anon/authenticated access to this bucket even when another older broad policy exists. Host moderation checks authenticated membership role and event account ownership. Public responses map only approved rows to short-lived signed URLs, captions, optional display names and timestamps. No uploader identity hash, removal secret, or report text is returned publicly.

Browser preparation supports JPEG/PNG/WebP and HEIC/HEIF if the browser can decode them; unsupported iPhone formats prompt the guest to choose a JPEG or screenshot. Files are resized in the browser to fit the hosting request limit. The server independently validates image signatures, limits decoded pixels, rotates/resizes, strips metadata and re-encodes to WebP. Originals are not stored. Sharp 0.34.5 is now an explicit dependency, using the existing locked package.

Reservation limits are enforced in a Postgres transaction locking the event row: 20 per browser identity per event, 100 per hashed network per hour, 250 total reservations per event. Failed/rejected/deleted reservations count. The service stores keyed hashes, not raw IP addresses. Reports have separate limits and a unique photo/reporter constraint. These limits reduce anonymous abuse; the host can stop uploads.

Gallery cards start collapsed. Public collapsed cards fetch only settings/counts; full-size signed image URLs are requested on opening. Open cards refresh every 45 seconds, collapsed summaries every 60 seconds, and returning focus refreshes the view. Removed images can remain briefly in an existing browser or signed URL cache (up to the URL's 120-second lifetime); previously downloaded copies cannot be recalled.

## Verification
13 Node tests cover public/private gallery separation, moderation authorization, upload/approval, metadata stripping, caption/permission validation, disabled/ended events, invalid images, failure cleanup, quota handling, uploader removal secrets, reports, and request validation. Targeted strict TypeScript, integration syntax checks for six pages, CSS parsing, and guest/host server-rendering/caption-escaping checks pass.

No production database migration or live Storage upload was executed from this environment. After SQL setup, test one phone upload while logged out; confirm it is invisible in a second browser before approval; approve it from the host panel; verify the caption/gallery; test removal/reporting; then end the test show and verify the recap still displays approved photos while refusing new uploads.

When deleting entire events through administrative tools, remove their event-photos/<eventId>/ Storage objects through the Storage API as well. Database cascades remove gallery/report rows but do not delete Storage bytes. Failed Storage cleanup is logged and may require the same private-bucket cleanup.
