import React, { useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  LogOut,
  Play,
  PlusCircle,
  Send,
  Sparkles,
  Tag,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  MIN_ROOM_PLAYERS_TO_START,
  TOOL_CONFIG,
  TOOL_ORDER,
} from '../game/constants.ts';
import type { OwlbearRoomInvite } from '../game/owlbear.ts';
import type { RoomInfo, ScreenMode } from '../game/types.ts';
import {
  BerrySvg,
  MiniBerryLeafIcon,
  MiniPokeBallIcon,
  MiniSparkleStarIcon,
  PixelToolSvg,
  TitleLockupSvg,
} from './BerryIcons.tsx';
import {
  BerryMasterMascot,
  LotadMascot,
  PixelBerryMini,
} from './ChibiMascots.tsx';

interface LobbyOverlayProps {
  screenMode: ScreenMode;
  playerId: string | null;
  playerName: string;
  onChangeName: (name: string) => void;
  room: RoomInfo | null;
  errorMsg: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onStartSolo: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onToggleReady: (nextReady: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isOwlbearModal?: boolean;
  onCloseOwlbearModal?: () => void;
  obrInvite?: OwlbearRoomInvite | null;
  onBroadcastOwlbearInvite?: () => void;
  obrBroadcastSent?: boolean;
  wsOffline?: boolean;
  coopTransport?: 'ws' | 'owlbear' | 'none';
}

const RpgCornerStuds: React.FC<{ size?: 'lg' | 'md' | 'sm' }> = ({
  size = 'md',
}) => {
  const dim =
    size === 'lg'
      ? 'h-4 w-4 border-[2.5px]'
      : size === 'sm'
        ? 'h-2 w-2 border-[1.5px]'
        : 'h-3 w-3 border-2';
  const offset = size === 'lg' ? '-m-1' : size === 'sm' ? '-m-0.5' : '-m-1';

  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 ${offset} ${dim} rounded-[3px] border-[#4A2816] bg-[#F7D469] shadow-[inset_1px_1px_0_#FFF8D6]`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-0 top-0 ${offset} ${dim} rounded-[3px] border-[#4A2816] bg-[#F7D469] shadow-[inset_1px_1px_0_#FFF8D6]`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 left-0 ${offset} ${dim} rounded-[3px] border-[#4A2816] bg-[#F7D469] shadow-[inset_1px_1px_0_#FFF8D6]`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 right-0 ${offset} ${dim} rounded-[3px] border-[#4A2816] bg-[#F7D469] shadow-[inset_1px_1px_0_#FFF8D6]`}
      />
    </>
  );
};

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  screenMode,
  playerId,
  playerName,
  onChangeName,
  room,
  errorMsg,
  muted,
  onToggleMute,
  onStartSolo,
  onCreateRoom,
  onJoinRoom,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  isOwlbearModal = false,
  onCloseOwlbearModal,
  obrInvite = null,
  onBroadcastOwlbearInvite,
  obrBroadcastSent = false,
  wsOffline = false,
  coopTransport = 'none',
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const me = room?.members.find((m) => m.id === playerId) ?? null;
  const isHost = Boolean(me?.isHost);
  const guests = room ? room.members.filter((m) => !m.isHost) : [];
  const allGuestsReady = guests.length > 0 && guests.every((g) => g.isReady);
  const canHostStart =
    Boolean(room) &&
    room!.members.length >= MIN_ROOM_PLAYERS_TO_START &&
    allGuestsReady;
  const isConnecting = screenMode === 'CONNECTING';
  const isHomeView = screenMode === 'HOME_LOBBY' || isConnecting;

