'use client';

import { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export default function SVBottomSheet({
  open,
  title,
  children,
  onClose,
}: Props) {
  return (
    <>
      <div
        className={`sv-sheet-backdrop ${
          open ? 'open' : ''
        }`}
        onClick={onClose}
      />

      <div
        className={`sv-bottom-sheet ${
          open ? 'open' : ''
        }`}
      >
        <div className="sv-sheet-handle" />

        <div className="sv-sheet-header">

          <h2>{title}</h2>

          <button onClick={onClose}>
            ✕
          </button>

        </div>

        {children}

      </div>
    </>
  );
}