export type RoomPhase = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type ScreenMode =
  | 'CONNECTING'
  | 'HOME_LOBBY'
  | 'ROOM_LOBBY'
  | 'IN_GAME'
  | 'SOLO_GAME';

export type ToolType =
  | 'wailmer_pail'
  | 'harvest_basket'
  | 'garden_rake'
  | 'defender_whistle';

export type BerryType = 'oran' | 'pecha' | 'sitrus';

export type GrowthStage = 'seedling' | 'sprout' | 'flowering' | 'ripe' | 'withered';

export type GameOverReason = 'timeout' | 'withered' | null;

export interface OrderCounts {
  oran: number;
  pecha: number;
  sitrus: number;
}

export interface LobbyMember {
  id: string;
  name: string;
  slotIndex: number;
  capColor: string;
  scarfColor: string;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomInfo {
  code: string;
  phase: RoomPhase;
  maxPlayers: number;
  hostId: string;
  members: LobbyMember[];
  targets: OrderCounts;
}

export interface ToolRackState {
  rackId: string;
  toolType: ToolType;
  name: string;
  shortName: string;
  x: number;
  y: number;
  occupiedByPlayerId: string | null;
  occupiedByName: string | null;
  pailWater: number;
  maxPailWater: number;
  basketBerries: BerryType[];
  maxBasketCapacity: number;
}

export interface InteractPrompt {
  x: number;
  y: number;
  label: string;
  accentColor: string;
  kind: 'rack' | 'plot' | 'well' | 'crate' | 'critter' | 'whistle';
}

export interface PlayerState {
  id: string;
  name: string;
  slotIndex: number;
  capColor: string;
  scarfColor: string;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  walkPhase: number;
  heldRackId: string | null;
  heldTool: ToolType | null;
  whistleAnimTimer: number;
  squashTimer: number;
}

export interface BerryPlotState {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  berryType: BerryType;
  stage: GrowthStage;
  growthProgress: number;
  waterLevel: number;
  needsWater: boolean;
  hasWeeds: boolean;
  vitality: number;
  shakeTimer: number;
  hitFlash: number;
  popTimer: number;
}

export type CritterKind = 'wurmple' | 'zigzagoon' | 'taillow';

export type CritterState = 'moving' | 'eating' | 'stunned' | 'fleeing';

export type WeatherType = 'sunny' | 'rainy' | 'heatwave';

export interface WildPokemonState {
  id: number;
  kind: CritterKind;
  x: number;
  y: number;
  targetPlotId: number;
  state: CritterState;
  hp: number;
  maxHp: number;
  stunTimer: number;
  walkPhase: number;
  hitFlash: number;
  squash: number;
  facingX: number;
}

export interface SpawnTelegraph {
  id: number;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  kind: CritterKind;
}

export type ParticleKind =
  | 'water'
  | 'leaf'
  | 'sparkle'
  | 'dust'
  | 'star'
  | 'note'
  | 'ring'
  | 'float_text';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius?: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  text?: string;
}

export interface AmbientButterfly {
  x: number;
  y: number;
  baseY: number;
  vx: number;
  phase: number;
  color: string;
}

export interface FxEvent {
  type:
    | 'pickup'
    | 'putdown'
    | 'error'
    | 'water'
    | 'refill'
    | 'harvest'
    | 'deliver'
    | 'rake'
    | 'whistle'
    | 'munch'
    | 'alert'
    | 'victory'
    | 'gameover'
    | 'weed'
    | 'wither'
    | 'pump'
    | 'weather';
  playerId?: string;
  x?: number;
  y?: number;
  text?: string;
  color?: string;
  particleKind?: ParticleKind;
  count?: number;
  repelled?: boolean;
  crateBounce?: boolean;
  wellRipple?: boolean;
  wellPump?: boolean;
  shake?: number;
  weather?: WeatherType;
  critterKind?: CritterKind;
  deliveredCounts?: OrderCounts;
}

export interface WorldSnapshot {
  phase: RoomPhase;
  timeRemaining: number;
  totalDuration: number;
  weather: WeatherType;
  weatherTimer: number;
  delivered: OrderCounts;
  targets: OrderCounts;
  crittersRepelled: number;
  wellWater: number;
  maxWellWater: number;
  gameOverReason: GameOverReason;
  players: PlayerState[];
  racks: ToolRackState[];
  plots: BerryPlotState[];
  critters: WildPokemonState[];
  telegraphs: SpawnTelegraph[];
}
