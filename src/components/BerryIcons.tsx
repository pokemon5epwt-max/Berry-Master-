import React from 'react';
import type { BerryType, ToolType } from '../game/types';

export const BerrySvg: React.FC<{ type: BerryType; size?: number }> = ({
  type,
  size = 22,
}) => {
  if (type === 'oran') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <ellipse cx="14" cy="6" rx="5" ry="2.6" fill="#58B368" stroke="#366E43" strokeWidth="1.5" />
        <circle cx="14" cy="16" r="9" fill="#4E8DF5" stroke="#2F64BD" strokeWidth="2" />
        <circle cx="11" cy="13" r="2.6" fill="#9AC4FF" />
        <circle cx="16.5" cy="18.5" r="1.1" fill="#2F64BD" />
        <circle cx="12" cy="19.5" r="1.1" fill="#2F64BD" />
      </svg>
    );
  }
  if (type === 'pecha') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <ellipse cx="14" cy="6" rx="5" ry="2.6" fill="#66BB6A" stroke="#366E43" strokeWidth="1.5" />
        <path
          d="M14 25C9.5 22 5 18 5 13.2C5 9.8 7.7 7.5 10.6 7.5C12.3 7.5 13.4 8.3 14 9.2C14.6 8.3 15.7 7.5 17.4 7.5C20.3 7.5 23 9.8 23 13.2C23 18 18.5 22 14 25Z"
          fill="#F48FB1"
          stroke="#C95D84"
          strokeWidth="2"
        />
        <circle cx="10.2" cy="12" r="2.2" fill="#FFD1E1" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="5.5" rx="4.5" ry="2.4" fill="#56AB64" stroke="#366E43" strokeWidth="1.5" />
      <path
        d="M14 8C17.5 8 18.5 11.2 20.5 13.5C22.4 15.7 22 20 19.5 22.3C17.4 24.2 10.6 24.2 8.5 22.3C6 20 5.6 15.7 7.5 13.5C9.5 11.2 10.5 8 14 8Z"
        fill="#F4C430"
        stroke="#C69214"
        strokeWidth="2"
      />
      <circle cx="11.5" cy="14" r="2.2" fill="#FFF099" />
    </svg>
  );
};

export const ToolSvg: React.FC<{ tool: ToolType; size?: number }> = ({
  tool,
  size = 26,
}) => {
  if (tool === 'wailmer_pail') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M11 11C11 7.5 21 7.5 21 11" stroke="#264653" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M22 14L28 8L29.5 11L23 17" fill="#4895EF" stroke="#264653" strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="15" cy="18" rx="10" ry="8" fill="#4895EF" stroke="#264653" strokeWidth="2" />
        <path d="M7.5 21C10 24.5 20 24.5 22.5 21" fill="#FFF5D6" />
        <circle cx="12" cy="16.5" r="1.4" fill="#264653" />
        <circle cx="18" cy="16.5" r="1.4" fill="#264653" />
      </svg>
    );
  }
  if (tool === 'harvest_basket') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M9 13C9 7.5 23 7.5 23 13" stroke="#6F4518" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6 14H26L23 26H9L6 14Z" fill="#D99B52" stroke="#6F4518" strokeWidth="2" strokeLinejoin="round" />
        <rect x="5" y="12" width="22" height="4.5" rx="2" fill="#F7EDE2" stroke="#6F4518" strokeWidth="1.8" />
        <line x1="11" y1="17" x2="12" y2="25" stroke="#8C5824" strokeWidth="1.5" />
        <line x1="16" y1="17" x2="16" y2="25" stroke="#8C5824" strokeWidth="1.5" />
        <line x1="21" y1="17" x2="20" y2="25" stroke="#8C5824" strokeWidth="1.5" />
      </svg>
    );
  }
  if (tool === 'garden_rake') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <g transform="rotate(-32 16 16)">
          <line x1="16" y1="27" x2="16" y2="10" stroke="#6F4518" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="7" y="7" width="18" height="4.5" rx="2" fill="#52B788" stroke="#2D6A4F" strokeWidth="1.8" />
          <line x1="9" y1="11" x2="9" y2="15" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" />
          <line x1="13.5" y1="11" x2="13.5" y2="15" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.5" y1="11" x2="18.5" y2="15" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" />
          <line x1="23" y1="11" x2="23" y2="15" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="13" cy="18" r="7.5" fill="#E76F51" stroke="#5C2C1D" strokeWidth="2" />
      <rect x="17" y="10" width="10" height="7" rx="2.5" fill="#F4A261" stroke="#5C2C1D" strokeWidth="2" />
      <circle cx="13" cy="18" r="3" fill="#FFF3B0" />
    </svg>
  );
};

