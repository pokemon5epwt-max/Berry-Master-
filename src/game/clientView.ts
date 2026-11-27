import { soundManager } from './audio.ts';
import {
  BERRY_META,
  DAY_DURATION_SECONDS,
  DELIVERY_CRATE_POS,
  INTERACT_RANGE_CRATE,
  INTERACT_RANGE_PLOT,
  INTERACT_RANGE_RACK,
  INTERACT_RANGE_WELL,
  PLOT_BERRY_LAYOUT,
  PLOT_COLS_X,
  PLOT_ROWS_Y,
  TOOL_CONFIG,
  WATER_WELL_POS,
  WELL_INITIAL_WATER,
  WELL_MAX_WATER,
  WHISTLE_REPEL_RANGE,
  WORLD_WIDTH,
  getOrderTargets,
  getRackDefinitions,
} from './constants.ts';
import type {
  AmbientButterfly,
  BerryPlotState,
  FxEvent,
  GrowthStage,
  InteractPrompt,
  Particle,
  PlayerState,
  SpawnTelegraph,
  ToolRackState,
  WildPokemonState,
  WorldSnapshot,
} from './types.ts';

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export interface WeatherParticle {
  x: number;
  y: number;
  speed: number;
  len: number;
  alpha: number;
}

export class ClientWorldView {
  public snapshot: WorldSnapshot;
  public renderPlayers = new Map<string, PlayerState>();
  public renderCritters = new Map<number, WildPokemonState>();
  public particles: Particle[] = [];
  public butterflies: AmbientButterfly[] = [];
  public weatherParticles: WeatherParticle[] = [];

  public worldClock = 0;
  public shakeTimer = 0;
  public shakeIntensity = 0;
  public crateBounceTimer = 0;
  public wellRippleTimer = 0;
  public wellPumpTimer = 0;
  public berryMasterSpeech: string | null = null;
  public berryMasterSpeechTimer = 0;
  public berryMasterCheerTimer = 0;
  public localPrompt: InteractPrompt | null = null;

  constructor() {
    this.snapshot = this.createPreviewSnapshot();
    this.initButterflies();
    this.initWeatherParticles();
  }

  private initWeatherParticles(): void {
    this.weatherParticles = Array.from({ length: 48 }, (_, i) => ({
      x: (i * 97) % WORLD_WIDTH,
      y: (i * 61) % 760,
      speed: 360 + (i % 5) * 42,
      len: 12 + (i % 4) * 5,
      alpha: 0.35 + (i % 4) * 0.12,
    }));
  }

  private initButterflies(): void {
    const colors = ['#FFF2A6', '#FFD1DC', '#BEE9FF', '#E5D4FF'];
    this.butterflies = Array.from({ length: 7 }, (_, i) => {
      const y = 155 + i * 86;
      return {
        x: 320 + ((i * 185) % 700),
        y,
        baseY: y,
        vx: (i % 2 === 0 ? 1 : -1) * (18 + (i % 3) * 7),
        phase: i * 1.4,
        color: colors[i % colors.length],
      };
    });
  }

