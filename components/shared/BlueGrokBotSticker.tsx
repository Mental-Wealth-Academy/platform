'use client';

import React from 'react';

interface BlueGrokBotStickerProps {
  size?: number;
  className?: string;
}

export default function BlueGrokBotSticker({ size = 96, className }: BlueGrokBotStickerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Blue sticker"
      style={{
        filter: 'drop-shadow(0 4px 14px color-mix(in oklch, var(--color-primary) 30%, transparent)) drop-shadow(0 1px 3px rgba(0,0,0,0.12))',
      }}
    >
      {/* Outer sticker contour / die-cut border */}
      <path
        d="M60 14 C36 14 22 28 18 46 C15 58 17 76 22 88 C26 97 34 105 45 107 C50 108 55 108 60 108 C65 108 70 108 75 107 C86 105 94 97 98 88 C103 76 105 58 102 46 C98 28 84 14 60 14 Z"
        fill="#ffffff"
      />

      {/* Back Hair Shadow & Plume */}
      <path
        d="M32 44 C26 62 28 85 30 98 L90 98 C92 85 94 62 88 44 C82 26 66 18 60 18 C54 18 38 26 32 44 Z"
        fill="#1D4ED8"
      />
      {/* High ponytail swoosh */}
      <path
        d="M68 22 C80 10 98 14 105 28 C110 38 110 58 104 78 C100 60 96 42 88 32 C82 24 74 22 68 22 Z"
        fill="#2563EB"
      />

      {/* Neck & Shading */}
      <path d="M52 70 L50 96 L70 96 L68 70 Z" fill="#E89668" />
      <path d="M53 77 L51 96 L69 96 L67 77 Z" fill="#F8B185" />

      {/* Lab Coat / Collar Collar */}
      <path d="M42 92 L48 106 L72 106 L78 92 L68 96 L60 88 L52 96 Z" fill="#F8FAFC" />
      <path d="M52 96 L60 88 L68 96 L60 104 Z" fill="#2563EB" />

      {/* Face & Head Base */}
      <path
        d="M38 48 C37 62 44 73 60 80 C76 73 83 62 82 48 C82 34 38 34 38 48 Z"
        fill="#F8B185"
      />
      <path
        d="M38 48 C38 40 42 34 48 31 C42 36 39 43 39 48 C39 61 45 71 60 78 C53 74 38 62 38 48 Z"
        fill="#E89668"
        opacity="0.35"
      />

      {/* Cyber Headset / Mecha Ear-Unit (Right Temple) */}
      <rect x="80" y="44" width="10" height="20" rx="3" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="82" y="48" width="6" height="12" rx="2" fill="#F97316" />
      <path d="M84 52 L84 56 C84 57.5 86 57.5 86 56 L86 52" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="85" y1="44" x2="85" y2="34" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="85" cy="33" r="2.5" fill="#5168FF" />

      {/* THE ICONIC GROK-BOT FACE: Two parallel solid black vertical capsules (3:1) */}
      <rect x="47" y="45" width="5.5" height="16.5" rx="2.75" fill="#09090B" />
      <rect x="67.5" y="45" width="5.5" height="16.5" rx="2.75" fill="#09090B" />

      {/* Soft Horizontal Elliptical Pink Blush Marks */}
      <ellipse cx="44" cy="58" rx="4.5" ry="2.2" fill="#F87171" opacity="0.75" />
      <ellipse cx="76" cy="58" rx="4.5" ry="2.2" fill="#F87171" opacity="0.75" />

      {/* Front Hair Bangs */}
      <path
        d="M60 20 C50 20 40 24 34 32 C32 38 32 46 34 54 C37 46 42 42 48 40 C52 43 56 44 60 44 C64 44 68 43 72 40 C78 42 83 46 86 54 C88 46 88 38 86 32 C80 24 70 20 60 20 Z"
        fill="#2563EB"
      />
      <polygon points="58,26 53,42 61,38" fill="#1D4ED8" />
      <polygon points="62,26 67,42 59,38" fill="#60A5FA" />
    </svg>
  );
}
