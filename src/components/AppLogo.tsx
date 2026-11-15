import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="appLogoBluePage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#0066D6" />
        </linearGradient>
      </defs>

      {/* Pure White Rounded-Square Background matching outer app icon */}
      <rect x="0" y="0" width="512" height="512" rx="112" fill="#FFFFFF" />
      <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#E5E5EA" strokeWidth="12" />

      {/* Centered, Compact Open Book (Half White / Half Blue) */}
      <g>
        <path
          d="M126 190 L126 334 C126 340 131 344 137 342 C176 329 218 331 244 345 C249 351 263 351 268 345 C294 331 336 329 375 342 C381 344 386 340 386 334 L386 190 Z"
          fill="#1D1D1F"
        />
        <path
          d="M256 184 C224 166 172 164 138 176 C133 178 130 182 130 188 L130 322 C130 327 135 330 140 328 C176 315 224 317 256 334 Z"
          fill="#FFFFFF"
          stroke="#1D1D1F"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M256 184 C288 166 340 164 374 176 C379 178 382 182 382 188 L382 322 C382 327 377 330 372 328 C336 315 288 317 256 334 Z"
          fill="url(#appLogoBluePage)"
          stroke="#0066D6"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <line
          x1="256"
          y1="184"
          x2="256"
          y2="334"
          stroke="#1D1D1F"
          strokeOpacity="0.28"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line x1="158" y1="218" x2="226" y2="218" stroke="#8E8E93" strokeWidth="8" strokeLinecap="round" />
        <line x1="158" y1="246" x2="226" y2="246" stroke="#8E8E93" strokeWidth="8" strokeLinecap="round" />
        <line x1="158" y1="274" x2="206" y2="274" stroke="#8E8E93" strokeWidth="8" strokeLinecap="round" />
        <line x1="286" y1="218" x2="354" y2="218" stroke="#FFFFFF" strokeOpacity="0.88" strokeWidth="8" strokeLinecap="round" />
        <line x1="286" y1="246" x2="354" y2="246" stroke="#FFFFFF" strokeOpacity="0.88" strokeWidth="8" strokeLinecap="round" />
        <line x1="286" y1="274" x2="334" y2="274" stroke="#FFFFFF" strokeOpacity="0.88" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  );
};
