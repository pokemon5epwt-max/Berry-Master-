import OBR from '@owlbear-rodeo/sdk';
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS_TO_START,
  PLAYER_PALETTES,
  getOrderTargets,
} from './constants.ts';
import {
  type OwlbearRoomInvite,
  broadcastOwlbearRoomInvite,
  clearOwlbearRoomInvite,
  isOwlbearAvailable,
} from './owlbear.ts';
import { ServerFarmEngine } from './serverEngine.ts';
import type {
  FxEvent,
  LobbyMember,
  RoomInfo,
  RoomPhase,
  SpectatorOffer,
  StageLevel,
  WorldSnapshot,
} from './types.ts';

export const OWLBEAR_COOP_CHANNEL = 'berry-master-farm/coop-sync';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const HOST_TICK_MS = 50; // 20Hz simulation
const SNAPSHOT_EVERY_N_TICKS = 2; // 10Hz network broadcast (~100ms), interpolated smoothly at 60fps
const GUEST_STALE_MS = 20000;
const HOST_STALE_MS = 22000;

interface HostRoomRecord {
  code: string;
  phase: RoomPhase;
  stage: StageLevel;
  hostId: string;
  members: LobbyMember[];
  spectators: Map<string, string>;
}

export interface OwlbearCoopCallbacks {
  onRoomJoined: (playerId: string, room: RoomInfo) => void;
  onSpectateOffer: (offer: SpectatorOffer) => void;
  onSpectatingJoined: (playerId: string, room: RoomInfo) => void;
  onRoomUpdate: (room: RoomInfo) => void;
  onRoomLeft: () => void;
  onError: (message: string) => void;
  onWorldSnapshot: (snapshot: WorldSnapshot) => void;
  onWorldFx: (events: FxEvent[]) => void;
  onInvite: (invite: OwlbearRoomInvite | null) => void;
}

function sanitizeName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 14);
  return cleaned.length > 0 ? cleaned : 'Petani';
}

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function findNextFreeSlot(members: LobbyMember[]): number {
  const used = new Set(members.map((m) => m.slotIndex));
  for (let i = 0; i < MAX_ROOM_PLAYERS; i++) {
    if (!used.has(i)) return i;
  }
  return 0;
}

export class OwlbearCoopClient {
  private callbacks: OwlbearCoopCallbacks;
  private myId: string | null = null;
  private role: 'GM' | 'PLAYER' = 'PLAYER';
  private unsubBroadcast: (() => void) | null = null;

  // Host state
  private hostRoom: HostRoomRecord | null = null;
  private hostEngine: ServerFarmEngine | null = null;
  private hostTickTimer: number | null = null;
  private hostMaintainTimer: number | null = null;
  private hostTickCount = 0;
  private memberLastSeen = new Map<string, number>();

  // Guest state
  private guestRoomCode: string | null = null;
  private isGuestSpectator = false;
  private guestPingTimer: number | null = null;
  private lastHostSeenAt = 0;
  private pendingJoin: { code: string; timer: number } | null = null;

  constructor(callbacks: OwlbearCoopCallbacks) {
    this.callbacks = callbacks;
  }

  public isAttached(): boolean {
    return this.myId !== null;
  }

  public isInRoom(): boolean {
    return this.hostRoom !== null || this.guestRoomCode !== null;
  }

  public isHosting(): boolean {
    return this.hostRoom !== null;
  }

  public getPlayerId(): string | null {
    return this.myId;
  }

  public attach(connectionId: string, role: 'GM' | 'PLAYER'): void {
    if (this.myId === connectionId && this.unsubBroadcast) {
      this.role = role;
      return;
    }
    this.detachListeners();
    this.myId = connectionId;
    this.role = role;

    if (!isOwlbearAvailable()) return;

    try {
      this.unsubBroadcast = OBR.broadcast.onMessage(
        OWLBEAR_COOP_CHANNEL,
        (event) => {
          this.handleIncoming(event.connectionId, event.data);
        }
      );
      this.sendRemote({ type: 'coop:discover' });
    } catch {
      // Ignore if Owlbear broadcast is unavailable
    }
  }

