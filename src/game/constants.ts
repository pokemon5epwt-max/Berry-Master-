import type {
  BerryType,
  CritterKind,
  OrderCounts,
  ToolType,
  WeatherType,
} from './types.ts';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 760;

export const MAX_ROOM_PLAYERS = 6;
export const MIN_ROOM_PLAYERS_TO_START = 2;
export const DAY_DURATION_SECONDS = 480;
export const WEATHER_DURATION_SECONDS = 34;

export const PLAYER_SPEED = 252;
export const PLAYER_RADIUS = 19;

export const INTERACT_RANGE_RACK = 62;
export const INTERACT_RANGE_PLOT = 76;
export const INTERACT_RANGE_WELL = 84;
export const INTERACT_RANGE_CRATE = 90;
export const WHISTLE_REPEL_RANGE = 126;

export const WEATHER_META: Record<
  WeatherType,
  {
    label: string;
    effectHint: string;
    accentColor: string;
  }
> = {
  sunny: {
    label: 'Cerah',
    effectHint: 'Pertumbuhan & air stabil',
    accentColor: '#D97706',
  },
  rainy: {
    label: 'Hujan',
    effectHint: 'Tanah lembap & sumur terisi',
    accentColor: '#2563EB',
  },
  heatwave: {
    label: 'Panas',
    effectHint: 'Tanah cepat kering',
    accentColor: '#DC2626',
  },
};

export const CRITTER_META: Record<
  CritterKind,
  {
    name: string;
    speed: number;
    maxHp: number;
    vitalityDamage: number;
    eatCooldown: number;
    accentColor: string;
  }
> = {
  wurmple: {
    name: 'Wurmple',
    speed: 62,
    maxHp: 1,
    vitalityDamage: 10,
    eatCooldown: 2.1,
    accentColor: '#E8364F',
  },
  zigzagoon: {
    name: 'Zigzagoon',
    speed: 96,
    maxHp: 2,
    vitalityDamage: 14,
    eatCooldown: 1.75,
    accentColor: '#8B5A3C',
  },
  taillow: {
    name: 'Taillow',
    speed: 132,
    maxHp: 3,
    vitalityDamage: 18,
    eatCooldown: 1.35,
    accentColor: '#2E4583',
  },
};

export const WAREHOUSE_BOUNDS = {
  x: 36,
  y: 112,
  width: 212,
  height: 534,
};

export const PLAYER_PALETTES = [
  { capColor: '#E85D5A', scarfColor: '#FDE047', label: 'Topi Merah' },
  { capColor: '#4B8FE2', scarfColor: '#FFD166', label: 'Topi Biru' },
  { capColor: '#52B788', scarfColor: '#FFF3B0', label: 'Topi Hijau' },
  { capColor: '#E9A825', scarfColor: '#FFFDF5', label: 'Topi Kuning' },
  { capColor: '#9B72CF', scarfColor: '#FBCFE8', label: 'Topi Ungu' },
  { capColor: '#F0788C', scarfColor: '#A7F3D0', label: 'Topi Persik' },
];

export const TOOL_CONFIG: Record<
  ToolType,
  {
    name: string;
    shortName: string;
    roleHint: string;
    accentColor: string;
  }
> = {
  wailmer_pail: {
    name: 'Wailmer Pail',
    shortName: 'Ember Siram',
    roleHint: 'Siram pohon kering & isi di Sumur',
    accentColor: '#4895EF',
  },
  harvest_basket: {
    name: 'Harvest Basket',
    shortName: 'Keranjang Panen',
    roleHint: 'Petik buah matang & setor ke Peti',
    accentColor: '#E09F3E',
  },
  garden_rake: {
    name: 'Garden Rake',
    shortName: 'Penggaruk Kebun',
    roleHint: 'Bersihkan gulma & lumpur tanah',
    accentColor: '#52B788',
  },
  defender_whistle: {
    name: 'Defender Whistle',
    shortName: 'Peluit Penjaga',
    roleHint: 'Tiup untuk mengusir hama (Wurmple/Zigzagoon/Taillow)',
    accentColor: '#E76F51',
  },
};

