import React, { useState } from 'react';
import { Maximize2, PanelTopOpen, Sparkles, Users } from 'lucide-react';
import type { OwlbearRoomInvite } from '../game/owlbear.ts';
import { BerryMasterMascot, LotadMascot, PixelBerryMini } from './ChibiMascots.tsx';

interface OwlbearPopoverProps {
  playerName: string;
  invite: OwlbearRoomInvite | null;
  onLaunchModal: (joinCode?: string) => void;
  onExpandInPopover: () => void;
}

export const OwlbearPopover: React.FC<OwlbearPopoverProps> = ({
  playerName,
  invite,
  onLaunchModal,
  onExpandInPopover,
}) => {
  const [launching, setLaunching] = useState(false);

  const handleOpenModal = (code?: string) => {
    setLaunching(true);
    onLaunchModal(code);
    window.setTimeout(() => setLaunching(false), 1200);
  };

  return (
    <div className="cozy-pokopia-backdrop flex h-screen w-screen flex-col justify-between p-2.5">
      <div className="relative flex h-full w-full flex-col justify-between rounded-[16px] border-[3px] border-[#2B4B36] bg-[#4C9E69] p-[4px] shadow-[0_6px_0_rgba(32,58,41,0.3)]">
        <div className="flex h-full w-full flex-col justify-between rounded-[12px] border-[2px] border-[#4A2816] bg-[#F2CA6B] p-[3px]">
          <div className="cozy-pokopia-backdrop flex h-full flex-col justify-between rounded-[9px] border-[2px] border-[#4A2816] px-3.5 py-3">
            {/* Header Mascots & Title */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-3">
                <BerryMasterMascot className="h-14 w-auto" />
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <PixelBerryMini type="oran" size={16} delay="0s" />
                    <PixelBerryMini type="pecha" size={16} delay="0.4s" />
                    <PixelBerryMini type="sitrus" size={16} delay="0.8s" />
                  </div>
                  <h1 className="mt-1 font-display text-lg font-bold leading-tight text-[#3B2314]">
                    Berry Master Farm
                  </h1>
                  <span className="mt-0.5 rounded-full border border-[#E6C25A] bg-[#2D6B4F] px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest text-[#FFF8DE]">
                    OWLBEAR CO-OP
                  </span>
                </div>
                <LotadMascot className="h-12 w-auto" />
              </div>

              <p className="mt-2 text-xs font-semibold leading-snug text-[#4B3624]">
                Halo <span className="font-extrabold text-[#2D6B4F]">{playerName}</span>! Buka kebun Berry langsung di meja Owlbear Rodeo.
              </p>
            </div>

            {/* Active Table Invite Banner */}
            {invite && (
              <div className="rounded-xl border-[2.5px] border-[#4A2816] bg-[#FCE07E] px-3 py-2 shadow-[0_3px_0_#4A2816]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 leading-tight">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A512E]">
                      Undangan Meja
                    </div>
                    <div className="truncate text-xs font-bold text-[#3B2314]">
                      {invite.hostName} ·{' '}
                      <span className="font-mono-tabular font-extrabold">{invite.code}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={launching}
                    onClick={() => handleOpenModal(invite.code)}
                    className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#4A2816] bg-[#2BA668] px-3 py-1.5 font-display text-xs font-bold text-white shadow-[0_2px_0_#4A2816] hover:bg-[#229259] active:translate-y-0.5"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Gabung</span>
                  </button>
                </div>
              </div>
            )}

            {/* Launch Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={launching}
                onClick={() => handleOpenModal()}
                className="flex w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#DF7E13] px-4 py-2.5 font-display text-sm font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#CE710B] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816]"
              >
                <Maximize2 className="h-4 w-4" />
                <span>{launching ? 'Membuka Kebun...' : 'Main Layar Penuh'}</span>
              </button>

              <button
                type="button"
                onClick={onExpandInPopover}
                className="flex w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF5] px-4 py-2 font-display text-xs font-bold text-[#3B2314] shadow-[0_3px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[2px] active:shadow-[0_1px_0_#4A2816]"
              >
                <PanelTopOpen className="h-3.5 w-3.5" />
                <span>Buka di Jendela Popover</span>
              </button>

              <div className="mt-0.5 flex items-center justify-center gap-1 text-[10.5px] font-bold text-[#5C4128]">
                <Sparkles className="h-3 w-3 text-[#D97706]" />
                <span>Mode Solo &amp; Co-op 4–6 Pemain · Kontrol WASD + SPACE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