  return (
    <div className="cozy-pokopia-backdrop fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      {/* Top-Left Close Button when inside Owlbear Modal */}
      {isOwlbearModal && onCloseOwlbearModal && (
        <button
          type="button"
          onClick={onCloseOwlbearModal}
          aria-label="Tutup dan kembali ke meja Owlbear"
          className="fixed left-3.5 top-3.5 z-50 flex h-10 items-center gap-1.5 rounded-full border-[3px] border-[#2C4E38] bg-[#FFF8E2] px-3.5 font-display text-xs font-bold text-[#3B2314] shadow-[0_3px_0_#2C4E38] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FCE89C] active:translate-y-[2px] active:shadow-[0_1px_0_#2C4E38]"
        >
          <X className="h-4 w-4" />
          <span>Meja Owlbear</span>
        </button>
      )}

      {/* Top-Right Audio Toggle */}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
        title={muted ? 'Nyalakan Suara (M)' : 'Matikan Suara (M)'}
        className="fixed right-3.5 top-3.5 z-50 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#2C4E38] bg-[#FFF8E2] text-[#3B2314] shadow-[0_3px_0_#2C4E38] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FCE89C] active:translate-y-[2px] active:shadow-[0_1px_0_#2C4E38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F]"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Ornate Emerald-Gold RPG Outer Frame */}
      <div className="relative w-full max-w-[1040px] rounded-[20px] border-[3.5px] border-[#2B4B36] bg-[#4C9E69] p-[5px] shadow-[0_8px_0_rgba(32,58,41,0.34)]">
        <RpgCornerStuds size="lg" />

        <div className="rounded-[15px] border-[2.5px] border-[#4A2816] bg-[#F2CA6B] p-[4px]">
          <div className="cozy-pokopia-backdrop relative flex flex-col items-center rounded-[11px] border-[2.5px] border-[#4A2816] px-4 py-4 sm:px-7 sm:py-5">
            {/* Header Row: Berry Master Elder (Left) + Curved Logo & Intro (Center) + Lotad (Right) */}
            <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
              <div className="pointer-events-none hidden sm:flex shrink-0 items-center justify-center pl-1 md:pl-3">
                <BerryMasterMascot className="h-24 w-auto md:h-32" />
              </div>

              <div className="mx-auto flex min-w-0 flex-1 max-w-[600px] flex-col items-center">
                <TitleLockupSvg />
                {isHomeView && (
                  <p className="mt-1 max-w-[540px] text-center text-xs sm:text-sm font-bold leading-snug text-[#3D2E1E]">
                    Bantu sang Berry Master berkebun untuk memenuhi kebutuhan Berry yang ada di Hoenn, Bantu seorang diri atau ajak trainer lain untuk membantu
                  </p>
                )}
              </div>

              <div className="pointer-events-none hidden sm:flex shrink-0 items-center justify-center pr-1 md:pr-3">
                <LotadMascot className="h-20 w-auto md:h-26" />
              </div>
            </div>