  public createRoom(rawName: string, stage: StageLevel = 1): void {
    if (!this.myId) {
      this.callbacks.onError('Koneksi meja Owlbear belum siap.');
      return;
    }

    this.resetAllRoomState(false);

    const name = sanitizeName(rawName);
    const code = generateRoomCode();
    const palette = PLAYER_PALETTES[0];
    const hostMember: LobbyMember = {
      id: this.myId,
      name,
      slotIndex: 0,
      capColor: palette.capColor,
      scarfColor: palette.scarfColor,
      isHost: true,
      isReady: true,
    };

    this.hostRoom = {
      code,
      phase: 'LOBBY',
      stage,
      hostId: this.myId,
      members: [hostMember],
      spectators: new Map<string, string>(),
    };

    const roomInfo = this.toHostRoomInfo();
    this.callbacks.onRoomJoined(this.myId, roomInfo);
    this.announceHostInvite();
    this.startHostMaintenanceLoop();
  }

  public joinRoom(rawCode: string, rawName: string): void {
    if (!this.myId) {
      this.callbacks.onError('Koneksi meja Owlbear belum siap.');
      return;
    }

    const code = rawCode.trim().toUpperCase();
    if (!code) {
      this.callbacks.onError('Masukkan kode room terlebih dahulu.');
      return;
    }

    this.resetAllRoomState(false);
    const name = sanitizeName(rawName);

    const timeoutId = window.setTimeout(() => {
      if (this.pendingJoin && this.pendingJoin.code === code) {
        this.pendingJoin = null;
        this.callbacks.onError(
          'Room tidak ditemukan di meja Owlbear. Pastikan Host sedang membuka lobi room.'
        );
      }
    }, 3200);

    this.pendingJoin = { code, timer: timeoutId };
    this.sendRemote({
      type: 'coop:join_req',
      code,
      name,
    });
  }

  public spectateRoom(rawCode: string, rawName: string): void {
    if (!this.myId) {
      this.callbacks.onError('Koneksi meja Owlbear belum siap.');
      return;
    }

    const code = rawCode.trim().toUpperCase();
    if (!code) {
      this.callbacks.onError('Masukkan kode room terlebih dahulu.');
      return;
    }

    this.resetAllRoomState(false);
    const name = sanitizeName(rawName);

    const timeoutId = window.setTimeout(() => {
      if (this.pendingJoin && this.pendingJoin.code === code) {
        this.pendingJoin = null;
        this.callbacks.onError(
          'Room tidak ditemukan di meja Owlbear atau sudah ditutup.'
        );
      }
    }, 3200);

    this.pendingJoin = { code, timer: timeoutId };
    this.sendRemote({
      type: 'coop:spectate_req',
      code,
      name,
    });
  }

  public setReady(isReady: boolean): void {
    if (!this.guestRoomCode || this.isGuestSpectator) return;
    this.sendRemote({
      type: 'coop:ready',
      code: this.guestRoomCode,
      isReady: Boolean(isReady),
    });
  }

  public startGame(): void {
    if (!this.hostRoom) return;
    const members = this.hostRoom.members;
    const guests = members.filter((m) => !m.isHost);
    const allGuestsReady = guests.length > 0 && guests.every((g) => g.isReady);
    if (members.length < MIN_ROOM_PLAYERS_TO_START || !allGuestsReady) {
      this.callbacks.onError(
        'Minimal 2 pemain dan semua tamu harus menekan Siap.'
      );
      return;
    }
    this.startHostEngine();
  }

  public setStage(stage: StageLevel): void {
    if (!this.hostRoom || this.hostRoom.phase !== 'LOBBY') return;
    this.hostRoom.stage = stage;
    const roomInfo = this.toHostRoomInfo();
    this.sendRemote({ type: 'coop:room_update', room: roomInfo });
    this.callbacks.onRoomUpdate(roomInfo);
  }

  public restartGame(): void {
    if (!this.hostRoom) return;
    this.startHostEngine();
  }

  public nextStage(): void {
    if (!this.hostRoom || this.hostRoom.phase !== 'VICTORY') return;
    this.hostRoom.stage = Math.min(3, this.hostRoom.stage + 1) as StageLevel;
    this.startHostEngine();
  }

  public returnToLobby(): void {
    if (!this.hostRoom) return;
    this.stopHostEngineLoop();
    this.hostEngine = null;
    this.hostRoom.phase = 'LOBBY';
    for (const m of this.hostRoom.members) {
      m.isReady = m.isHost;
    }
    const roomInfo = this.toHostRoomInfo();
    this.sendRemote({ type: 'coop:room_update', room: roomInfo });
    this.callbacks.onRoomUpdate(roomInfo);
    this.announceHostInvite();
  }

