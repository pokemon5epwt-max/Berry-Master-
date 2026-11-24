import React from 'react';
import type { BerryType } from '../game/types.ts';

/**
 * Pixel-Art Chibi Farmer Mascot (24x24 pixel grid, thick #4A2816 outlines)
 * Waves gently and blinks periodically.
 */
export const ChibiFarmerMascot: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <svg
    viewBox="0 0 24 24"
    shapeRendering="crispEdges"
    className={`chibi-bob select-none ${className}`}
    aria-hidden="true"
  >
    {/* Ground Shadow */}
    <rect x="6" y="21" width="12" height="2" fill="#4A2816" opacity="0.2" />

    {/* Cap Outline */}
    <rect x="7" y="1" width="10" height="1" fill="#4A2816" />
    <rect x="5" y="2" width="2" height="1" fill="#4A2816" />
    <rect x="17" y="2" width="2" height="1" fill="#4A2816" />
    <rect x="4" y="3" width="1" height="4" fill="#4A2816" />
    <rect x="19" y="3" width="1" height="4" fill="#4A2816" />
    {/* Cap Visor Outline */}
    <rect x="4" y="7" width="16" height="1" fill="#4A2816" />

    {/* Cap Red Fill + White Emblem + Highlight */}
    <rect x="7" y="2" width="10" height="5" fill="#EF5B47" />
    <rect x="5" y="3" width="2" height="4" fill="#EF5B47" />
    <rect x="17" y="3" width="2" height="4" fill="#EF5B47" />
    <rect x="7" y="2" width="8" height="1" fill="#FF8473" />
    <rect x="10" y="3" width="4" height="3" fill="#FFFDF8" />
    <rect x="11" y="4" width="2" height="1" fill="#3B9AE1" />

    {/* Hair Tufts & Face Outline */}
    <rect x="4" y="8" width="1" height="5" fill="#4A2816" />
    <rect x="19" y="8" width="1" height="5" fill="#4A2816" />
    <rect x="5" y="13" width="1" height="1" fill="#4A2816" />
    <rect x="18" y="13" width="1" height="1" fill="#4A2816" />
    <rect x="6" y="14" width="12" height="1" fill="#4A2816" />

    {/* Hair & Skin Fill */}
    <rect x="5" y="8" width="2" height="2" fill="#6E4427" />
    <rect x="17" y="8" width="2" height="2" fill="#6E4427" />
    <rect x="7" y="8" width="10" height="6" fill="#FFE0C2" />
    <rect x="5" y="10" width="2" height="3" fill="#FFE0C2" />
    <rect x="17" y="10" width="2" height="3" fill="#FFE0C2" />

    {/* Rosy Cheeks */}
    <rect x="6" y="12" width="2" height="1" fill="#FF949D" />
    <rect x="16" y="12" width="2" height="1" fill="#FF949D" />

    {/* Cute Smile */}
    <rect x="11" y="12" width="2" height="1" fill="#B5654B" />

    {/* Blinking Eyes */}
    <g className="chibi-blink">
      <rect x="8" y="10" width="2" height="2" fill="#3B2314" />
      <rect x="14" y="10" width="2" height="2" fill="#3B2314" />
      <rect x="8" y="10" width="1" height="1" fill="#FFFDF8" />
      <rect x="14" y="10" width="1" height="1" fill="#FFFDF8" />
    </g>

    {/* Scarf + Body Outline */}
    <rect x="6" y="15" width="12" height="1" fill="#4A2816" />
    <rect x="5" y="16" width="1" height="4" fill="#4A2816" />
    <rect x="17" y="16" width="1" height="4" fill="#4A2816" />
    <rect x="6" y="20" width="11" height="1" fill="#4A2816" />

    {/* Golden Scarf */}
    <rect x="7" y="15" width="10" height="2" fill="#FFE066" />
    <rect x="6" y="16" width="2" height="1" fill="#F5B041" />

    {/* Green Overalls & Cream Shirt */}
    <rect x="6" y="17" width="11" height="3" fill="#4BA868" />
    <rect x="8" y="17" width="1" height="1" fill="#FFE066" />
    <rect x="14" y="17" width="1" height="1" fill="#FFE066" />

    {/* Boots */}
    <rect x="6" y="20" width="4" height="2" fill="#7D4A28" stroke="#4A2816" strokeWidth="0.6" />
    <rect x="13" y="20" width="4" height="2" fill="#7D4A28" stroke="#4A2816" strokeWidth="0.6" />
    <rect x="6" y="21" width="4" height="1" fill="#4A2816" />
    <rect x="13" y="21" width="4" height="1" fill="#4A2816" />

    {/* Left Resting Arm */}
    <rect x="4" y="16" width="2" height="3" fill="#FFF2D6" />
    <rect x="3" y="16" width="1" height="3" fill="#4A2816" />
    <rect x="4" y="19" width="2" height="1" fill="#4A2816" />

    {/* Waving Right Arm (greeting the title) */}
    <g className="chibi-wave-arm">
      <rect x="18" y="13" width="3" height="3" fill="#4A2816" />
      <rect x="18" y="14" width="2" height="2" fill="#FFE0C2" />
      <rect x="17" y="15" width="2" height="2" fill="#FFF2D6" />
    </g>
  </svg>
);

