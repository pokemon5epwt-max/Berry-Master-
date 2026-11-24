import React from 'react';
import {
  CheckCircle2,
  Clock,
  CloudRain,
  Droplets,
  Flame,
  Hand,
  Pause,
  Sun,
  Trees,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { BERRY_META, TOOL_CONFIG, WEATHER_META } from '../game/constants.ts';
import type { BerryType, InteractPrompt, WorldSnapshot } from '../game/types.ts';
import { BerrySvg, ToolSvg } from './BerryIcons.tsx';

interface GameHudProps {
  snapshot: WorldSnapshot;
  roomCode: string;
  localPlayerId: string | null;
  localPrompt?: InteractPrompt | null;
  muted: boolean;
  onToggleMute: () => void;
  isSolo?: boolean;
  onTogglePause?: () => void;
  onAction?: () => void;
  isOwlbearModal?: boolean;
  onCloseOwlbearModal?: () => void;
}

function formatTimer(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const GameHud: React.FC<GameHudProps> = ({
  snapshot,
  roomCode,
  localPlayerId,
  localPrompt = null,
  muted,
  onToggleMute,
  isSolo = false,
  onTogglePause,
  onAction,
  isOwlbearModal = false,
  onCloseOwlbearModal,
}) => {
  const isUrgent = snapshot.timeRemaining <= 30;
  const isWellLow = snapshot.wellWater <= 3;
  const healthyTrees = snapshot.plots.filter((p) => p.stage !== 'withered').length;
  const berryTypes: BerryType[] = ['oran', 'pecha', 'sitrus'];
  const weatherMeta = WEATHER_META[snapshot.weather];

  const localPlayer =
    snapshot.players.find((p) => p.id === localPlayerId) ??
    snapshot.players[0] ??
    null;
  const teammates = snapshot.players.filter((p) => p.id !== localPlayer?.id);

  const localRack = localPlayer?.heldRackId
    ? snapshot.racks.find((r) => r.rackId === localPlayer.heldRackId) ?? null
    : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-3.5">
      {/* Top HUD: Consistent Warm Rounded Cards */}
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        {/* Left Card: Timer, Garden Health, Well Water & Weather */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border-[3px] border-[#4A2816] bg-[#FFFDF5] px-3.5 py-2 shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-[#F3D88C]/60">
          <div className="flex items-center gap-1.5">
            <Clock
              className={`h-4.5 w-4.5 ${isUrgent ? 'text-[#D64541]' : 'text-[#7C583B]'}`}
            />
            <span
              className={`font-mono-tabular text-base sm:text-lg font-extrabold leading-none ${
                isUrgent ? 'text-[#D64541]' : 'text-[#3B2314]'
              }`}
            >
              {formatTimer(snapshot.timeRemaining)}
            </span>
          </div>

          <span className="h-4 w-px bg-[#E2CCA5]" aria-hidden="true" />

          <div
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#2E6B3E]"
            title="Pohon Berry sehat"
          >
            <Trees className="h-4 w-4 text-[#2EB872]" />
            <span className="font-mono-tabular">
              {healthyTrees}/{snapshot.plots.length}
            </span>
          </div>

          <span className="h-4 w-px bg-[#E2CCA5]" aria-hidden="true" />

          <div
            className={`flex items-center gap-1 text-xs sm:text-sm font-bold ${
              isWellLow ? 'text-[#D64541]' : 'text-[#1E40AF]'
            }`}
            title="Stok air Sumur"
          >
            <Droplets className="h-4 w-4" />
            <span className="font-mono-tabular">
              {snapshot.wellWater}/{snapshot.maxWellWater}
            </span>
            <span className="hidden xl:inline text-[11px] font-semibold text-[#6B5A4D]">
              Sumur
            </span>
          </div>

          <span className="h-4 w-px bg-[#E2CCA5]" aria-hidden="true" />

          <div
            title={weatherMeta.effectHint}
            className="flex items-center gap-1 text-xs sm:text-sm font-extrabold"
            style={{ color: weatherMeta.accentColor }}
          >
            {snapshot.weather === 'rainy' ? (
              <CloudRain className="h-4 w-4" />
            ) : snapshot.weather === 'heatwave' ? (
              <Flame className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="hidden md:inline text-xs">{weatherMeta.label}</span>
          </div>
        </div>

        {/* Center Card: Berry Master Order Targets */}
        <div className="flex items-center gap-3.5 sm:gap-5 rounded-2xl border-[3px] border-[#4A2816] bg-[#FFFDF5] px-4 py-1.5 shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-[#F3D88C]/60">
          <span className="hidden lg:inline font-display text-xs font-bold tracking-wide text-[#7C583B]">
            Pesanan Berry Master
          </span>
          <span className="hidden lg:inline h-5 w-px bg-[#E2CCA5]" aria-hidden="true" />
          <div className="flex items-center gap-3.5 sm:gap-5">
            {berryTypes.map((type) => {
              const cur = snapshot.delivered[type];
              const tgt = snapshot.targets[type];
              const done = cur >= tgt;
              return (
                <div
                  key={type}
                  className={`flex items-center gap-1.5 rounded-xl px-2 py-0.5 transition-colors ${
                    done ? 'bg-[#E5F7EC]' : 'bg-[#FAF3DF]/70'
                  }`}
                >
                  <BerrySvg type={type} size={22} />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10.5px] font-bold text-[#6F5846]">
                      {BERRY_META[type].label.replace(' Berry', '')}
                    </span>
                    <span
                      className={`flex items-center gap-1 font-mono-tabular text-xs sm:text-sm font-extrabold ${
                        done ? 'text-[#1F7A4D]' : 'text-[#3B2314]'
                      }`}
                    >
                      {Math.min(cur, tgt)}/{tgt}
                      {done && <CheckCircle2 className="h-3.5 w-3.5 text-[#2EB872]" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Controls: Mode/Room, Pause (Solo) & Audio Mute */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end rounded-2xl border-[3px] border-[#4A2816] bg-[#FFFDF5] px-3 py-1 shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-[#F3D88C]/60 leading-tight">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#8C6645]">
              {isSolo ? 'Mode' : 'Room'}
            </span>
            <span className="font-mono-tabular text-xs font-extrabold text-[#3B2314]">
              {isSolo ? 'SOLO' : roomCode}
            </span>
          </div>

          {isSolo && onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label="Jeda Permainan"
              title="Jeda Permainan (Esc / P)"
              className="flex h-10 items-center gap-1.5 rounded-full border-[3px] border-[#4A2816] bg-[#FCE07E] px-3.5 font-display text-xs font-bold text-[#3B2314] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFD447] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] focus-visible:outline-2 focus-visible:outline-[#E07A5F] whitespace-nowrap"
            >
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Jeda</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            title={muted ? 'Nyalakan Suara (M)' : 'Matikan Suara (M)'}
            className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#4A2816] bg-[#FFFDF5] text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF3CC] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] focus-visible:outline-2 focus-visible:outline-[#E07A5F]"
          >
            {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
          </button>

          {isOwlbearModal && onCloseOwlbearModal && (
            <button
              type="button"
              onClick={onCloseOwlbearModal}
              aria-label="Tutup dan kembali ke meja Owlbear"
              title="Kembali ke meja Owlbear"
              className="flex h-10 items-center gap-1 rounded-full border-[3px] border-[#4A2816] bg-[#FFFDF5] px-3 font-display text-xs font-bold text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFE4E2] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar: Informative Local Player Tool & Action Panel + Compact Teammate Cards */}
      <div className="flex flex-wrap items-end justify-center gap-2.5">
        {localPlayer && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2.5 sm:gap-3 rounded-2xl border-[3px] border-[#4A2816] bg-[#FFFDF5] px-3.5 py-2 shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-[#F3D88C]/80">
            {/* Local Player Identity */}
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#4A2816] text-xs font-extrabold text-white shadow-[0_2px_0_#4A2816]"
                style={{ backgroundColor: localPlayer.capColor }}
              >
                P{localPlayer.slotIndex + 1}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="max-w-[110px] truncate text-xs font-extrabold text-[#3B2314]">
                  {localPlayer.name} (Anda)
                </span>
                <span className="text-[10.5px] font-semibold text-[#7A624E]">
                  Gerak: <span className="font-mono-tabular font-bold text-[#4A2816]">WASD</span>
                </span>
              </div>
            </div>

            <span className="h-7 w-px bg-[#E2CCA5]" aria-hidden="true" />

            {/* Held Tool Informative Status */}
            {localPlayer.heldTool && localRack ? (
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#4A2816]"
                  style={{
                    backgroundColor: `${TOOL_CONFIG[localPlayer.heldTool].accentColor}26`,
                  }}
                >
                  <ToolSvg tool={localPlayer.heldTool} size={23} />
                </span>

                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-extrabold text-[#3B2314]">
                    {TOOL_CONFIG[localPlayer.heldTool].shortName}
                  </span>

                  {localPlayer.heldTool === 'wailmer_pail' && (
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`font-mono-tabular text-[11px] font-extrabold ${
                          localRack.pailWater === 0 ? 'text-[#D64541]' : 'text-[#1E40AF]'
                        }`}
                      >
                        Air: {localRack.pailWater}/{localRack.maxPailWater}
                      </span>
                      <div className="flex items-center gap-0.5" aria-hidden="true">
                        {Array.from({ length: localRack.maxPailWater }, (_, i) => (
                          <span
                            key={i}
                            className={`h-2 w-2.5 rounded-sm border border-[#1E3A8A]/40 ${
                              i < localRack.pailWater ? 'bg-[#3B82F6]' : 'bg-[#E2E8F0]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {localPlayer.heldTool === 'harvest_basket' && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`font-mono-tabular text-[11px] font-extrabold ${
                          localRack.basketBerries.length >= localRack.maxBasketCapacity
                            ? 'text-[#B45309]'
                            : 'text-[#6F4518]'
                        }`}
                      >
                        Berry: {localRack.basketBerries.length}/{localRack.maxBasketCapacity}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: localRack.maxBasketCapacity }, (_, i) => {
                          const b = localRack.basketBerries[i];
                          return b ? (
                            <BerrySvg key={i} type={b} size={15} />
                          ) : (
                            <span
                              key={i}
                              className="h-3.5 w-3.5 rounded-full border border-dashed border-[#BFA582] bg-[#FAF3DF]"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {localPlayer.heldTool === 'garden_rake' && (
                    <span className="text-[11px] font-semibold text-[#2E6B3E]">
                      Bersihkan gulma &amp; lumut
                    </span>
                  )}

                  {localPlayer.heldTool === 'defender_whistle' && (
                    <span className="text-[11px] font-semibold text-[#C2410C]">
                      Usir hama di sekitar kebun
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[#C7B08B] bg-[#FAF3DF] text-[#8C7057]">
                  <Hand className="h-4 w-4" />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-[#5C4433]">Tangan Kosong</span>
                  <span className="text-[10.5px] font-semibold text-[#8C7057]">
                    Ambil alat di Gudang kiri
                  </span>
                </div>
              </div>
            )}

            <span className="h-7 w-px bg-[#E2CCA5]" aria-hidden="true" />

            {/* Clear Interactive Action Button */}
            <button
              type="button"
              onClick={onAction}
              disabled={!onAction || snapshot.phase !== 'PLAYING'}
              className={`flex items-center gap-1.5 rounded-full border-[2.5px] border-[#4A2816] px-3.5 py-1.5 font-display text-xs font-bold transition-transform duration-150 whitespace-nowrap ${
                localPrompt
                  ? 'bg-[#F59E0B] text-white shadow-[0_3px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#E08A00] active:translate-y-[2px] active:shadow-[0_1px_0_#4A2816]'
                  : 'bg-[#FAF3DF] text-[#5C4433] shadow-[0_3px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#F3E5C2] active:translate-y-[2px] active:shadow-[0_1px_0_#4A2816]'
              }`}
              title="Tekan SPACE atau klik untuk melakukan aksi"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="font-mono-tabular rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-extrabold">
                SPACE
              </span>
              <span>{localPrompt ? localPrompt.label : 'Aksi'}</span>
            </button>
          </div>
        )}

        {/* Co-op Teammate Mini Status Cards */}
        {teammates.map((p) => {
          const rack = p.heldRackId
            ? snapshot.racks.find((r) => r.rackId === p.heldRackId) ?? null
            : null;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-2xl border-[2.5px] border-[#4A2816] bg-[#FFFDF5]/95 px-2.5 py-1.5 shadow-[0_3px_0_#4A2816]"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#4A2816] text-[10px] font-extrabold text-white"
                style={{ backgroundColor: p.capColor }}
              >
                P{p.slotIndex + 1}
              </span>
              <span className="max-w-[74px] truncate text-[11px] font-bold text-[#3B2314]">
                {p.name}
              </span>
              {p.heldTool && rack ? (
                <div className="flex items-center gap-1 border-l border-[#E2CCA5] pl-1.5">
                  <ToolSvg tool={p.heldTool} size={18} />
                  {p.heldTool === 'wailmer_pail' && (
                    <span className="font-mono-tabular text-[11px] font-bold text-[#1E40AF]">
                      {rack.pailWater}/{rack.maxPailWater}
                    </span>
                  )}
                  {p.heldTool === 'harvest_basket' && (
                    <span className="font-mono-tabular text-[11px] font-bold text-[#B45309]">
                      {rack.basketBerries.length}/{rack.maxBasketCapacity}
                    </span>
                  )}
                </div>
              ) : (
                <span className="border-l border-[#E2CCA5] pl-1.5 text-[10.5px] font-semibold text-[#8C7766]">
                  Kosong
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
