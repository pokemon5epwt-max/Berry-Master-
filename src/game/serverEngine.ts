import {
  BASKET_BUFF_MAX_CAPACITY,
  BASKET_BUFF_SPEED_MULT,
  BERRY_META,
  CRITTER_META,
  DAY_DURATION_SECONDS,
  DELIVERY_CRATE_POS,
  INTERACT_RANGE_CRATE,
  INTERACT_RANGE_PLOT,
  INTERACT_RANGE_RACK,
  INTERACT_RANGE_WELL,
  PAIL_BUFF_MAX_WATER,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLOT_BERRY_LAYOUT,
  PLOT_BERRY_LAYOUT_4X4,
  PLOT_COLS_X,
  PLOT_COLS_X_4X4,
  PLOT_ROWS_Y,
  PLOT_ROWS_Y_4X4,
  RAKE_BUFF_RADIUS,
  SKILL_CHECK_DC,
  SKILL_CHECK_MAX_MOD,
  SKILL_CHECK_MIN_MOD,
  SOLID_OBSTACLES,
  STAGE_CONFIG,
  STAGE_DURATIONS,
  TOOL_CONFIG,
  WATER_WELL_POS,
  WEATHER_DURATION_SECONDS,
  WEATHER_META,
  WELL_INITIAL_WATER,
  WELL_MAX_WATER,
  WELL_PUMP_AMOUNT,
  WHISTLE_BUFF_COOLDOWN_SECONDS,
  WHISTLE_BUFF_RANGE,
  WHISTLE_COOLDOWN_SECONDS,
  WHISTLE_REPEL_RANGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getOrderTargets,
  getRackDefinitions,
} from './constants.ts';
import type {
  BerryPlotState,
  BerryType,
  CritterKind,
  FxEvent,
  GameOverReason,
  GrowthStage,
  LobbyMember,
  OrderCounts,
  PlayerState,
  RoomPhase,
  SpawnTelegraph,
  StageLevel,
  ToolRackState,
  WeatherType,
  WildPokemonState,
  WorldSnapshot,
} from './types.ts';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

interface InternalPlayer extends PlayerState {
  moveX: number;
  moveY: number;
  actionCooldown: number;
}

interface InternalCritter extends WildPokemonState {
  eatTimer: number;
}

export class ServerFarmEngine {
  public phase: RoomPhase = 'PREP';
  public stage: StageLevel;
  public timeRemaining: number = DAY_DURATION_SECONDS;
  public totalDuration: number = DAY_DURATION_SECONDS;
  public elapsedPlayTime = 0;

  public delivered: OrderCounts = { oran: 0, pecha: 0, sitrus: 0 };
  public targets: OrderCounts;
  public crittersRepelled = 0;
  public wellWater: number = WELL_INITIAL_WATER;
  public maxWellWater: number = WELL_MAX_WATER;
  public weather: WeatherType = 'sunny';
  public weatherTimer = 28;
  public gameOverReason: GameOverReason = null;

  public players: InternalPlayer[] = [];
  public racks: ToolRackState[] = [];
  public plots: BerryPlotState[] = [];
  public critters: InternalCritter[] = [];
  public telegraphs: SpawnTelegraph[] = [];

  private pendingFx: FxEvent[] = [];
  private nextEntityId = 1;
  private critterSpawnTimer = 14;
  private weedSpawnTimer = 15;
  private wellRainAccum = 0;
  private lastSpawnSide: 'north' | 'east' | 'south' | 'west' | null = null;
  private prepAutoStartCountdown: number | null = null;

  constructor(members: LobbyMember[], stage: StageLevel = 1) {
    this.stage = stage;
    this.targets = getOrderTargets(members.length, stage);
    this.critterSpawnTimer = stage === 3 ? 6.5 : stage === 2 ? 9.5 : 13.5;
    this.weedSpawnTimer = members.length <= 1 ? 8.0 : members.length >= 5 ? 4.2 : 5.5;
    this.initWorld(members);
  }

  private rollRipeBerryCount(): number {
    return 1 + Math.floor(Math.random() * 3);
  }

  private initWorld(members: LobbyMember[]): void {
    this.players = members.map((m, i) => ({
      id: m.id,
      name: m.name,
      slotIndex: m.slotIndex,
      capColor: m.capColor,
      scarfColor: m.scarfColor,
      x: 274 + (i % 2) * 38,
      y: 230 + Math.floor(i / 2) * 115,
      facingX: 1,
      facingY: 0,
      walkPhase: 0,
      heldRackId: null,
      heldTool: null,
      buffedTool: null,
      skillCheck: {
        rackId: null,
        toolType: null,
        modifier: 0,
        naturalRoll: null,
        totalRoll: null,
        dc: SKILL_CHECK_DC,
        rolled: false,
        success: false,
      },
      whistleAnimTimer: 0,
      whistleCooldown: 0,
      squashTimer: 0,
      moveX: 0,
      moveY: 0,
      actionCooldown: 0,
    }));

    const rackDefs = getRackDefinitions(members.length);
    this.racks = rackDefs.map((def) => ({
      rackId: def.rackId,
      toolType: def.toolType,
      name: TOOL_CONFIG[def.toolType].name,
      shortName: TOOL_CONFIG[def.toolType].shortName,
      x: def.x,
      y: def.y,
      occupiedByPlayerId: null,
      occupiedByName: null,
      pailWater: 5,
      maxPailWater: 5,
      basketBerries: [],
      maxBasketCapacity: 3,
    }));

    const use4x4 = members.length > 5;
    const colsX = use4x4 ? PLOT_COLS_X_4X4 : PLOT_COLS_X;
    const rowsY = use4x4 ? PLOT_ROWS_Y_4X4 : PLOT_ROWS_Y;
    const layout = use4x4 ? PLOT_BERRY_LAYOUT_4X4 : PLOT_BERRY_LAYOUT;
    const initialStages3x3: GrowthStage[] = [
      'flowering',
      'sprout',
      'flowering',
      'sprout',
      'ripe',
      'seedling',
      'flowering',
      'sprout',
      'seedling',
    ];
    const initialStages4x4: GrowthStage[] = [
      'flowering',
      'sprout',
      'ripe',
      'seedling',
      'sprout',
      'flowering',
      'sprout',
      'flowering',
      'seedling',
      'ripe',
      'flowering',
      'sprout',
      'flowering',
      'seedling',
      'sprout',
      'seedling',
    ];
    const initialStages = use4x4 ? initialStages4x4 : initialStages3x3;

    this.plots = [];
    for (let row = 0; row < rowsY.length; row++) {
      for (let col = 0; col < colsX.length; col++) {
        const idx = row * colsX.length + col;
        const stage = initialStages[idx];
        const needsWaterInit = use4x4
          ? idx === 1 || idx === 6 || idx === 10 || idx === 14
          : idx === 1 || idx === 6;
        const hasWeedsInit = use4x4
          ? idx === 2 || idx === 5 || idx === 11
          : idx === 5;
        this.plots.push({
          id: idx,
          row,
          col,
          x: colsX[col],
          y: rowsY[row],
          berryType: layout[idx],
          stage,
          growthProgress: stage === 'ripe' ? 1 : 0.35 + (idx % 3) * 0.2,
          ripeBerriesRemaining: stage === 'ripe' ? this.rollRipeBerryCount() : 0,
          waterLevel: needsWaterInit ? 0.22 : 0.72 + (idx % 3) * 0.06,
          needsWater: needsWaterInit,
          hasWeeds: hasWeedsInit,
          vitality: 100,
          boostCooldown: 0,
          shakeTimer: 0,
          hitFlash: 0,
          popTimer: 0,
        });
      }
    }
  }

