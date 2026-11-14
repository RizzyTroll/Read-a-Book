import React from 'react';

interface BookArtworkBackdropProps {
  motif: string;
  strokeColor: string;
  fillColor: string;
}

export const BookArtworkBackdrop: React.FC<BookArtworkBackdropProps> = ({
  motif,
  strokeColor,
  fillColor,
}) => {
  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Subtle top-right ambient radial glow */}
      <circle cx="195" cy="25" r="90" fill={fillColor} fillOpacity="0.22" />
      <circle cx="40" cy="175" r="70" fill={fillColor} fillOpacity="0.16" />

      {motif === 'coins' && (
        <g stroke={strokeColor} strokeOpacity="0.14" fill="none" strokeWidth="1.2">
          <circle cx="120" cy="100" r="82" />
          <circle cx="120" cy="100" r="62" strokeDasharray="4 4" />
          <circle cx="165" cy="60" r="34" fill={fillColor} fillOpacity="0.14" stroke="none" />
          <path d="M20 148 Q 120 112 220 148" />
          <path d="M20 162 Q 120 126 220 162" strokeOpacity="0.08" />
        </g>
      )}

      {motif === 'orbit' && (
        <g stroke={strokeColor} strokeOpacity="0.15" fill="none" strokeWidth="1.2">
          <ellipse cx="120" cy="100" rx="95" ry="44" transform="rotate(-18 120 100)" />
          <ellipse cx="120" cy="100" rx="95" ry="44" transform="rotate(18 120 100)" />
          <circle cx="120" cy="100" r="56" strokeDasharray="3 5" />
          <circle cx="196" cy="70" r="5" fill={strokeColor} fillOpacity="0.2" stroke="none" />
          <circle cx="44" cy="130" r="4" fill={strokeColor} fillOpacity="0.2" stroke="none" />
        </g>
      )}

      {motif === 'monolith' && (
        <g stroke={strokeColor} strokeOpacity="0.13" fill="none" strokeWidth="1.2">
          <rect x="38" y="24" width="164" height="152" rx="14" />
          <line x1="20" y1="150" x2="220" y2="50" />
          <line x1="20" y1="170" x2="220" y2="70" strokeOpacity="0.08" />
          <rect x="148" y="36" width="44" height="44" rx="10" fill={fillColor} fillOpacity="0.18" stroke="none" />
        </g>
      )}

      {motif === 'duality' && (
        <g stroke={strokeColor} strokeOpacity="0.15" fill="none" strokeWidth="1.3">
          <circle cx="92" cy="100" r="64" fill={fillColor} fillOpacity="0.12" />
          <circle cx="148" cy="100" r="64" />
          <path d="M12 100 C 60 40, 180 160, 228 100" strokeOpacity="0.18" />
        </g>
      )}

      {motif === 'crest' && (
        <g stroke={strokeColor} strokeOpacity="0.14" fill="none" strokeWidth="1.2">
          <path d="M55 180 V 82 A 65 65 0 0 1 185 82 V 180" />
          <path d="M75 180 V 88 A 45 45 0 0 1 165 88 V 180" strokeOpacity="0.1" />
          <line x1="30" y1="158" x2="210" y2="158" />
          <circle cx="120" cy="48" r="16" fill={fillColor} fillOpacity="0.2" stroke="none" />
        </g>
      )}

      {motif === 'matrix' && (
        <g stroke={strokeColor} strokeOpacity="0.11" fill="none" strokeWidth="1">
          <line x1="60" y1="0" x2="60" y2="200" />
          <line x1="120" y1="0" x2="120" y2="200" />
          <line x1="180" y1="0" x2="180" y2="200" />
          <line x1="0" y1="50" x2="240" y2="50" />
          <line x1="0" y1="100" x2="240" y2="100" />
          <line x1="0" y1="150" x2="240" y2="150" />
          <circle cx="60" cy="50" r="4" fill={strokeColor} fillOpacity="0.22" stroke="none" />
          <circle cx="180" cy="150" r="4" fill={strokeColor} fillOpacity="0.22" stroke="none" />
          <circle cx="180" cy="50" r="24" fill={fillColor} fillOpacity="0.16" stroke="none" />
        </g>
      )}

      {motif === 'gears' && (
        <g stroke={strokeColor} strokeOpacity="0.14" fill="none" strokeWidth="1.2">
          <circle cx="80" cy="70" r="54" strokeDasharray="8 6" />
          <circle cx="164" cy="128" r="46" strokeDasharray="6 5" />
          <circle cx="80" cy="70" r="24" fill={fillColor} fillOpacity="0.16" stroke="none" />
          <circle cx="164" cy="128" r="18" />
        </g>
      )}

      {motif === 'loop' && (
        <g stroke={strokeColor} strokeOpacity="0.15" fill="none" strokeWidth="1.3">
          <path d="M 30 140 C 30 40, 210 40, 210 100 C 210 160, 60 160, 60 100 C 60 65, 170 65, 170 100" />
          <circle cx="182" cy="56" r="22" fill={fillColor} fillOpacity="0.18" stroke="none" />
        </g>
      )}

      {motif === 'lattice' && (
        <g stroke={strokeColor} strokeOpacity="0.12" fill="none" strokeWidth="1.1">
          <polygon points="120,18 214,100 120,182 26,100" />
          <polygon points="120,44 186,100 120,156 54,100" />
          <line x1="26" y1="100" x2="214" y2="100" />
          <line x1="120" y1="18" x2="120" y2="182" />
        </g>
      )}

      {motif === 'diagonal' && (
        <g stroke={strokeColor} strokeOpacity="0.13" fill="none" strokeWidth="1.2">
          <line x1="-20" y1="170" x2="160" y2="-10" />
          <line x1="30" y1="210" x2="220" y2="20" />
          <line x1="80" y1="220" x2="260" y2="40" />
          <circle cx="176" cy="144" r="36" fill={fillColor} fillOpacity="0.16" stroke="none" />
        </g>
      )}
    </svg>
  );
};