  public leaveRoom(): void {
    this.resetAllRoomState(true);
    this.callbacks.onRoomLeft();
  }

  public selectPrepRack(rackId: string): void {
    if (this.isGuestSpectator) return;
    if (this.hostRoom && this.hostRoom.phase === 'PREP' && this.hostEngine && this.myId) {
      if (this.hostEngine.selectPrepRack(this.myId, rackId)) {
        const snapshot = this.hostEngine.getSnapshot();
        this.callbacks.onWorldSnapshot(snapshot);
        this.sendRemote({
          type: 'coop:snapshot',
          code: this.hostRoom.code,
          snapshot,
        });
      }
      return;
    }
    if (this.guestRoomCode) {
      this.sendRemote({
        type: 'coop:prep_select',
        code: this.guestRoomCode,
        rackId,
      });
    }
  }

  public rollPrepSkillCheck(modifier: number): void {
    if (this.isGuestSpectator) return;
    if (this.hostRoom && this.hostRoom.phase === 'PREP' && this.hostEngine && this.myId) {
      if (this.hostEngine.rollPrepSkillCheck(this.myId, modifier)) {
        const fx = this.hostEngine.step(0);
        const snapshot = this.hostEngine.getSnapshot();
        this.callbacks.onWorldSnapshot(snapshot);
        if (fx.length > 0) {
          this.callbacks.onWorldFx(fx);
          this.sendRemote({
            type: 'coop:fx',
            code: this.hostRoom.code,
            events: fx,
          });
        }
        this.sendRemote({
          type: 'coop:snapshot',
          code: this.hostRoom.code,
          snapshot,
        });
      }
      return;
    }
    if (this.guestRoomCode) {
      this.sendRemote({
        type: 'coop:prep_roll',
        code: this.guestRoomCode,
        modifier,
      });
    }
  }

  public startRoundFromPrep(): void {
    if (!this.hostRoom || this.hostRoom.phase !== 'PREP' || !this.hostEngine) return;
    if (this.hostEngine.startRoundFromPrep()) {
      this.hostRoom.phase = this.hostEngine.phase;
      const roomInfo = this.toHostRoomInfo();
      const snapshot = this.hostEngine.getSnapshot();
      this.sendRemote({ type: 'coop:room_update', room: roomInfo });
      this.sendRemote({
        type: 'coop:snapshot',
        code: this.hostRoom.code,
        snapshot,
      });
      this.callbacks.onRoomUpdate(roomInfo);
      this.callbacks.onWorldSnapshot(snapshot);
    }
  }

  public sendInput(moveX: number, moveY: number): void {
    if (this.isGuestSpectator) return;
    if (this.hostRoom && this.hostRoom.phase === 'PLAYING' && this.hostEngine && this.myId) {
      this.hostEngine.setPlayerInput(this.myId, moveX, moveY);
      return;
    }
    if (this.guestRoomCode) {
      this.sendRemote({
        type: 'coop:input',
        code: this.guestRoomCode,
        moveX,
        moveY,
      });
    }
  }

  public sendAction(): void {
    if (this.isGuestSpectator) return;
    if (this.hostRoom && this.hostRoom.phase === 'PLAYING' && this.hostEngine && this.myId) {
      this.hostEngine.handlePlayerAction(this.myId);
      return;
    }
    if (this.guestRoomCode) {
      this.sendRemote({
        type: 'coop:action',
        code: this.guestRoomCode,
      });
    }
  }

  public broadcastInvite(): void {
    if (!this.hostRoom) return;
    this.announceHostInvite();
  }

  public dispose(): void {
    this.resetAllRoomState(true);
    this.detachListeners();
    this.myId = null;
  }

  private detachListeners(): void {
    if (this.unsubBroadcast) {
      this.unsubBroadcast();
      this.unsubBroadcast = null;
    }
  }

  private sendRemote(payload: unknown): void {
    if (!isOwlbearAvailable()) return;
    void OBR.broadcast
      .sendMessage(OWLBEAR_COOP_CHANNEL, payload, { destination: 'REMOTE' })
      .catch(() => {});
  }