export const TOOL_ORDER: ToolType[] = [
  'wailmer_pail',
  'harvest_basket',
  'garden_rake',
  'defender_whistle',
];

export interface RackDefinition {
  rackId: string;
  toolType: ToolType;
  x: number;
  y: number;
}

export function getRackDefinitions(playerCount: number): RackDefinition[] {
  if (playerCount >= 5) {
    return [
      { rackId: 'wailmer_pail_1', toolType: 'wailmer_pail', x: 120, y: 204 },
      { rackId: 'wailmer_pail_2', toolType: 'wailmer_pail', x: 120, y: 278 },
      { rackId: 'harvest_basket_1', toolType: 'harvest_basket', x: 120, y: 352 },
      { rackId: 'harvest_basket_2', toolType: 'harvest_basket', x: 120, y: 426 },
      { rackId: 'garden_rake_1', toolType: 'garden_rake', x: 120, y: 500 },
      { rackId: 'defender_whistle_1', toolType: 'defender_whistle', x: 120, y: 574 },
    ];
  }
  return [
    { rackId: 'wailmer_pail_1', toolType: 'wailmer_pail', x: 120, y: 218 },
    { rackId: 'harvest_basket_1', toolType: 'harvest_basket', x: 120, y: 326 },
    { rackId: 'garden_rake_1', toolType: 'garden_rake', x: 120, y: 434 },
    { rackId: 'defender_whistle_1', toolType: 'defender_whistle', x: 120, y: 542 },
  ];
}

export function getOrderTargets(playerCount: number): OrderCounts {
  if (playerCount <= 1) {
    return { oran: 7, pecha: 5, sitrus: 3 };
  }
  if (playerCount >= 5) {
    return { oran: 20, pecha: 14, sitrus: 9 };
  }
  if (playerCount >= 3) {
    return { oran: 16, pecha: 11, sitrus: 7 };
  }
  return { oran: 12, pecha: 8, sitrus: 5 };
}

export const WATER_WELL_POS = {
  x: 318,
  y: 616,
  radius: 44,
};

export const WELL_MAX_WATER = 12;
export const WELL_INITIAL_WATER = 6;
export const WELL_PUMP_AMOUNT = 3;

export const BERRY_MASTER_POS = {
  x: 560,
  y: 108,
};

export const DELIVERY_CRATE_POS = {
  x: 702,
  y: 116,
  width: 82,
  height: 54,
};

export const PLOT_COLS_X = [496, 650, 804];
export const PLOT_ROWS_Y = [268, 404, 540];
export const PLOT_SIZE = 108;

export const PLOT_BERRY_LAYOUT: BerryType[] = [
  'oran',
  'pecha',
  'oran',
  'sitrus',
  'oran',
  'pecha',
  'pecha',
  'oran',
  'sitrus',
];

export const BERRY_META: Record<
  BerryType,
  {
    label: string;
    color: string;
    highlight: string;
    leaf: string;
    shadow: string;
  }
> = {
  oran: {
    label: 'Oran Berry',
    color: '#4E8DF5',
    highlight: '#9AC4FF',
    leaf: '#58B368',
    shadow: '#2F64BD',
  },
  pecha: {
    label: 'Pecha Berry',
    color: '#F48FB1',
    highlight: '#FFD1E1',
    leaf: '#66BB6A',
    shadow: '#C95D84',
  },
  sitrus: {
    label: 'Sitrus Berry',
    color: '#F4C430',
    highlight: '#FFF099',
    leaf: '#56AB64',
    shadow: '#C69214',
  },
};

export const STAGE_DURATIONS = {
  seedling: 5.5,
  sprout: 6.5,
  flowering: 7.5,
};

export const SOLID_OBSTACLES = [
  { x: 28, y: 110, w: 66, h: 536 },
  { x: 282, y: 582, w: 72, h: 68 },
  { x: 515, y: 74, w: 92, h: 54 },
  { x: 662, y: 88, w: 80, h: 50 },
];