export const MiniPokeBallIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = '',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#FFFDF7" stroke="#4A2816" strokeWidth="2.2" />
    <path d="M2.6 12A9.4 9.4 0 0 1 21.4 12H2.6Z" fill="#EF5B47" stroke="#4A2816" strokeWidth="2" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="#4A2816" strokeWidth="2.2" />
    <circle cx="12" cy="12" r="3.1" fill="#FFFDF7" stroke="#4A2816" strokeWidth="2" />
  </svg>
);

export const MiniSparkleStarIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 18,
  className = '',
  color = '#FFD447',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 2.5L14.6 8.3L20.9 9.1L16.2 13.4L17.5 19.6L12 16.5L6.5 19.6L7.8 13.4L3.1 9.1L9.4 8.3L12 2.5Z"
      fill={color}
      stroke="#4A2816"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const MiniBerryLeafIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = '',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 18C4 10 11 4.5 20 5C19.5 14 14 20 6 19.5L4 18Z"
      fill="#5AC97B"
      stroke="#4A2816"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M6.5 17.5L16.5 8.5" stroke="#2D6A4F" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const PixelToolSvg: React.FC<{ tool: ToolType; size?: number }> = ({
  tool,
  size = 46,
}) => {
  if (tool === 'wailmer_pail') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* Top Handle */}
        <rect x="9" y="4" width="6" height="1" fill="#1F2E3D" />
        <rect x="8" y="5" width="1" height="3" fill="#1F2E3D" />
        <rect x="15" y="5" width="1" height="3" fill="#1F2E3D" />
        <rect x="9" y="5" width="6" height="1" fill="#6BA8EE" />
        {/* Spout */}
        <rect x="2" y="10" width="2" height="2" fill="#1F2E3D" />
        <rect x="3" y="11" width="3" height="2" fill="#3B82D6" />
        <rect x="4" y="13" width="2" height="1" fill="#1F2E3D" />
        {/* Body Outline */}
        <rect x="7" y="7" width="10" height="1" fill="#1F2E3D" />
        <rect x="5" y="8" width="2" height="1" fill="#1F2E3D" />
        <rect x="17" y="8" width="2" height="1" fill="#1F2E3D" />
        <rect x="4" y="9" width="1" height="7" fill="#1F2E3D" />
        <rect x="19" y="9" width="1" height="7" fill="#1F2E3D" />
        <rect x="5" y="16" width="2" height="2" fill="#1F2E3D" />
        <rect x="17" y="16" width="2" height="2" fill="#1F2E3D" />
        <rect x="7" y="18" width="10" height="1" fill="#1F2E3D" />
        {/* Blue Wailmer Fill */}
        <rect x="7" y="8" width="10" height="6" fill="#3E87DE" />
        <rect x="5" y="9" width="14" height="5" fill="#3E87DE" />
        <rect x="7" y="8" width="6" height="2" fill="#6FB4FA" />
        {/* Cream Striped Belly */}
        <rect x="5" y="14" width="14" height="2" fill="#FFF2CE" />
        <rect x="7" y="16" width="10" height="2" fill="#F2DCA6" />
        <rect x="8" y="15" width="1" height="2" fill="#C49A52" />
        <rect x="12" y="15" width="1" height="2" fill="#C49A52" />
        <rect x="16" y="15" width="1" height="2" fill="#C49A52" />
        {/* Eyes */}
        <rect x="8" y="11" width="1" height="2" fill="#101827" />
        <rect x="14" y="11" width="1" height="2" fill="#101827" />
        {/* Tail Fin */}
        <rect x="20" y="10" width="2" height="3" fill="#3E87DE" />
        <rect x="21" y="9" width="1" height="1" fill="#1F2E3D" />
        <rect x="22" y="10" width="1" height="3" fill="#1F2E3D" />
        <rect x="20" y="13" width="2" height="1" fill="#1F2E3D" />
      </svg>
    );
  }
  if (tool === 'harvest_basket') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* Arch Handle */}
        <rect x="8" y="3" width="8" height="1" fill="#4A2816" />
        <rect x="7" y="4" width="1" height="5" fill="#4A2816" />
        <rect x="16" y="4" width="1" height="5" fill="#4A2816" />
        <rect x="8" y="4" width="8" height="1" fill="#B57439" />
        {/* Rim Outline & Fill */}
        <rect x="4" y="9" width="16" height="1" fill="#4A2816" />
        <rect x="3" y="10" width="1" height="2" fill="#4A2816" />
        <rect x="20" y="10" width="1" height="2" fill="#4A2816" />
        <rect x="4" y="10" width="16" height="2" fill="#E3A55B" />
        <rect x="5" y="10" width="12" height="1" fill="#F6C885" />
        <rect x="4" y="12" width="16" height="1" fill="#4A2816" />
        {/* Woven Body */}
        <rect x="5" y="13" width="14" height="6" fill="#C4813F" />
        <rect x="6" y="19" width="12" height="1" fill="#9E5E24" />
        <rect x="4" y="13" width="1" height="6" fill="#4A2816" />
        <rect x="19" y="13" width="1" height="6" fill="#4A2816" />
        <rect x="5" y="19" width="1" height="1" fill="#4A2816" />
        <rect x="18" y="19" width="1" height="1" fill="#4A2816" />
        <rect x="6" y="20" width="12" height="1" fill="#4A2816" />
        {/* Basket Weave Highlights */}
        <rect x="7" y="14" width="2" height="1" fill="#E9AE68" />
        <rect x="11" y="14" width="2" height="1" fill="#E9AE68" />
        <rect x="15" y="14" width="2" height="1" fill="#E9AE68" />
        <rect x="9" y="16" width="2" height="1" fill="#E9AE68" />
        <rect x="13" y="16" width="2" height="1" fill="#E9AE68" />
        <rect x="7" y="18" width="2" height="1" fill="#9E5E24" />
        <rect x="11" y="18" width="2" height="1" fill="#9E5E24" />
        <rect x="15" y="18" width="2" height="1" fill="#9E5E24" />
      </svg>
    );
  }
  if (tool === 'garden_rake') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* Diagonal Wooden Handle */}
        <rect x="4" y="19" width="2" height="2" fill="#4A2816" />
        <rect x="5" y="18" width="2" height="2" fill="#A66A38" />
        <rect x="6" y="17" width="2" height="2" fill="#4A2816" />
        <rect x="7" y="16" width="2" height="2" fill="#C4834A" />
        <rect x="8" y="15" width="2" height="2" fill="#A66A38" />
        <rect x="9" y="14" width="2" height="2" fill="#C4834A" />
        <rect x="10" y="13" width="2" height="2" fill="#A66A38" />
        <rect x="11" y="12" width="2" height="2" fill="#C4834A" />
        <rect x="12" y="11" width="2" height="2" fill="#4A2816" />
        {/* Green Rake Head Bar */}
        <rect x="10" y="5" width="2" height="2" fill="#234D32" />
        <rect x="11" y="6" width="2" height="2" fill="#4CA86B" />
        <rect x="12" y="7" width="2" height="2" fill="#6FD18E" />
        <rect x="13" y="8" width="2" height="2" fill="#4CA86B" />
        <rect x="14" y="9" width="2" height="2" fill="#6FD18E" />
        <rect x="15" y="10" width="2" height="2" fill="#4CA86B" />
        <rect x="16" y="11" width="2" height="2" fill="#234D32" />
        {/* Rake Tines */}
        <rect x="12" y="3" width="1" height="3" fill="#234D32" />
        <rect x="14" y="4" width="1" height="3" fill="#234D32" />
        <rect x="16" y="6" width="1" height="3" fill="#234D32" />
        <rect x="18" y="8" width="1" height="3" fill="#234D32" />
        <rect x="19" y="10" width="1" height="2" fill="#234D32" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Golden Whistle */}
      <rect x="8" y="5" width="7" height="1" fill="#4A2816" />
      <rect x="7" y="6" width="1" height="2" fill="#4A2816" />
      <rect x="15" y="6" width="2" height="2" fill="#4A2816" />
      <rect x="6" y="8" width="1" height="8" fill="#4A2816" />
      <rect x="17" y="8" width="1" height="6" fill="#4A2816" />
      <rect x="7" y="16" width="3" height="2" fill="#4A2816" />
      <rect x="10" y="17" width="4" height="1" fill="#4A2816" />
      <rect x="14" y="14" width="3" height="3" fill="#4A2816" />
      {/* Brass Fill */}
      <rect x="8" y="6" width="7" height="10" fill="#E8AE42" />
      <rect x="7" y="8" width="10" height="6" fill="#E8AE42" />
      <rect x="9" y="7" width="4" height="2" fill="#FFE484" />
      <rect x="8" y="11" width="3" height="3" fill="#B87A1D" />
      {/* Mouthpiece Slot */}
      <rect x="10" y="14" width="4" height="2" fill="#C98A24" />
      <rect x="12" y="15" width="2" height="2" fill="#8C5814" />
      {/* Side Sound Hole */}
      <rect x="10" y="9" width="2" height="2" fill="#4A2816" />
    </svg>
  );
};