  private toHostRoomInfo(): RoomInfo {
    const room = this.hostRoom!;
    return {
      code: room.code,
      phase: room.phase,
      stage: room.stage,
      maxPlayers: MAX_ROOM_PLAYERS,
      hostId: room.hostId,
      members: room.members.map((m) => ({ ...m })),
      spectatorCount: room.spectators.size,
      targets: getOrderTargets(Math.max(2, room.members.length), room.stage),
    };
  }

  private announceHostInvite(): void {
    if (!this.hostRoom) return;
    const hostMember = this.hostRoom.members.find((m) => m.isHost);
    const hostName = hostMember?.name ?? 'Host';
    const payload: OwlbearRoomInvite = {
      code: this.hostRoom.code,
      hostName,
      updatedAt: Date.now(),
    };
    this.sendRemote({
      type: 'coop:invite_announce',
      invite: payload,
    });
    void broadcastOwlbearRoomInvite(this.hostRoom.code, hostName, this.role);
  }

  private startHostMaintenanceLoop(): void {
    this.stopHostMaintenanceLoop();
    this.hostMaintainTimer = window.setInterval(() => {
      const room = this.hostRoom;
      if (!room) return;
      const now = Date.now();
      let changed = false;

      for (let i = room.members.length - 1; i >= 0; i--) {
        const m = room.members[i];
        if (m.isHost) continue;
        const lastSeen = this.memberLastSeen.get(m.id) ?? now;
        if (now - lastSeen > GUEST_STALE_MS) {
          room.members.splice(i, 1);
          this.memberLastSeen.delete(m.id);
          if (this.hostEngine) {
            this.hostEngine.removePlayer(m.id);
          }
          changed = true;
        }
      }

      for (const spectatorId of Array.from(room.spectators.keys())) {
        const lastSeen = this.memberLastSeen.get(spectatorId) ?? now;
        if (now - lastSeen > GUEST_STALE_MS) {
          room.spectators.delete(spectatorId);
          this.memberLastSeen.delete(spectatorId);
          changed = true;
        }
      }

      if (changed) {
        const info = this.toHostRoomInfo();
        this.sendRemote({ type: 'coop:room_update', room: info });
        this.callbacks.onRoomUpdate(info);
      } else if (room.phase === 'LOBBY') {
        // Periodic keepalive in lobby so guests stay synced
        this.sendRemote({ type: 'coop:room_update', room: this.toHostRoomInfo() });
      }
    }, 4500);
  }

  private stopHostMaintenanceLoop(): void {
    if (this.hostMaintainTimer !== null) {
      clearInterval(this.hostMaintainTimer);
      this.hostMaintainTimer = null;
    }
  }

  private startHostEngine(): void {
    if (!this.hostRoom) return;
    this.stopHostEngineLoop();

    this.hostEngine = new ServerFarmEngine(
      this.hostRoom.members,
      this.hostRoom.stage
    );
    this.hostRoom.phase = this.hostEngine.phase;
    this.hostTickCount = 0;

    const roomInfo = this.toHostRoomInfo();
    const initialSnapshot = this.hostEngine.getSnapshot();

    this.sendRemote({ type: 'coop:room_update', room: roomInfo });
    this.sendRemote({
      type: 'coop:snapshot',
      code: this.hostRoom.code,
      snapshot: initialSnapshot,
    });
    void clearOwlbearRoomInvite(this.role);

    this.callbacks.onRoomUpdate(roomInfo);
    this.callbacks.onWorldSnapshot(initialSnapshot);

    this.hostTickTimer = window.setInterval(() => {
      const room = this.hostRoom;
      const engine = this.hostEngine;
      if (!room || !engine || (room.phase !== 'PREP' && room.phase !== 'PLAYING')) {
        this.stopHostEngineLoop();
        return;
      }

      this.hostTickCount++;
      const dt = HOST_TICK_MS / 1000;
      const prevPhase = engine.phase;
      const fx = engine.step(dt);
      const snapshot = engine.getSnapshot();

      this.callbacks.onWorldSnapshot(snapshot);
      if (fx.length > 0) {
        this.callbacks.onWorldFx(fx);
        this.sendRemote({
          type: 'coop:fx',
          code: room.code,
          events: fx,
        });
      }

      const phaseChanged = engine.phase !== prevPhase;
      const ended = engine.phase === 'VICTORY' || engine.phase === 'GAME_OVER';
      if (phaseChanged || ended || this.hostTickCount % SNAPSHOT_EVERY_N_TICKS === 0) {
        this.sendRemote({
          type: 'coop:snapshot',
          code: room.code,
          snapshot,
        });
      }

      if (phaseChanged) {
        room.phase = engine.phase;
        const updatedInfo = this.toHostRoomInfo();
        this.sendRemote({ type: 'coop:room_update', room: updatedInfo });
        this.callbacks.onRoomUpdate(updatedInfo);
      }

      if (ended) {
        room.phase = engine.phase;
        this.stopHostEngineLoop();
      }
    }, HOST_TICK_MS);
  }

