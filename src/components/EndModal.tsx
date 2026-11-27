import React from 'react';
import { ArrowRight, Home, LogOut, Play, RotateCcw, Users } from 'lucide-react';
import { BERRY_META, STAGE_CONFIG } from '../game/constants.ts';
import type { BerryType, WorldSnapshot } from '../game/types.ts';
import {
  BerrySvg,
  MiniBerryLeafIcon,
  MiniSparkleStarIcon,
} from './BerryIcons.tsx';

interface EndModalProps {
  snapshot: WorldSnapshot;
  isHost: boolean;
  isSolo?: boolean;
  isSpectator?: boolean;
  onResume?: () => void;
  onRestart: () => void;
  onNextStage?: () => void;
  onReturnLobby: () => void;
  onLeaveRoom: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({
  snapshot,
  isHost,
  isSolo = false,
  isSpectator = false,
  onResume,
  onRestart,
  onNextStage,
  onReturnLobby,
  onLeaveRoom,
}) => {
  if (
    snapshot.phase !== 'PAUSED' &&
    snapshot.phase !== 'VICTORY' &&
    snapshot.phase !== 'GAME_OVER'
  ) {
    return null;
  }

  const isPaused = snapshot.phase === 'PAUSED';
  const isVictory = snapshot.phase === 'VICTORY';
  const canAdvanceStage = isVictory && snapshot.stage < 3 && Boolean(onNextStage);
  const stageMeta = STAGE_CONFIG[snapshot.stage];
  const elapsed = Math.max(
    0,
    Math.round(snapshot.totalDuration - snapshot.timeRemaining)
  );
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const healthyTrees = snapshot.plots.filter((p) => p.stage !== 'withered').length;
  const berryTypes: BerryType[] = ['oran', 'pecha', 'sitrus'];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#334427]/45 p-4">
      <div className="relative flex w-full max-w-md flex-col items-center rounded-[28px] border-[4px] border-[#4A2816] bg-[#FFFDF5] p-6 sm:p-7 text-center shadow-[0_10px_0_#4A2816]">
        <div className="pointer-events-none absolute left-4 top-4">
          <MiniBerryLeafIcon size={20} />
        </div>
        <div className="pointer-events-none absolute right-4 top-4">
          <MiniSparkleStarIcon size={20} />
        </div>

        <div
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#4A2816] px-3 py-0.5 font-display text-xs font-bold text-white"
          style={{ backgroundColor: stageMeta.accentColor }}
        >
          <span>{stageMeta.label}</span>
          <span>·</span>
          <span>{stageMeta.title}</span>
        </div>

        <h2
          className={`font-display text-3xl font-bold ${
            isPaused
              ? 'text-[#4A2816]'
              : isVictory
                ? 'text-[#238E55]'
                : 'text-[#C8403A]'
          }`}
        >
          {isPaused
            ? 'Permainan Dijeda'
            : isVictory
              ? 'Panen Berhasil!'
              : 'Kebun Gagal Panen'}
        </h2>

        <p className="mt-2 text-sm font-semibold text-[#634832]">
          {isPaused
            ? 'Tekan Lanjutkan atau tombol Esc/P untuk kembali berkebun.'
            : isVictory
              ? `Semua pesanan Berry Master terpenuhi dalam ${elapsedMin}m ${elapsedSec}d!`
              : snapshot.gameOverReason === 'withered'
                ? 'Seluruh pohon Berry layu sebelum pesanan terpenuhi.'
                : 'Waktu hari kebun habis sebelum seluruh pesanan terpenuhi.'}
        </p>

        {/* Order Progress Breakdown */}
        <div className="mt-5 w-full rounded-[20px] border-[2.5px] border-[#4A2816] bg-[#FDEFC8] p-4 shadow-[0_4px_0_#C8A26E]">
          <div className="grid grid-cols-3 gap-3">
            {berryTypes.map((type) => {
              const cur = snapshot.delivered[type];
              const tgt = snapshot.targets[type];
              const ok = cur >= tgt;
              return (
                <div
                  key={type}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 border-[#C9A36B] bg-[#FFFDF8] py-2"
                >
                  <BerrySvg type={type} size={26} />
                  <span className="text-xs font-bold text-[#6A5648]">
                    {BERRY_META[type].label.replace(' Berry', '')}
                  </span>
                  <span
                    className={`font-mono-tabular text-sm font-bold ${
                      ok ? 'text-[#2D8A56]' : 'text-[#3B2314]'
                    }`}
                  >
                    {cur}/{tgt}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="my-3 h-0.5 bg-[#E2C58E]" />

          <div className="flex items-center justify-around text-xs font-bold text-[#634832]">
            <span className="tabular-nums">
              Pohon Sehat:{' '}
              <strong className="text-[#3B2314]">
                {healthyTrees}/{snapshot.plots.length}
              </strong>
            </span>
            <span className="tabular-nums">
              Pokémon Diusir:{' '}
              <strong className="text-[#3B2314]">
                {snapshot.crittersRepelled}
              </strong>
            </span>
          </div>
        </div>

        {/* Solo vs Online Controls */}
        {isSolo ? (
          <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
            {isPaused && onResume && (
              <button
                type="button"
                onClick={onResume}
                className="flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] bg-[#2EB872] px-6 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-white/35 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#23A362] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Lanjutkan</span>
              </button>
            )}

            {canAdvanceStage && (
              <button
                type="button"
                onClick={onNextStage}
                className="flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] bg-[#2EB872] px-5 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-white/35 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#23A362] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
              >
                <span>Lanjut Stage {snapshot.stage + 1}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] bg-[#EF5B47] px-5 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-white/35 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#E14A36] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Main Lagi</span>
            </button>

            <button
              type="button"
              onClick={onReturnLobby}
              className="flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF8] px-4 py-2.5 font-display text-sm font-bold text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <Home className="h-4 w-4" />
              <span>Kembali ke Menu</span>
            </button>
          </div>
        ) : isHost ? (
          <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
            {canAdvanceStage && (
              <button
                type="button"
                onClick={onNextStage}
                className="flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] bg-[#2EB872] px-5 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-white/35 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#23A362] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
              >
                <span>Lanjut Stage {snapshot.stage + 1}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onReturnLobby}
              className="flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF8] px-4 py-2.5 font-display text-sm font-bold text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              <span>Kembali ke Lobby</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-2 rounded-full border-[3px] border-[#4A2816] bg-[#EF5B47] px-6 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#4A2816] ring-1 ring-inset ring-white/35 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#E14A36] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Main Lagi</span>
            </button>
          </div>
        ) : isSpectator ? (
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <p className="text-xs font-bold text-[#1E3A5F]">
              Anda berada di Mode Penonton. Tetap menunggu ronde berikutnya atau keluar room untuk ikut bermain.
            </p>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF8] px-5 py-2 font-display text-xs font-bold text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar Room</span>
            </button>
          </div>
        ) : (
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <p className="text-xs font-bold text-[#6E4D2F]">
              Menunggu Host memulai ronde baru atau kembali ke Lobby...
            </p>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF8] px-5 py-2 font-display text-xs font-bold text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar Room</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
