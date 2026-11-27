import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { TOOL_CONFIG } from '../game/constants.ts';
import type { InteractPrompt, ToolType } from '../game/types.ts';
import { ToolSvg } from './BerryIcons.tsx';

interface MobileControllerProps {
  visible: boolean;
  active: boolean;
  localPrompt: InteractPrompt | null;
  heldTool: ToolType | null;
  whistleCooldown?: number;
  onMove: (moveX: number, moveY: number) => void;
  onAction: () => void;
}

const JOYSTICK_BASE_SIZE = 124;
const JOYSTICK_KNOB_SIZE = 52;
const JOYSTICK_MAX_RADIUS = 40;
const JOYSTICK_DEADZONE = 0.14;

export const MobileController: React.FC<MobileControllerProps> = ({
  visible,
  active,
  localPrompt,
  heldTool,
  whistleCooldown = 0,
  onMove,
  onAction,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const actionPointerIdRef = useRef<number | null>(null);

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [joystickActive, setJoystickActive] = useState(false);
  const [actionPressed, setActionPressed] = useState(false);

  const resetJoystick = useCallback(() => {
    pointerIdRef.current = null;
    setJoystickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    if (!visible || !active) {
      resetJoystick();
      actionPointerIdRef.current = null;
      setActionPressed(false);
    }
  }, [visible, active, resetJoystick]);

  const updateStickFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);

      const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
      const angle = Math.atan2(dy, dx);
      const kx = dist > 0.001 ? Math.cos(angle) * clampedDist : 0;
      const ky = dist > 0.001 ? Math.sin(angle) * clampedDist : 0;
      setKnobOffset({ x: kx, y: ky });

      const norm = clampedDist / JOYSTICK_MAX_RADIUS;
      if (norm < JOYSTICK_DEADZONE) {
        onMove(0, 0);
        return;
      }

      const scaled = (norm - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE);
      const mx = Math.round(Math.cos(angle) * scaled * 100) / 100;
      const my = Math.round(Math.sin(angle) * scaled * 100) / 100;
      onMove(mx, my);
    },
    [onMove]
  );

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture failure on unsupported environments
    }
    setJoystickActive(true);
    updateStickFromPoint(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateStickFromPoint(e.clientX, e.clientY);
  };

  const handleStickPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    resetJoystick();
  };

  const handleActionPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    actionPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture failure
    }
    setActionPressed(true);
    onAction();
  };

  const handleActionPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (actionPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    actionPointerIdRef.current = null;
    setActionPressed(false);
  };

  if (!visible || !active) return null;

  const isWhistleCooling = heldTool === 'defender_whistle' && whistleCooldown > 0;
  const shortActionLabel = localPrompt
    ? localPrompt.label.split(' ')[0]
    : isWhistleCooling
      ? `${whistleCooldown.toFixed(1)}d`
      : 'Aksi';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 select-none"
      aria-label="Kontrol Sentuh Mobile"
    >
      {/* Left Thumb: Virtual Analog Joystick */}
      <div
        ref={baseRef}
        role="application"
        aria-label="Joystick Gerak"
        onPointerDown={handleStickPointerDown}
        onPointerMove={handleStickPointerMove}
        onPointerUp={handleStickPointerEnd}
        onPointerCancel={handleStickPointerEnd}
        onLostPointerCapture={resetJoystick}
        onContextMenu={(e) => e.preventDefault()}
        className="pointer-events-auto fixed bottom-4 left-4 sm:bottom-6 sm:left-6 flex touch-none items-center justify-center rounded-full border-[3px] border-[#4A2816] bg-[#FFFDF5]/75 backdrop-blur-sm shadow-[0_5px_0_rgba(74,40,22,0.38)]"
        style={{
          width: JOYSTICK_BASE_SIZE,
          height: JOYSTICK_BASE_SIZE,
        }}
      >
        {/* Subtle inner guide ring & cardinal direction markers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded-full border-2 border-dashed border-[#C9A36B]/70"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 text-[9px] font-black text-[#7C583B]/75"
        >
          ▲
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 text-[9px] font-black text-[#7C583B]/75"
        >
          ▼
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 text-[9px] font-black text-[#7C583B]/75"
        >
          ◀
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 text-[9px] font-black text-[#7C583B]/75"
        >
          ▶
        </span>

        {/* Draggable Thumb Knob */}
        <div
          aria-hidden="true"
          className={`pointer-events-none flex items-center justify-center rounded-full border-[3px] border-[#4A2816] shadow-[0_3px_0_#4A2816] transition-colors duration-100 ${
            joystickActive ? 'bg-[#F59E0B]' : 'bg-[#FCE07E]'
          }`}
          style={{
            width: JOYSTICK_KNOB_SIZE,
            height: JOYSTICK_KNOB_SIZE,
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
          }}
        >
          <span className="h-4 w-4 rounded-full bg-white/55" />
        </div>
      </div>

      {/* Right Thumb: Contextual Primary Action Button */}
      <div className="pointer-events-none fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2">
        {localPrompt && (
          <div
            className="max-w-[170px] truncate rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF5]/95 px-3 py-1 font-display text-xs font-bold text-[#3B2314] shadow-[0_3px_0_#4A2816]"
            style={{ borderColor: '#4A2816' }}
          >
            {localPrompt.label}
          </div>
        )}

        <button
          type="button"
          onPointerDown={handleActionPointerDown}
          onPointerUp={handleActionPointerEnd}
          onPointerCancel={handleActionPointerEnd}
          onLostPointerCapture={() => {
            actionPointerIdRef.current = null;
            setActionPressed(false);
          }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={localPrompt ? localPrompt.label : 'Tombol Aksi'}
          className={`pointer-events-auto flex h-[88px] w-[88px] touch-none flex-col items-center justify-center gap-0.5 rounded-full border-[3.5px] border-[#4A2816] font-display font-bold transition-transform duration-75 ${
            localPrompt
              ? 'bg-[#F59E0B] text-white'
              : isWhistleCooling
                ? 'bg-[#FDE68A]/90 text-[#9A3412] opacity-85'
                : 'bg-[#FFFDF5]/90 text-[#4A2816]'
          } ${
            actionPressed
              ? 'translate-y-[3px] scale-95 shadow-[0_2px_0_#4A2816]'
              : 'shadow-[inset_0_3px_0_rgba(255,255,255,0.4),0_6px_0_#4A2816]'
          }`}
        >
          {heldTool && !localPrompt ? (
            <ToolSvg tool={heldTool} size={28} />
          ) : (
            <Zap className="h-7 w-7" />
          )}
          <span className="max-w-[74px] truncate text-xs font-extrabold leading-none">
            {shortActionLabel}
          </span>
        </button>

        {heldTool && (
          <span className="rounded-lg border border-[#4A2816]/40 bg-[#FFFDF5]/85 px-2 py-0.5 text-[10px] font-bold text-[#4A2816] md:hidden">
            {TOOL_CONFIG[heldTool].shortName}
          </span>
        )}
      </div>
    </div>
  );
};