  private stopHostEngineLoop(): void {
    if (this.hostTickTimer !== null) {
      clearInterval(this.hostTickTimer);
      this.hostTickTimer = null;
    }
  }

  private startGuestKeepalive(): void {
    this.stopGuestKeepalive();
    this.lastHostSeenAt = Date.now();
    this.guestPingTimer = window.setInterval(() => {
      if (!this.guestRoomCode) {
        this.stopGuestKeepalive();
        return;
      }
      if (Date.now() - this.lastHostSeenAt > HOST_STALE_MS) {
        this.guestRoomCode = null;
        this.isGuestSpectator = false;
        this.stopGuestKeepalive();
        this.callbacks.onRoomLeft();
        this.callbacks.onError('Koneksi ke Host Owlbear terputus.');
        return;
      }
      this.sendRemote({
        type: 'coop:ping',
        code: this.guestRoomCode,
      });
    }, 5000);
  }

  private stopGuestKeepalive(): void {
    if (this.guestPingTimer !== null) {
      clearInterval(this.guestPingTimer);
      this.guestPingTimer = null;
    }
  }

  private resetAllRoomState(notifyPeers: boolean): void {
    if (this.pendingJoin) {
      clearTimeout(this.pendingJoin.timer);
      this.pendingJoin = null;
    }

    if (this.hostRoom) {
      const code = this.hostRoom.code;
      this.stopHostEngineLoop();
      this.stopHostMaintenanceLoop();
      this.hostEngine = null;
      this.hostRoom = null;
      this.memberLastSeen.clear();
      if (notifyPeers) {
        this.sendRemote({
          type: 'coop:host_closed',
          code,
          reason: 'Host menutup room Owlbear.',
        });
        void clearOwlbearRoomInvite(this.role);
      }
    }

    if (this.guestRoomCode) {
      const code = this.guestRoomCode;
      this.guestRoomCode = null;
      this.isGuestSpectator = false;
      this.stopGuestKeepalive();
      if (notifyPeers) {
        this.sendRemote({ type: 'coop:leave', code });
      }
    }
  }