/**
 * Pixel-Art Chibi Garden Pokémon Mascot (24x24 pixel grid, thick #4A2816 outlines)
 * Fluffy caramel squirrel-critter with leafy head sprout, waving paw & blinking eyes.
 */
export const ChibiPokemonMascot: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <svg
    viewBox="0 0 24 24"
    shapeRendering="crispEdges"
    className={`chibi-bob select-none ${className}`}
    style={{ animationDelay: '0.45s' }}
    aria-hidden="true"
  >
    {/* Ground Shadow */}
    <rect x="5" y="21" width="14" height="2" fill="#4A2816" opacity="0.2" />

    {/* Cute Leafy Head Sprout */}
    <rect x="11" y="1" width="3" height="1" fill="#4A2816" />
    <rect x="10" y="2" width="1" height="2" fill="#4A2816" />
    <rect x="14" y="2" width="1" height="1" fill="#4A2816" />
    <rect x="11" y="2" width="3" height="2" fill="#5AC97B" />
    <rect x="11" y="2" width="2" height="1" fill="#89EA9D" />
    <rect x="11" y="4" width="2" height="1" fill="#4A2816" />

    {/* Fluffy Curled Tail (Right Side) */}
    <rect x="17" y="10" width="4" height="1" fill="#4A2816" />
    <rect x="21" y="11" width="1" height="5" fill="#4A2816" />
    <rect x="20" y="16" width="1" height="2" fill="#4A2816" />
    <rect x="17" y="18" width="3" height="1" fill="#4A2816" />
    <rect x="17" y="11" width="4" height="5" fill="#D58A4E" />
    <rect x="18" y="12" width="2" height="3" fill="#F4B77D" />
    <rect x="17" y="16" width="3" height="2" fill="#D58A4E" />

    {/* Rounded Ears */}
    <rect x="6" y="4" width="3" height="1" fill="#4A2816" />
    <rect x="5" y="5" width="1" height="3" fill="#4A2816" />
    <rect x="6" y="5" width="3" height="3" fill="#E8A66D" />
    <rect x="7" y="6" width="1" height="2" fill="#FFABC1" />

    <rect x="14" y="4" width="3" height="1" fill="#4A2816" />
    <rect x="17" y="5" width="1" height="3" fill="#4A2816" />
    <rect x="14" y="5" width="3" height="3" fill="#E8A66D" />
    <rect x="15" y="6" width="1" height="2" fill="#FFABC1" />

    {/* Head Outline & Fur */}
    <rect x="9" y="5" width="5" height="1" fill="#4A2816" />
    <rect x="5" y="8" width="1" height="5" fill="#4A2816" />
    <rect x="17" y="8" width="1" height="5" fill="#4A2816" />
    <rect x="6" y="6" width="11" height="7" fill="#E8A66D" />
    <rect x="8" y="6" width="7" height="2" fill="#F5BC84" />

    {/* Cream Face Patch & Rosy Cheeks */}
    <rect x="7" y="11" width="9" height="3" fill="#FFF4D6" />
    <rect x="6" y="11" width="2" height="1" fill="#FF8FA3" />
    <rect x="15" y="11" width="2" height="1" fill="#FF8FA3" />
    <rect x="11" y="11" width="1" height="1" fill="#B55D45" />

    {/* Blinking Eyes */}
    <g className="chibi-blink" style={{ animationDelay: '1.1s' }}>
      <rect x="8" y="9" width="2" height="2" fill="#3B2314" />
      <rect x="13" y="9" width="2" height="2" fill="#3B2314" />
      <rect x="8" y="9" width="1" height="1" fill="#FFFDF8" />
      <rect x="13" y="9" width="1" height="1" fill="#FFFDF8" />
    </g>

    {/* Chubby Body Outline & Cream Belly */}
    <rect x="6" y="14" width="11" height="1" fill="#4A2816" opacity="0.2" />
    <rect x="5" y="13" width="1" height="7" fill="#4A2816" />
    <rect x="17" y="13" width="1" height="7" fill="#4A2816" />
    <rect x="6" y="20" width="11" height="1" fill="#4A2816" />
    <rect x="6" y="13" width="11" height="7" fill="#E8A66D" />
    <rect x="8" y="14" width="7" height="5" fill="#FFF4D6" />

    {/* Little Feet */}
    <rect x="7" y="20" width="3" height="2" fill="#C97B42" />
    <rect x="13" y="20" width="3" height="2" fill="#C97B42" />
    <rect x="7" y="21" width="3" height="1" fill="#4A2816" />
    <rect x="13" y="21" width="3" height="1" fill="#4A2816" />

    {/* Waving Left Paw (toward the title) */}
    <g className="chibi-wave-paw">
      <rect x="2" y="12" width="3" height="3" fill="#4A2816" />
      <rect x="3" y="13" width="2" height="2" fill="#FFF4D6" />
      <rect x="4" y="14" width="2" height="2" fill="#E8A66D" />
    </g>

    {/* Right Resting Paw */}
    <rect x="15" y="15" width="2" height="2" fill="#FFF4D6" />
  </svg>
);

