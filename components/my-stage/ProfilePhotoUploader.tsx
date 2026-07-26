'use client';

import { useRef, useState } from 'react';

type Props = {
  imageUrl?: string | null;
  initials: string;
  onSelect: (file: File) => void | Promise<void>;
};

export default function ProfilePhotoUploader({
  imageUrl,
  initials,
  onSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      await onSelect(file);
    } finally {
      setUploading(false);

      // Allows the same file to be selected again later.
      event.target.value = '';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: 126,
        flexShrink: 0,
        textAlign: 'center',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />

      <button
        type="button"
        aria-label="Change profile photo"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        style={{
          position: 'relative',
          display: 'block',
          width: 126,
          height: 126,
          padding: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid #38bdf8',
          background: '#13233f',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
          cursor: uploading ? 'wait' : 'pointer',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Singer profile"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: uploading ? 0.55 : 1,
            }}
          />
        ) : (
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '100%',
              height: '100%',
              color: 'white',
              fontSize: 38,
              fontWeight: 900,
              opacity: uploading ? 0.55 : 1,
            }}
          >
            {initials}
          </span>
        )}

        {uploading && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 900,
              background: 'rgba(15, 23, 42, 0.38)',
            }}
          >
            Uploading…
          </span>
        )}
      </button>

      <button
        type="button"
        aria-label="Upload a new profile photo"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        style={{
          position: 'absolute',
          right: 2,
          bottom: 20,
          display: 'grid',
          placeItems: 'center',
          width: 36,
          height: 36,
          padding: 0,
          borderRadius: '50%',
          border: '3px solid #172554',
          background: '#f97316',
          color: 'white',
          fontSize: 17,
          cursor: uploading ? 'wait' : 'pointer',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        📷
      </button>

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        style={{
          marginTop: 9,
          padding: 0,
          border: 0,
          background: 'transparent',
          color: '#7dd3fc',
          fontSize: 12,
          fontWeight: 800,
          cursor: uploading ? 'wait' : 'pointer',
        }}
      >
        {uploading ? 'Uploading…' : 'Change photo'}
      </button>
    </div>
  );
}