  private handleIncoming(senderId: string, rawData: unknown): void {
    if (!this.myId || senderId === this.myId) return;
    if (!rawData || typeof rawData !== 'object') return;
    const msg = rawData as Record<string, unknown>;
    const type = msg.type;
    if (typeof type !== 'string') return;

    if (type === 'coop:discover') {
      if (this.hostRoom && this.hostRoom.phase === 'LOBBY') {
        this.announceHostInvite();
      }
      return;
    }

    if (type === 'coop:invite_announce' && msg.invite && typeof msg.invite === 'object') {
      const inv = msg.invite as Record<string, unknown>;
      if (typeof inv.code === 'string' && inv.code.trim()) {
        this.callbacks.onInvite({
          code: inv.code.trim().toUpperCase(),
          hostName:
            typeof inv.hostName === 'string' && inv.hostName.trim()
              ? inv.hostName
              : 'Host',
          updatedAt: typeof inv.updatedAt === 'number' ? inv.updatedAt : Date.now(),
        });
      }
      return;
    }

    // Host message handling
    if (this.hostRoom) {
      const room = this.hostRoom;

      if (type === 'coop:join_req' && typeof msg.code === 'string') {
        if (msg.code.trim().toUpperCase() !== room.code) return;

        if (room.phase !== 'LOBBY') {
          this.sendRemote({
            type: 'coop:spectate_offer',
            targetId: senderId,
            offer: {
              code: room.code,
              stage: room.stage,
              playerCount: room.members.length,
              maxPlayers: MAX_ROOM_PLAYERS,
            },
          });
          return;
        }

        const existing = room.members.find((m) => m.id === senderId);
        const guestName = sanitizeName(
          typeof msg.name === 'string' ? msg.name : 'Petani'
        );
        this.memberLastSeen.set(senderId, Date.now());

        if (existing) {
          existing.name = guestName;
          const info = this.toHostRoomInfo();
          this.sendRemote({ type: 'coop:joined', targetId: senderId, room: info });
          this.sendRemote({ type: 'coop:room_update', room: info });
          this.callbacks.onRoomUpdate(info);
          return;
        }

        if (room.members.length >= MAX_ROOM_PLAYERS) {
          this.sendRemote({
            type: 'coop:error',
            targetId: senderId,
            message: 'Room sudah penuh (maksimal 6 pemain).',
          });
          return;
        }

        const slot = findNextFreeSlot(room.members);
        const palette = PLAYER_PALETTES[slot % PLAYER_PALETTES.length];
        room.members.push({
          id: senderId,
          name: guestName,
          slotIndex: slot,
          capColor: palette.capColor,
          scarfColor: palette.scarfColor,
          isHost: false,
          isReady: false,
        });

        const info = this.toHostRoomInfo();
        this.sendRemote({ type: 'coop:joined', targetId: senderId, room: info });
        this.sendRemote({ type: 'coop:room_update', room: info });
        this.callbacks.onRoomUpdate(info);
        return;
      }

      if (type === 'coop:spectate_req' && typeof msg.code === 'string') {
        if (msg.code.trim().toUpperCase() !== room.code) return;
        const guestName = sanitizeName(
          typeof msg.name === 'string' ? msg.name : 'Penonton'
        );
        room.spectators.set(senderId, guestName);
        this.memberLastSeen.set(senderId, Date.now());

        const info = this.toHostRoomInfo();
        this.sendRemote({ type: 'coop:spectating', targetId: senderId, room: info });
        if (this.hostEngine) {
          this.sendRemote({
            type: 'coop:snapshot',
            code: room.code,
            snapshot: this.hostEngine.getSnapshot(),
          });
        }
        this.sendRemote({ type: 'coop:room_update', room: info });
        this.callbacks.onRoomUpdate(info);
        return;
      }

      if (msg.code !== room.code) return;
      this.memberLastSeen.set(senderId, Date.now());

      if (type === 'coop:leave') {
        if (room.spectators.delete(senderId)) {
          this.memberLastSeen.delete(senderId);
          const info = this.toHostRoomInfo();
          this.sendRemote({ type: 'coop:room_update', room: info });
          this.callbacks.onRoomUpdate(info);
          return;
        }
        const idx = room.members.findIndex((m) => m.id === senderId);
        if (idx === -1) return;
        room.members.splice(idx, 1);
        this.memberLastSeen.delete(senderId);
        if (this.hostEngine) {
          this.hostEngine.removePlayer(senderId);
        }
        const info = this.toHostRoomInfo();
        this.sendRemote({ type: 'coop:room_update', room: info });
        this.callbacks.onRoomUpdate(info);
        return;
      }

      if (room.spectators.has(senderId)) return;

      if (type === 'coop:ready') {
        if (room.phase !== 'LOBBY') return;
        const member = room.members.find((m) => m.id === senderId);
        if (!member || member.isHost) return;
        member.isReady = Boolean(msg.isReady);
        const info = this.toHostRoomInfo();
        this.sendRemote({ type: 'coop:room_update', room: info });
        this.callbacks.onRoomUpdate(info);
        return;
      }

      if (type === 'coop:prep_select' && room.phase === 'PREP' && this.hostEngine) {
        const rackId = typeof msg.rackId === 'string' ? msg.rackId : '';
        if (this.hostEngine.selectPrepRack(senderId, rackId)) {
          const snapshot = this.hostEngine.getSnapshot();
          this.callbacks.onWorldSnapshot(snapshot);
          this.sendRemote({
            type: 'coop:snapshot',
            code: room.code,
            snapshot,
          });
        }
        return;
      }

      if (type === 'coop:prep_roll' && room.phase === 'PREP' && this.hostEngine) {
        const modifier = typeof msg.modifier === 'number' ? msg.modifier : 0;
        if (this.hostEngine.rollPrepSkillCheck(senderId, modifier)) {
          const fx = this.hostEngine.step(0);
          const snapshot = this.hostEngine.getSnapshot();
          this.callbacks.onWorldSnapshot(snapshot);
          if (fx.length > 0) {
            this.callbacks.onWorldFx(fx);
            this.sendRemote({
              type: 'coop:fx',
              code: room.code,
              events: fx,
            });
          }
          this.sendRemote({
            type: 'coop:snapshot',
            code: room.code,
            snapshot,
          });
        }
        return;
      }

      if (type === 'coop:input' && room.phase === 'PLAYING' && this.hostEngine) {
        const moveX = typeof msg.moveX === 'number' ? msg.moveX : 0;
        const moveY = typeof msg.moveY === 'number' ? msg.moveY : 0;
        this.hostEngine.setPlayerInput(senderId, moveX, moveY);
        return;
      }

      if (type === 'coop:action' && room.phase === 'PLAYING' && this.hostEngine) {
        this.hostEngine.handlePlayerAction(senderId);
        return;
      }

      return;
    }

    // Guest message handling
    if (type === 'coop:joined' && msg.targetId === this.myId && msg.room) {
      const joinedRoom = msg.room as RoomInfo;
      if (this.pendingJoin && this.pendingJoin.code === joinedRoom.code) {
        clearTimeout(this.pendingJoin.timer);
        this.pendingJoin = null;
      }
      this.guestRoomCode = joinedRoom.code;
      this.isGuestSpectator = false;
      this.startGuestKeepalive();
      this.callbacks.onRoomJoined(this.myId, joinedRoom);
      return;
    }

    if (type === 'coop:spectate_offer' && msg.targetId === this.myId && msg.offer) {
      const offer = msg.offer as SpectatorOffer;
      if (this.pendingJoin && this.pendingJoin.code === offer.code) {
        clearTimeout(this.pendingJoin.timer);
        this.pendingJoin = null;
      }
      this.callbacks.onSpectateOffer(offer);
      return;
    }

    if (type === 'coop:spectating' && msg.targetId === this.myId && msg.room) {
      const joinedRoom = msg.room as RoomInfo;
      if (this.pendingJoin && this.pendingJoin.code === joinedRoom.code) {
        clearTimeout(this.pendingJoin.timer);
        this.pendingJoin = null;
      }
      this.guestRoomCode = joinedRoom.code;
      this.isGuestSpectator = true;
      this.startGuestKeepalive();
      this.callbacks.onSpectatingJoined(this.myId, joinedRoom);
      return;
    }

    if (type === 'coop:error' && msg.targetId === this.myId && typeof msg.message === 'string') {
      if (this.pendingJoin) {
        clearTimeout(this.pendingJoin.timer);
        this.pendingJoin = null;
      }
      this.callbacks.onError(msg.message);
      return;
    }

    if (type === 'coop:host_closed' && typeof msg.code === 'string') {
      this.callbacks.onInvite(null);
      if (this.guestRoomCode === msg.code) {
        this.guestRoomCode = null;
        this.isGuestSpectator = false;
        this.stopGuestKeepalive();
        this.callbacks.onRoomLeft();
        this.callbacks.onError(
          typeof msg.reason === 'string'
            ? msg.reason
            : 'Host menutup room Owlbear.'
        );
      }
      return;
    }

    if (!this.guestRoomCode) return;

    if (type === 'coop:room_update' && msg.room) {
      const nextRoom = msg.room as RoomInfo;
      if (nextRoom.code !== this.guestRoomCode) return;
      this.lastHostSeenAt = Date.now();
      const stillInRoom =
        this.isGuestSpectator || nextRoom.members.some((m) => m.id === this.myId);
      if (!stillInRoom) {
        this.guestRoomCode = null;
        this.isGuestSpectator = false;
        this.stopGuestKeepalive();
        this.callbacks.onRoomLeft();
        this.callbacks.onError('Anda keluar dari room Owlbear.');
        return;
      }
      this.callbacks.onRoomUpdate(nextRoom);
      return;
    }

    if (type === 'coop:snapshot' && msg.code === this.guestRoomCode && msg.snapshot) {
      this.lastHostSeenAt = Date.now();
      this.callbacks.onWorldSnapshot(msg.snapshot as WorldSnapshot);
      return;
    }

    if (type === 'coop:fx' && msg.code === this.guestRoomCode && Array.isArray(msg.events)) {
      this.lastHostSeenAt = Date.now();
      this.callbacks.onWorldFx(msg.events as FxEvent[]);
    }
  }
}
