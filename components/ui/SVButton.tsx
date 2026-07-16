'use client';

import React from 'react';

type SVButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export default function SVButton({
  variant = 'primary',
  className = '',
  children,
  ...props
}: SVButtonProps) {
  return (
    <button
      className={`sv-btn sv-btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}