/**
 * Pixel-Art Mini Berry Charm (14x14 pixel grid) with gentle wobble animation
 */
export const PixelBerryMini: React.FC<{
  type: BerryType;
  size?: number;
  delay?: string;
  className?: string;
}> = ({ type, size = 24, delay = '0s', className = '' }) => {
  const palette =
    type === 'oran'
      ? { body: '#4E8DF5', shine: '#A8CCFF', shade: '#2D60BA' }
      : type === 'pecha'
        ? { body: '#FF7AA8', shine: '#FFD1E1', shade: '#CF4D7E' }
        : { body: '#F4C430', shine: '#FFF3A8', shade: '#C99212' };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      className={`berry-wobble select-none ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      {/* Leaf & Stem Outline */}
      <rect x="5" y="1" width="4" height="1" fill="#4A2816" />
      <rect x="4" y="2" width="6" height="1" fill="#5AC97B" />
      <rect x="6" y="1" width="2" height="1" fill="#89EA9D" />

      {/* Berry Outline */}
      <rect x="4" y="3" width="6" height="1" fill="#4A2816" />
      <rect x="2" y="4" width="2" height="1" fill="#4A2816" />
      <rect x="10" y="4" width="2" height="1" fill="#4A2816" />
      <rect x="1" y="5" width="1" height="5" fill="#4A2816" />
      <rect x="12" y="5" width="1" height="5" fill="#4A2816" />
      <rect x="2" y="10" width="2" height="1" fill="#4A2816" />
      <rect x="10" y="10" width="2" height="1" fill="#4A2816" />
      <rect x="4" y="11" width="6" height="1" fill="#4A2816" />

      {/* Berry Body */}
      <rect x="4" y="4" width="6" height="7" fill={palette.body} />
      <rect x="2" y="5" width="2" height="5" fill={palette.body} />
      <rect x="10" y="5" width="2" height="5" fill={palette.body} />

      {/* Bottom Pixel Shade */}
      <rect x="4" y="10" width="6" height="1" fill={palette.shade} />
      <rect x="9" y="8" width="2" height="2" fill={palette.shade} />

      {/* Pixel Shine */}
      <rect x="4" y="5" width="2" height="2" fill={palette.shine} />
    </svg>
  );
};

/**
 * Full-Body Pixel-Art Berry Master Elder Mascot (26x36 grid, crisp dark outline)
 * Matches the elderly Berry Master with white mustache, green patterned vest & dark pants.
 */
export const BerryMasterMascot: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <svg
    viewBox="0 0 26 36"
    shapeRendering="crispEdges"
    className={`chibi-bob select-none ${className}`}
    aria-hidden="true"
  >
    {/* Ground Shadow */}
    <rect x="6" y="33" width="14" height="2" fill="#2A1A10" opacity="0.22" />

    {/* Head Outline */}
    <rect x="9" y="1" width="8" height="1" fill="#2A1A10" />
    <rect x="8" y="2" width="1" height="2" fill="#2A1A10" />
    <rect x="17" y="2" width="1" height="2" fill="#2A1A10" />
    {/* White Side Hair Tufts */}
    <rect x="6" y="4" width="2" height="1" fill="#2A1A10" />
    <rect x="18" y="4" width="2" height="1" fill="#2A1A10" />
    <rect x="5" y="5" width="1" height="4" fill="#2A1A10" />
    <rect x="20" y="5" width="1" height="4" fill="#2A1A10" />
    <rect x="6" y="9" width="2" height="1" fill="#2A1A10" />
    <rect x="18" y="9" width="2" height="1" fill="#2A1A10" />
    <rect x="8" y="10" width="1" height="2" fill="#2A1A10" />
    <rect x="17" y="10" width="1" height="2" fill="#2A1A10" />
    <rect x="9" y="12" width="8" height="1" fill="#2A1A10" />

    {/* Bald Head & Face Skin */}
    <rect x="9" y="2" width="8" height="10" fill="#FAD2B4" />
    <rect x="8" y="4" width="1" height="6" fill="#FAD2B4" />
    <rect x="17" y="4" width="1" height="6" fill="#FAD2B4" />
    <rect x="10" y="2" width="5" height="1" fill="#FFE6D1" />
    {/* Ears */}
    <rect x="7" y="7" width="1" height="2" fill="#F0BA95" />
    <rect x="18" y="7" width="1" height="2" fill="#F0BA95" />

    {/* White Side Hair */}
    <rect x="6" y="5" width="2" height="3" fill="#F8FAFC" />
    <rect x="18" y="5" width="2" height="3" fill="#F8FAFC" />
    <rect x="6" y="8" width="1" height="1" fill="#CBD5E1" />
    <rect x="19" y="8" width="1" height="1" fill="#CBD5E1" />

    {/* Eyebrows & Blinking Eyes */}
    <rect x="9" y="5" width="2" height="1" fill="#475569" />
    <rect x="15" y="5" width="2" height="1" fill="#475569" />
    <g className="chibi-blink">
      <rect x="10" y="6" width="1" height="2" fill="#1E293B" />
      <rect x="15" y="6" width="1" height="2" fill="#1E293B" />
    </g>

    {/* Nose & Bushy White Mustache */}
    <rect x="12" y="7" width="2" height="1" fill="#E8A984" />
    <rect x="9" y="9" width="8" height="2" fill="#FFFFFF" />
    <rect x="8" y="10" width="1" height="1" fill="#FFFFFF" />
    <rect x="17" y="10" width="1" height="1" fill="#FFFFFF" />
    <rect x="10" y="11" width="6" height="1" fill="#E2E8F0" />

    {/* Torso & Arms Outline */}
    <rect x="7" y="13" width="12" height="1" fill="#2A1A10" />
    <rect x="5" y="14" width="2" height="1" fill="#2A1A10" />
    <rect x="19" y="14" width="2" height="1" fill="#2A1A10" />
    <rect x="4" y="15" width="1" height="8" fill="#2A1A10" />
    <rect x="21" y="15" width="1" height="8" fill="#2A1A10" />
    <rect x="5" y="23" width="2" height="1" fill="#2A1A10" />
    <rect x="19" y="23" width="2" height="1" fill="#2A1A10" />

    {/* Cream Collar & Green Patterned Knit Vest */}
    <rect x="10" y="13" width="6" height="2" fill="#FFF7DF" />
    <rect x="12" y="14" width="2" height="1" fill="#E7D6AE" />
    <rect x="7" y="14" width="3" height="9" fill="#3D5A35" />
    <rect x="16" y="14" width="3" height="9" fill="#3D5A35" />
    <rect x="10" y="15" width="6" height="8" fill="#3D5A35" />
    {/* Vest Zigzag Knit Pattern */}
    <rect x="8" y="16" width="2" height="1" fill="#7CA36B" />
    <rect x="12" y="16" width="2" height="1" fill="#7CA36B" />
    <rect x="16" y="16" width="2" height="1" fill="#7CA36B" />
    <rect x="10" y="17" width="2" height="1" fill="#7CA36B" />
    <rect x="14" y="17" width="2" height="1" fill="#7CA36B" />
    <rect x="8" y="19" width="2" height="1" fill="#7CA36B" />
    <rect x="12" y="19" width="2" height="1" fill="#7CA36B" />
    <rect x="16" y="19" width="2" height="1" fill="#7CA36B" />
    {/* Vest Bottom Hem */}
    <rect x="7" y="22" width="12" height="1" fill="#2C4226" />

    {/* Long Sleeves & Hands */}
    <rect x="5" y="15" width="2" height="6" fill="#4C6D41" />
    <rect x="19" y="15" width="2" height="6" fill="#4C6D41" />
    <rect x="5" y="21" width="2" height="2" fill="#FAD2B4" />
    <rect x="19" y="21" width="2" height="2" fill="#FAD2B4" />

    {/* Pants Outline & Fill */}
    <rect x="7" y="23" width="1" height="9" fill="#2A1A10" />
    <rect x="18" y="23" width="1" height="9" fill="#2A1A10" />
    <rect x="12" y="26" width="2" height="6" fill="#2A1A10" />
    <rect x="8" y="23" width="10" height="3" fill="#4A4A48" />
    <rect x="8" y="26" width="4" height="6" fill="#4A4A48" />
    <rect x="14" y="26" width="4" height="6" fill="#4A4A48" />
    <rect x="9" y="24" width="1" height="7" fill="#636360" />
    <rect x="15" y="24" width="1" height="7" fill="#636360" />

    {/* Dark Shoes */}
    <rect x="7" y="32" width="5" height="2" fill="#1F2937" />
    <rect x="14" y="32" width="5" height="2" fill="#1F2937" />
    <rect x="8" y="32" width="3" height="1" fill="#4B5563" />
    <rect x="15" y="32" width="3" height="1" fill="#4B5563" />
  </svg>
);

/**
 * Pixel-Art Lotad Mascot (28x24 grid, crisp dark outline)
 * Matches the charming blue Lotad with a big green notched lilypad leaf on top.
 */
export const LotadMascot: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <svg
    viewBox="0 0 28 24"
    shapeRendering="crispEdges"
    className={`chibi-bob select-none ${className}`}
    style={{ animationDelay: '0.4s' }}
    aria-hidden="true"
  >
    {/* Ground Shadow */}
    <rect x="6" y="21" width="16" height="2" fill="#1B3A24" opacity="0.2" />

    {/* Lilypad Cap Outline */}
    <rect x="7" y="1" width="12" height="1" fill="#1F3B1F" />
    <rect x="4" y="2" width="3" height="1" fill="#1F3B1F" />
    <rect x="19" y="2" width="4" height="1" fill="#1F3B1F" />
    <rect x="2" y="3" width="2" height="2" fill="#1F3B1F" />
    <rect x="23" y="3" width="2" height="2" fill="#1F3B1F" />
    <rect x="1" y="5" width="1" height="4" fill="#1F3B1F" />
    <rect x="25" y="5" width="1" height="4" fill="#1F3B1F" />
    <rect x="2" y="9" width="2" height="1" fill="#1F3B1F" />
    <rect x="23" y="9" width="2" height="1" fill="#1F3B1F" />
    <rect x="4" y="10" width="19" height="1" fill="#1F3B1F" />

    {/* Lilypad Top Fill & Veins */}
    <rect x="7" y="2" width="12" height="8" fill="#52BA4A" />
    <rect x="4" y="3" width="19" height="7" fill="#52BA4A" />
    <rect x="2" y="5" width="23" height="4" fill="#52BA4A" />
    {/* Highlights & Rim Shade */}
    <rect x="6" y="2" width="11" height="2" fill="#7CE063" />
    <rect x="4" y="4" width="6" height="2" fill="#7CE063" />
    <rect x="4" y="9" width="19" height="1" fill="#2E7D32" />
    <rect x="12" y="4" width="1" height="5" fill="#2E7D32" />
    <rect x="8" y="6" width="4" height="1" fill="#2E7D32" />
    {/* Characteristic Right V-Notch on Lilypad */}
    <rect x="20" y="5" width="4" height="1" fill="#1F3B1F" />
    <rect x="21" y="6" width="4" height="1" fill="#DFF0C8" />

    {/* Lotad Blue Body Outline */}
    <rect x="5" y="11" width="1" height="7" fill="#1B2A4A" />
    <rect x="21" y="11" width="1" height="7" fill="#1B2A4A" />
    <rect x="6" y="18" width="15" height="1" fill="#1B2A4A" />

    {/* Lotad Blue Body Fill */}
    <rect x="6" y="11" width="15" height="7" fill="#2466B5" />
    <rect x="7" y="12" width="13" height="4" fill="#3B82D6" />
    <rect x="13" y="12" width="5" height="2" fill="#63A8F2" />

    {/* Blinking Eyes */}
    <g className="chibi-blink" style={{ animationDelay: '0.9s' }}>
      <rect x="7" y="13" width="2" height="2" fill="#101827" />
      <rect x="12" y="13" width="2" height="2" fill="#101827" />
      <rect x="7" y="13" width="1" height="1" fill="#FFFFFF" />
      <rect x="12" y="13" width="1" height="1" fill="#FFFFFF" />
    </g>

    {/* Yellow Duck-Like Mouth/Beak */}
    <rect x="5" y="15" width="7" height="1" fill="#4A2816" />
    <rect x="4" y="16" width="8" height="2" fill="#F4C430" />
    <rect x="5" y="17" width="6" height="1" fill="#D99B16" />
    <rect x="4" y="18" width="8" height="1" fill="#4A2816" />

    {/* Four Stubby Blue Legs */}
    <rect x="6" y="19" width="2" height="2" fill="#1D4E8F" />
    <rect x="10" y="19" width="2" height="2" fill="#1D4E8F" />
    <rect x="15" y="19" width="2" height="2" fill="#1D4E8F" />
    <rect x="19" y="19" width="2" height="2" fill="#1D4E8F" />
    <rect x="6" y="21" width="2" height="1" fill="#1B2A4A" />
    <rect x="10" y="21" width="2" height="1" fill="#1B2A4A" />
    <rect x="15" y="21" width="2" height="1" fill="#1B2A4A" />
    <rect x="19" y="21" width="2" height="1" fill="#1B2A4A" />
  </svg>
);