  public setPlayerInput(playerId: string, moveX: number, moveY: number): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.moveX = clamp(moveX, -1, 1);
    p.moveY = clamp(moveY, -1, 1);
  }

  public selectPrepRack(playerId: string, rackId: string): boolean {
    if (this.phase !== 'PREP') return false;
    const player = this.players.find((p) => p.id === playerId);
    const rack = this.racks.find((r) => r.rackId === rackId);
    if (!player || !rack || player.skillCheck.rolled) return false;

    if (rack.occupiedByPlayerId !== null && rack.occupiedByPlayerId !== player.id) {
      return false;
    }

    if (player.skillCheck.rackId && player.skillCheck.rackId !== rack.rackId) {
      const oldRack = this.racks.find((r) => r.rackId === player.skillCheck.rackId);
      if (oldRack && oldRack.occupiedByPlayerId === player.id) {
        oldRack.occupiedByPlayerId = null;
        oldRack.occupiedByName = null;
      }
    }

    rack.occupiedByPlayerId = player.id;
    rack.occupiedByName = player.name;
    player.skillCheck.rackId = rack.rackId;
    player.skillCheck.toolType = rack.toolType;
    return true;
  }

  public rollPrepSkillCheck(playerId: string, rawModifier: number): boolean {
    if (this.phase !== 'PREP') return false;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.skillCheck.rolled) return false;
    if (!player.skillCheck.rackId) return false;
    const rack = this.racks.find((r) => r.rackId === player.skillCheck.rackId);
    if (!rack) return false;

    const modifier = Math.round(
      clamp(
        Number.isFinite(rawModifier) ? rawModifier : 0,
        SKILL_CHECK_MIN_MOD,
        SKILL_CHECK_MAX_MOD
      )
    );
    const naturalRoll = 1 + Math.floor(Math.random() * 20);
    const totalRoll = naturalRoll + modifier;
    const success = totalRoll >= SKILL_CHECK_DC;

    player.skillCheck = {
      rackId: rack.rackId,
      toolType: rack.toolType,
      modifier,
      naturalRoll,
      totalRoll,
      dc: SKILL_CHECK_DC,
      rolled: true,
      success,
    };

    rack.occupiedByPlayerId = player.id;
    rack.occupiedByName = player.name;
    player.heldRackId = rack.rackId;
    player.heldTool = rack.toolType;

    if (success) {
      player.buffedTool = rack.toolType;
      if (rack.toolType === 'wailmer_pail') {
        rack.maxPailWater = PAIL_BUFF_MAX_WATER;
        rack.pailWater = PAIL_BUFF_MAX_WATER;
      } else if (rack.toolType === 'harvest_basket') {
        rack.maxBasketCapacity = BASKET_BUFF_MAX_CAPACITY;
      }
      this.pendingFx.push({
        type: 'dice_success',
        playerId: player.id,
      });
    } else {
      player.buffedTool = null;
      this.pendingFx.push({
        type: 'dice_fail',
        playerId: player.id,
      });
    }

    if (this.players.length > 1 && this.areAllPlayersRolled()) {
      this.prepAutoStartCountdown = 1.8;
    }

    return true;
  }

  public areAllPlayersRolled(): boolean {
    return this.players.length > 0 && this.players.every((p) => p.skillCheck.rolled);
  }

  public startRoundFromPrep(): boolean {
    if (this.phase !== 'PREP') return false;
    if (!this.areAllPlayersRolled()) return false;
    this.prepAutoStartCountdown = null;
    this.phase = 'PLAYING';
    return true;
  }

  public removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const p = this.players[idx];
    const rackIdToRelease = p.heldRackId ?? p.skillCheck.rackId;
    if (rackIdToRelease) {
      const rack = this.racks.find((r) => r.rackId === rackIdToRelease);
      if (rack && rack.occupiedByPlayerId === p.id) {
        rack.occupiedByPlayerId = null;
        rack.occupiedByName = null;
      }
    }
    this.players.splice(idx, 1);

    if (
      this.phase === 'PREP' &&
      this.players.length > 1 &&
      this.areAllPlayersRolled() &&
      this.prepAutoStartCountdown === null
    ) {
      this.prepAutoStartCountdown = 1.8;
    }
  }

  public handlePlayerAction(playerId: string): void {
    if (this.phase !== 'PLAYING') return;
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.actionCooldown > 0) return;

    player.actionCooldown = 0.14;
    player.squashTimer = 0.18;

    const isToolLocked = this.players.length > 1;
    const heldRack = player.heldRackId
      ? this.racks.find((r) => r.rackId === player.heldRackId) ?? null
      : null;

    // 1. Defender Whistle near wild Pokémon takes priority (cooldown 1.0s or 0.65s with buff)
    if (player.heldTool === 'defender_whistle') {
      const crittersInRange = this.findCrittersInWhistleRange(player);
      const nearestRack = isToolLocked ? null : this.findNearestRack(player);
      const nearHomeRack =
        nearestRack !== null && nearestRack.rackId === player.heldRackId;
      if (isToolLocked || crittersInRange.length > 0 || !nearHomeRack) {
        if (player.whistleCooldown > 0) {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: player.x,
            y: player.y - 40,
            text: `Peluit jeda ${player.whistleCooldown.toFixed(1)}d`,
            color: '#D97706',
          });
          return;
        }
        this.useWhistle(player, crittersInRange);
        return;
      }
    }

    // 2. Tool Rack Pick-Up / Put-Down (allowed in Solo; locked during 2-6P Co-op rounds)
    const rack = isToolLocked ? null : this.findNearestRack(player);
    if (rack) {
      if (player.heldRackId === null) {
        if (rack.occupiedByPlayerId === null) {
          rack.occupiedByPlayerId = player.id;
          rack.occupiedByName = player.name;
          player.heldRackId = rack.rackId;
          player.heldTool = rack.toolType;
          this.pendingFx.push({
            type: 'pickup',
            playerId: player.id,
            x: rack.x + 24,
            y: rack.y - 22,
            text: rack.shortName,
            color: TOOL_CONFIG[rack.toolType].accentColor,
          });
        } else {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: rack.x + 24,
            y: rack.y - 22,
            text: `Dipakai ${rack.occupiedByName ?? ''}`,
            color: '#C85A53',
          });
        }
        return;
      }

      if (player.heldRackId === rack.rackId) {
        rack.occupiedByPlayerId = null;
        rack.occupiedByName = null;
        player.heldRackId = null;
        player.heldTool = null;
        this.pendingFx.push({
          type: 'putdown',
          playerId: player.id,
          x: rack.x + 24,
          y: rack.y - 22,
          text: 'Ditaruh',
          color: '#7B6554',
        });
        return;
      }

      this.pendingFx.push({
        type: 'error',
        playerId: player.id,
        x: player.x,
        y: player.y - 40,
        text: 'Taruh alat di rak asalnya dulu',
        color: '#C85A53',
      });
      return;
    }

    // 3. Water Well Interaction (Pump well OR refill Wailmer Pail from well stock)
    if (
      dist(player.x, player.y, WATER_WELL_POS.x, WATER_WELL_POS.y) <=
      INTERACT_RANGE_WELL
    ) {
      if (player.heldTool === 'wailmer_pail' && heldRack) {
        if (heldRack.pailWater < heldRack.maxPailWater && this.wellWater > 0) {
          const needed = heldRack.maxPailWater - heldRack.pailWater;
          const taken = Math.min(needed, this.wellWater);
          heldRack.pailWater += taken;
          this.wellWater -= taken;
          this.pendingFx.push({
            type: 'refill',
            playerId: player.id,
            x: WATER_WELL_POS.x,
            y: WATER_WELL_POS.y - 42,
            text:
              heldRack.pailWater >= heldRack.maxPailWater
                ? `Air Penuh ${heldRack.pailWater}/${heldRack.maxPailWater}!`
                : `Isi +${taken} Air!`,
            color: '#2F78D3',
            particleKind: 'water',
            count: 14,
            wellRipple: true,
          });
          return;
        }
      }

      if (this.wellWater < this.maxWellWater) {
        const prev = this.wellWater;
        this.wellWater = Math.min(this.maxWellWater, this.wellWater + WELL_PUMP_AMOUNT);
        const gained = this.wellWater - prev;
        this.pendingFx.push({
          type: 'pump',
          playerId: player.id,
          x: WATER_WELL_POS.x,
          y: WATER_WELL_POS.y - 44,
          text: `+${gained} Air Sumur (${this.wellWater}/${this.maxWellWater})`,
          color: '#0284C7',
          particleKind: 'water',
          count: 12,
          wellRipple: true,
          wellPump: true,
        });
      } else {
        this.pendingFx.push({
          type: 'refill',
          playerId: player.id,
          x: WATER_WELL_POS.x,
          y: WATER_WELL_POS.y - 42,
          text: `Sumur Penuh (${this.wellWater}/${this.maxWellWater})`,
          color: '#2F78D3',
          count: 0,
        });
      }
      return;
    }

    // 4. Empty hands outside warehouse
    if (!heldRack || !player.heldTool) {
      const plot = this.findNearestPlot(player);
      if (plot) {
        this.pendingFx.push({
          type: 'error',
          playerId: player.id,
          x: player.x,
          y: player.y - 40,
          text: 'Ambil alat di Gudang!',
          color: '#7B6554',
        });
      }
      return;
    }

    // 5. Wailmer Pail watering (plus 'Siram Subur!' growth burst during Rain)
    if (player.heldTool === 'wailmer_pail') {
      const plot = this.findNearestPlot(player);
      if (plot) {
        if (plot.stage === 'withered') {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 36,
            text: 'Pohon layu',
            color: '#9E7B66',
          });
          return;
        }
        if (heldRack.pailWater <= 0) {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: player.x,
            y: player.y - 42,
            text: 'Air habis! Isi di Sumur',
            color: '#3B82F6',
          });
          return;
        }

        const canRainBoost =
          this.weather === 'rainy' &&
          plot.stage !== 'ripe' &&
          plot.boostCooldown <= 0;
        const needsMoisture = plot.needsWater || plot.waterLevel < 0.88;

        if (!needsMoisture && !canRainBoost) {
          this.pendingFx.push({
            type: 'water',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 38,
            text:
              this.weather === 'rainy' && plot.stage !== 'ripe'
                ? 'Baru disuburkan'
                : 'Masih basah',
            color: '#4895EF',
            count: 0,
          });
          return;
        }

        const hasPailBuff = player.buffedTool === 'wailmer_pail';
        heldRack.pailWater -= 1;
        plot.waterLevel = 1;
        plot.needsWater = false;
        plot.vitality = Math.min(100, plot.vitality + (hasPailBuff ? 28 : 20));
        plot.popTimer = 0.28;

        if (canRainBoost) {
          plot.boostCooldown = 3.5;
          this.advancePlotGrowth(plot, hasPailBuff ? 0.55 : 0.38);
          this.pendingFx.push({
            type: 'water',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 10,
            text: 'Siram Subur!',
            color: '#0EA5E9',
            particleKind: 'water',
            count: 16,
          });
        } else {
          this.pendingFx.push({
            type: 'water',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 10,
            text: 'Segar!',
            color: '#2D7DD2',
            particleKind: 'water',
            count: 14,
          });
        }
      }
      return;
    }

    // 5b. Garden Rake
    if (player.heldTool === 'garden_rake') {
      const plot = this.findNearestPlot(player);
      if (plot) {
        if (plot.stage === 'withered') {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 36,
            text: 'Pohon layu',
            color: '#9E7B66',
          });
          return;
        }
        const hasRakeBuff = player.buffedTool === 'garden_rake';
        const plotsToClear = hasRakeBuff
          ? this.plots.filter(
              (pl) =>
                pl.stage !== 'withered' &&
                pl.hasWeeds &&
                dist(plot.x, plot.y, pl.x, pl.y) <= RAKE_BUFF_RADIUS
            )
          : plot.hasWeeds
            ? [plot]
            : [];

        if (plotsToClear.length > 0) {
          for (const targetPl of plotsToClear) {
            targetPl.hasWeeds = false;
            targetPl.vitality = Math.min(100, targetPl.vitality + 18);
            targetPl.popTimer = 0.28;
            this.pendingFx.push({
              type: 'rake',
              playerId: player.id,
              x: targetPl.x,
              y: targetPl.y,
              text:
                targetPl.id === plot.id
                  ? plotsToClear.length > 1
                    ? `Sapuan Lebar (${plotsToClear.length})!`
                    : 'Bersih!'
                  : undefined,
              color: '#3A9A5B',
              particleKind: 'leaf',
              count: 12,
            });
          }
        } else {
          this.pendingFx.push({
            type: 'rake',
            playerId: player.id,
            x: plot.x,
            y: plot.y + 8,
            text: 'Tanah rapi',
            color: '#6B8F71',
            particleKind: 'dust',
            count: 5,
          });
        }
      }
      return;
    }

    // 6. Harvest Basket
    if (player.heldTool === 'harvest_basket') {
      if (
        dist(player.x, player.y, DELIVERY_CRATE_POS.x, DELIVERY_CRATE_POS.y + 18) <=
        INTERACT_RANGE_CRATE
      ) {
        if (heldRack.basketBerries.length === 0) {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: DELIVERY_CRATE_POS.x,
            y: DELIVERY_CRATE_POS.y - 36,
            text: 'Keranjang kosong',
            color: '#A67C52',
          });
          return;
        }
        const batch = [...heldRack.basketBerries];
        heldRack.basketBerries = [];
        const counts: Record<BerryType, number> = { oran: 0, pecha: 0, sitrus: 0 };
        for (const b of batch) {
          this.delivered[b] += 1;
          counts[b] += 1;
        }
        const parts: string[] = [];
        if (counts.oran > 0) parts.push(`+${counts.oran} Oran`);
        if (counts.pecha > 0) parts.push(`+${counts.pecha} Pecha`);
        if (counts.sitrus > 0) parts.push(`+${counts.sitrus} Sitrus`);

        this.pendingFx.push({
          type: 'deliver',
          playerId: player.id,
          x: DELIVERY_CRATE_POS.x,
          y: DELIVERY_CRATE_POS.y - 12,
          text: parts.join(' · '),
          color: '#B45309',
          particleKind: 'star',
          count: 16,
          crateBounce: true,
          deliveredCounts: { ...counts },
        });

        if (
          this.delivered.oran >= this.targets.oran &&
          this.delivered.pecha >= this.targets.pecha &&
          this.delivered.sitrus >= this.targets.sitrus
        ) {
          this.phase = 'VICTORY';
          this.pendingFx.push({ type: 'victory' });
        }
        return;
      }

      const plot = this.findNearestPlot(player);
      if (plot) {
        if (plot.stage === 'withered') {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 36,
            text: 'Pohon layu',
            color: '#9E7B66',
          });
          return;
        }
        if (plot.stage !== 'ripe') {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 38,
            text: 'Belum matang',
            color: '#A67C52',
          });
          return;
        }
        if (plot.hasWeeds) {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: plot.x,
            y: plot.y - 42,
            text: 'Bersihkan gulma dulu!',
            color: '#D9534F',
          });
          return;
        }
        const freeSpace =
          heldRack.maxBasketCapacity - heldRack.basketBerries.length;
        if (freeSpace <= 0) {
          this.pendingFx.push({
            type: 'error',
            playerId: player.id,
            x: player.x,
            y: player.y - 44,
            text: `Keranjang penuh (${heldRack.basketBerries.length}/${heldRack.maxBasketCapacity})!`,
            color: '#D97706',
          });
          return;
        }

        const available = Math.max(1, plot.ripeBerriesRemaining || 1);
        const taken = Math.min(freeSpace, available);
        for (let i = 0; i < taken; i++) {
          heldRack.basketBerries.push(plot.berryType);
        }

        const remainingOnTree = available - taken;
        plot.ripeBerriesRemaining = remainingOnTree;
        plot.popTimer = 0.35;

        if (remainingOnTree <= 0) {
          plot.stage = 'flowering';
          plot.growthProgress = 0.25;
          plot.ripeBerriesRemaining = 0;
        }

        const harvestText =
          remainingOnTree > 0
            ? `+${taken} ${BERRY_META[plot.berryType].label} (Sisa ${remainingOnTree})`
            : `+${taken} ${BERRY_META[plot.berryType].label}`;

        this.pendingFx.push({
          type: 'harvest',
          playerId: player.id,
          x: plot.x,
          y: plot.y - 16,
          text: harvestText,
          color: BERRY_META[plot.berryType].color,
          particleKind: 'sparkle',
          count: 10 + taken * 3,
        });
      }
    }
  }

  private useWhistle(player: InternalPlayer, targets: InternalCritter[]): void {
    const hasWhistleBuff = player.buffedTool === 'defender_whistle';
    player.whistleAnimTimer = 0.35;
    player.whistleCooldown = hasWhistleBuff
      ? WHISTLE_BUFF_COOLDOWN_SECONDS
      : WHISTLE_COOLDOWN_SECONDS;

    if (targets.length === 0) {
      this.pendingFx.push({
        type: 'whistle',
        playerId: player.id,
        x: player.x,
        y: player.y,
        repelled: false,
      });
      return;
    }

    const dmg = hasWhistleBuff ? 2 : 1;
    let anyRepelled = false;
    for (const c of targets) {
      c.hp -= dmg;
      c.hitFlash = 0.22;
      c.squash = 0.45;
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      c.x += (dx / d) * 26;
      c.y += (dy / d) * 26;

      if (c.hp <= 0) {
        c.state = 'fleeing';
        this.crittersRepelled += 1;
        anyRepelled = true;
        let repelText = 'Kabur!';
        if (c.kind === 'taillow' && this.wellWater < this.maxWellWater) {
          this.wellWater = Math.min(this.maxWellWater, this.wellWater + 1);
          repelText = 'Kabur! +1 Air Sumur';
        }
        this.pendingFx.push({
          type: 'whistle',
          playerId: player.id,
          x: c.x,
          y: c.y - 10,
          text: repelText,
          color: '#E76F51',
          particleKind: 'star',
          count: 14,
          repelled: true,
          shake: 5.5,
        });
      } else {
        c.state = 'stunned';
        c.stunTimer = 1.45;
        const hitsDone = c.maxHp - c.hp;
        this.pendingFx.push({
          type: 'whistle',
          playerId: player.id,
          x: c.x,
          y: c.y - 10,
          text: `Usir! (${hitsDone}/${c.maxHp})`,
          color: '#D97706',
          particleKind: 'star',
          count: 7,
          repelled: false,
          shake: 3,
        });
      }
    }

    if (!anyRepelled && targets.length > 0) {
      this.pendingFx.push({
        type: 'whistle',
        playerId: player.id,
        x: player.x,
        y: player.y,
        repelled: false,
      });
    } else if (anyRepelled) {
      this.pendingFx.push({
        type: 'whistle',
        playerId: player.id,
        x: player.x,
        y: player.y,
        repelled: true,
      });
    }
  }

  public step(dt: number): FxEvent[] {
    if (this.phase === 'PREP') {
      if (
        this.prepAutoStartCountdown !== null &&
        this.players.length > 1 &&
        this.areAllPlayersRolled()
      ) {
        this.prepAutoStartCountdown -= dt;
        if (this.prepAutoStartCountdown <= 0) {
          this.startRoundFromPrep();
        }
      }
      const flushed = this.pendingFx;
      this.pendingFx = [];
      return flushed;
    }

    if (this.phase !== 'PLAYING') {
      const flushed = this.pendingFx;
      this.pendingFx = [];
      return flushed;
    }

    this.elapsedPlayTime += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    if (this.timeRemaining <= 0) {
      this.phase = 'GAME_OVER';
      this.gameOverReason = 'timeout';
      this.pendingFx.push({ type: 'gameover' });
      const flushed = this.pendingFx;
      this.pendingFx = [];
      return flushed;
    }

    for (const p of this.players) {
      this.updatePlayerMovement(p, dt);
    }
    this.separatePlayers();

    this.updateWeather(dt);
    this.updatePlots(dt);
    this.updateWaveDirector(dt);
    this.updateTelegraphs(dt);
    this.updateCritters(dt);

    const healthyCount = this.plots.filter((p) => p.stage !== 'withered').length;
    if (healthyCount === 0) {
      this.phase = 'GAME_OVER';
      this.gameOverReason = 'withered';
      this.pendingFx.push({ type: 'gameover' });
    }

    const flushed = this.pendingFx;
    this.pendingFx = [];
    return flushed;
  }

  private updateWeather(dt: number): void {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      const options: WeatherType[] = (
        ['sunny', 'rainy', 'heatwave'] as WeatherType[]
      ).filter((w) => w !== this.weather);
      const next =
        this.weather === 'sunny'
          ? options[Math.floor(Math.random() * options.length)]
          : Math.random() < 0.55
            ? 'sunny'
            : options.find((w) => w !== 'sunny') ?? 'sunny';
      this.weather = next;
      this.weatherTimer = WEATHER_DURATION_SECONDS;
      this.wellRainAccum = 0;

      const meta = WEATHER_META[next];
      this.pendingFx.push({
        type: 'weather',
        weather: next,
        x: 640,
        y: 190,
        text: `Cuaca: ${meta.label}!`,
        color: meta.accentColor,
      });
    }

    if (this.weather === 'rainy') {
      this.wellRainAccum += dt;
      if (this.wellRainAccum >= 4.2) {
        this.wellRainAccum = 0;
        if (this.wellWater < this.maxWellWater) {
          this.wellWater += 1;
          this.pendingFx.push({
            type: 'refill',
            x: WATER_WELL_POS.x,
            y: WATER_WELL_POS.y - 40,
            text: '+1 Air Hujan',
            color: '#2563EB',
            particleKind: 'water',
            count: 6,
            wellRipple: true,
          });
        }
      }
    }
  }

  private updatePlayerMovement(p: InternalPlayer, dt: number): void {
    p.actionCooldown = Math.max(0, p.actionCooldown - dt);
    p.whistleAnimTimer = Math.max(0, p.whistleAnimTimer - dt);
    p.whistleCooldown = Math.max(0, p.whistleCooldown - dt);
    p.squashTimer = Math.max(0, p.squashTimer - dt);

    let nx = p.moveX;
    let ny = p.moveY;
    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }

    if (len > 0.05) {
      p.facingX = nx;
      p.facingY = ny;
      p.walkPhase += dt * 13;
    } else {
      p.walkPhase = 0;
    }

    const moveSpeed =
      p.heldTool === 'harvest_basket' && p.buffedTool === 'harvest_basket'
        ? PLAYER_SPEED * BASKET_BUFF_SPEED_MULT
        : PLAYER_SPEED;
    let nextX = p.x + nx * moveSpeed * dt;
    let nextY = p.y + ny * moveSpeed * dt;

    nextX = clamp(nextX, 95, WORLD_WIDTH - 95);
    nextY = clamp(nextY, 138, WORLD_HEIGHT - 54);

    for (const obs of SOLID_OBSTACLES) {
      const closestX = clamp(nextX, obs.x, obs.x + obs.w);
      const closestY = clamp(nextY, obs.y, obs.y + obs.h);
      const dx = nextX - closestX;
      const dy = nextY - closestY;
      const d = Math.hypot(dx, dy);
      if (d < PLAYER_RADIUS) {
        if (d > 0.001) {
          const push = PLAYER_RADIUS - d;
          nextX += (dx / d) * push;
          nextY += (dy / d) * push;
        } else {
          nextY = obs.y + obs.h + PLAYER_RADIUS;
        }
      }
    }

    p.x = nextX;
    p.y = nextY;
  }

  private separatePlayers(): void {
    const minDist = PLAYER_RADIUS * 1.9;
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i];
        const b = this.players[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.001 && d < minDist) {
          const overlap = (minDist - d) * 0.5;
          const ux = dx / d;
          const uy = dy / d;
          a.x = clamp(a.x - ux * overlap, 95, WORLD_WIDTH - 95);
          a.y = clamp(a.y - uy * overlap, 138, WORLD_HEIGHT - 54);
          b.x = clamp(b.x + ux * overlap, 95, WORLD_WIDTH - 95);
          b.y = clamp(b.y + uy * overlap, 138, WORLD_HEIGHT - 54);
        }
      }
    }
  }

  private findNearestRack(player: InternalPlayer): ToolRackState | null {
    let best: ToolRackState | null = null;
    let bestD = INTERACT_RANGE_RACK;
    for (const rack of this.racks) {
      const d = dist(player.x, player.y, rack.x + 28, rack.y);
      if (d <= bestD) {
        bestD = d;
        best = rack;
      }
    }
    return best;
  }

  private findNearestPlot(player: InternalPlayer): BerryPlotState | null {
    let best: BerryPlotState | null = null;
    let bestD = this.plots.length > 9 ? 66 : INTERACT_RANGE_PLOT;
    for (const plot of this.plots) {
      const d = dist(player.x, player.y, plot.x, plot.y);
      if (d <= bestD) {
        bestD = d;
        best = plot;
      }
    }
    return best;
  }

  private findCrittersInWhistleRange(player: InternalPlayer): InternalCritter[] {
    const range =
      player.buffedTool === 'defender_whistle'
        ? WHISTLE_BUFF_RANGE
        : WHISTLE_REPEL_RANGE;
    return this.critters.filter(
      (c) =>
        c.state !== 'fleeing' &&
        dist(player.x, player.y, c.x, c.y) <= range
    );
  }

  private advancePlotGrowth(plot: BerryPlotState, deltaProgress: number): void {
    if (plot.stage === 'ripe' || plot.stage === 'withered') return;
    plot.growthProgress += deltaProgress;
    if (plot.growthProgress >= 1) {
      plot.growthProgress = 0;
      plot.popTimer = 0.35;
      if (plot.stage === 'seedling') {
        plot.stage = 'sprout';
      } else if (plot.stage === 'sprout') {
        plot.stage = 'flowering';
      } else if (plot.stage === 'flowering') {
        plot.stage = 'ripe';
        plot.growthProgress = 1;
        plot.ripeBerriesRemaining = this.rollRipeBerryCount();
        this.pendingFx.push({
          type: 'harvest',
          x: plot.x,
          y: plot.y - 16,
          particleKind: 'sparkle',
          color: BERRY_META[plot.berryType].color,
          count: 8,
        });
      }
    }
  }

  private updatePlots(dt: number): void {
    this.weedSpawnTimer -= dt;
    if (this.weedSpawnTimer <= 0) {
      const progressRatio = clamp(this.elapsedPlayTime / this.totalDuration, 0, 1);
      if (this.players.length <= 1) {
        this.weedSpawnTimer = 8.5 - progressRatio * 2.5 + Math.random() * 2.0;
      } else if (this.players.length >= 5) {
        const gridFactor = this.plots.length > 9 ? 0.65 : 0;
        this.weedSpawnTimer =
          Math.max(2.6, 5.2 - progressRatio * 1.5 - gridFactor) +
          Math.random() * 1.2;
      } else {
        this.weedSpawnTimer =
          Math.max(3.6, 6.8 - progressRatio * 1.8) + Math.random() * 1.5;
      }
      if (this.weather === 'rainy') {
        this.weedSpawnTimer *= 0.78;
      }

      const cleanPlots = this.plots.filter(
        (p) => !p.hasWeeds && p.stage !== 'withered'
      );
      if (cleanPlots.length > 0) {
        let spawnCount = 1;
        if (this.players.length <= 1) {
          spawnCount = this.stage >= 2 && Math.random() < 0.25 ? 2 : 1;
        } else if (this.players.length >= 5) {
          const tripleChance =
            this.plots.length > 9 || this.stage >= 2 ? 0.55 : 0.3;
          spawnCount = 2 + (Math.random() < tripleChance ? 1 : 0);
        } else {
          const doubleChance = this.stage >= 2 ? 0.72 : 0.5;
          spawnCount = Math.random() < doubleChance ? 2 : 1;
        }

        const pool = [...cleanPlots];
        const actualCount = Math.min(spawnCount, pool.length);
        for (let w = 0; w < actualCount; w++) {
          const pickIdx = Math.floor(Math.random() * pool.length);
          const chosen = pool.splice(pickIdx, 1)[0];
          chosen.hasWeeds = true;
          chosen.shakeTimer = 0.25;
          this.pendingFx.push({
            type: 'weed',
            x: chosen.x,
            y: chosen.y + 8,
            particleKind: 'leaf',
            color: '#658354',
            count: 6,
          });
        }
      }
    }

    for (const plot of this.plots) {
      plot.boostCooldown = Math.max(0, plot.boostCooldown - dt);
      plot.shakeTimer = Math.max(0, plot.shakeTimer - dt);
      plot.hitFlash = Math.max(0, plot.hitFlash - dt);
      plot.popTimer = Math.max(0, plot.popTimer - dt);

      if (plot.stage === 'withered') continue;

      if (this.weather === 'rainy') {
        if (plot.waterLevel < 0.72) {
          plot.waterLevel = Math.min(0.72, plot.waterLevel + dt * 0.022);
        }
        if (plot.waterLevel > 0.35) {
          plot.needsWater = false;
        }
      } else {
        const dryRate = this.weather === 'heatwave' ? 0.044 : 0.026;
        plot.waterLevel = Math.max(0, plot.waterLevel - dt * dryRate);
        if (plot.waterLevel <= 0.25) {
          plot.needsWater = true;
        }
      }

      if (plot.waterLevel <= 0.02) {
        plot.vitality -= dt * 2.0;
      }
      if (plot.hasWeeds) {
        plot.vitality -= dt * 0.85;
      }
      if (!plot.needsWater && !plot.hasWeeds) {
        plot.vitality = Math.min(100, plot.vitality + dt * 2.4);
      }

      if (plot.vitality <= 0) {
        plot.vitality = 0;
        plot.stage = 'withered';
        this.pendingFx.push({
          type: 'wither',
          x: plot.x,
          y: plot.y - 24,
          text: 'Layu!',
          color: '#A94442',
          particleKind: 'dust',
          count: 10,
        });
        continue;
      }

      if (!plot.needsWater && !plot.hasWeeds && plot.stage !== 'ripe') {
        const dur =
          plot.stage === 'seedling'
            ? STAGE_DURATIONS.seedling
            : plot.stage === 'sprout'
              ? STAGE_DURATIONS.sprout
              : STAGE_DURATIONS.flowering;

        this.advancePlotGrowth(plot, dt / dur);
      }
    }
  }

  private updateWaveDirector(dt: number): void {
    const progressRatio = clamp(this.elapsedPlayTime / this.totalDuration, 0, 1);
    const stageCfg = STAGE_CONFIG[this.stage];
    const isSolo = this.players.length <= 1;
    const maxBase = isSolo ? 1 : this.players.length >= 5 ? 3 : 2;
    const stageBonus = isSolo
      ? this.stage === 3
        ? 2
        : this.stage === 2
          ? 1
          : 0
      : stageCfg.maxActiveBonus;
    const maxActive =
      (isSolo
        ? progressRatio > 0.55
          ? 2
          : 1
        : progressRatio > 0.45
          ? maxBase + 1
          : maxBase) + stageBonus;

    let activeCount =
      this.critters.filter((c) => c.state !== 'fleeing').length +
      this.telegraphs.length;

    this.critterSpawnTimer -= dt;
    if (this.critterSpawnTimer <= 0) {
      const baseInterval = isSolo
        ? 14.5 - progressRatio * 4.5 + Math.random() * 2.0
        : Math.max(
            4.8,
            11.8 - progressRatio * 4.4 - Math.max(0, this.players.length - 2) * 0.9
          ) +
          Math.random() * 1.8;

      this.critterSpawnTimer = Math.max(
        isSolo ? 4.2 : 2.8,
        baseInterval * stageCfg.spawnIntervalScale
      );

      if (activeCount < maxActive) {
        this.spawnCritterTelegraph();
        activeCount++;

        const pairChance =
          this.stage === 3 ? 0.55 : this.stage === 2 ? 0.3 : 0;
        if (activeCount < maxActive && Math.random() < pairChance) {
          this.spawnCritterTelegraph();
        }
      }
    }
  }

  private spawnCritterTelegraph(): void {
    const validPlots = this.plots.filter((p) => p.stage !== 'withered');
    if (validPlots.length === 0) return;

    const allSides: Array<'north' | 'east' | 'south' | 'west'> = [
      'north',
      'east',
      'south',
      'west',
    ];
    const sidePool =
      this.lastSpawnSide !== null
        ? allSides.filter((s) => s !== this.lastSpawnSide)
        : allSides;
    const side = sidePool[Math.floor(Math.random() * sidePool.length)];
    this.lastSpawnSide = side;

    let x: number;
    let y: number;
    if (side === 'north') {
      x =
        Math.random() < 0.45
          ? 280 + Math.random() * 195
          : 785 + Math.random() * 290;
      y = 48;
    } else if (side === 'east') {
      x = WORLD_WIDTH - 36;
      y = 135 + Math.random() * 510;
    } else if (side === 'south') {
      x = 270 + Math.random() * 820;
      y = WORLD_HEIGHT - 30;
    } else {
      x = 252;
      y = 135 + Math.random() * 485;
    }

    let kind: CritterKind;
    const roll = Math.random();
    if (this.stage === 1) {
      if (this.elapsedPlayTime < 75) {
        kind = 'wurmple';
      } else if (this.elapsedPlayTime < 180) {
        kind = roll < 0.62 ? 'wurmple' : 'zigzagoon';
      } else {
        kind = roll < 0.4 ? 'wurmple' : 'zigzagoon';
      }
    } else if (this.stage === 2) {
      if (this.elapsedPlayTime < 55) {
        kind = roll < 0.75 ? 'zigzagoon' : 'taillow';
      } else if (this.elapsedPlayTime < 190) {
        kind = roll < 0.55 ? 'zigzagoon' : 'taillow';
      } else {
        kind = roll < 0.38 ? 'zigzagoon' : 'taillow';
      }
    } else {
      if (this.elapsedPlayTime < 60) {
        kind = roll < 0.3 ? 'wurmple' : roll < 0.68 ? 'zigzagoon' : 'taillow';
      } else {
        kind = roll < 0.22 ? 'wurmple' : roll < 0.56 ? 'zigzagoon' : 'taillow';
      }
    }

    const priority =
      kind === 'taillow'
        ? validPlots.filter((p) => p.stage === 'ripe')
        : validPlots.filter((p) => p.stage === 'ripe' || p.stage === 'flowering');
    const fallbackPriority = validPlots.filter(
      (p) => p.stage === 'ripe' || p.stage === 'flowering'
    );
    const pool =
      priority.length > 0
        ? priority
        : fallbackPriority.length > 0
          ? fallbackPriority
          : validPlots;
    const target =
      pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : this.plots[0];

    const meta = CRITTER_META[kind];
    this.critters.push({
      id: this.nextEntityId++,
      kind,
      x,
      y,
      targetPlotId: target.id,
      state: 'moving',
      hp: meta.maxHp,
      maxHp: meta.maxHp,
      eatTimer: 0.7,
      stunTimer: 0,
      walkPhase: 0,
      hitFlash: 0,
      squash: 0,
      facingX: target.x >= x ? 1 : -1,
    });
    this.pendingFx.push({
      type: 'weed',
      x,
      y,
      particleKind: 'leaf',
      color: meta.accentColor,
      count: 6,
    });
  }

  private updateTelegraphs(dt: number): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tel = this.telegraphs[i];
      tel.timer -= dt;
      if (tel.timer <= 0) {
        const validPlots = this.plots.filter((p) => p.stage !== 'withered');
        const priority =
          tel.kind === 'taillow'
            ? validPlots.filter((p) => p.stage === 'ripe')
            : validPlots.filter((p) => p.stage === 'ripe' || p.stage === 'flowering');
        const fallbackPriority = validPlots.filter(
          (p) => p.stage === 'ripe' || p.stage === 'flowering'
        );
        const pool =
          priority.length > 0
            ? priority
            : fallbackPriority.length > 0
              ? fallbackPriority
              : validPlots;
        const target =
          pool.length > 0
            ? pool[Math.floor(Math.random() * pool.length)]
            : this.plots[0];

        const meta = CRITTER_META[tel.kind];
        this.critters.push({
          id: tel.id,
          kind: tel.kind,
          x: tel.x,
          y: tel.y,
          targetPlotId: target.id,
          state: 'moving',
          hp: meta.maxHp,
          maxHp: meta.maxHp,
          eatTimer: 0.7,
          stunTimer: 0,
          walkPhase: 0,
          hitFlash: 0,
          squash: 0,
          facingX: -1,
        });
        this.pendingFx.push({
          type: 'weed',
          x: tel.x,
          y: tel.y,
          particleKind: 'leaf',
          color: meta.accentColor,
          count: 6,
        });
        this.telegraphs.splice(i, 1);
      }
    }
  }

  private updateCritters(dt: number): void {
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const c = this.critters[i];
      const meta = CRITTER_META[c.kind];
      c.hitFlash = Math.max(0, c.hitFlash - dt);
      c.squash = Math.max(0, c.squash - dt * 2.5);

      if (c.state === 'fleeing') {
        const distTop = c.y;
        const distBottom = WORLD_HEIGHT - c.y;
        const distRight = WORLD_WIDTH - c.x;
        let exitX = WORLD_WIDTH + 60;
        let exitY = c.y;
        if (distTop < distRight && distTop < distBottom) {
          exitX = c.x;
          exitY = -60;
        } else if (distBottom < distRight && distBottom <= distTop) {
          exitX = c.x;
          exitY = WORLD_HEIGHT + 60;
        }
        const dx = exitX - c.x;
        const dy = exitY - c.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const speed = 295;
        c.x += (dx / d) * speed * dt;
        c.y += (dy / d) * speed * dt;
        c.facingX = dx >= 0 ? 1 : -1;
        c.walkPhase += dt * 22;

        if (
          c.x > WORLD_WIDTH + 40 ||
          c.x < -40 ||
          c.y > WORLD_HEIGHT + 40 ||
          c.y < -40
        ) {
          this.critters.splice(i, 1);
        }
        continue;
      }

      if (c.state === 'stunned') {
        c.stunTimer -= dt;
        if (c.stunTimer <= 0) {
          c.state = 'moving';
        }
        continue;
      }

      let targetPlot = this.plots[c.targetPlotId];
      if (!targetPlot || targetPlot.stage === 'withered') {
        const alive = this.plots.filter((p) => p.stage !== 'withered');
        if (alive.length === 0) continue;
        targetPlot = alive[Math.floor(Math.random() * alive.length)];
        c.targetPlotId = targetPlot.id;
        c.state = 'moving';
      }

      const tx = targetPlot.x + 18;
      const ty = targetPlot.y + 18;
      const d = dist(c.x, c.y, tx, ty);

      if (c.state === 'moving') {
        if (d <= 28) {
          c.state = 'eating';
          c.eatTimer = 0.75;
        } else {
          const speed = meta.speed;
          const dx = tx - c.x;
          const dy = ty - c.y;
          const ux = dx / d;
          const uy = dy / d;
          const zigzagOffset =
            c.kind === 'zigzagoon' && d > 44 ? Math.sin(c.walkPhase * 0.95) * 32 : 0;
          c.x += (ux * speed - uy * zigzagOffset) * dt;
          c.y += (uy * speed + ux * zigzagOffset) * dt;
          c.facingX = dx >= 0 ? 1 : -1;
          c.walkPhase += dt * (c.kind === 'taillow' ? 16 : c.kind === 'zigzagoon' ? 14 : 11);
        }
      } else if (c.state === 'eating') {
        if (d > 38) {
          c.state = 'moving';
          continue;
        }
        c.eatTimer -= dt;
        if (c.eatTimer <= 0) {
          c.eatTimer = meta.eatCooldown;
          c.squash = 0.35;
          targetPlot.shakeTimer = 0.3;
          targetPlot.hitFlash = 0.16;
          targetPlot.hasWeeds = true;
          targetPlot.vitality = Math.max(0, targetPlot.vitality - meta.vitalityDamage);

          let ateText: string | undefined;
          if (targetPlot.stage === 'ripe') {
            if ((targetPlot.ripeBerriesRemaining ?? 1) > 1) {
              targetPlot.ripeBerriesRemaining -= 1;
              ateText =
                c.kind === 'taillow' ? '1 Buah disambar!' : '1 Buah dimakan!';
            } else {
              targetPlot.stage = 'flowering';
              targetPlot.growthProgress = 0.35;
              targetPlot.ripeBerriesRemaining = 0;
              ateText =
                c.kind === 'taillow' ? 'Buah disambar!' : 'Buah dimakan!';
            }
          } else if (targetPlot.growthProgress > 0.25) {
            targetPlot.growthProgress = Math.max(0, targetPlot.growthProgress - 0.35);
          } else if (targetPlot.stage === 'flowering') {
            targetPlot.stage = 'sprout';
            targetPlot.growthProgress = 0.5;
          }

          this.pendingFx.push({
            type: 'munch',
            x: targetPlot.x,
            y: targetPlot.y - 34,
            text: ateText,
            color: '#D9534F',
            particleKind: 'leaf',
            count: c.kind === 'taillow' ? 10 : 7,
          });
        }
      }
    }
  }

  public getSnapshot(): WorldSnapshot {
    return {
      phase: this.phase,
      stage: this.stage,
      timeRemaining: this.timeRemaining,
      totalDuration: this.totalDuration,
      weather: this.weather,
      weatherTimer: Math.max(0, Math.ceil(this.weatherTimer)),
      delivered: { ...this.delivered },
      targets: { ...this.targets },
      crittersRepelled: this.crittersRepelled,
      wellWater: this.wellWater,
      maxWellWater: this.maxWellWater,
      gameOverReason: this.gameOverReason,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        slotIndex: p.slotIndex,
        capColor: p.capColor,
        scarfColor: p.scarfColor,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        facingX: p.facingX,
        facingY: p.facingY,
        walkPhase: Math.round(p.walkPhase * 100) / 100,
        heldRackId: p.heldRackId,
        heldTool: p.heldTool,
        buffedTool: p.buffedTool,
        skillCheck: { ...p.skillCheck },
        whistleAnimTimer: p.whistleAnimTimer,
        whistleCooldown: Math.round(p.whistleCooldown * 100) / 100,
        squashTimer: p.squashTimer,
      })),
      racks: this.racks.map((r) => ({
        ...r,
        basketBerries: [...r.basketBerries],
      })),
      plots: this.plots.map((pl) => ({ ...pl })),
      critters: this.critters.map((c) => ({
        id: c.id,
        kind: c.kind,
        x: Math.round(c.x * 10) / 10,
        y: Math.round(c.y * 10) / 10,
        targetPlotId: c.targetPlotId,
        state: c.state,
        hp: c.hp,
        maxHp: c.maxHp,
        stunTimer: c.stunTimer,
        walkPhase: Math.round(c.walkPhase * 100) / 100,
        hitFlash: c.hitFlash,
        squash: c.squash,
        facingX: c.facingX,
      })),
      telegraphs: this.telegraphs.map((t) => ({ ...t })),
    };
  }
}
