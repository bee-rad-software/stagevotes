# Share My Night

My History cards include a Share My Night button. This opens a native modal with a photo selector, explicit Create Card step, PNG preview, Save Image, and Share. No automatic posting or new QR. No migration.

Content comes from the signed-in singer profile plus the existing browser device identity used by My History, deduplicated by performance ID and restricted to completed performances in the selected show. Badge data uses the existing public finished-show badge API, filtered to those exact performance IDs and deduplicated by badge title. Badge errors block generation rather than silently excluding achievements. No judge scores, phone numbers, or device IDs appear in the image.

Photo choices are the singer's profile photo, host-approved photos from the event gallery, or a branded no-photo design. Image loading uses anonymous CORS with a timeout; if a selected photo cannot be exported, users receive an error and can select another image or the no-photo design. Signed photo URLs are refreshed whenever the modal is opened. Removing a gallery photo later cannot recall an already saved image.

PNG is 1080 × 1350, with up to six song lines, four earned badges, and explicit remaining-item counts for larger nights. Names and long titles truncate to fit; full content stays in the recap. The visible recap URL is printed in the PNG. File sharing uses Web Share when supported, with link-only sharing or copy-link fallback. Saving uses a download link; iPhone users can use the share sheet to save to Photos. Sharing requires a fresh button tap after generation to preserve browser activation.

Validation: focused component/helper TypeScript, history-page syntax, four renderer/helper tests, CSS parsing, sample PNG rendered and visually inspected with a native canvas. Real iPhone/Android share-sheet and hosted photo CORS checks remain manual after deployment. No live external share was sent during development.
