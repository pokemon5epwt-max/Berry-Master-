import OBR from '@owlbear-rodeo/sdk';

export const OWLBEAR_MODAL_ID = 'berry-master-farm/game-modal';
export const OWLBEAR_BROADCAST_CHANNEL = 'berry-master-farm/room-invite';
export const OWLBEAR_ROOM_META_KEY = 'berry-master-farm/activeRoom';

export type OwlbearSurfaceMode = 'standalone' | 'popover' | 'modal';

export interface OwlbearRoomInvite {
  code: string;
  hostName: string;
  updatedAt: number;
}

export function getInitialOwlbearParams(): {
  surfaceMode: OwlbearSurfaceMode;
  autoJoinRoomCode: string | null;
} {
  if (typeof window === 'undefined') {
    return { surfaceMode: 'standalone', autoJoinRoomCode: null };
  }
  const params = new URLSearchParams(window.location.search);
  const obr = params.get('obr');
  const room = params.get('room');
  const surfaceMode: OwlbearSurfaceMode =
    obr === 'popover' ? 'popover' : obr === 'modal' ? 'modal' : 'standalone';
  const autoJoinRoomCode = room ? room.trim().toUpperCase().slice(0, 8) : null;
  return { surfaceMode, autoJoinRoomCode };
}

export function isOwlbearAvailable(): boolean {
  try {
    return Boolean(OBR.isAvailable);
  } catch {
    return false;
  }
}

export function initOwlbearSdk(callbacks: {
  onReady: (info: {
    playerName: string;
    role: 'GM' | 'PLAYER';
    connectionId: string;
  }) => void;
  onInvite: (invite: OwlbearRoomInvite | null) => void;
}): () => void {
  if (!isOwlbearAvailable()) {
    return () => {};
  }

  let disposed = false;
  let unsubBroadcast: (() => void) | null = null;
  let unsubMetadata: (() => void) | null = null;

  const parseInvite = (raw: unknown): OwlbearRoomInvite | null => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.code !== 'string' || !obj.code.trim()) return null;
    const updatedAt = typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now();
    // Ignore stale metadata older than 4 hours
    if (Date.now() - updatedAt > 4 * 60 * 60 * 1000) return null;
    return {
      code: obj.code.trim().toUpperCase(),
      hostName: typeof obj.hostName === 'string' && obj.hostName.trim() ? obj.hostName : 'Host',
      updatedAt,
    };
  };

  OBR.onReady(async () => {
    if (disposed) return;

    try {
      const [playerName, role, connectionId, meta] = await Promise.all([
        OBR.player.getName().catch(() => 'Petani'),
        OBR.player.getRole().catch(() => 'PLAYER' as const),
        OBR.player
          .getConnectionId()
          .catch(() => `obr_${Math.random().toString(36).slice(2, 10)}`),
        OBR.room.getMetadata().catch(() => ({} as Record<string, unknown>)),
      ]);
      if (disposed) return;

      callbacks.onReady({
        playerName: playerName.trim().slice(0, 14) || 'Petani',
        role,
        connectionId,
      });

      const existingInvite = parseInvite(meta[OWLBEAR_ROOM_META_KEY]);
      if (existingInvite) {
        callbacks.onInvite(existingInvite);
      }
    } catch {
      // Ignore transient SDK init failures
    }

    try {
      unsubBroadcast = OBR.broadcast.onMessage(OWLBEAR_BROADCAST_CHANNEL, (event) => {
        if (disposed) return;
        const data = event.data as Record<string, unknown> | undefined;
        if (data && data.clear === true) {
          callbacks.onInvite(null);
          return;
        }
        const invite = parseInvite(event.data);
        if (invite) {
          callbacks.onInvite(invite);
        }
      });

      unsubMetadata = OBR.room.onMetadataChange((meta) => {
        if (disposed) return;
        const invite = parseInvite(meta[OWLBEAR_ROOM_META_KEY]);
        callbacks.onInvite(invite);
      });
    } catch {
      // Ignore if room subscriptions unavailable
    }
  });

  return () => {
    disposed = true;
    unsubBroadcast?.();
    unsubMetadata?.();
  };
}

export async function openOwlbearGameModal(roomCode?: string): Promise<void> {
  if (!isOwlbearAvailable()) return;
  const url = roomCode
    ? `/?obr=modal&room=${encodeURIComponent(roomCode)}`
    : '/?obr=modal';
  await OBR.modal.open({
    id: OWLBEAR_MODAL_ID,
    url,
    fullScreen: true,
    hideBackdrop: false,
  });
  try {
    await OBR.action.close();
  } catch {
    // Popover might already be closed
  }
}

export async function closeOwlbearGameModal(): Promise<void> {
  if (!isOwlbearAvailable()) return;
  await OBR.modal.close(OWLBEAR_MODAL_ID);
}

export async function expandOwlbearPopover(): Promise<void> {
  if (!isOwlbearAvailable()) return;
  await Promise.all([
    OBR.action.setWidth(1120),
    OBR.action.setHeight(700),
  ]);
}

export async function broadcastOwlbearRoomInvite(
  code: string,
  hostName: string,
  role: 'GM' | 'PLAYER'
): Promise<void> {
  if (!isOwlbearAvailable()) return;
  const payload: OwlbearRoomInvite = {
    code: code.trim().toUpperCase(),
    hostName: hostName.trim() || 'Host',
    updatedAt: Date.now(),
  };
  try {
    await OBR.broadcast.sendMessage(OWLBEAR_BROADCAST_CHANNEL, payload, {
      destination: 'ALL',
    });
  } catch {
    // Ignore broadcast failure
  }
  if (role === 'GM') {
    try {
      await OBR.room.setMetadata({
        [OWLBEAR_ROOM_META_KEY]: payload,
      });
    } catch {
      // Ignore if GM metadata permission restricted
    }
  }
}

export async function clearOwlbearRoomInvite(
  role: 'GM' | 'PLAYER'
): Promise<void> {
  if (!isOwlbearAvailable()) return;
  try {
    await OBR.broadcast.sendMessage(
      OWLBEAR_BROADCAST_CHANNEL,
      { clear: true },
      { destination: 'ALL' }
    );
  } catch {
    // Ignore broadcast failure
  }
  if (role === 'GM') {
    try {
      await OBR.room.setMetadata({
        [OWLBEAR_ROOM_META_KEY]: undefined,
      });
    } catch {
      // Ignore metadata clear failure
    }
  }
}