export const TitleLockupSvg: React.FC = () => (
  <svg
    viewBox="0 0 680 144"
    className="w-full max-w-[600px] h-auto drop-shadow-[0_4px_0_rgba(58,29,14,0.22)]"
    role="img"
    aria-label="Berry Master Farm Co-op Berkebun Berry"
  >
    <defs>
      {/* Gentle upward arc matching the curved logo in the reference */}
      <path id="berry-arc-path" d="M 38,80 Q 340,26 642,80" />
      <linearGradient id="green-plaque-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3E8862" />
        <stop offset="50%" stopColor="#2D6B4F" />
        <stop offset="100%" stopColor="#21533C" />
      </linearGradient>
    </defs>

    {/* Small Sparkles & Top Star matching the mockup */}
    <path
      d="M340 4L342 10L348 11L343.5 15L344.5 21L340 18L335.5 21L336.5 15L332 11L338 10Z"
      fill="#FFE26A"
      stroke="#3B1E10"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* 4-point sparkles */}
    <path
      d="M84 18L86.5 24.5L93 27L86.5 29.5L84 36L81.5 29.5L75 27L81.5 24.5Z"
      fill="#FFF29A"
      stroke="#3B1E10"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M594 18L596.5 24.5L603 27L596.5 29.5L594 36L591.5 29.5L585 27L591.5 24.5Z"
      fill="#FFF29A"
      stroke="#3B1E10"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M622 44L623.5 48L627.5 49.5L623.5 51L622 55L620.5 51L616.5 49.5L620.5 48Z"
      fill="#FFF7BD"
      stroke="#3B1E10"
      strokeWidth="1.4"
    />
    <path
      d="M56 54L57.5 58L61.5 59.5L57.5 61L56 65L54.5 61L50.5 59.5L54.5 58Z"
      fill="#FFF7BD"
      stroke="#3B1E10"
      strokeWidth="1.4"
    />

    {/* Curved Main Title Layer 1: Dark Espresso Outer Outline */}
    <g>
      <text
        className="font-display"
        fontSize="43"
        fontWeight="700"
        fill="#3B1E10"
        stroke="#3B1E10"
        strokeWidth="14"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <textPath href="#berry-arc-path" startOffset="50%" textAnchor="middle">
          Berry Master Farm Co-op
        </textPath>
      </text>

      {/* Layer 2: Cream Inner Sticker Rim */}
      <text
        className="font-display"
        fontSize="43"
        fontWeight="700"
        fill="#FFFDF5"
        stroke="#FFFDF5"
        strokeWidth="7"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <textPath href="#berry-arc-path" startOffset="50%" textAnchor="middle">
          Berry Master Farm Co-op
        </textPath>
      </text>

      {/* Layer 3: Reference Palette: Blue / Coral-Red / Emerald / Amber */}
      <text className="font-display" fontSize="43" fontWeight="700">
        <textPath href="#berry-arc-path" startOffset="50%" textAnchor="middle">
          <tspan fill="#3586E8">Berry </tspan>
          <tspan fill="#EC5D69">Master </tspan>
          <tspan fill="#3DB268">Farm </tspan>
          <tspan fill="#F4A825">Co-op</tspan>
        </textPath>
      </text>
    </g>

    {/* Forest-Green Pill Plaque with Gold Trim & Corner Pins: BERKEBUN BERRY */}
    <g transform="translate(178, 92)">
      {/* Drop Shadow */}
      <rect x="2" y="4" width="320" height="36" rx="18" fill="#1F3E2E" />
      {/* Gold Outer Rim */}
      <rect
        x="0"
        y="0"
        width="320"
        height="36"
        rx="18"
        fill="url(#green-plaque-grad)"
        stroke="#E6C25A"
        strokeWidth="3.2"
      />
      {/* Subtle Dark Inner Hairline */}
      <rect
        x="2"
        y="2"
        width="316"
        height="32"
        rx="16"
        fill="none"
        stroke="#1C402E"
        strokeWidth="1.2"
      />
      {/* Left & Right Gold Studs */}
      <circle cx="19" cy="18" r="2.8" fill="#FCE588" stroke="#1C402E" strokeWidth="1.2" />
      <circle cx="301" cy="18" r="2.8" fill="#FCE588" stroke="#1C402E" strokeWidth="1.2" />
      <text
        x="160"
        y="24"
        textAnchor="middle"
        className="font-display"
        fontSize="19.5"
        fontWeight="700"
        letterSpacing="3.4"
        fill="#FFF9E6"
      >
        BERKEBUN BERRY
      </text>
    </g>
  </svg>
);