  public createPreviewSnapshot(): WorldSnapshot {
    const rackDefs = getRackDefinitions(4);
    const racks: ToolRackState[] = rackDefs.map((def) => ({
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

    const previewStages: GrowthStage[] = [
      'ripe',
      'flowering',
      'ripe',
      'flowering',
      'ripe',
      'sprout',
      'flowering',
      'ripe',
      'sprout',
    ];

    const plots: BerryPlotState[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const stage = previewStages[idx];
        plots.push({
          id: idx,
          row,
          col,
          x: PLOT_COLS_X[col],
          y: PLOT_ROWS_Y[row],
          berryType: PLOT_BERRY_LAYOUT[idx],
          stage,
          growthProgress: 0.7,
          ripeBerriesRemaining: stage === 'ripe' ? ((idx % 3) + 1) : 0,
          waterLevel: 0.85,
          needsWater: false,
          hasWeeds: false,
          vitality: 100,
          shakeTimer: 0,
          hitFlash: 0,
          popTimer: 0,
        });
      }
    }

    return {
      phase: 'LOBBY',
      stage: 1,
      timeRemaining: DAY_DURATION_SECONDS,
      totalDuration: DAY_DURATION_SECONDS,
      weather: 'sunny',
      weatherTimer: 28,
      delivered: { oran: 0, pecha: 0, sitrus: 0 },
      targets: getOrderTargets(4, 1),
      crittersRepelled: 0,
      wellWater: WELL_INITIAL_WATER,
      maxWellWater: WELL_MAX_WATER,
      gameOverReason: null,
      players: [],
      racks,
      plots,
      critters: [],
      telegraphs: [],
    };
  }

  public resetToPreview(): void {
    this.snapshot = this.createPreviewSnapshot();
    this.renderPlayers.clear();
    this.renderCritters.clear();
    this.particles = [];
    this.berryMasterSpeech = null;
    this.berryMasterSpeechTimer = 0;
    this.berryMasterCheerTimer = 0;
    this.localPrompt = null;
  }

  public applyServerSnapshot(next: WorldSnapshot): void {
    const prevPhase = this.snapshot.phase;
    this.snapshot = next;
    if (prevPhase === 'LOBBY' && next.phase === 'PLAYING' && !this.berryMasterSpeech) {
      this.setBerryMasterSpeech('Ayo isi Peti Setoran sebelum senja!', 3.2);
    }

    // Sync player map
    const activePlayerIds = new Set(next.players.map((p) => p.id));
    for (const id of this.renderPlayers.keys()) {
      if (!activePlayerIds.has(id)) {
        this.renderPlayers.delete(id);
      }
    }
    for (const p of next.players) {
      const existing = this.renderPlayers.get(p.id);
      if (!existing) {
        this.renderPlayers.set(p.id, { ...p });
      } else {
        existing.facingX = p.facingX;
        existing.facingY = p.facingY;
        existing.walkPhase = p.walkPhase;
        existing.heldRackId = p.heldRackId;
        existing.heldTool = p.heldTool;
        existing.whistleAnimTimer = p.whistleAnimTimer;
        existing.squashTimer = p.squashTimer;
        existing.name = p.name;
        existing.capColor = p.capColor;
        existing.scarfColor = p.scarfColor;
      }
    }

    // Sync critters map
    const activeCritterIds = new Set(next.critters.map((c) => c.id));
    for (const id of this.renderCritters.keys()) {
      if (!activeCritterIds.has(id)) {
        this.renderCritters.delete(id);
      }
    }
    for (const c of next.critters) {
      const existing = this.renderCritters.get(c.id);
      if (!existing) {
        this.renderCritters.set(c.id, { ...c });
      } else {
        existing.state = c.state;
        existing.hp = c.hp;
        existing.stunTimer = c.stunTimer;
        existing.walkPhase = c.walkPhase;
        existing.hitFlash = c.hitFlash;
        existing.squash = c.squash;
        existing.facingX = c.facingX;
      }
    }
  }

  public applyFxEvents(events: FxEvent[]): void {
    for (const ev of events) {
      // Sound effects
      if (ev.type === 'pickup') soundManager.playPickup();
      else if (ev.type === 'putdown') soundManager.playPutdown();
      else if (ev.type === 'error') soundManager.playError();
      else if (ev.type === 'water' && (ev.count ?? 0) > 0) soundManager.playWater();
      else if (ev.type === 'refill') soundManager.playRefill();
      else if (ev.type === 'pump') soundManager.playPump();
      else if (ev.type === 'harvest' && ev.text) soundManager.playHarvest();
      else if (ev.type === 'deliver') {
        soundManager.playDeliver();
        soundManager.playBerryMasterCheer();
        this.triggerBerryMasterDeliverReaction(ev);
      } else if (ev.type === 'rake') soundManager.playRake();
      else if (ev.type === 'whistle' && ev.particleKind === undefined) {
        soundManager.playWhistle(Boolean(ev.repelled));
      } else if (ev.type === 'munch') soundManager.playCritterMunch();
      else if (ev.type === 'weather' && ev.weather) {
        soundManager.playWeatherChange(ev.weather);
        if (ev.weather === 'rainy') {
          this.setBerryMasterSpeech('Hujan turun! Tanah basah & sumur terisi!', 2.8);
        } else if (ev.weather === 'heatwave') {
          this.setBerryMasterSpeech('Panas terik! Awas tanah cepat kering!', 2.8);
        } else {
          this.setBerryMasterSpeech('Langit cerah kembali! Ayo semangat!', 2.6);
        }
      } else if (ev.type === 'victory') {
        soundManager.playVictory();
        this.setBerryMasterSpeech('Terima kasih! Panen Berry luar biasa!', 4);
        this.berryMasterCheerTimer = 2.0;
      } else if (ev.type === 'gameover') soundManager.playGameOver();

      if (ev.crateBounce) {
        this.crateBounceTimer = 0.35;
      }
      if (ev.wellRipple) {
        this.wellRippleTimer = 0.7;
      }
      if (ev.wellPump) {
        this.wellPumpTimer = 0.4;
      }
      if (ev.shake) {
        this.shakeTimer = 0.2;
        this.shakeIntensity = ev.shake;
      }

      if (ev.type === 'whistle' && ev.x !== undefined && ev.y !== undefined && !ev.particleKind) {
        this.particles.push({
          kind: 'ring',
          x: ev.x,
          y: ev.y,
          vx: 0,
          vy: 0,
          radius: 18,
          maxRadius: WHISTLE_REPEL_RANGE,
          color: '#F4A261',
          alpha: 0.9,
          life: 0,
          maxLife: 0.38,
        });
        this.spawnBurst(ev.x, ev.y - 18, 'note', 4, '#E76F51');
      }

      if (
        ev.particleKind &&
        ev.x !== undefined &&
        ev.y !== undefined &&
        (ev.count ?? 0) > 0
      ) {
        this.spawnBurst(
          ev.x,
          ev.y,
          ev.particleKind,
          ev.count!,
          ev.color ?? '#FFD166'
        );
      }

      if (ev.text && ev.x !== undefined && ev.y !== undefined) {
        this.particles.push({
          kind: 'float_text',
          x: ev.x,
          y: ev.y - 12,
          vx: 0,
          vy: -36,
          radius: 14,
          color: ev.color ?? '#42332A',
          alpha: 1,
          life: 0,
          maxLife: 1.05,
          text: ev.text,
        });
      }
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    kind: Particle['kind'],
    count: number,
    color: string
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 35 + Math.random() * 85;
      this.particles.push({
        kind,
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (kind === 'water' || kind === 'sparkle' ? 28 : 15),
        radius: kind === 'star' ? 5.5 : 3.5 + Math.random() * 2.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
      });
    }
  }

  private setBerryMasterSpeech(text: string, duration = 2.6): void {
    this.berryMasterSpeech = text;
    this.berryMasterSpeechTimer = duration;
  }

  private triggerBerryMasterDeliverReaction(ev: FxEvent): void {
    this.berryMasterCheerTimer = 1.4;
    const c = ev.deliveredCounts;
    const totalBatch = c ? c.oran + c.pecha + c.sitrus : 1;

    const remOran = Math.max(0, this.snapshot.targets.oran - this.snapshot.delivered.oran);
    const remPecha = Math.max(0, this.snapshot.targets.pecha - this.snapshot.delivered.pecha);
    const remSitrus = Math.max(0, this.snapshot.targets.sitrus - this.snapshot.delivered.sitrus);
    const totalRem = remOran + remPecha + remSitrus;

    if (totalRem > 0 && totalRem <= 3) {
      this.setBerryMasterSpeech(`Tinggal ${totalRem} Berry lagi! Semangat!`, 2.8);
      return;
    }

    if (totalBatch >= 3) {
      const praises = [
        'Wah, keranjang penuh! Hebat sekali!',
        'Segar sekali! Panen bertiga mantap!',
      ];
      this.setBerryMasterSpeech(
        praises[Math.floor(Math.random() * praises.length)],
        2.7
      );
      return;
    }

    if (c && c.sitrus > 0) {
      this.setBerryMasterSpeech('Sitrus Berry harum sekali! Terima kasih!', 2.4);
    } else if (c && c.pecha > 0) {
      this.setBerryMasterSpeech('Manisnya Pecha Berry segar ini!', 2.4);
    } else {
      this.setBerryMasterSpeech('Oran Berry bagus! Teruskan ya!', 2.4);
    }
  }

  public updateFrame(rawDt: number, localPlayerId: string | null): void {
    const dt = Math.min(rawDt, 0.05);
    this.worldClock += dt;

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.crateBounceTimer > 0) this.crateBounceTimer = Math.max(0, this.crateBounceTimer - dt);
    if (this.wellRippleTimer > 0) this.wellRippleTimer = Math.max(0, this.wellRippleTimer - dt);
    if (this.wellPumpTimer > 0) this.wellPumpTimer = Math.max(0, this.wellPumpTimer - dt);
    if (this.berryMasterCheerTimer > 0) {
      this.berryMasterCheerTimer = Math.max(0, this.berryMasterCheerTimer - dt);
    }
    if (this.berryMasterSpeechTimer > 0) {
      this.berryMasterSpeechTimer = Math.max(0, this.berryMasterSpeechTimer - dt);
      if (this.berryMasterSpeechTimer <= 0) {
        this.berryMasterSpeech = null;
      }
    }

    // Weather ambient particles
    if (this.snapshot.weather === 'rainy') {
      for (const wp of this.weatherParticles) {
        wp.x -= wp.speed * 0.22 * dt;
        wp.y += wp.speed * dt;
        if (wp.y > 760) {
          wp.y = -20;
          wp.x = Math.random() * (WORLD_WIDTH + 160);
        }
        if (wp.x < -30) {
          wp.x = WORLD_WIDTH + 20;
        }
      }
    } else if (this.snapshot.weather === 'heatwave') {
      for (const wp of this.weatherParticles) {
        wp.y -= 28 * dt;
        wp.x += Math.sin(this.worldClock * 2 + wp.y * 0.02) * 14 * dt;
        if (wp.y < -15) {
          wp.y = 770;
          wp.x = Math.random() * WORLD_WIDTH;
        }
      }
    }

    // Butterflies (hide during rain)
    if (this.snapshot.weather !== 'rainy') {
      for (const b of this.butterflies) {
        b.x += b.vx * dt;
        b.phase += dt * 3.8;
        b.y = b.baseY + Math.sin(b.phase) * 14;
        if (b.x > WORLD_WIDTH - 90) b.vx = -Math.abs(b.vx);
        if (b.x < 240) b.vx = Math.abs(b.vx);
      }
    }

    // Interpolate players & critters smoothly toward server snapshot
    const lerpFactor = Math.min(1, dt * 18);
    for (const sp of this.snapshot.players) {
      const rp = this.renderPlayers.get(sp.id);
      if (rp) {
        if (Math.hypot(sp.x - rp.x, sp.y - rp.y) > 120) {
          rp.x = sp.x;
          rp.y = sp.y;
        } else {
          rp.x += (sp.x - rp.x) * lerpFactor;
          rp.y += (sp.y - rp.y) * lerpFactor;
        }
      }
    }

    for (const sc of this.snapshot.critters) {
      const rc = this.renderCritters.get(sc.id);
      if (rc) {
        rc.x += (sc.x - rc.x) * lerpFactor;
        rc.y += (sc.y - rc.y) * lerpFactor;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const progress = p.life / p.maxLife;
      p.alpha = 1 - progress;
      if (p.kind === 'ring') {
        const maxR = p.maxRadius ?? 120;
        p.radius = 18 + (maxR - 18) * (1 - Math.pow(1 - progress, 2));
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'water' || p.kind === 'leaf') {
          p.vy += 150 * dt;
        }
      }
    }

    // Compute local contextual prompt
    if (localPlayerId && this.snapshot.phase === 'PLAYING') {
      const me = this.renderPlayers.get(localPlayerId);
      this.localPrompt = me ? this.computePrompt(me) : null;
    } else {
      this.localPrompt = null;
    }
  }

  private computePrompt(player: PlayerState): InteractPrompt | null {
    const heldRack = player.heldRackId
      ? this.snapshot.racks.find((r) => r.rackId === player.heldRackId) ?? null
      : null;

    if (player.heldTool === 'defender_whistle') {
      for (const c of this.renderCritters.values()) {
        if (
          c.state !== 'fleeing' &&
          dist(player.x, player.y, c.x, c.y) <= WHISTLE_REPEL_RANGE
        ) {
          return {
            x: c.x,
            y: c.y - 42,
            label: `Usir! (${c.hp}/${c.maxHp})`,
            accentColor: '#E76F51',
            kind: 'critter',
          };
        }
      }
    }

    if (
      player.heldTool === 'harvest_basket' &&
      heldRack &&
      heldRack.basketBerries.length > 0 &&
      dist(player.x, player.y, DELIVERY_CRATE_POS.x, DELIVERY_CRATE_POS.y + 18) <=
        INTERACT_RANGE_CRATE
    ) {
      return {
        x: DELIVERY_CRATE_POS.x,
        y: DELIVERY_CRATE_POS.y - 38,
        label: `Setor (${heldRack.basketBerries.length})`,
        accentColor: '#E09F3E',
        kind: 'crate',
      };
    }

    if (
      dist(player.x, player.y, WATER_WELL_POS.x, WATER_WELL_POS.y) <=
      INTERACT_RANGE_WELL
    ) {
      if (
        player.heldTool === 'wailmer_pail' &&
        heldRack &&
        heldRack.pailWater < heldRack.maxPailWater &&
        this.snapshot.wellWater > 0
      ) {
        return {
          x: WATER_WELL_POS.x,
          y: WATER_WELL_POS.y - 52,
          label: `Isi Ember (${this.snapshot.wellWater}/${this.snapshot.maxWellWater})`,
          accentColor: '#4895EF',
          kind: 'well',
        };
      }
      const needsPump = this.snapshot.wellWater < this.snapshot.maxWellWater;
      return {
        x: WATER_WELL_POS.x,
        y: WATER_WELL_POS.y - 52,
        label: needsPump
          ? `Pompa Sumur (+3)`
          : `Sumur Penuh (${this.snapshot.wellWater}/${this.snapshot.maxWellWater})`,
        accentColor: needsPump ? '#0284C7' : '#4895EF',
        kind: 'well',
      };
    }

    // Nearest rack
    let bestRack: ToolRackState | null = null;
    let bestRackDist = INTERACT_RANGE_RACK;
    for (const r of this.snapshot.racks) {
      const d = dist(player.x, player.y, r.x + 28, r.y);
      if (d <= bestRackDist) {
        bestRackDist = d;
        bestRack = r;
      }
    }

    if (bestRack) {
      if (player.heldRackId === null && bestRack.occupiedByPlayerId === null) {
        return {
          x: bestRack.x + 26,
          y: bestRack.y - 34,
          label: `Ambil ${bestRack.shortName}`,
          accentColor: TOOL_CONFIG[bestRack.toolType].accentColor,
          kind: 'rack',
        };
      }
      if (player.heldRackId === bestRack.rackId) {
        return {
          x: bestRack.x + 26,
          y: bestRack.y - 34,
          label: `Taruh ${bestRack.shortName}`,
          accentColor: TOOL_CONFIG[bestRack.toolType].accentColor,
          kind: 'rack',
        };
      }
    }

    // Nearest plot
    let bestPlot: BerryPlotState | null = null;
    let bestPlotDist = INTERACT_RANGE_PLOT;
    for (const p of this.snapshot.plots) {
      const d = dist(player.x, player.y, p.x, p.y);
      if (d <= bestPlotDist) {
        bestPlotDist = d;
        bestPlot = p;
      }
    }

    if (bestPlot && bestPlot.stage !== 'withered' && heldRack) {
      if (
        player.heldTool === 'wailmer_pail' &&
        (bestPlot.needsWater || bestPlot.waterLevel < 0.85)
      ) {
        return {
          x: bestPlot.x,
          y: bestPlot.y - 54,
          label: heldRack.pailWater > 0 ? 'Siram' : 'Isi Air Dulu!',
          accentColor: '#4895EF',
          kind: 'plot',
        };
      }
      if (player.heldTool === 'garden_rake' && bestPlot.hasWeeds) {
        return {
          x: bestPlot.x,
          y: bestPlot.y - 54,
          label: 'Bersihkan Gulma',
          accentColor: '#52B788',
          kind: 'plot',
        };
      }
      if (player.heldTool === 'harvest_basket' && bestPlot.stage === 'ripe') {
        if (bestPlot.hasWeeds) {
          return {
            x: bestPlot.x,
            y: bestPlot.y - 54,
            label: 'Butuh Rake!',
            accentColor: '#E76F51',
            kind: 'plot',
          };
        }
        const count = Math.max(1, bestPlot.ripeBerriesRemaining || 1);
        return {
          x: bestPlot.x,
          y: bestPlot.y - 54,
          label:
            heldRack.basketBerries.length >= heldRack.maxBasketCapacity
              ? 'Keranjang Penuh!'
              : `Petik ${BERRY_META[bestPlot.berryType].label} (${count})`,
          accentColor: '#E09F3E',
          kind: 'plot',
        };
      }
    }

    return null;
  }
}
