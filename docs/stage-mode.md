# Stage Mode: five-singer sidebar and Fill TV

Open **Run the show → Displays → Open Stage Mode · Lyrics backdrop**. The current singer and venue branding remain at the top. The next five active performances follow the host rotation in a left column. The signup QR is beneath that column, away from KaraFun's lower-right watermark. QR visibility still respects signup/QR settings. Reposition KaraFun's transparent window inside the clear area to the right of the column; StageVotes cannot move or hide KaraFun's own window.

## Desktop Fill TV

**Requires a rebuilt/reinstalled StageVotes desktop app** with the updated electron-karafun-display.js and electron-preload.js. A Vercel deployment alone updates the layout but cannot update an installed app's native window behavior. Use the repository's normal signed/notarized release workflow on the appropriate build machine; do not publish an unsigned replacement. The main host and existing narrow KaraFun display are unchanged.

The updated desktop app intercepts only same-origin `/stage-display/{eventId}` window opens and creates a separate frameless Stage Mode window, with no native fullscreen capability. Drag the small handle along the top to move it, choose the TV in the display toolbar, then click **Fill TV**. This sets ordinary window bounds to the selected display's bounds; it does not call fullscreen/maximize or create a macOS fullscreen Space. The backdrop is not always-on-top. Bring KaraFun's transparent lyric window above it after positioning.

**Restore** or **Escape** (with Stage Mode focused) returns to the previous window size. **Close** closes just Stage Mode. A repeated Fill TV preserves the original restore bounds, even when switching monitors. The old installed app or a browser still opens a normal window: Fill TV explains that the desktop update is needed. Continue resizing manually there. Browser fullscreen and double-click fullscreen have been removed from Stage Mode because they can isolate it from KaraFun on macOS.

Move the pointer to reveal the toolbar; it fades after five seconds and remains available by keyboard focus. L selects Lyrics, N selects Up Next, G toggles alignment guides. The queue/current-singer data refresh live and every ten seconds. Up Next is manual during a performance; with no current singer it appears automatically. No lyric rendering, playback commands, or queue advancement are performed by this display. Ended shows hide queue and signup content. Animation honors reduced-motion preferences.

## Verification

Run `node tests/stage-window.cjs` from the repository root for the mocked Electron regression checks. These cover window options, display selection, repeated fill/restore, main-frame sender checks and URL-origin restrictions. TypeScript and rendered display states were checked separately. Real macOS/Windows window stacking, signing/notarization and an external TV still require release-machine testing.
