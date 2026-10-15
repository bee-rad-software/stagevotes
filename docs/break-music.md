# Host break music

The host show page includes a desktop-only Break music panel. It uses a local
HTML audio element and object URLs from files selected by the host. It does not
upload audio or expose local paths to the server. The existing desktop preload
isDesktop flag is sufficient; no Electron rebuild or database migration is needed.

## Host workflow

1. Choose a folder or multiple audio files (MP3, WAV, M4A, AAC, OGG, FLAC).
2. Set volume (starts at 25%) and choose shuffle or sequential playback.
3. Press Play music once. This also gives the audio element a user gesture.
4. Optionally enable automatic playback between KaraFun songs.
5. Mute now stops music immediately. Unmute does not start it; press Play.

Selections last while this show page stays mounted. Reloading, switching away
from the show, or closing the app stops playback and releases the object URLs.
Choose files again when returning. Files must be playable by the desktop app's
audio codecs; file extensions alone do not guarantee decoding. Playback errors
are shown to the host and require choosing another track or retrying Play.
Audio uses the computer's default output; check it at the venue before the show.

## KaraFun behavior

- StageVotes Play awaits a fade to silence before sending remote.PlayRequest.
- Status 4 (playing) and 5 (paused) silence break music. Command-pending and
  ended-show states also silence it.
- Automatic music requires observed playback, followed by status 3 (ready),
  stable for 1.2 seconds. A fresh connection in ready state does not start music.
- Disconnection/unknown states reset the playback baseline and stop music.
- Status 3 indicates ready, not a separately documented natural-end event.
  Thus automatic music can also return after a performance is stopped/loaded
  into ready state. Test actual KaraFun transitions on both host platforms.
- Manual Pause music and Mute hold automatic music until a subsequent karaoke
  performance or explicit manual Play. The player never advances singers or
  sends KaraFun Next/Play commands itself.

## Validation

Automated tests cover state transitions, initial-ready/reconnect safety,
paused/unknown silence, playlist wrapping and nonrepeating shuffle.
The component has a focused TypeScript check; the host integration is syntax checked.

Before a venue rollout, test real audio on Mac and Windows: folder selection,
multiple files, unsupported file, shuffle, track end, mute, volume, singer Play,
Pause/Resume, natural end and ready transition, external KaraFun Play, disconnect,
reconnect, show end, page navigation, and minimized host window. Confirm KaraFun
does not automatically start the next performance if manual starts are desired.
