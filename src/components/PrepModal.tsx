import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Dices,
  Eye,
  Minus,
  MinusCircle,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../game/audio.ts';
import {
  SKILL_CHECK_DC,
  SKILL_CHECK_MAX_MOD,
  SKILL_CHECK_MIN_MOD,
  STAGE_CONFIG,
  TOOL_CONFIG,
  TOOL_SKILL_CHECK_META,
} from '../game/constants.ts';
import type { ToolType, WorldSnapshot } from '../game/types.ts';
import { PixelToolSvg } from './BerryIcons.tsx';

interface PrepModalProps {
  snapshot: WorldSnapshot;
  localPlayerId: string | null;
  isHost: boolean;
  isSolo: boolean;
  isSpectator: boolean;
  onSelectRack: (rackId: string) => void;
  onRollCheck: (modifier: number) => void;
  onStartRound: () => void;
}

const D20Badge: React.FC<{
  value: number | string;
  rolling?: boolean;
  tone?: 'idle' | 'success' | 'fail';
}> = ({ value, rolling = false, tone = 'idle' }) => {
  const fill =
    tone === 'success'
      ? '#2BA668'
      : tone === 'fail'
        ? '#9E7B66'
        : '#D97706';
  return (
    <div
      className={`relative flex h-16 w-16 shrink-0 items-center justify-center transition-transform duration-200 ${
        rolling ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_3px_0_#4A2816]">
        <polygon
          points="32,3 57,17 57,47 32,61 7,47 7,17"
          fill={fill}
          stroke="#4A2816"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <polygon
          points="32,10 50,21 50,43 32,54 14,43 14,21"
          fill="rgba(255,255,255,0.16)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-mono-tabular absolute text-lg font-extrabold text-white drop-shadow-[0_1.5px_0_#4A2816]">
        {value}
      </span>
    </div>
  );
};

export const PrepModal: React.FC<PrepModalProps> = ({
  snapshot,
  localPlayerId,
  isHost,
  isSolo,
  isSpectator,
  onSelectRack,
  onRollCheck,
  onStartRound,
}) => {
  const [modifier, setModifier] = useState<number>(0);
  const [rollingAnim, setRollingAnim] = useState<boolean>(false);

  const localPlayer = useMemo(() => {
    if (isSpectator) return null;
    return (
      snapshot.players.find((p) => p.id === localPlayerId) ??
      snapshot.players[0] ??
      null
    );
  }, [isSpectator, localPlayerId, snapshot.players]);

  const skillCheck = localPlayer?.skillCheck ?? null;
  const selectedRackId = skillCheck?.rackId ?? null;
  const selectedRack = selectedRackId
    ? snapshot.racks.find((r) => r.rackId === selectedRackId) ?? null
    : null;
  const selectedTool: ToolType | null = selectedRack?.toolType ?? null;
  const checkMeta = selectedTool ? TOOL_SKILL_CHECK_META[selectedTool] : null;
  const hasRolled = Boolean(skillCheck?.rolled);

  // Reset local roll animation state on new PREP round
  useEffect(() => {
    if (!hasRolled) {
      setRollingAnim(false);
    }
  }, [hasRolled, snapshot.stage]);

  // Count duplicate tool types (for 5-6 player rooms with 2 Pails / 2 Baskets)
  const toolTotals = useMemo(() => {
    const counts: Record<ToolType, number> = {
      wailmer_pail: 0,
      harvest_basket: 0,
      garden_rake: 0,
      defender_whistle: 0,
    };
    for (const r of snapshot.racks) {
      counts[r.toolType] += 1;
    }
    return counts;
  }, [snapshot.racks]);

  const toolRunningIndex: Record<ToolType, number> = {
    wailmer_pail: 0,
    harvest_basket: 0,
    garden_rake: 0,
    defender_whistle: 0,
  };

  const allRolled =
    snapshot.players.length > 0 &&
    snapshot.players.every((p) => p.skillCheck.rolled);
  const stageMeta = STAGE_CONFIG[snapshot.stage];

  const handleAdjustModifier = (delta: number) => {
    if (hasRolled || isSpectator) return;
    setModifier((prev) =>
      Math.max(SKILL_CHECK_MIN_MOD, Math.min(SKILL_CHECK_MAX_MOD, prev + delta))
    );
  };

  const handleTriggerRoll = () => {
    if (!selectedRack || hasRolled || rollingAnim || isSpectator) return;
    soundManager.unlock();
    soundManager.playDiceRoll();
    setRollingAnim(true);
    window.setTimeout(() => {
      setRollingAnim(false);
      onRollCheck(modifier);
    }, 220);
  };

  if (snapshot.phase !== 'PREP') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Persiapan Alat dan Uji Keahlian DnD"
      className="fixed inset-0 z-30 flex items-start sm:items-center justify-center overflow-y-auto bg-[#2D3E22]/55 p-3 sm:p-5 backdrop-blur-[2px]"
    >
      <div className="my-auto w-full max-w-4xl rounded-[24px] border-[4px] border-[#4A2816] bg-[#FFFDF5] p-4 sm:p-6 shadow-[0_10px_0_#4A2816] ring-1 ring-inset ring-[#F3D88C]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#E6D2A7] pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-md border-2 border-[#4A2816] px-2.5 py-0.5 font-display text-xs font-bold text-white"
                style={{ backgroundColor: stageMeta.accentColor }}
              >
                {stageMeta.label}
              </span>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#3B2314]">
                Pilih Alat &amp; Uji Keahlian DnD
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6E4F33]">
              {isSpectator
                ? 'Menyaksikan tim memilih alat dan melempar 1d20 sebelum ronde dimulai.'
                : isSolo
                  ? 'Pilih alat awal, atur modifier (-5 s.d. +10), lalu lempar 1d20 melawan DC 14 untuk buff permanen.'
                  : 'Setiap pemain memilih 1 slot alat unik (terkunci sepanjang ronde), atur modifier, lalu lempar 1d20 melawan DC 14.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border-2 border-[#4A2816] bg-[#FCE07E] px-3 py-1.5 font-mono-tabular text-xs font-extrabold text-[#3B2314] shadow-[0_2px_0_#4A2816]">
            <Dices className="h-4 w-4" />
            <span>Target DC {SKILL_CHECK_DC}</span>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left 7 Cols: Unique Warehouse Rack Cards */}
          <div className="lg:col-span-7">
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#6A4A2E]">
              <span>Slot Alat Gudang ({snapshot.racks.length} Tersedia)</span>
              {!isSolo && !isSpectator && (
                <span className="font-semibold normal-case text-[#7D5E42]">
                  Terkunci 1 ronde penuh
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {snapshot.racks.map((rack) => {
                toolRunningIndex[rack.toolType] += 1;
                const slotNum = toolRunningIndex[rack.toolType];
                const hasDuplicate = toolTotals[rack.toolType] > 1;
                const toolCfg = TOOL_CONFIG[rack.toolType];
                const meta = TOOL_SKILL_CHECK_META[rack.toolType];

                const isMine =
                  !isSpectator &&
                  localPlayer !== null &&
                  rack.occupiedByPlayerId === localPlayer.id;
                const isTakenByOther =
                  rack.occupiedByPlayerId !== null && !isMine;
                const disabled = isSpectator || hasRolled || isTakenByOther;

                return (
                  <button
                    key={rack.rackId}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectRack(rack.rackId)}
                    className={`group flex items-start gap-3 rounded-2xl border-[2.5px] p-3 text-left transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F] ${
                      isMine
                        ? 'border-[#4A2816] bg-[#FCE07E] shadow-[0_4px_0_#4A2816] -translate-y-0.5'
                        : isTakenByOther
                          ? 'cursor-not-allowed border-[#CBBAA4] bg-[#F3EAD3]/75 opacity-75'
                          : hasRolled || isSpectator
                            ? 'cursor-default border-[#D8C49E] bg-[#FAF3DF]/85'
                            : 'border-[#4A2816] bg-[#FAF3DF] shadow-[0_3px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#FFF6DA] active:translate-y-[2px]'
                    }`}
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#4A2816] bg-[#FFFDF5]"
                      style={{
                        boxShadow: `inset 0 0 0 2px ${toolCfg.accentColor}30`,
                      }}
                    >
                      <PixelToolSvg tool={rack.toolType} size={38} />
                    </div>

                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate font-display text-sm font-bold text-[#3B2314]">
                          {toolCfg.shortName}
                          {hasDuplicate ? ` #${slotNum}` : ''}
                        </span>
                      </div>

                      <div className="mt-0.5 text-[11px] font-bold text-[#6E4F33]">
                        {meta.skillName} ({meta.abilityCode})
                      </div>

                      <div className="mt-1 text-[11px] font-semibold leading-snug text-[#4E3A28]">
                        Buff: <strong className="text-[#2E6B3E]">{meta.buffName}</strong>
                      </div>

                      <div className="mt-1.5 text-[10.5px] font-extrabold">
                        {isMine ? (
                          <span className="text-[#9A3412]">Pilihan Anda</span>
                        ) : isTakenByOther ? (
                          <span className="text-[#7A624E]">
                            Dipakai: {rack.occupiedByName}
                          </span>
                        ) : (
                          <span className="text-[#238E55]">Tersedia</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: DnD 1d20 Skill Check & Modifier */}
          <div className="flex flex-col justify-between rounded-2xl border-[3px] border-[#4A2816] bg-[#FAF3DF] p-4 shadow-[inset_0_0_0_2px_#E6C25A] lg:col-span-5">
            {isSpectator ? (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                <Eye className="h-9 w-9 text-[#2563EB]" />
                <h3 className="mt-2 font-display text-lg font-bold text-[#1E3A5F]">
                  Mode Penonton
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#335C81]">
                  Tim sedang memilih alat dan melakukan uji 1d20. Permainan akan segera dimulai setelah semua selesai melempar.
                </p>
              </div>
            ) : !selectedRack || !checkMeta ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <D20Badge value="d20" />
                <h3 className="mt-3 font-display text-base font-bold text-[#3B2314]">
                  Pilih Alat Terlebih Dahulu
                </h3>
                <p className="mt-1 max-w-[240px] text-xs font-semibold text-[#6F553D]">
                  Klik salah satu slot alat yang tersedia di sebelah kiri untuk membuka Skill Check DnD dan melempar dadu 1d20.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A5A33]">
                        Skill Check · {checkMeta.skillName} ({checkMeta.abilityCode})
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#3B2314]">
                        {checkMeta.checkTitle}
                      </h3>
                    </div>
                    <span className="rounded-lg border-2 border-[#4A2816] bg-[#FFFDF5] px-2.5 py-0.5 font-mono-tabular text-xs font-extrabold text-[#3B2314] whitespace-nowrap">
                      DC {SKILL_CHECK_DC}
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-xl border-2 border-[#D7BE8E] bg-[#FFFDF5] p-2.5 text-xs leading-snug">
                    <div className="font-bold text-[#2E6B3E]">
                      Lolos (≥ 14) · {checkMeta.buffName}:{' '}
                      <span className="font-semibold text-[#3B2314]">
                        {checkMeta.buffDesc}
                      </span>
                    </div>
                    <div className="mt-1 font-semibold text-[#7A624E]">
                      Gagal (&lt; 14): Tidak terjadi apa-apa (status alat standar).
                    </div>
                  </div>

                  {/* Modifier Control (-5 to +10) */}
                  <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-[#4A2816] bg-[#FFFDF5] px-3 py-2">
                    <div className="leading-tight">
                      <div className="text-xs font-extrabold text-[#3B2314]">
                        Modifier Karakter
                      </div>
                      <div className="text-[10.5px] font-semibold text-[#7A624E]">
                        Rentang {SKILL_CHECK_MIN_MOD} sampai +{SKILL_CHECK_MAX_MOD}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={hasRolled || modifier <= SKILL_CHECK_MIN_MOD}
                        onClick={() => handleAdjustModifier(-1)}
                        aria-label="Kurangi modifier"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#4A2816] bg-[#FAF3DF] text-[#3B2314] shadow-[0_2px_0_#4A2816] transition-transform hover:bg-[#FCE07E] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span
                        className="font-mono-tabular min-w-[44px] text-center text-lg font-extrabold text-[#3B2314]"
                        aria-live="polite"
                      >
                        {hasRolled && skillCheck
                          ? skillCheck.modifier >= 0
                            ? `+${skillCheck.modifier}`
                            : skillCheck.modifier
                          : modifier >= 0
                            ? `+${modifier}`
                            : modifier}
                      </span>

                      <button
                        type="button"
                        disabled={hasRolled || modifier >= SKILL_CHECK_MAX_MOD}
                        onClick={() => handleAdjustModifier(1)}
                        aria-label="Tambah modifier"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#4A2816] bg-[#FAF3DF] text-[#3B2314] shadow-[0_2px_0_#4A2816] transition-transform hover:bg-[#FCE07E] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Roll Trigger OR Outcome */}
                <div className="mt-4">
                  {hasRolled && skillCheck ? (
                    <div
                      className={`flex items-center gap-3 rounded-2xl border-[2.5px] p-3 ${
                        skillCheck.success
                          ? 'border-[#238E55] bg-[#E5F7EC]'
                          : 'border-[#B69B7D] bg-[#F5EFE2]'
                      }`}
                    >
                      <D20Badge
                        value={skillCheck.naturalRoll ?? '?'}
                        tone={skillCheck.success ? 'success' : 'fail'}
                      />
                      <div className="min-w-0 flex-1 leading-snug">
                        <div className="font-mono-tabular text-xs font-extrabold text-[#3B2314]">
                          1d20 ({skillCheck.naturalRoll}){' '}
                          {skillCheck.modifier >= 0
                            ? `+ ${skillCheck.modifier}`
                            : `- ${Math.abs(skillCheck.modifier)}`}{' '}
                          = Total {skillCheck.totalRoll} (DC {skillCheck.dc})
                        </div>
                        <div
                          className={`mt-1 flex items-center gap-1.5 text-sm font-extrabold ${
                            skillCheck.success ? 'text-[#1F7A4D]' : 'text-[#6F553D]'
                          }`}
                        >
                          {skillCheck.success ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#238E55]" />
                              <span>Berhasil! {checkMeta.buffName} Aktif</span>
                            </>
                          ) : (
                            <>
                              <MinusCircle className="h-4 w-4 shrink-0 text-[#8C7057]" />
                              <span>Gagal — Tidak terjadi apa-apa</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <D20Badge
                        value={rollingAnim ? '...' : 'd20'}
                        rolling={rollingAnim}
                      />
                      <button
                        type="button"
                        disabled={rollingAnim}
                        onClick={handleTriggerRoll}
                        className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-full border-[3px] border-[#4A2816] bg-[#DF7E13] px-5 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#CE710B] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] disabled:opacity-70 whitespace-nowrap"
                      >
                        <Dices className="h-5 w-5" />
                        <span>{rollingAnim ? 'Melempar...' : 'Lempar 1d20'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Team Preparation Status & Start Round Footer */}
        <div className="mt-4 border-t-2 border-[#E6D2A7] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#4B3824]">
            <span>Status Tim ({snapshot.players.length} Pemain)</span>
            <span className="font-mono-tabular">
              {snapshot.players.filter((p) => p.skillCheck.rolled).length}/
              {snapshot.players.length} Selesai Lempar
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.players.map((p) => {
              const chosenTool = p.skillCheck.toolType;
              const toolName = chosenTool
                ? TOOL_CONFIG[chosenTool].shortName
                : 'Belum pilih alat';
              const rolled = p.skillCheck.rolled;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border-2 border-[#D4BD92] bg-[#FAF3DF]/90 px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#4A2816] text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: p.capColor }}
                    >
                      P{p.slotIndex + 1}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate font-bold text-[#3B2314]">
                        {p.name}
                        {p.id === localPlayerId ? ' (Anda)' : ''}
                      </div>
                      <div className="truncate text-[10.5px] font-semibold text-[#6F553D]">
                        {toolName}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-mono-tabular shrink-0 text-[11px] font-extrabold whitespace-nowrap ${
                      !rolled
                        ? 'text-[#8C7057]'
                        : p.skillCheck.success
                          ? 'text-[#1F7A4D]'
                          : 'text-[#6F553D]'
                    }`}
                  >
                    {!rolled
                      ? chosenTool
                        ? 'Siap lempar'
                        : 'Memilih...'
                      : p.skillCheck.success
                        ? `${p.skillCheck.totalRoll} · Buff`
                        : `${p.skillCheck.totalRoll} · Standar`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {isSolo ? (
              <button
                type="button"
                disabled={!allRolled}
                onClick={onStartRound}
                className={`flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] px-6 py-2.5 font-display text-base font-bold text-white transition-transform duration-150 whitespace-nowrap ${
                  allRolled
                    ? 'bg-[#2EB872] shadow-[0_4px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#23A362] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816]'
                    : 'cursor-not-allowed bg-[#CBBAA4] opacity-75 shadow-[0_2px_0_#4A2816]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Masuk ke Kebun</span>
              </button>
            ) : isHost ? (
              <>
                <span className="text-xs font-bold text-[#6E4F33]">
                  {allRolled
                    ? 'Semua pemain selesai melempar! Segera masuk kebun...'
                    : 'Menunggu seluruh pemain memilih alat dan melempar 1d20...'}
                </span>
                <button
                  type="button"
                  disabled={!allRolled}
                  onClick={onStartRound}
                  className={`flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] px-6 py-2.5 font-display text-base font-bold text-white transition-transform duration-150 whitespace-nowrap ${
                    allRolled
                      ? 'bg-[#2EB872] shadow-[0_4px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#23A362] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816]'
                      : 'cursor-not-allowed bg-[#CBBAA4] opacity-75 shadow-[0_2px_0_#4A2816]'
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Mulai Ronde</span>
                </button>
              </>
            ) : (
              <span className="text-xs font-bold text-[#6E4F33]">
                {allRolled
                  ? 'Semua pemain siap! Memasuki kebun...'
                  : 'Menunggu rekan tim menyelesaikan lemparan 1d20...'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
