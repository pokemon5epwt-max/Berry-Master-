import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS_TO_START,
  PLAYER_PALETTES,
  getOrderTargets,
} from './src/game/constants.ts';
import { ServerFarmEngine } from './src/game/serverEngine.ts';
import type {
  LobbyMember,
  RoomInfo,
  RoomPhase,
  StageLevel,
} from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  roomCode: string | null;
  isAlive: boolean;
}

interface RoomRecord {
  code: string;
  phase: RoomPhase;
  stage: StageLevel;
  hostId: string;
  members: LobbyMember[];
  engine: ServerFarmEngine | null;
  tickTimer: ReturnType<typeof setInterval> | null;
  lastTickMs: number;
}

const clients = new Map<string, ConnectedClient>();
const rooms = new Map<string, RoomRecord>();

let nextClientSeq = 1;

function generateClientId(): string {
  return `p_${Date.now().toString(36)}_${nextClientSeq++}`;
}

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return `B${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Petani';
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 14);
  return cleaned.length > 0 ? cleaned : 'Petani';
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function toRoomInfo(room: RoomRecord): RoomInfo {
  return {
    code: room.code,
    phase: room.phase,
    stage: room.stage,
    maxPlayers: MAX_ROOM_PLAYERS,
    hostId: room.hostId,
    members: room.members.map((m) => ({ ...m })),
    targets: getOrderTargets(Math.max(2, room.members.length), room.stage),
  };
}

function broadcastToRoom(room: RoomRecord, payload: unknown): void {
  const raw = JSON.stringify(payload);
  for (const m of room.members) {
    const client = clients.get(m.id);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

function stopRoomLoop(room: RoomRecord): void {
  if (room.tickTimer) {
    clearInterval(room.tickTimer);
    room.tickTimer = null;
  }
}

function startRoomEngine(room: RoomRecord): void {
  stopRoomLoop(room);
  room.phase = 'PLAYING';
  room.engine = new ServerFarmEngine(room.members, room.stage);
  room.lastTickMs = Date.now();

  broadcastToRoom(room, {
    type: 'room:update',
    room: toRoomInfo(room),
  });
  broadcastToRoom(room, {
    type: 'world:snapshot',
    snapshot: room.engine.getSnapshot(),
  });

  room.tickTimer = setInterval(() => {
    if (!room.engine) return;
    const now = Date.now();
    const dt = Math.min((now - room.lastTickMs) / 1000, 0.05);
    room.lastTickMs = now;

    const fx = room.engine.step(dt);
    const snapshot = room.engine.getSnapshot();

    if (fx.length > 0) {
      broadcastToRoom(room, {
        type: 'world:fx',
        events: fx,
      });
    }

    broadcastToRoom(room, {
      type: 'world:snapshot',
      snapshot,
    });

    if (room.engine.phase !== 'PLAYING') {
      room.phase = room.engine.phase;
      stopRoomLoop(room);
      broadcastToRoom(room, {
        type: 'room:update',
        room: toRoomInfo(room),
      });
    }
  }, 40);
}

function removeClientFromRoom(client: ConnectedClient): void {
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  client.roomCode = null;
  if (!room) return;

  const idx = room.members.findIndex((m) => m.id === client.id);
  if (idx !== -1) {
    room.members.splice(idx, 1);
  }

  if (room.engine) {
    room.engine.removePlayer(client.id);
  }

  if (room.members.length === 0) {
    stopRoomLoop(room);
    rooms.delete(room.code);
    return;
  }

  // Reassign host if previous host left
  if (room.hostId === client.id) {
    room.hostId = room.members[0].id;
    room.members[0].isHost = true;
    room.members[0].isReady = true;
  }

  broadcastToRoom(room, {
    type: 'room:update',
    room: toRoomInfo(room),
  });
}

function findNextFreeSlot(members: LobbyMember[]): number {
  const used = new Set(members.map((m) => m.slotIndex));
  for (let i = 0; i < MAX_ROOM_PLAYERS; i++) {
    if (!used.has(i)) return i;
  }
  return 0;
}

async function bootstrap() {
  const app = express();

  // Required CORS headers so Owlbear Rodeo can fetch manifest.json, icons, and assets cross-origin
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = generateClientId();
    const client: ConnectedClient = {
      id: clientId,
      ws,
      roomCode: null,
      isAlive: true,
    };
    clients.set(clientId, client);

    sendJson(ws, { type: 'welcome', playerId: clientId });

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString());
      } catch {
        return;
      }

      const type = msg.type;

      if (type === 'room:create') {
        removeClientFromRoom(client);
        const name = sanitizeName(msg.name);
        const code = generateRoomCode();
        const palette = PLAYER_PALETTES[0];
        const hostMember: LobbyMember = {
          id: client.id,
          name,
          slotIndex: 0,
          capColor: palette.capColor,
          scarfColor: palette.scarfColor,
          isHost: true,
          isReady: true,
        };
        const requestedStage =
          msg.stage === 1 || msg.stage === 2 || msg.stage === 3 ? msg.stage : 1;
        const room: RoomRecord = {
          code,
          phase: 'LOBBY',
          stage: requestedStage,
          hostId: client.id,
          members: [hostMember],
          engine: null,
          tickTimer: null,
          lastTickMs: Date.now(),
        };
        rooms.set(code, room);
        client.roomCode = code;

        sendJson(ws, {
          type: 'room:joined',
          playerId: client.id,
          room: toRoomInfo(room),
        });
        return;
      }

      if (type === 'room:join') {
        const rawCode =
          typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
        if (!rawCode) {
          sendJson(ws, {
            type: 'room:error',
            message: 'Masukkan kode room terlebih dahulu.',
          });
          return;
        }
        const room = rooms.get(rawCode);
        if (!room) {
          sendJson(ws, {
            type: 'room:error',
            message: `Room "${rawCode}" tidak ditemukan. Periksa kembali kodenya.`,
          });
          return;
        }
        if (room.phase !== 'LOBBY') {
          sendJson(ws, {
            type: 'room:error',
            message: 'Permainan di room tersebut sudah dimulai.',
          });
          return;
        }
        if (room.members.length >= MAX_ROOM_PLAYERS) {
          sendJson(ws, {
            type: 'room:error',
            message: `Room penuh (maksimal ${MAX_ROOM_PLAYERS} pemain).`,
          });
          return;
        }

        removeClientFromRoom(client);
        const slotIndex = findNextFreeSlot(room.members);
        const palette = PLAYER_PALETTES[slotIndex % PLAYER_PALETTES.length];
        const member: LobbyMember = {
          id: client.id,
          name: sanitizeName(msg.name),
          slotIndex,
          capColor: palette.capColor,
          scarfColor: palette.scarfColor,
          isHost: false,
          isReady: false,
        };
        room.members.push(member);
        client.roomCode = room.code;

        sendJson(ws, {
          type: 'room:joined',
          playerId: client.id,
          room: toRoomInfo(room),
        });
        broadcastToRoom(room, {
          type: 'room:update',
          room: toRoomInfo(room),
        });
        return;
      }

      if (type === 'room:leave') {
        removeClientFromRoom(client);
        sendJson(ws, { type: 'room:left' });
        return;
      }

      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;

      if (type === 'room:ready') {
        if (room.phase !== 'LOBBY') return;
        const member = room.members.find((m) => m.id === client.id);
        if (!member || member.isHost) return;
        member.isReady = Boolean(msg.isReady);
        broadcastToRoom(room, {
          type: 'room:update',
          room: toRoomInfo(room),
        });
        return;
      }

      if (type === 'room:start') {
        if (room.hostId !== client.id || room.phase !== 'LOBBY') return;
        if (room.members.length < MIN_ROOM_PLAYERS_TO_START) {
          sendJson(ws, {
            type: 'room:error',
            message: 'Minimal 2 pemain untuk memulai kebun co-op!',
          });
          return;
        }
        const allGuestsReady = room.members
          .filter((m) => !m.isHost)
          .every((m) => m.isReady);
        if (!allGuestsReady) {
          sendJson(ws, {
            type: 'room:error',
            message: 'Semua tamu wajib menekan tombol Siap terlebih dahulu.',
          });
          return;
        }
        startRoomEngine(room);
        return;
      }

      if (type === 'room:set_stage') {
        if (room.hostId !== client.id || room.phase !== 'LOBBY') return;
        const nextStage = msg.stage;
        if (nextStage !== 1 && nextStage !== 2 && nextStage !== 3) return;
        room.stage = nextStage;
        broadcastToRoom(room, {
          type: 'room:update',
          room: toRoomInfo(room),
        });
        return;
      }

      if (type === 'room:restart') {
        if (room.hostId !== client.id) return;
        if (room.phase !== 'VICTORY' && room.phase !== 'GAME_OVER') return;
        startRoomEngine(room);
        return;
      }

      if (type === 'room:next_stage') {
        if (room.hostId !== client.id || room.phase !== 'VICTORY') return;
        room.stage = Math.min(3, room.stage + 1) as StageLevel;
        startRoomEngine(room);
        return;
      }

      if (type === 'room:return_lobby') {
        if (room.hostId !== client.id) return;
        stopRoomLoop(room);
        room.engine = null;
        room.phase = 'LOBBY';
        for (const m of room.members) {
          m.isReady = m.isHost;
        }
        broadcastToRoom(room, {
          type: 'room:update',
          room: toRoomInfo(room),
        });
        return;
      }

      if (type === 'player:input' && room.phase === 'PLAYING' && room.engine) {
        const moveX = typeof msg.moveX === 'number' ? msg.moveX : 0;
        const moveY = typeof msg.moveY === 'number' ? msg.moveY : 0;
        room.engine.setPlayerInput(client.id, moveX, moveY);
        return;
      }

      if (type === 'player:action' && room.phase === 'PLAYING' && room.engine) {
        room.engine.handlePlayerAction(client.id);
      }
    });

    ws.on('close', () => {
      removeClientFromRoom(client);
      clients.delete(clientId);
    });
  });

  // Periodic heartbeat for stale sockets
  const heartbeat = setInterval(() => {
    for (const [id, client] of clients.entries()) {
      if (!client.isAlive) {
        client.ws.terminate();
        removeClientFromRoom(client);
        clients.delete(id);
        continue;
      }
      client.isAlive = false;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Pokopia Berry Farm Co-op server listening on port ${port}`);
  });

  const shutdown = () => {
    clearInterval(heartbeat);
    for (const room of rooms.values()) {
      stopRoomLoop(room);
    }
    wss.close();
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
