import type {
  BerryType,
  CritterKind,
  OrderCounts,
  StageLevel,
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
export const WHISTLE_COOLDOWN_SECONDS = 1.0;

export const SKILL_CHECK_DC = 14;
export const SKILL_CHECK_MIN_MOD = -5;
export const SKILL_CHECK_MAX_MOD = 10;

export const PAIL_BUFF_MAX_WATER = 8;
export const BASKET_BUFF_MAX_CAPACITY = 5;
export const BASKET_BUFF_SPEED_MULT = 1.14;
export const RAKE_BUFF_RADIUS = 175;
export const WHISTLE_BUFF_RANGE = 210;
export const WHISTLE_BUFF_COOLDOWN_SECONDS = 0.65;

export const TOOL_SKILL_CHECK_META: Record<
  ToolType,
  {
    skillName: string;
    abilityCode: string;
    checkTitle: string;
    buffName: string;
    buffDesc: string;
  }
> = {
  wailmer_pail: {
    skillName: 'Nature',
    abilityCode: 'Wis',
    checkTitle: 'Resonansi Air & Tanah',
    buffName: 'Ember Tak Surut',
    buffDesc: 'Kapasitas air 8/8 & Siram Subur lebih kuat (+55%).',
  },
  harvest_basket: {
    skillName: 'Sleight of Hand',
    abilityCode: 'Dex',
    checkTitle: 'Tangan Cekatan',
    buffName: 'Keranjang Luas',
    buffDesc: 'Muat 5 Berry sekaligus & gerak +14% lebih cepat.',
  },
  garden_rake: {
    skillName: 'Athletics',
    abilityCode: 'Str',
    checkTitle: 'Tenaga Olah Lahan',
    buffName: 'Sapuan Lebar',
    buffDesc: 'Sekali ayun bersihkan seluruh gulma di sekitar.',
  },
  defender_whistle: {
    skillName: 'Intimidation',
    abilityCode: 'Cha',
    checkTitle: 'Gema Wibawa',
    buffName: 'Gema Penjaga',
    buffDesc: 'Jangkauan luas, 2 damage sekali tiup & jeda 0.65d.',
  },
};

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
    effectHint: 'Sumur cepat penuh & bisa Siram Subur!',
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
    speed: 52,
    maxHp: 1,
    vitalityDamage: 6,
    eatCooldown: 2.8,
    accentColor: '#E8364F',
  },
  zigzagoon: {
    name: 'Zigzagoon',
    speed: 78,
    maxHp: 2,
    vitalityDamage: 9,
    eatCooldown: 2.3,
    accentColor: '#8B5A3C',
  },
  taillow: {
    name: 'Taillow',
    speed: 102,
    maxHp: 2,
    vitalityDamage: 12,
    eatCooldown: 1.9,
    accentColor: '#2E4583',
  },
};

export const STAGE_ORDER: StageLevel[] = [1, 2, 3];

export const STAGE_CONFIG: Record<
  StageLevel,
  {
    label: string;
    title: string;
    pestSummary: string;
    description: string;
    pests: CritterKind[];
    targetMultiplier: number;
    spawnIntervalScale: number;
    maxActiveBonus: number;
    accentColor: string;
  }
> = {
  1: {
    label: 'Stage 1',
    title: 'Kebun Awal',
    pestSummary: 'Wurmple & Zigzagoon',
    description: 'Gelombang awal kebun.',
    pests: ['wurmple', 'zigzagoon'],
    targetMultiplier: 1.0,
    spawnIntervalScale: 1.0,
    maxActiveBonus: 0,
    accentColor: '#2BA668',
  },
  2: {
    label: 'Stage 2',
    title: 'Kebun Ramai',
    pestSummary: 'Zigzagoon & Taillow',
    description: 'Tantangan kebun tingkat menengah.',
    pests: ['zigzagoon', 'taillow'],
    targetMultiplier: 1.75,
    spawnIntervalScale: 0.68,
    maxActiveBonus: 2,
    accentColor: '#DF7E13',
  },
  3: {
    label: 'Stage 3',
    title: 'Puncak Panen',
    pestSummary: 'Semua Hama Datang',
    description: 'Tantangan puncak kebun.',
    pests: ['wurmple', 'zigzagoon', 'taillow'],
    targetMultiplier: 2.5,
    spawnIntervalScale: 0.48,
    maxActiveBonus: 4,
    accentColor: '#D94136',
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
    roleHint: 'Siram pohon kering atau Siram Subur saat hujan',
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
    roleHint: 'Tiup untuk mengusir hama (jeda 1 detik per tiupan)',
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

export function getOrderTargets(
  playerCount: number,
  stage: StageLevel = 1
): OrderCounts {
  const mult = STAGE_CONFIG[stage]?.targetMultiplier ?? 1;
  const base =
    playerCount <= 1
      ? { oran: 6, pecha: 4, sitrus: 3 }
      : playerCount >= 5
        ? { oran: 18, pecha: 13, sitrus: 8 }
        : playerCount >= 3
          ? { oran: 14, pecha: 10, sitrus: 6 }
          : { oran: 10, pecha: 7, sitrus: 4 };

  return {
    oran: Math.max(1, Math.round(base.oran * mult)),
    pecha: Math.max(1, Math.round(base.pecha * mult)),
    sitrus: Math.max(1, Math.round(base.sitrus * mult)),
  };
}

export const WATER_WELL_POS = {
  x: 318,
  y: 616,
  radius: 44,
};

export const WELL_MAX_WATER = 12;
export const WELL_INITIAL_WATER = 8;
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

export const PLOT_COLS_X_4X4 = [456, 594, 732, 870];
export const PLOT_ROWS_Y_4X4 = [224, 342, 460, 578];
export const PLOT_SIZE_4X4 = 92;

export function getPlotSize(plotCount: number): number {
  return plotCount > 9 ? PLOT_SIZE_4X4 : PLOT_SIZE;
}

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

export const PLOT_BERRY_LAYOUT_4X4: BerryType[] = [
  'oran',
  'pecha',
  'sitrus',
  'oran',
  'pecha',
  'oran',
  'pecha',
  'sitrus',
  'sitrus',
  'pecha',
  'oran',
  'pecha',
  'oran',
  'sitrus',
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
  seedling: 4.5,
  sprout: 5.5,
  flowering: 6.5,
};

export const SOLID_OBSTACLES = [
  { x: 28, y: 110, w: 66, h: 536 },
  { x: 282, y: 582, w: 72, h: 68 },
  { x: 515, y: 74, w: 92, h: 54 },
  { x: 662, y: 88, w: 80, h: 50 },
];