            {isHomeView && (
              <>
                {/* Nameplate Input with Docked Forest-Green Tab */}
                <div className="mt-3 w-full max-w-[490px]">
                  <div className="relative flex flex-col">
                    <label
                      htmlFor="player-name-input"
                      className="relative z-10 -mb-2.5 ml-2 inline-flex w-fit items-center gap-1.5 rounded-full border-[2.5px] border-[#E6C25A] bg-[#2D6B4F] px-3.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#FFF8DE] shadow-[0_2px_0_#1D3E2D]"
                    >
                      <MiniSparkleStarIcon size={12} />
                      <span>Papan Nama Petani</span>
                    </label>
                    <div className="flex items-center overflow-hidden rounded-[12px] border-[3px] border-[#4A2816] bg-[#FFF5D8] shadow-[inset_0_0_0_2px_#E6C25A,0_3px_0_rgba(74,40,22,0.22)] focus-within:ring-2 focus-within:ring-[#3586E8]">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border-r-[2.5px] border-[#4A2816] bg-[#F3D88C] pt-1 text-[#4A2816]">
                        <Tag className="h-4 w-4" />
                      </div>
                      <input
                        id="player-name-input"
                        type="text"
                        maxLength={14}
                        value={playerName}
                        onChange={(e) => onChangeName(e.target.value)}
                        placeholder="Masukkan nama Anda..."
                        className="h-11 w-full bg-transparent px-3.5 pt-1 text-sm font-bold text-[#3B2314] placeholder:font-medium placeholder:text-[#A08568] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {coopTransport === 'owlbear' && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#2D6B4F] bg-[#E5F7EC] px-3.5 py-1 text-[11px] font-extrabold text-[#1E523A]">
                    <span className="h-2 w-2 rounded-full bg-[#2BA668]" aria-hidden="true" />
                    <span>Co-op aktif via Server Meja Owlbear Rodeo</span>
                  </div>
                )}

                {obrInvite && (
                  <div className="mt-3 flex w-full max-w-[540px] flex-wrap items-center justify-between gap-2 rounded-xl border-[2.5px] border-[#4A2816] bg-[#FCE07E] px-3.5 py-2 shadow-[0_3px_0_#4A2816]">
                    <div className="text-xs font-bold text-[#3B2314]">
                      Undangan Meja Owlbear dari <span className="font-extrabold">{obrInvite.hostName}</span> · Kode{' '}
                      <span className="font-mono-tabular font-extrabold">{obrInvite.code}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => onJoinRoom(obrInvite.code)}
                      className="flex items-center gap-1.5 rounded-full border-2 border-[#4A2816] bg-[#2BA668] px-3.5 py-1 font-display text-xs font-bold text-white shadow-[0_2px_0_#4A2816] hover:bg-[#229259] active:translate-y-0.5 disabled:opacity-60"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Gabung Meja</span>
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="mt-3 w-full max-w-2xl rounded-xl border-[2.5px] border-[#992B25] bg-[#FFE4E2] px-4 py-2 text-center text-xs font-bold text-[#8E221D] shadow-[0_3px_0_#992B25]"
                  >
                    {errorMsg}
                  </div>
                )}

