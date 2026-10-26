# Stage Mode v1

In the host dashboard, open **Run the show → Displays → Open Stage Mode · Lyrics backdrop**. This opens `/stage-display/{eventId}` in a separate window. Move it to the TV, size it to the screen, and position KaraFun's transparent lyrics window over the open center. The existing TV display and narrow KaraFun companion remain available. No desktop installer change or SQL migration is required for this version.

The backdrop does not render lyrics or control KaraFun's window. Keep KaraFun running and use the host playback controls as usual. Test window stacking and focus on the actual host computer and TV before using it live. Browser fullscreen is optional: if it changes window stacking, use a normal maximized window instead.

The top band shows the current singer, song, and venue name, with account branding where available. Photos use singer profile IDs; guests get an initial rather than matching another person's photo by name. The bottom shows the next two active rotation entries. The existing static singer signup route is used when an account ID is available. The QR is shown only when the show enables its signup QR and signups are open. Ended shows replace the stage content with a thank-you message and hide signup/queue prompts.

Move the pointer to reveal the display toolbar (it fades after five seconds), or tab to its buttons. With this display focused:
- **L:** Lyrics view, leaving the center clear while there is a current singer.
- **N:** Up Next announcement view. Move or hide the transparent lyrics window before using it, since StageVotes cannot hide an external KaraFun window.
- **G:** Toggle the alignment guides. Use the Guides button to return to Lyrics view first.
- **Fullscreen:** use the button or double-click the backdrop. Escape leaves browser fullscreen.

With no current singer, the display automatically shows the next queued singer. During a performance the view switch is manual: v1 follows StageVotes queue/current-singer data, not KaraFun's exact playback/paused/end state. No song is started and no singer is advanced by this display. Real-time updates and a ten-second refresh keep queue changes current. Connection interruptions are shown in a small top notice; the last loaded view is retained while reconnecting.

The background animation stays around the edges and honors reduced-motion preferences. Layout scales for TVs, with smaller-window fallbacks. Keep lyrics away from the header/footer bands. The first release does not include audience photos, advertisements, audio-reactive visuals, judge progress, or winner reveals.
