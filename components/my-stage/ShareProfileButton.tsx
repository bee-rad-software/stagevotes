'use client';

import { useState } from 'react';

type ShareProfileButtonProps = {
  name: string;
  badgeLabel: string;
  performances: number;
  photoUrl?: string | null;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not create the share image.'));
        }
      },
      'image/png',
      1
    );
  });
}

function drawCircularPhoto(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  size: number
) {
  const radius = size / 2;

  const imageRatio = image.width / image.height;
  const targetRatio = 1;

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.save();

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    centerX - radius,
    centerY - radius,
    size,
    size
  );

  context.restore();

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.lineWidth = 12;
  context.strokeStyle = '#38bdf8';
  context.stroke();
}

function drawFallbackAvatar(
  context: CanvasRenderingContext2D,
  name: string,
  centerX: number,
  centerY: number,
  size: number
) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  context.beginPath();
  context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  context.fillStyle = '#172554';
  context.fill();

  context.lineWidth = 12;
  context.strokeStyle = '#38bdf8';
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = '900 100px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initials || 'SV', centerX, centerY + 4);
}

async function generateShareCard({
  name,
  badgeLabel,
  performances,
  photoUrl,
}: ShareProfileButtonProps): Promise<Blob> {
  const canvas = document.createElement('canvas');

  canvas.width = 1080;
  canvas.height = 1350;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not supported.');
  }

  // Background
  const background = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );

  background.addColorStop(0, '#071525');
  background.addColorStop(0.55, '#10295a');
  background.addColorStop(1, '#1c1630');

  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative glow
  const glow = context.createRadialGradient(
    250,
    280,
    0,
    250,
    280,
    520
  );

  glow.addColorStop(0, 'rgba(56,189,248,.28)');
  glow.addColorStop(1, 'rgba(56,189,248,0)');

  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  context.strokeStyle = 'rgba(56,189,248,.42)';
  context.lineWidth = 4;
  context.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

  // StageVotes heading
  context.fillStyle = '#38bdf8';
  context.font = '900 34px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText('STAGEVOTES', canvas.width / 2, 105);

  context.fillStyle = '#94a3b8';
  context.font = '800 24px Arial, sans-serif';
  context.fillText('MY STAGE', canvas.width / 2, 148);

  // Profile photo
  const photoCenterX = canvas.width / 2;
  const photoCenterY = 340;
  const photoSize = 300;

  if (photoUrl) {
    try {
      const image = await loadImage(photoUrl);

      drawCircularPhoto(
        context,
        image,
        photoCenterX,
        photoCenterY,
        photoSize
      );
    } catch {
      drawFallbackAvatar(
        context,
        name,
        photoCenterX,
        photoCenterY,
        photoSize
      );
    }
  } else {
    drawFallbackAvatar(
      context,
      name,
      photoCenterX,
      photoCenterY,
      photoSize
    );
  }

  // Singer name
  context.fillStyle = '#ffffff';
  context.font = '900 92px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(name, canvas.width / 2, 590);

  // Badge pill
  const badgeText = `⭐ ${badgeLabel}`;

  context.font = '900 34px Arial, sans-serif';

  const badgeWidth = context.measureText(badgeText).width + 80;
  const badgeX = (canvas.width - badgeWidth) / 2;
  const badgeY = 640;
  const badgeHeight = 76;

  context.beginPath();
  context.roundRect(
    badgeX,
    badgeY,
    badgeWidth,
    badgeHeight,
    badgeHeight / 2
  );

  context.fillStyle = 'rgba(250,204,21,.13)';
  context.fill();

  context.strokeStyle = 'rgba(250,204,21,.55)';
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = '#facc15';
  context.textBaseline = 'middle';
  context.fillText(
    badgeText,
    canvas.width / 2,
    badgeY + badgeHeight / 2 + 2
  );

  // Performance stat
  context.fillStyle = 'rgba(255,255,255,.07)';
  context.beginPath();
  context.roundRect(170, 785, 740, 250, 34);
  context.fill();

  context.fillStyle = '#ffffff';
  context.font = '900 118px Arial, sans-serif';
  context.textBaseline = 'alphabetic';
  context.fillText(
    String(performances),
    canvas.width / 2,
    930
  );

  context.fillStyle = '#94a3b8';
  context.font = '900 30px Arial, sans-serif';
  context.fillText(
    '🎤 LIFETIME PERFORMANCES',
    canvas.width / 2,
    990
  );

  // Footer
  context.fillStyle = '#ffffff';
  context.font = '900 42px Arial, sans-serif';
  context.fillText('Own the stage.', canvas.width / 2, 1160);

  context.fillStyle = '#7dd3fc';
  context.font = '800 27px Arial, sans-serif';
  context.fillText(
    'Powered by StageVotes',
    canvas.width / 2,
    1212
  );

  return canvasToBlob(canvas);
}

export default function ShareProfileButton({
  name,
  badgeLabel,
  performances,
  photoUrl,
}: ShareProfileButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);

    try {
      const imageBlob = await generateShareCard({
        name,
        badgeLabel,
        performances,
        photoUrl,
      });

      const safeName =
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'singer';

      const imageFile = new File(
        [imageBlob],
        `${safeName}-stagevotes-profile.png`,
        {
          type: 'image/png',
        }
      );

      const shareData: ShareData = {
        title: `${name}'s StageVotes Profile`,
        text: `Check out my StageVotes karaoke profile!`,
        files: [imageFile],
      };

      if (
        navigator.share &&
        navigator.canShare?.({ files: [imageFile] })
      ) {
        await navigator.share(shareData);
        return;
      }

      // Fallback: save the image
      const imageUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');

      link.href = imageUrl;
      link.download = imageFile.name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      console.error('Unable to share profile:', error);
      alert('We could not create your share card. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      aria-label="Share your StageVotes profile"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        minHeight: 44,
        padding: '8px 4px',
        border: 'none',
        background: 'transparent',
        color: '#7dd3fc',
        fontWeight: 800,
        fontSize: 14,
        cursor: isSharing ? 'wait' : 'pointer',
        opacity: isSharing ? 0.55 : 0.9,
        transition: 'opacity .2s ease, transform .15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {isSharing ? 'Creating card…' : '📤 Share'}
    </button>
  );
}