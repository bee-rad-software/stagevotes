'use client';

import { useState } from 'react';
import { Music2, UserPlus } from 'lucide-react';
import SVBottomSheet from '@/components/ui/SVBottomSheet';

type ManualSinger = {
  singerName: string;
  songTitle: string;
  artist: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAddSinger?: (singer: ManualSinger) => void | Promise<void>;
};

export default function SVAddSingerSheet({
  open,
  onClose,
  onAddSinger,
}: Props) {
  const [singerName, setSingerName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canSubmit =
    singerName.trim().length > 0 &&
    songTitle.trim().length > 0 &&
    !saving;

  async function handleSubmit() {
    if (!canSubmit) {
      setMessage('Enter the singer’s name and song title.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await onAddSinger?.({
        singerName: singerName.trim(),
        songTitle: songTitle.trim(),
        artist: artist.trim(),
      });

      setSingerName('');
      setSongTitle('');
      setArtist('');
      onClose();
    } catch (error) {
      console.error('Could not add singer:', error);
      setMessage('We could not add the singer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SVBottomSheet
      open={open}
      title="Add Singer"
      onClose={onClose}
    >
      <div className="sv-manual-singer-form">
        <div className="sv-manual-singer-intro">
          <div className="sv-manual-singer-icon">
            <UserPlus size={24} />
          </div>

          <div>
            <div className="sv-mobile-kicker">Manual signup</div>
            <h3>Add someone to the rotation</h3>
            <p>
              Use this when a singer does not have a phone or prefers to sign
              up with the host.
            </p>
          </div>
        </div>

        <label htmlFor="manual-singer-name">
          Singer name
        </label>

        <input
          id="manual-singer-name"
          value={singerName}
          onChange={(event) => setSingerName(event.target.value)}
          placeholder="Enter singer name"
          autoComplete="off"
        />

        <label htmlFor="manual-song-title">
          Song title
        </label>

        <div className="sv-manual-song-input">
          <Music2 size={19} />

          <input
            id="manual-song-title"
            value={songTitle}
            onChange={(event) => setSongTitle(event.target.value)}
            placeholder="Enter song title"
            autoComplete="off"
          />
        </div>

        <label htmlFor="manual-song-artist">
          Artist
          <span className="sv-optional-label">Optional</span>
        </label>

        <input
          id="manual-song-artist"
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
          placeholder="Enter artist"
          autoComplete="off"
        />

        {message && (
          <div className="sv-manual-singer-message">
            {message}
          </div>
        )}

        <button
          type="button"
          className="sv-manual-singer-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <UserPlus size={19} />
          {saving ? 'Adding Singer...' : 'Add to Rotation'}
        </button>
      </div>
    </SVBottomSheet>
  );
}