                {/* 3 Handheld Mode Cards with Gold Corner Brackets */}
                <div className="mt-4 grid w-full grid-cols-1 gap-3.5 md:grid-cols-3">
                  {/* Card 1: Mode Solo */}
                  <div className="rpg-card-shell relative flex flex-col justify-between rounded-[14px] bg-[#FCE07E] p-4">
                    <RpgCornerStuds size="md" />
                    <div className="pointer-events-none absolute right-3.5 top-3.5 flex items-center gap-1">
                      <PixelBerryMini type="pecha" size={18} delay="0.1s" />
                      <PixelBerryMini type="sitrus" size={18} delay="0.5s" />
                      <MiniSparkleStarIcon size={17} color="#FFFDF4" />
                    </div>
                    <div className="pr-14">
                      <h2 className="font-display text-[17px] font-bold tracking-tight text-[#2B1B10]">
                        Mode Solo (1 Pemain)
                      </h2>
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#4C321D]">
                        Main langsung tanpa perlu room! Target pesanan disesuaikan untuk 1 petani (7 Oran, 5 Pecha, 3 Sitrus) dengan tombol Jeda (Esc/P).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onStartSolo}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#DF7E13] px-5 py-2.5 font-display text-[15px] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#CE710B] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A2816] whitespace-nowrap"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Main Solo</span>
                    </button>
                  </div>

                  {/* Card 2: Buat Room Baru */}
                  <div className="rpg-card-shell relative flex flex-col justify-between rounded-[14px] bg-[#F4A298] p-4">
                    <RpgCornerStuds size="md" />
                    <div className="pointer-events-none absolute right-3.5 top-3.5 flex items-center gap-1">
                      <PixelBerryMini type="pecha" size={18} delay="0.6s" />
                      <MiniPokeBallIcon size={18} />
                    </div>
                    <div className="pr-12">
                      <h2 className="font-display text-[17px] font-bold tracking-tight text-[#2B1B10]">
                        Buat Room Baru (Host)
                      </h2>
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#572620]">
                        Buat ruang tunggu online untuk 4–6 pemain dan bagikan kode room kepada teman satu tim.
                      </p>
                      {isConnecting && (
                        <p className="mt-2 text-[11px] font-bold text-[#7F2921]">
                          {wsOffline
                            ? 'Server WebSocket offline — pakai Mode Solo atau buka lewat Owlbear Rodeo untuk Co-op di meja.'
                            : 'Menghubungkan ke server online...'}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={onCreateRoom}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-[#4A2816] px-5 py-2.5 font-display text-[15px] font-bold text-white transition-transform duration-150 whitespace-nowrap ${
                        isConnecting
                          ? 'cursor-not-allowed bg-[#CCA8A2] opacity-80 shadow-[0_2px_0_#4A2816]'
                          : 'bg-[#D94136] shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_4px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#C6352A] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A2816]'
                      }`}
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Buat Room Baru</span>
                    </button>
                  </div>

                  {/* Card 3: Gabung Room */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isConnecting) onJoinRoom(joinCode);
                    }}
                    className="rpg-card-shell relative flex flex-col justify-between rounded-[14px] bg-[#8FD5B5] p-4"
                  >
                    <RpgCornerStuds size="md" />
                    <div className="pointer-events-none absolute right-3.5 top-3.5 flex items-center gap-1">
                      <PixelBerryMini type="oran" size={18} delay="1s" />
                      <MiniBerryLeafIcon size={18} />
                    </div>
                    <div className="pr-12">
                      <h2 className="font-display text-[17px] font-bold tracking-tight text-[#1E3B2B]">
                        Gabung Room (Pakai Kode)
                      </h2>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-[#204D36]">
                        Masukkan kode room 6 huruf/angka yang dibuat oleh Host room.
                      </p>
                      {isConnecting && wsOffline && (
                        <p className="mt-1.5 text-[11px] font-bold text-[#1B4332]">
                          Mode Co-op butuh server WebSocket aktif.
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center overflow-hidden rounded-[10px] border-[2.5px] border-[#4A2816] bg-[#FFF5D8] shadow-[inset_0_0_0_1.5px_#E6C25A] focus-within:ring-2 focus-within:ring-[#247BA0]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-r-[2px] border-[#4A2816] bg-[#CDEEDB] text-[#235F40]">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        maxLength={8}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="CONTOH: BERRY7"
                        aria-label="Kode Room"
                        className="h-9 w-full bg-transparent px-2.5 font-mono-tabular text-xs font-bold uppercase tracking-widest text-[#3B2314] placeholder:text-[11px] placeholder:font-semibold placeholder:tracking-wide placeholder:text-[#8E7C64] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isConnecting}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full border-[2.5px] border-[#4A2816] px-5 py-2.5 font-display text-[15px] font-bold text-white transition-transform duration-150 whitespace-nowrap ${
                        isConnecting
                          ? 'cursor-not-allowed bg-[#9BBDAE] opacity-80 shadow-[0_2px_0_#4A2816]'
                          : 'bg-[#2BA668] shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_4px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#229259] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A2816]'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Gabung Room</span>
                    </button>
                  </form>
                </div>

                {/* Bottom Item Pocket & Controls Bar */}
                <div className="rpg-card-shell relative mt-4 w-full rounded-[14px] bg-[#FAF3DF] px-3.5 py-3">
                  <RpgCornerStuds size="md" />
                  <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12">
                    {/* Left Control Keycaps Box */}
                    <div className="relative flex flex-col items-center justify-center rounded-[10px] border-2 border-[#B38E52] bg-[#FFFBF0] px-3 py-2 shadow-[inset_0_0_0_1.5px_#EBD08A] md:col-span-3">
                      <RpgCornerStuds size="sm" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5A3B22]">
                        • Kontrol Anda •
                      </span>
                      <div className="mt-1.5 flex w-full flex-col gap-1.5 pl-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 min-w-[50px] items-center justify-center rounded-md border-2 border-[#4A2816] bg-[#FFFDF8] px-1.5 font-mono-tabular text-[11px] font-extrabold text-[#3B2314] shadow-[0_2px_0_#4A2816]">
                            WASD
                          </span>
                          <span className="text-xs font-bold text-[#4A301C]">
                            Gerak
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 min-w-[50px] items-center justify-center rounded-md border-2 border-[#4A2816] bg-[#FFFDF8] px-1.5 font-mono-tabular text-[11px] font-extrabold text-[#3B2314] shadow-[0_2px_0_#4A2816]">
                            SPACE
                          </span>
                          <span className="text-xs font-bold text-[#4A301C]">
                            Aksi
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right 4 Pixel-Art Tools with Vertical Dividers */}
                    <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:grid-cols-4 sm:divide-x divide-[#DFCFA9] md:col-span-9">
                      {TOOL_ORDER.map((toolId) => {
                        const tool = TOOL_CONFIG[toolId];
                        return (
                          <div
                            key={toolId}
                            tabIndex={0}
                            className="group relative flex cursor-help flex-col items-center justify-center px-2 py-1.5 text-center transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3586E8]"
                          >
                            <div className="flex h-12 items-center justify-center">
                              <PixelToolSvg tool={toolId} size={44} />
                            </div>
                            <div className="mt-0.5 font-display text-xs font-bold text-[#2E1E12]">
                              {tool.name}
                            </div>
                            <div className="text-[11px] font-semibold text-[#6F553D]">
                              {tool.shortName}
                            </div>

                            {/* Hover / Focus Tooltip */}
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-48 -translate-x-1/2 rounded-xl border-[2.5px] border-[#4A2816] bg-[#FFFDF4] px-3 py-2 text-center opacity-0 shadow-[0_4px_0_#4A2816] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                              <div className="font-display text-xs font-bold text-[#3B2314]">
                                {tool.name}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold leading-snug text-[#634832]">
                                {tool.roleHint}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="mt-2 border-t border-[#DFCFA9] pt-2 text-center text-[11px] font-bold text-[#5C4128]">
                    Pompa Sumur Air dengan SPACE saat stok menipis · Pantau cuaca (Cerah/Hujan/Panas) · Halau semua Pokémon liar sebelum senja!
                  </p>
                </div>
              </>
            )}

            {screenMode === 'ROOM_LOBBY' && room && (
              <div className="mt-3 w-full">
                {/* Room Code Nameplate Header + Targets */}
                <div className="rpg-card-shell relative flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[#FAF3DF] px-4 py-3">
                  <RpgCornerStuds size="md" />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center overflow-hidden rounded-[10px] border-[2.5px] border-[#4A2816] bg-[#FFF5D8]">
                      <div className="flex h-11 w-10 items-center justify-center border-r-2 border-[#4A2816] bg-[#FCE07E] text-[#4A2816]">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div className="px-3 py-1 leading-tight">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#7A512E]">
                          Kode Room
                        </span>
                        <span className="font-mono-tabular text-xl font-extrabold tracking-widest text-[#3B2314]">
                          {room.code}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex h-10 items-center gap-1.5 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF8] px-4 text-xs font-bold text-[#4A2816] shadow-[0_3px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[2px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#2D8A56]" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin Kode</span>
                        </>
                      )}
                    </button>

                    {isHost && onBroadcastOwlbearInvite && (
                      <button
                        type="button"
                        onClick={onBroadcastOwlbearInvite}
                        className="flex h-10 items-center gap-1.5 rounded-full border-[2.5px] border-[#4A2816] bg-[#2D6B4F] px-4 text-xs font-bold text-[#FFF8DE] shadow-[0_3px_0_#1D3E2D] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#245A41] active:translate-y-[2px] whitespace-nowrap"
                      >
                        {obrBroadcastSent ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#A7F3D0]" />
                            <span>Terkirim ke Meja</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Undang Meja Owlbear</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Scaled Order Preview */}
                  <div className="flex items-center gap-3.5 rounded-xl border-2 border-[#C9A36B] bg-[#FFF9EA] px-3.5 py-2 text-xs font-bold text-[#4A2816]">
                    <span className="hidden sm:inline text-[#7A512E]">Target Pesanan</span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <BerrySvg type="oran" size={18} /> {room.targets.oran}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <BerrySvg type="pecha" size={18} /> {room.targets.pecha}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <BerrySvg type="sitrus" size={18} /> {room.targets.sitrus}
                    </span>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border-[2.5px] border-[#992B25] bg-[#FFE4E2] px-4 py-2 text-center text-xs font-bold text-[#8E221D]"
                  >
                    {errorMsg}
                  </div>
                )}

                {/* 6 Trainer Slots */}
                <div className="mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#4B3824]">
                    <span className="tabular-nums">
                      Daftar Pemain ({room.members.length}/{room.maxPlayers})
                      {coopTransport === 'owlbear' ? ' · Server Meja Owlbear' : ''}
                    </span>
                    <span>Kontrol: W A S D · SPACE</span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: room.maxPlayers }, (_, slot) => {
                      const member = room.members.find((m) => m.slotIndex === slot);
                      if (!member) {
                        return (
                          <div
                            key={slot}
                            className="flex items-center justify-between rounded-xl border-2 border-dashed border-[#8EA882] bg-[#F5FBE8] px-3.5 py-2.5 text-xs font-semibold text-[#6F8267]"
                          >
                            <span>Slot {slot + 1} · Menunggu pemain...</span>
                          </div>
                        );
                      }
                      const isSelf = member.id === playerId;
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between rounded-xl border-[2.5px] px-3.5 py-2.5 shadow-[0_3px_0_rgba(74,40,22,0.22)] ${
                            isSelf
                              ? 'border-[#4A2816] bg-[#FCE07E]'
                              : 'border-[#4A2816] bg-[#FAF3DF]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#4A2816] text-xs font-extrabold text-white"
                              style={{ backgroundColor: member.capColor }}
                            >
                              P{slot + 1}
                            </span>
                            <div className="min-w-0 leading-tight">
                              <div className="truncate text-sm font-bold text-[#3B2314]">
                                {member.name}
                                {isSelf ? ' (Anda)' : ''}
                              </div>
                              <div className="text-[11px] font-semibold text-[#6F553D]">
                                {member.isHost ? 'Host Room' : 'Tamu'}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-extrabold whitespace-nowrap ${
                              member.isHost
                                ? 'text-[#B45309]'
                                : member.isReady
                                  ? 'text-[#1F7A4D]'
                                  : 'text-[#8C7057]'
                            }`}
                          >
                            {member.isHost
                              ? 'Host'
                              : member.isReady
                                ? 'Siap'
                                : 'Menunggu'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onLeaveRoom}
                    className="flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] bg-[#FFFDF8] px-5 py-2.5 font-display text-sm font-bold text-[#4A2816] shadow-[0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FFF2CC] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar Room</span>
                  </button>

                  {isHost ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-[#4B3824]">
                        {room.members.length < MIN_ROOM_PLAYERS_TO_START
                          ? 'Menunggu minimal 1 teman bergabung...'
                          : !allGuestsReady
                            ? 'Menunggu semua tamu menekan Siap...'
                            : 'Semua siap! Silakan mulai.'}
                      </span>
                      <button
                        type="button"
                        disabled={!canHostStart}
                        onClick={onStartGame}
                        className={`flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] px-6 py-2.5 font-display text-base font-bold text-white transition-transform duration-150 whitespace-nowrap ${
                          canHostStart
                            ? 'bg-[#D94136] shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_4px_0_#4A2816] hover:-translate-y-0.5 hover:bg-[#C6352A] active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816]'
                            : 'cursor-not-allowed bg-[#CBBAA4] opacity-80 shadow-[0_3px_0_#4A2816]'
                        }`}
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Mulai Permainan</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleReady(!me?.isReady)}
                      className={`flex items-center gap-2 rounded-full border-[2.5px] border-[#4A2816] px-6 py-2.5 font-display text-base font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_4px_0_#4A2816] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-[0_1px_0_#4A2816] whitespace-nowrap ${
                        me?.isReady
                          ? 'bg-[#DF7E13] hover:bg-[#CE710B]'
                          : 'bg-[#2BA668] hover:bg-[#229259]'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>{me?.isReady ? 'Batal Siap' : 'Saya Siap!'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
