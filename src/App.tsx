import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EndModal } from './components/EndModal.tsx';
import { GameHud } from './components/GameHud.tsx';
import { LobbyOverlay } from './components/LobbyOverlay.tsx';
import { OwlbearPopover } from './components/OwlbearPopover.tsx';
import { soundManager } from './game/audio.ts';
import { ClientWorldView } from './game/clientView.ts';
import {
  PLAYER_PALETTES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './game/constants.ts';
import {
  broadcastOwlbearRoomInvite,
  closeOwlbearGameModal,
  expandOwlbearPopover,
  getInitialOwlbearParams,
  initOwlbearSdk,
  isOwlbearAvailable,
  openOwlbearGameModal,
  type OwlbearRoomInvite,
} from './game/owlbear.ts';
import { renderClientWorld } from './game/renderer.ts';
import { ServerFarmEngine } from './game/serverEngine.ts';
import type {
  FxEvent,
  LobbyMember,
  RoomInfo,
  ScreenMode,
  WorldSnapshot,
} from './game/types.ts';

const SOLO_PLAYER_ID = 'solo_1';

function sanitizeSoloName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 14);
  return cleaned.length > 0 ? cleaned : 'Petani';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<ClientWorldView | null>(null);
  if (!viewRef.current) {
    viewRef.current = new ClientWorldView();
  }

  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef<boolean>(false);
  const socketPlayerIdRef = useRef<string | null>(null);
  const soloEngineRef = useRef<ServerFarmEngine | null>(null);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const lastSentMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const localPlayerIdRef = useRef<string | null>(null);

  const owlbearParams = useMemo(() => getInitialOwlbearParams(), []);

  const [screenMode, setScreenMode] = useState<ScreenMode>('CONNECTING');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('Petani');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [popoverExpanded, setPopoverExpanded] = useState<boolean>(false);
  const [obrRole, setObrRole] = useState<'GM' | 'PLAYER'>('PLAYER');
  const [obrInvite, setObrInvite] = useState<OwlbearRoomInvite | null>(null);
  const [obrBroadcastSent, setObrBroadcastSent] = useState<boolean>(false);
  const [wsOffline, setWsOffline] = useState<boolean>(false);
  const [hudSnapshot, setHudSnapshot] = useState<WorldSnapshot>(() =>
    viewRef.current!.snapshot
  );

  const screenModeRef = useRef<ScreenMode>('CONNECTING');
  screenModeRef.current = screenMode;
  const playerNameRef = useRef<string>(playerName);
  playerNameRef.current = playerName;
  const nameEditedRef = useRef<boolean>(false);
  const obrRoleRef = useRef<'GM' | 'PLAYER'>('PLAYER');
  obrRoleRef.current = obrRole;
  const pendingAutoJoinRef = useRef<string | null>(owlbearParams.autoJoinRoomCode);
  const obrBroadcastTimerRef = useRef<number | null>(null);

  const handleChangeName = useCallback((nextName: string) => {
    nameEditedRef.current = true;
    setPlayerName(nextName);
  }, []);

  const sendSocket = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  // Initialize Owlbear Rodeo SDK if embedded inside Owlbear
  useEffect(() => {
    const cleanup = initOwlbearSdk({
      onReady: ({ playerName: obrName, role }) => {
        setObrRole(role);
        obrRoleRef.current = role;
        if (!nameEditedRef.current && obrName) {
          setPlayerName(obrName);
          playerNameRef.current = obrName;
        }
      },
      onInvite: (invite) => {
        setObrInvite(invite);
      },
    });
    return () => {
      cleanup();
      if (obrBroadcastTimerRef.current !== null) {
        clearTimeout(obrBroadcastTimerRef.current);
      }
    };
  }, []);

  // Connect WebSocket with automatic reconnect
  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: number | null = null;
    let failedAttempts = 0;

    const connect = () => {
      if (closedByUnmount) return;
      const configuredWs = (
        import.meta.env.VITE_WS_URL as string | undefined
      )?.trim();
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = configuredWs
        ? configuredWs
        : `${proto}//${window.location.host}/ws`;
      const isVercelWithoutWs =
        !configuredWs && window.location.hostname.endsWith('.vercel.app');

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        setWsOffline(true);
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnectedRef.current = true;
        failedAttempts = 0;
        setWsOffline(false);
        setErrorMsg(null);
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }

        const type = msg.type;

        if (type === 'welcome' && typeof msg.playerId === 'string') {
          socketPlayerIdRef.current = msg.playerId;
          if (screenModeRef.current !== 'SOLO_GAME') {
            localPlayerIdRef.current = msg.playerId;
            setPlayerId(msg.playerId);
            setScreenMode((prev) =>
              prev === 'CONNECTING' ? 'HOME_LOBBY' : prev
            );
            const autoCode = pendingAutoJoinRef.current;
            if (autoCode) {
              pendingAutoJoinRef.current = null;
              ws.send(
                JSON.stringify({
                  type: 'room:join',
                  name: playerNameRef.current,
                  code: autoCode,
                })
              );
            }
          }
          return;
        }

        if (type === 'room:joined') {
          const joinedId = msg.playerId as string;
          const nextRoom = msg.room as RoomInfo;
          socketPlayerIdRef.current = joinedId;
          localPlayerIdRef.current = joinedId;
          setPlayerId(joinedId);
          setRoom(nextRoom);
          setErrorMsg(null);
          setScreenMode('ROOM_LOBBY');
          if (nextRoom.hostId === joinedId && isOwlbearAvailable()) {
            void broadcastOwlbearRoomInvite(
              nextRoom.code,
              playerNameRef.current,
              obrRoleRef.current
            );
          }
          return;
        }

        if (type === 'room:update') {
          const nextRoom = msg.room as RoomInfo;
          setRoom(nextRoom);
          if (nextRoom.phase === 'LOBBY') {
            soundManager.stopBgm();
            viewRef.current?.resetToPreview();
            setScreenMode('ROOM_LOBBY');
          } else {
            setScreenMode('IN_GAME');
            if (nextRoom.phase === 'PLAYING') {
              soundManager.startBgm();
            } else {
              soundManager.stopBgm();
            }
          }
          return;
        }

        if (type === 'room:left') {
          soundManager.stopBgm();
          setRoom(null);
          viewRef.current?.resetToPreview();
          setScreenMode('HOME_LOBBY');
          return;
        }

        if (type === 'room:error' && typeof msg.message === 'string') {
          setErrorMsg(msg.message);
          return;
        }

        if (type === 'world:snapshot' && msg.snapshot) {
          if (screenModeRef.current === 'SOLO_GAME') return;
          const snap = msg.snapshot as WorldSnapshot;
          viewRef.current?.applyServerSnapshot(snap);
          setHudSnapshot(snap);
          return;
        }

        if (type === 'world:fx' && Array.isArray(msg.events)) {
          if (screenModeRef.current === 'SOLO_GAME') return;
          viewRef.current?.applyFxEvents(msg.events as FxEvent[]);
        }
      };

      ws.onclose = () => {
        const wasConnected = wsConnectedRef.current;
        wsConnectedRef.current = false;
        if (closedByUnmount) return;
        failedAttempts = wasConnected ? 1 : failedAttempts + 1;
        if ((!wasConnected && failedAttempts >= 2) || (!wasConnected && isVercelWithoutWs)) {
          setWsOffline(true);
        }
        if (screenModeRef.current !== 'SOLO_GAME') {
          soundManager.stopBgm();
          setRoom(null);
          setScreenMode('CONNECTING');
        }
        reconnectTimer = window.setTimeout(
          connect,
          failedAttempts >= 2 ? 6000 : 1500
        );
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      soundManager.stopBgm();
      wsRef.current?.close();
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      if (
        screenModeRef.current === 'IN_GAME' ||
        (screenModeRef.current === 'SOLO_GAME' &&
          soloEngineRef.current?.phase === 'PLAYING')
      ) {
        soundManager.startBgm();
      }
    }
  }, []);

  const handleStartSolo = useCallback(() => {
    soundManager.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    heldKeysRef.current.clear();
    lastSentMoveRef.current = { x: 0, y: 0 };

    const palette = PLAYER_PALETTES[0];
    const soloMember: LobbyMember = {
      id: SOLO_PLAYER_ID,
      name: sanitizeSoloName(playerName),
      slotIndex: 0,
      capColor: palette.capColor,
      scarfColor: palette.scarfColor,
      isHost: true,
      isReady: true,
    };

    const engine = new ServerFarmEngine([soloMember]);
    soloEngineRef.current = engine;
    localPlayerIdRef.current = SOLO_PLAYER_ID;
    setPlayerId(SOLO_PLAYER_ID);
    setErrorMsg(null);

    viewRef.current?.resetToPreview();
    const initialSnap = engine.getSnapshot();
    viewRef.current?.applyServerSnapshot(initialSnap);
    setHudSnapshot(initialSnap);
    setScreenMode('SOLO_GAME');
    soundManager.startBgm();
  }, [playerName]);

  const handleToggleSoloPause = useCallback(() => {
    const engine = soloEngineRef.current;
    if (!engine || screenModeRef.current !== 'SOLO_GAME') return;
    if (engine.phase === 'PLAYING') {
      engine.phase = 'PAUSED';
      engine.setPlayerInput(SOLO_PLAYER_ID, 0, 0);
      heldKeysRef.current.clear();
      soundManager.stopBgm();
    } else if (engine.phase === 'PAUSED') {
      engine.phase = 'PLAYING';
      soundManager.startBgm();
    } else {
      return;
    }
    const snap = engine.getSnapshot();
    viewRef.current?.applyServerSnapshot(snap);
    setHudSnapshot(snap);
  }, []);

  const handleReturnToMenuFromSolo = useCallback(() => {
    soundManager.stopBgm();
    soloEngineRef.current = null;
    heldKeysRef.current.clear();
    lastSentMoveRef.current = { x: 0, y: 0 };

    localPlayerIdRef.current = socketPlayerIdRef.current;
    setPlayerId(socketPlayerIdRef.current);
    viewRef.current?.resetToPreview();
    setHudSnapshot(viewRef.current!.snapshot);
    setScreenMode(wsConnectedRef.current ? 'HOME_LOBBY' : 'CONNECTING');
  }, []);

  const handleCreateRoom = useCallback(() => {
    soundManager.unlock();
    setErrorMsg(null);
    sendSocket({ type: 'room:create', name: playerName });
  }, [playerName, sendSocket]);

  const handleJoinRoom = useCallback(
    (code: string) => {
      soundManager.unlock();
      setErrorMsg(null);
      sendSocket({ type: 'room:join', name: playerName, code });
    },
    [playerName, sendSocket]
  );

  const handleToggleReady = useCallback(
    (nextReady: boolean) => {
      soundManager.unlock();
      sendSocket({ type: 'room:ready', isReady: nextReady });
    },
    [sendSocket]
  );

  const handleStartGame = useCallback(() => {
    soundManager.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sendSocket({ type: 'room:start' });
  }, [sendSocket]);

  const handleRestart = useCallback(() => {
    if (screenModeRef.current === 'SOLO_GAME') {
      handleStartSolo();
      return;
    }
    soundManager.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sendSocket({ type: 'room:restart' });
  }, [handleStartSolo, sendSocket]);

  const handleReturnLobby = useCallback(() => {
    if (screenModeRef.current === 'SOLO_GAME') {
      handleReturnToMenuFromSolo();
      return;
    }
    sendSocket({ type: 'room:return_lobby' });
  }, [handleReturnToMenuFromSolo, sendSocket]);

  const handleLeaveRoom = useCallback(() => {
    sendSocket({ type: 'room:leave' });
  }, [sendSocket]);

  const handleBroadcastOwlbearInvite = useCallback(() => {
    if (!room || !isOwlbearAvailable()) return;
    void broadcastOwlbearRoomInvite(room.code, playerNameRef.current, obrRoleRef.current);
    setObrBroadcastSent(true);
    if (obrBroadcastTimerRef.current !== null) {
      clearTimeout(obrBroadcastTimerRef.current);
    }
    obrBroadcastTimerRef.current = window.setTimeout(() => {
      setObrBroadcastSent(false);
    }, 2200);
  }, [room]);

  const handlePlayerAction = useCallback(() => {
    const mode = screenModeRef.current;
    if (mode !== 'IN_GAME' && mode !== 'SOLO_GAME') return;
    const activePhase =
      mode === 'SOLO_GAME'
        ? soloEngineRef.current?.phase
        : viewRef.current?.snapshot.phase;
    if (activePhase !== 'PLAYING') return;

    soundManager.unlock();
    if (mode === 'SOLO_GAME') {
      soloEngineRef.current?.handlePlayerAction(SOLO_PLAYER_ID);
    } else {
      sendSocket({ type: 'player:action' });
    }
  }, [sendSocket]);

  // Keyboard Listeners (strictly WASD for movement, SPACE for action)
  useEffect(() => {
    const syncMovement = () => {
      const mode = screenModeRef.current;
      if (mode !== 'IN_GAME' && mode !== 'SOLO_GAME') return;
      const held = heldKeysRef.current;
      const mx = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
      const my = (held.has('KeyS') ? 1 : 0) - (held.has('KeyW') ? 1 : 0);

      if (mode === 'SOLO_GAME') {
        soloEngineRef.current?.setPlayerInput(SOLO_PLAYER_ID, mx, my);
        return;
      }

      if (
        mx !== lastSentMoveRef.current.x ||
        my !== lastSentMoveRef.current.y
      ) {
        lastSentMoveRef.current = { x: mx, y: my };
        sendSocket({ type: 'player:input', moveX: mx, moveY: my });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isTyping) return;

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      const mode = screenModeRef.current;
      if (mode === 'SOLO_GAME' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        e.preventDefault();
        handleToggleSoloPause();
        return;
      }

      if (mode !== 'IN_GAME' && mode !== 'SOLO_GAME') return;
      const activePhase =
        mode === 'SOLO_GAME'
          ? soloEngineRef.current?.phase
          : viewRef.current?.snapshot.phase;
      if (activePhase !== 'PLAYING') return;

      if (
        e.code === 'KeyW' ||
        e.code === 'KeyA' ||
        e.code === 'KeyS' ||
        e.code === 'KeyD' ||
        e.code === 'Space'
      ) {
        e.preventDefault();
      }

      if (e.code === 'Space' && !e.repeat) {
        handlePlayerAction();
        return;
      }

      if (
        e.code === 'KeyW' ||
        e.code === 'KeyA' ||
        e.code === 'KeyS' ||
        e.code === 'KeyD'
      ) {
        heldKeysRef.current.add(e.code);
        syncMovement();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (heldKeysRef.current.delete(e.code)) {
        syncMovement();
      }
    };

    const onBlur = () => {
      heldKeysRef.current.clear();
      if (screenModeRef.current === 'SOLO_GAME') {
        soloEngineRef.current?.setPlayerInput(SOLO_PLAYER_ID, 0, 0);
      }
      if (
        lastSentMoveRef.current.x !== 0 ||
        lastSentMoveRef.current.y !== 0
      ) {
        lastSentMoveRef.current = { x: 0, y: 0 };
        sendSocket({ type: 'player:input', moveX: 0, moveY: 0 });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handlePlayerAction, handleToggleMute, handleToggleSoloPause, sendSocket]);

  // Isolated 60fps Canvas Render Loop (+ Solo Engine Simulation)
  useEffect(() => {
    const canvas = canvasRef.current;
    const view = viewRef.current;
    if (!canvas || !view) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let lastSoloHudSync = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      if (screenModeRef.current === 'SOLO_GAME' && soloEngineRef.current) {
        const engine = soloEngineRef.current;
        const prevPhase = engine.phase;
        const fx = engine.step(Math.min(rawDt, 0.05));
        if (fx.length > 0) {
          view.applyFxEvents(fx);
        }
        const snap = engine.getSnapshot();
        view.applyServerSnapshot(snap);

        if (
          engine.phase !== prevPhase &&
          (engine.phase === 'VICTORY' || engine.phase === 'GAME_OVER')
        ) {
          soundManager.stopBgm();
        }

        if (engine.phase !== prevPhase || now - lastSoloHudSync >= 100) {
          lastSoloHudSync = now;
          setHudSnapshot(snap);
        }
      }

      view.updateFrame(rawDt, localPlayerIdRef.current);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = canvas.width / dpr;
      const vh = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#C6DF9F';
      ctx.fillRect(0, 0, vw, vh);

      const scale = Math.min(vw / WORLD_WIDTH, vh / WORLD_HEIGHT);
      const offsetX = (vw - WORLD_WIDTH * scale) / 2;
      const offsetY = (vh - WORLD_HEIGHT * scale) / 2;

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      renderClientWorld(ctx, view, localPlayerIdRef.current);
      ctx.restore();

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const isSolo = screenMode === 'SOLO_GAME';
  const isPlayingView = screenMode === 'IN_GAME' || isSolo;
  const isHost = Boolean(room && playerId && room.hostId === playerId);
  const isOwlbearModal = owlbearParams.surfaceMode === 'modal';
  const showOwlbearPopover =
    owlbearParams.surfaceMode === 'popover' && !popoverExpanded && !isPlayingView;
  const handleCloseModal = useCallback(() => {
    void closeOwlbearGameModal();
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#C6DF9F]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label="Arena Kebun Berry Pokopia"
      />

      {showOwlbearPopover && (
        <div className="fixed inset-0 z-40">
          <OwlbearPopover
            playerName={playerName}
            invite={obrInvite}
            onLaunchModal={(code) => {
              void openOwlbearGameModal(code);
            }}
            onExpandInPopover={() => {
              void expandOwlbearPopover();
              setPopoverExpanded(true);
            }}
          />
        </div>
      )}

      {!isPlayingView && !showOwlbearPopover && (
        <LobbyOverlay
          screenMode={screenMode}
          playerId={playerId}
          playerName={playerName}
          onChangeName={handleChangeName}
          room={room}
          errorMsg={errorMsg}
          muted={muted}
          onToggleMute={handleToggleMute}
          onStartSolo={handleStartSolo}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          isOwlbearModal={isOwlbearModal}
          onCloseOwlbearModal={handleCloseModal}
          obrInvite={obrInvite}
          onBroadcastOwlbearInvite={
            isOwlbearAvailable() ? handleBroadcastOwlbearInvite : undefined
          }
          obrBroadcastSent={obrBroadcastSent}
          wsOffline={wsOffline}
        />
      )}

      {isPlayingView && (
        <GameHud
          snapshot={hudSnapshot}
          roomCode={room?.code ?? ''}
          localPlayerId={playerId}
          localPrompt={viewRef.current?.localPrompt ?? null}
          muted={muted}
          onToggleMute={handleToggleMute}
          isSolo={isSolo}
          onTogglePause={handleToggleSoloPause}
          onAction={handlePlayerAction}
          isOwlbearModal={isOwlbearModal}
          onCloseOwlbearModal={handleCloseModal}
        />
      )}

      {isPlayingView && (
        <EndModal
          snapshot={hudSnapshot}
          isHost={isHost}
          isSolo={isSolo}
          onResume={handleToggleSoloPause}
          onRestart={handleRestart}
          onReturnLobby={handleReturnLobby}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </main>
  );
}
