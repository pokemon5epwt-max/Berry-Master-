import {
  BERRY_MASTER_POS,
  BERRY_META,
  CRITTER_META,
  DELIVERY_CRATE_POS,
  PLOT_SIZE,
  TOOL_CONFIG,
  WAREHOUSE_BOUNDS,
  WATER_WELL_POS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants.ts';
import type { ClientWorldView } from './clientView.ts';
import type {
  BerryPlotState,
  BerryType,
  CritterKind,
  Particle,
  PlayerState,
  ToolRackState,
  ToolType,
  WildPokemonState,
} from './types.ts';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const MEADOW_PATCHES = Array.from({ length: 58 }, (_, i) => ({
  x: 48 + ((i * 179) % (WORLD_WIDTH - 96)),
  y: 72 + ((i * 131) % (WORLD_HEIGHT - 105)),
  kind: i % 4,
  scale: 0.85 + (i % 3) * 0.14,
}));

const GARDEN_FENCE_POSTS = [
  { x: 276, y: 142 },
  { x: 332, y: 142 },
  { x: 388, y: 142 },
  { x: 444, y: 142 },
  { x: 806, y: 142 },
  { x: 862, y: 142 },
  { x: 918, y: 142 },
  { x: 974, y: 142 },
];

const FOREST_TREES = [
  { x: 1125, y: 120, r: 48, shade: 0, autumn: false, fruits: true },
  { x: 1205, y: 185, r: 54, shade: 1, autumn: true, fruits: false },
  { x: 1150, y: 265, r: 44, shade: 2, autumn: false, fruits: true },
  { x: 1220, y: 350, r: 56, shade: 0, autumn: true, fruits: false },
  { x: 1160, y: 440, r: 46, shade: 1, autumn: false, fruits: false },
  { x: 1225, y: 525, r: 52, shade: 2, autumn: true, fruits: false },
  { x: 1145, y: 610, r: 50, shade: 0, autumn: false, fruits: true },
  { x: 1215, y: 695, r: 56, shade: 1, autumn: true, fruits: false },
  { x: 1035, y: 78, r: 46, shade: 1, autumn: false, fruits: true },
  { x: 965, y: 64, r: 40, shade: 2, autumn: true, fruits: false },
  { x: 295, y: 68, r: 44, shade: 0, autumn: false, fruits: true },
  { x: 395, y: 64, r: 40, shade: 1, autumn: false, fruits: false },
  { x: 92, y: 70, r: 48, shade: 2, autumn: true, fruits: false },
  { x: 110, y: 722, r: 42, shade: 1, autumn: false, fruits: true },
  { x: 205, y: 734, r: 38, shade: 0, autumn: false, fruits: false },
  { x: 430, y: 736, r: 36, shade: 2, autumn: true, fruits: false },
  { x: 650, y: 736, r: 38, shade: 1, autumn: false, fruits: true },
  { x: 870, y: 734, r: 40, shade: 0, autumn: true, fruits: false },
  { x: 1020, y: 724, r: 46, shade: 2, autumn: false, fruits: true },
];

export function renderClientWorld(
  ctx: CanvasRenderingContext2D,
  view: ClientWorldView,
  localPlayerId: string | null
): void {
  const t = view.worldClock;
  const snap = view.snapshot;

  ctx.save();

  if (view.shakeTimer > 0) {
    const mag = view.shakeIntensity * (view.shakeTimer / 0.2);
    ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
  }

  // 1. Detailed Pixel-Cozy Meadow Tiles & Wildflowers
  drawMeadowGround(ctx, t);

  // 2. Cobblestone Stepping Paths & Wooden Garden Fence
  drawPathsAndFence(ctx, t);

  // 3. Detailed Gudang Kebun Berry & Tool Racks
  drawWarehouse(ctx, view, t);

  // 4. Detailed Sumur & Kolam Air
  drawWaterWell(ctx, view, t);

  // 5. Detailed Berry Master Stall & Peti Setoran
  drawBerryMasterAndCrate(ctx, view, t);

  // 6. Raised Planter Soil Beds (3x3)
  for (const plot of snap.plots) {
    drawPlotSoilBase(ctx, plot, t);
  }

  // 7. Depth-Sorted Entities (Berry Trees, Players, Wild Critters)
  type Drawable = { y: number; draw: () => void };
  const drawables: Drawable[] = [];

  for (const plot of snap.plots) {
    drawables.push({
      y: plot.y + 8,
      draw: () => drawPlotPlant(ctx, plot, t),
    });
  }

  for (const player of view.renderPlayers.values()) {
    drawables.push({
      y: player.y,
      draw: () => drawPlayer(ctx, player, view, player.id === localPlayerId, t),
    });
  }

  for (const critter of view.renderCritters.values()) {
    drawables.push({
      y: critter.y,
      draw: () => drawCritter(ctx, critter, t),
    });
  }

  drawables.sort((a, b) => a.y - b.y);
  for (const item of drawables) {
    item.draw();
  }

  // 8. Plot Status Badges (Water Drop, Weeds, Growth, Vitality)
  for (const plot of snap.plots) {
    drawPlotStatusOverlay(ctx, plot, t);
  }

  // 9. Spawn Telegraphs
  for (const tel of snap.telegraphs) {
    drawTelegraph(ctx, tel.x, tel.y, tel.timer / tel.maxTimer, t, tel.kind);
  }

  // 10. Layered Forest Canopy Border
  drawForestBorder(ctx, t);

  // 11. Ambient Butterflies (clear/heatwave only)
  if (snap.weather !== 'rainy') {
    for (const b of view.butterflies) {
      drawButterfly(ctx, b.x, b.y, b.phase, b.color);
    }
  }

  // 12. Weather Particles (Rain streaks / Heat shimmer)
  drawWeatherParticles(ctx, view, t);

  // 13. Morning-to-Dusk Atmosphere & Glowing Lantern Halos
  drawAtmosphereAndLanterns(ctx, view, t);

  // 14. Berry Master Speech Bubble (above dusk tint for sharp contrast)
  if (view.berryMasterSpeech && snap.phase !== 'LOBBY') {
    drawBerryMasterSpeech(ctx, view.berryMasterSpeech, view.berryMasterSpeechTimer);
  }

  // 15. Particles & Popups
  for (const p of view.particles) {
    drawParticle(ctx, p);
  }

  // 16. Local Player Contextual [SPACE] Prompt
  if (snap.phase === 'PLAYING' && view.localPrompt) {
    drawInteractionPrompt(ctx, view.localPrompt);
  }

  ctx.restore();
}

function drawMeadowGround(ctx: CanvasRenderingContext2D, t: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  grad.addColorStop(0, '#78C257');
  grad.addColorStop(0.55, '#68B44A');
  grad.addColorStop(1, '#58A13D');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Crisp pixel-tile meadow checkerboard
  ctx.fillStyle = 'rgba(255, 252, 220, 0.08)';
  const tile = 32;
  for (let gx = 0; gx < WORLD_WIDTH; gx += tile) {
    for (let gy = 0; gy < WORLD_HEIGHT; gy += tile) {
      if (((gx / tile) + (gy / tile)) % 2 === 0) {
        ctx.fillRect(gx, gy, tile, tile);
      }
    }
  }

  // Pixel grass tufts, clovers & wildflowers
  for (const d of MEADOW_PATCHES) {
    ctx.save();
    ctx.translate(Math.round(d.x), Math.round(d.y));
    ctx.scale(d.scale, d.scale);
    const sway = Math.sin(t * 1.9 + d.x * 0.02) * 1.4;

    ctx.fillStyle = '#3E7A2D';
    ctx.fillRect(-4, -3, 2, 4);
    ctx.fillRect(0 + Math.round(sway * 0.4), -6, 2, 7);
    ctx.fillRect(4, -4, 2, 5);

    if (d.kind === 0) {
      ctx.fillStyle = '#FFFDF2';
      ctx.fillRect(-3, -7, 2, 2);
      ctx.fillRect(1, -7, 2, 2);
      ctx.fillRect(-3, -3, 2, 2);
      ctx.fillRect(1, -3, 2, 2);
      ctx.fillStyle = '#F6C453';
      ctx.fillRect(-1, -5, 2, 2);
    } else if (d.kind === 1) {
      ctx.fillStyle = '#FFCAD4';
      ctx.fillRect(2, -7, 3, 3);
      ctx.fillStyle = '#F48FB1';
      ctx.fillRect(3, -6, 1, 1);
    } else if (d.kind === 2) {
      ctx.fillStyle = '#A8DADC';
      ctx.fillRect(-4, -8, 3, 3);
      ctx.fillStyle = '#FFF3B0';
      ctx.fillRect(-3, -7, 1, 1);
    }
    ctx.restore();
  }
}

function drawFencePost(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Crisp pixel wooden fence post with pointed cap
  ctx.fillStyle = '#2D1C12';
  ctx.fillRect(x - 6, y - 20, 12, 24);
  ctx.fillStyle = '#A66D42';
  ctx.fillRect(x - 4, y - 16, 8, 18);
  ctx.fillStyle = '#D49E6A';
  ctx.fillRect(x - 4, y - 18, 8, 4);
  ctx.fillRect(x - 2, y - 19, 4, 2);
}

function drawPathsAndFence(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();

  // Interconnected pixel-art sandy dirt road network (outer turf-edge border + inner dirt fill)
  const roadSegments = [
    // Warehouse to central courtyard
    { x: 236, y: 342, w: 196, h: 98, r: 16 },
    // Warehouse vertical walkway down to Water Well
    { x: 246, y: 170, w: 112, h: 465, r: 18 },
    // Berry Master plaza & vertical connection to garden
    { x: 422, y: 138, w: 374, h: 96, r: 18 },
    // Central 3x3 garden sandy courtyard surround
    { x: 408, y: 204, w: 486, h: 416, r: 22 },
  ];

  ctx.fillStyle = '#754C2E';
  for (const s of roadSegments) {
    roundRectPath(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, s.r + 3);
    ctx.fill();
  }

  ctx.fillStyle = '#D5A778';
  for (const s of roadSegments) {
    roundRectPath(ctx, s.x, s.y, s.w, s.h, s.r);
    ctx.fill();
  }

  // Pixel dirt path pebble/grain texture
  ctx.fillStyle = '#C2905E';
  for (let gx = 262; gx < 880; gx += 38) {
    for (let gy = 158; gy < 620; gy += 36) {
      if ((gx + gy) % 7 === 0) {
        ctx.fillRect(gx, gy, 5, 3);
      } else if ((gx * 3 + gy) % 5 === 0) {
        ctx.fillRect(gx + 8, gy + 6, 4, 2);
      }
    }
  }

  // Crisp rectangular pixel water pond beside Berry Master's stall (matching reference style)
  const pondX = 816;
  const pondY = 66;
  const pondW = 98;
  const pondH = 54;
  ctx.fillStyle = '#3B281E';
  ctx.fillRect(pondX - 3, pondY - 3, pondW + 6, pondH + 6);
  ctx.fillStyle = '#8F6B4D';
  ctx.fillRect(pondX, pondY, pondW, pondH);
  ctx.fillStyle = '#4A9BE8';
  ctx.fillRect(pondX + 5, pondY + 5, pondW - 10, pondH - 10);
  // Water highlight shimmer lines
  const shim = Math.sin(t * 2.5) * 4;
  ctx.fillStyle = '#85C7FF';
  ctx.fillRect(pondX + 14 + Math.round(shim), pondY + 14, 22, 3);
  ctx.fillRect(pondX + 48 - Math.round(shim), pondY + 34, 26, 3);

  // Cobblestone apron beneath Water Well so its indicator sits on clean stone
  ctx.fillStyle = '#B8B0A0';
  ctx.strokeStyle = '#6E6659';
  ctx.lineWidth = 2;
  roundRectPath(ctx, WATER_WELL_POS.x - 56, WATER_WELL_POS.y - 12, 112, 86, 18);
  ctx.fill();
  ctx.stroke();

  // Cozy perimeter wooden fences along upper meadow & bottom meadow (clear of Water Well)
  const rails = [
    { x1: 274, x2: 454, y: 133 },
    { x1: 804, x2: 976, y: 133 },
    { x1: 392, x2: 960, y: 678 },
  ];
  for (const r of rails) {
    ctx.fillStyle = '#2D1C12';
    ctx.fillRect(r.x1, r.y - 1, r.x2 - r.x1, 9);
    ctx.fillStyle = '#B88152';
    ctx.fillRect(r.x1 + 2, r.y + 1, r.x2 - r.x1 - 4, 5);
  }
  for (const p of GARDEN_FENCE_POSTS) {
    drawFencePost(ctx, p.x, p.y);
  }
  for (let bx = 396; bx <= 960; bx += 56) {
    drawFencePost(ctx, bx, 686);
  }

  ctx.restore();
}

function drawWarehouse(
  ctx: CanvasRenderingContext2D,
  view: ClientWorldView,
  t: number
): void {
  const b = WAREHOUSE_BOUNDS;
  const racks = view.snapshot.racks;

  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(42, 30, 20, 0.22)';
  roundRectPath(ctx, b.x + 6, b.y + 10, b.width, b.height, 14);
  ctx.fill();

  // Dark pixel-art building outline + stone base
  ctx.fillStyle = '#9E9388';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 3;
  roundRectPath(ctx, b.x, b.y + 6, b.width, b.height, 14);
  ctx.fill();
  ctx.stroke();

  // Warm wooden porch deck
  ctx.fillStyle = '#E8CEAA';
  ctx.strokeStyle = '#3B2418';
  ctx.lineWidth = 3;
  roundRectPath(ctx, b.x, b.y, b.width, b.height - 6, 14);
  ctx.fill();
  ctx.stroke();

  // Plank lines & nail details
  ctx.strokeStyle = 'rgba(110, 72, 42, 0.3)';
  ctx.lineWidth = 1.5;
  for (let py = b.y + 52; py < b.y + b.height - 16; py += 32) {
    ctx.beginPath();
    ctx.moveTo(b.x + 12, py);
    ctx.lineTo(b.x + b.width - 12, py);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90, 56, 30, 0.35)';
    ctx.fillRect(b.x + 56, py - 5, 3, 3);
    ctx.fillRect(b.x + b.width - 20, py - 5, 3, 3);
  }

  // Left whitewashed barn wall with crisp dark pixel outline & wood trim
  ctx.fillStyle = '#F7F1E3';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 3;
  roundRectPath(ctx, b.x, b.y, 48, b.height - 6, 12);
  ctx.fill();
  ctx.stroke();

  // Timber cross-beams & small barn window
  ctx.fillStyle = '#8F593C';
  ctx.fillRect(b.x + 5, b.y + 72, 38, 8);
  ctx.fillRect(b.x + 5, b.y + b.height - 34, 38, 8);
  ctx.fillStyle = '#4A3321';
  ctx.fillRect(b.x + 13, b.y + 105, 22, 18);
  ctx.fillStyle = '#88D4FF';
  ctx.fillRect(b.x + 16, b.y + 108, 16, 12);

  // Miniature cylindrical wooden silo tucked on the lower-left solid wall
  const siloX = b.x + 10;
  const siloY = b.y + b.height - 118;
  ctx.fillStyle = '#B88255';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 2.5;
  ctx.fillRect(siloX, siloY, 30, 68);
  ctx.strokeRect(siloX, siloY, 30, 68);
  ctx.fillStyle = '#8F593C';
  ctx.fillRect(siloX + 2, siloY + 18, 26, 4);
  ctx.fillRect(siloX + 2, siloY + 42, 26, 4);
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.arc(siloX + 15, siloY, 15, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top Sky-Blue Ribbed Corrugated Barn Roof (inspired by reference image!)
  ctx.fillStyle = '#3B9AE1';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 3;
  roundRectPath(ctx, b.x - 8, b.y - 20, b.width + 16, 64, 10);
  ctx.fill();
  ctx.stroke();

  // Vertical ribbed roof stripes
  for (let sx = b.x + 6; sx < b.x + b.width - 6; sx += 22) {
    ctx.fillStyle = '#70C1FA';
    ctx.fillRect(sx, b.y - 16, 8, 52);
    ctx.fillStyle = '#236DAA';
    ctx.fillRect(sx + 8, b.y - 16, 4, 52);
  }
  ctx.fillStyle = '#FFF9EB';
  ctx.fillRect(b.x - 5, b.y + 37, b.width + 10, 5);

  // Warm rounded HUD-matched header signboard
  ctx.fillStyle = 'rgba(74, 40, 22, 0.25)';
  roundRectPath(ctx, b.x + 18, b.y + 11, b.width - 36, 28, 10);
  ctx.fill();

  ctx.fillStyle = '#FFFDF5';
  ctx.strokeStyle = '#4A2816';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, b.x + 18, b.y + 8, b.width - 36, 28, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3B2314';
  ctx.font = '800 12.5px "Fredoka", "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Gudang Kebun Berry', b.x + b.width / 2, b.y + 22);

  // Glowing paper lanterns (left & right corners of shed awning)
  const dayProgress =
    view.snapshot.phase === 'LOBBY'
      ? 0.12
      : Math.max(
          0,
          Math.min(
            1,
            1 - view.snapshot.timeRemaining / Math.max(1, view.snapshot.totalDuration)
          )
        );
  const duskBoost = Math.max(0, Math.min(1, (dayProgress - 0.35) / 0.65));
  const lanternGlow =
    (view.snapshot.weather === 'rainy' ? Math.max(0.45, duskBoost) : duskBoost) * 0.35 +
    0.22 +
    Math.sin(t * 2.8) * 0.05;

  for (const lx of [b.x + 14, b.x + b.width - 14]) {
    ctx.fillStyle = `rgba(255, 214, 110, ${lanternGlow})`;
    ctx.beginPath();
    ctx.arc(lx, b.y + 58, 26 + duskBoost * 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = duskBoost > 0.35 ? '#FFF3B0' : '#FFE082';
    ctx.strokeStyle = '#3B2418';
    ctx.lineWidth = 1.8;
    roundRectPath(ctx, lx - 6, b.y + 50, 12, 14, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Draw Tool Racks (4 or 6 depending on room size)
  const compact = racks.length > 4;
  for (const rack of racks) {
    drawToolRack(ctx, rack, compact, t);
  }

  ctx.restore();
}

function drawToolRack(
  ctx: CanvasRenderingContext2D,
  rack: ToolRackState,
  compact: boolean,
  t: number
): void {
  const cfg = TOOL_CONFIG[rack.toolType];
  const rx = rack.x;
  const ry = rack.y;
  const isOccupied = rack.occupiedByPlayerId !== null;
  const boxH = compact ? 56 : 68;
  const boxY = ry - boxH / 2 + 2;
  const boxX = rx - 38;
  const boxW = 136;

  ctx.save();
  // Warm rounded card matching Top HUD aesthetic
  ctx.fillStyle = isOccupied ? 'rgba(74, 40, 22, 0.14)' : '#4A2816';
  roundRectPath(ctx, boxX, boxY + 3, boxW, boxH, 14);
  ctx.fill();

  ctx.fillStyle = isOccupied ? '#EADCC5' : '#FFFDF5';
  ctx.strokeStyle = isOccupied ? '#8E7358' : '#4A2816';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.fill();
  ctx.stroke();

  // Left color-accented icon badge
  const iconCx = rx - 14;
  const iconCy = ry - 2;
  ctx.fillStyle = isOccupied ? 'rgba(140, 118, 96, 0.14)' : `${cfg.accentColor}24`;
  ctx.strokeStyle = isOccupied ? '#A8947C' : cfg.accentColor;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(iconCx, iconCy, compact ? 17 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!isOccupied) {
    const bob = Math.sin(t * 2.3 + ry) * 1.4;
    drawToolIcon(ctx, rack.toolType, iconCx, iconCy + bob, compact ? 0.8 : 0.92, rack);

    ctx.fillStyle = '#3B2314';
    ctx.font = `700 ${compact ? '10.5px' : '11.5px'} "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rack.shortName, rx + 12, ry - (compact ? 8 : 10));

    // Compact live stock / readiness label
    let statusLabel = 'Tersedia';
    let statusColor = '#2D8A56';
    if (rack.toolType === 'wailmer_pail') {
      statusLabel = `Air ${rack.pailWater}/${rack.maxPailWater}`;
      statusColor = rack.pailWater > 0 ? '#2563EB' : '#D64541';
    } else if (rack.toolType === 'harvest_basket') {
      statusLabel = `Isi ${rack.basketBerries.length}/${rack.maxBasketCapacity}`;
      statusColor = rack.basketBerries.length > 0 ? '#B45309' : '#7A6658';
    }
    ctx.fillStyle = statusColor;
    ctx.font = `800 ${compact ? '10px' : '10.5px'} "JetBrains Mono", monospace`;
    ctx.fillText(statusLabel, rx + 12, ry + (compact ? 9 : 11));
  } else {
    ctx.save();
    ctx.globalAlpha = 0.3;
    drawToolIcon(ctx, rack.toolType, iconCx, iconCy, compact ? 0.78 : 0.88, rack);
    ctx.restore();

    ctx.fillStyle = '#7A5C43';
    ctx.font = `700 ${compact ? '10px' : '11px'} "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rack.shortName, rx + 12, ry - (compact ? 8 : 10));

    ctx.fillStyle = '#9E3B2E';
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    const owner = (rack.occupiedByName ?? '').slice(0, 9);
    ctx.fillText(`Dipakai ${owner}`, rx + 12, ry + (compact ? 9 : 11));
  }

  ctx.restore();
}

export function drawToolIcon(
  ctx: CanvasRenderingContext2D,
  tool: ToolType,
  x: number,
  y: number,
  scale = 1,
  rack?: ToolRackState
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (tool === 'wailmer_pail') {
    ctx.fillStyle = '#4895EF';
    ctx.strokeStyle = '#264653';
    ctx.lineWidth = 2;
    // Spout
    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.lineTo(20, -13);
    ctx.lineTo(22, -8);
    ctx.lineTo(12, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Handle
    ctx.beginPath();
    ctx.arc(-2, -11, 8, Math.PI, 0);
    ctx.stroke();
    // Whale body
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Belly
    ctx.fillStyle = '#FFF5D6';
    ctx.beginPath();
    ctx.ellipse(0, 6, 10, 4, 0, 0, Math.PI);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#264653';
    ctx.beginPath();
    ctx.arc(-4, -1, 1.6, 0, Math.PI * 2);
    ctx.arc(4, -1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (tool === 'harvest_basket') {
    ctx.fillStyle = '#D99B52';
    ctx.strokeStyle = '#6F4518';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-13, -3);
    ctx.lineTo(13, -3);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Handle
    ctx.beginPath();
    ctx.arc(0, -4, 9, Math.PI, 0);
    ctx.stroke();
    // Weave lines
    ctx.strokeStyle = '#9C6631';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, -1);
    ctx.lineTo(-5, 9);
    ctx.moveTo(0, -1);
    ctx.lineTo(0, 9);
    ctx.moveTo(6, -1);
    ctx.lineTo(5, 9);
    ctx.stroke();
    // Gingham rim
    ctx.fillStyle = '#F7EDE2';
    ctx.strokeStyle = '#6F4518';
    ctx.lineWidth = 1.8;
    roundRectPath(ctx, -14, -5, 28, 5, 2.5);
    ctx.fill();
    ctx.stroke();

    if (rack && rack.basketBerries.length > 0) {
      rack.basketBerries.forEach((b, idx) => {
        ctx.fillStyle = BERRY_META[b].color;
        ctx.beginPath();
        ctx.arc(-6 + idx * 6, -6, 3.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else if (tool === 'garden_rake') {
    ctx.save();
    ctx.rotate(-0.45);
    ctx.strokeStyle = '#6F4518';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -6);
    ctx.stroke();

    ctx.strokeStyle = '#2D6A4F';
    ctx.fillStyle = '#52B788';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -11, -11, 22, 5, 2);
    ctx.fill();
    ctx.stroke();

    for (let px = -9; px <= 9; px += 6) {
      ctx.beginPath();
      ctx.moveTo(px, -6);
      ctx.lineTo(px, -1);
      ctx.stroke();
    }
    ctx.restore();
  } else if (tool === 'defender_whistle') {
    ctx.fillStyle = '#E76F51';
    ctx.strokeStyle = '#5C2C1D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-3, 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F4A261';
    roundRectPath(ctx, 2, -6, 13, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFF3B0';
    ctx.beginPath();
    ctx.arc(-3, 2, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawWaterWell(
  ctx: CanvasRenderingContext2D,
  view: ClientWorldView,
  t: number
): void {
  const { x, y, radius } = WATER_WELL_POS;
  const wellWater = view.snapshot.wellWater;
  const maxWell = Math.max(1, view.snapshot.maxWellWater);
  const ratio = Math.max(0, Math.min(1, wellWater / maxWell));
  const isLow = wellWater <= 3;

  ctx.save();
  ctx.fillStyle = 'rgba(56, 78, 52, 0.16)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 8, radius + 7, radius - 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cobble stone rim
  ctx.fillStyle = '#B8B5AD';
  ctx.strokeStyle = '#6E6B64';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dry cobble well floor (visible when water is low/empty)
  ctx.fillStyle = '#8F8A81';
  ctx.beginPath();
  ctx.ellipse(x, y, radius - 9, (radius - 9) * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dynamic water surface scaled by well stock
  if (ratio > 0) {
    const waterScale = 0.48 + ratio * 0.52;
    const wRx = (radius - 9) * waterScale;
    const wRy = (radius - 9) * 0.78 * waterScale;
    const wGrad = ctx.createRadialGradient(x - 6, y - 5, 3, x, y, wRx);
    wGrad.addColorStop(0, '#8ED6FF');
    wGrad.addColorStop(1, '#52A7EB');
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, wRx, wRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lilypad & lotus when sufficient water
    if (ratio >= 0.3) {
      ctx.fillStyle = '#69B578';
      ctx.beginPath();
      ctx.arc(x + 12 * waterScale, y + 6 * waterScale, 6, 0.4, Math.PI * 2 - 0.3);
      ctx.lineTo(x + 12 * waterScale, y + 6 * waterScale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFCAD4';
      ctx.beginPath();
      ctx.arc(x + 13 * waterScale, y + 4 * waterScale, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const rPulse = (t * 0.9) % 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * (1 - rPulse)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      x - 3,
      y - 2,
      (5 + rPulse * 15) * waterScale,
      (5 + rPulse * 15) * 0.72 * waterScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  if (view.wellRippleTimer > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 25, 19, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Timber well posts & shingled mini roof
  ctx.strokeStyle = '#7F5539';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 32, y - 4);
  ctx.lineTo(x - 32, y - 42);
  ctx.lineTo(x + 32, y - 42);
  ctx.lineTo(x + 32, y - 4);
  ctx.stroke();

  ctx.fillStyle = '#5299D3';
  ctx.strokeStyle = '#2B5B84';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 42, y - 36);
  ctx.lineTo(x, y - 57);
  ctx.lineTo(x + 42, y - 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Well post lantern
  ctx.fillStyle = '#FFE082';
  ctx.strokeStyle = '#8C5E2A';
  ctx.lineWidth = 1.4;
  roundRectPath(ctx, x + 26, y - 36, 9, 11, 3);
  ctx.fill();
  ctx.stroke();

  // Side Hand Pump ("Pompa Sumur") on the right edge of the well
  const pumpX = x + radius + 8;
  const pumpY = y - 2;
  const pumpAngle =
    view.wellPumpTimer > 0
      ? Math.sin((view.wellPumpTimer / 0.4) * Math.PI * 2) * 0.55
      : 0;

  // Pump iron pipe body & spout
  ctx.fillStyle = '#5C768D';
  ctx.strokeStyle = '#2B3E50';
  ctx.lineWidth = 2;
  roundRectPath(ctx, pumpX - 6, pumpY - 22, 12, 26, 4);
  ctx.fill();
  ctx.stroke();

  // Spout pointing into well
  ctx.beginPath();
  ctx.moveTo(pumpX - 6, pumpY - 12);
  ctx.lineTo(pumpX - 18, pumpY - 8);
  ctx.lineTo(pumpX - 16, pumpY - 3);
  ctx.lineTo(pumpX - 6, pumpY - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Animated pump lever handle
  ctx.save();
  ctx.translate(pumpX + 2, pumpY - 18);
  ctx.rotate(pumpAngle);
  ctx.strokeStyle = '#6F4518';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, -10);
  ctx.stroke();
  ctx.fillStyle = '#E07A5F';
  ctx.beginPath();
  ctx.arc(16, -10, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Clean high-contrast visual Well Water Badge + Gauge Card nestled below well rim
  const cardW = 104;
  const cardH = 30;
  const cardX = x - cardW / 2;
  const cardY = y + 40;

  ctx.fillStyle = '#4A2816';
  roundRectPath(ctx, cardX, cardY + 3, cardW, cardH, 10);
  ctx.fill();

  ctx.fillStyle = isLow ? '#FFF1F0' : '#FFFDF5';
  ctx.strokeStyle = isLow ? '#B91C1C' : '#2B5B84';
  ctx.lineWidth = 2.2;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 10);
  ctx.fill();
  ctx.stroke();

  // Water Droplet Icon on left of badge
  const dropX = cardX + 13;
  const dropY = cardY + 12;
  ctx.fillStyle = isLow ? '#EF4444' : '#3B82F6';
  ctx.beginPath();
  ctx.moveTo(dropX, dropY - 5);
  ctx.quadraticCurveTo(dropX + 5.5, dropY + 2, dropX, dropY + 6.5);
  ctx.quadraticCurveTo(dropX - 5.5, dropY + 2, dropX, dropY - 5);
  ctx.fill();

  // Numeric Water Count + Visual Progress Bar
  ctx.fillStyle = isLow ? '#B91C1C' : '#1E40AF';
  ctx.font = '800 10.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${wellWater}/${maxWell}`, cardX + 23, cardY + 10);

  ctx.fillStyle = '#5C4433';
  ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Sumur', cardX + cardW - 8, cardY + 10);

  const barX = cardX + 22;
  const barY = cardY + 19;
  const barW = cardW - 30;
  ctx.fillStyle = '#E2E8F0';
  roundRectPath(ctx, barX, barY, barW, 6, 3);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = isLow ? '#EF4444' : '#3B82F6';
    roundRectPath(ctx, barX, barY, Math.max(5, barW * ratio), 6, 3);
    ctx.fill();
  }

  ctx.restore();
}

function drawBerryMasterAndCrate(
  ctx: CanvasRenderingContext2D,
  view: ClientWorldView,
  t: number
): void {
  const mx = BERRY_MASTER_POS.x;
  const my = BERRY_MASTER_POS.y;
  const cx = DELIVERY_CRATE_POS.x;
  const cy = DELIVERY_CRATE_POS.y;

  ctx.save();
  // Stall shadow & whitewashed farmhouse counter
  ctx.fillStyle = 'rgba(42, 30, 20, 0.2)';
  roundRectPath(ctx, 486, 60, 294, 86, 12);
  ctx.fill();

  ctx.fillStyle = '#FBF7EE';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 482, 56, 294, 82, 12);
  ctx.fill();
  ctx.stroke();

  // Coral-Red Ribbed Roof Canopy (matching center red barn in reference image)
  ctx.fillStyle = '#E24E5B';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 476, 40, 306, 28, 8);
  ctx.fill();
  ctx.stroke();
  for (let sx = 490; sx < 766; sx += 26) {
    ctx.fillStyle = '#F58A94';
    ctx.fillRect(sx, 43, 10, 22);
    ctx.fillStyle = '#A82E3A';
    ctx.fillRect(sx + 10, 43, 4, 22);
  }
  ctx.fillStyle = '#FFF6DF';
  ctx.fillRect(480, 65, 298, 4);

  // Mini berry jam jars on counter left
  ctx.fillStyle = '#4E8DF5';
  ctx.fillRect(496, 86, 10, 12);
  ctx.fillStyle = '#F48FB1';
  ctx.fillRect(509, 88, 10, 10);
  ctx.fillStyle = '#FFFDF5';
  ctx.fillRect(496, 84, 10, 3);
  ctx.fillRect(509, 86, 10, 3);

  // Stall counter warm lantern on right side
  ctx.fillStyle = '#FFE082';
  ctx.strokeStyle = '#8C5E2A';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, mx + 70, my - 30, 11, 13, 3.5);
  ctx.fill();
  ctx.stroke();

  // Berry Master character (bounces & waves faster when cheering delivery)
  const isCheering = view.berryMasterCheerTimer > 0;
  const bob = isCheering
    ? -Math.abs(Math.sin(t * 11)) * 6
    : Math.sin(t * 2.6) * 2;
  ctx.save();
  ctx.translate(mx, my + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, 14 - bob * 0.4, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6FA37A';
  ctx.strokeStyle = '#3F4A3C';
  ctx.lineWidth = 2;
  roundRectPath(ctx, -12, -2, 24, 18, 8);
  ctx.fill();
  ctx.stroke();

  // Waving hand
  const wave = isCheering ? Math.sin(t * 14) * 0.65 - 0.35 : Math.sin(t * 4) * 0.35;
  ctx.save();
  ctx.translate(14, 2);
  ctx.rotate(wave);
  ctx.fillStyle = '#FFE0C4';
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFE0C4';
  ctx.beginPath();
  ctx.arc(0, -10, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isCheering) {
    ctx.strokeStyle = '#3D2B1F';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-4, -8.5, 2.2, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(4, -8.5, 2.2, Math.PI, 0);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#3D2B1F';
    ctx.beginPath();
    ctx.arc(-4, -9, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#F4978E';
  ctx.beginPath();
  ctx.arc(-6.5, -6, 2.2, 0, Math.PI * 2);
  ctx.arc(6.5, -6, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Straw Hat with green ribbon
  ctx.fillStyle = '#F4D58D';
  ctx.strokeStyle = '#8C6B32';
  ctx.beginPath();
  ctx.ellipse(0, -17, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -19, 9.5, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#52B788';
  ctx.fillRect(-9, -21, 18, 3);
  ctx.restore();

  // Crisp rounded nameplate plaque for Berry Master (never collides with counter outline)
  ctx.fillStyle = '#4A2816';
  roundRectPath(ctx, mx - 44, my + 24, 88, 20, 8);
  ctx.fill();
  ctx.fillStyle = '#FFFDF5';
  ctx.strokeStyle = '#4A2816';
  ctx.lineWidth = 2;
  roundRectPath(ctx, mx - 44, my + 22, 88, 20, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3B2314';
  ctx.font = '800 10.5px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Berry Master', mx, my + 32.5);

  // Delivery Crate ("Peti Setoran")
  const crateScale =
    view.crateBounceTimer > 0
      ? 1 + Math.sin((view.crateBounceTimer / 0.35) * Math.PI) * 0.14
      : 1;
  const anyBasketHasBerries = view.snapshot.racks.some(
    (r) => r.toolType === 'harvest_basket' && r.basketBerries.length > 0
  );

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(crateScale, crateScale);

  if (anyBasketHasBerries && view.snapshot.phase === 'PLAYING') {
    const pulse = 0.35 + Math.sin(t * 5) * 0.2;
    ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
    ctx.lineWidth = 4;
    roundRectPath(ctx, -44, -27, 88, 54, 12);
    ctx.stroke();
  }

  ctx.fillStyle = '#D49A5A';
  ctx.strokeStyle = '#6F4518';
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, -38, -22, 76, 44, 8);
  ctx.fill();
  ctx.stroke();

  // Corner iron brackets
  ctx.fillStyle = '#6D6875';
  ctx.fillRect(-37, -21, 7, 7);
  ctx.fillRect(30, -21, 7, 7);
  ctx.fillRect(-37, 14, 7, 7);
  ctx.fillRect(30, 14, 7, 7);

  ctx.strokeStyle = '#9C6631';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-36, -7);
  ctx.lineTo(36, -7);
  ctx.moveTo(-36, 7);
  ctx.lineTo(36, 7);
  ctx.stroke();

  ctx.fillStyle = '#FFF8EC';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E85D5A';
  ctx.beginPath();
  ctx.arc(-3, 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4E8DF5';
  ctx.beginPath();
  ctx.arc(3, 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#52B788';
  ctx.beginPath();
  ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Crisp rounded nameplate plaque for Peti Setoran below the crate
  ctx.fillStyle = '#4A2816';
  roundRectPath(ctx, cx - 42, cy + 28, 84, 20, 8);
  ctx.fill();
  ctx.fillStyle = '#FFFDF5';
  ctx.strokeStyle = '#6F4518';
  ctx.lineWidth = 2;
  roundRectPath(ctx, cx - 42, cy + 26, 84, 20, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4A2816';
  ctx.font = '800 10.5px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Peti Setoran', cx, cy + 36.5);

  ctx.restore();
}

function drawPlotSoilBase(
  ctx: CanvasRenderingContext2D,
  plot: BerryPlotState,
  t: number
): void {
  const half = PLOT_SIZE / 2;
  const shakeX = plot.shakeTimer > 0 ? Math.sin(t * 55) * 3 : 0;

  ctx.save();
  ctx.translate(plot.x + shakeX, plot.y);

  // Drop shadow
  ctx.fillStyle = 'rgba(42, 28, 18, 0.22)';
  roundRectPath(ctx, -half + 3, -half + 5, PLOT_SIZE, PLOT_SIZE, 10);
  ctx.fill();

  // Chunky Round-Log Perimeter Frame (inspired by reference image crop beds)
  ctx.fillStyle = '#8F593C';
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 2.8;
  roundRectPath(ctx, -half, -half, PLOT_SIZE, PLOT_SIZE, 10);
  ctx.fill();
  ctx.stroke();

  // Top & side highlight wood log segments
  ctx.fillStyle = '#C48A5A';
  for (let lx = -half + 14; lx <= half - 22; lx += 18) {
    ctx.fillRect(lx, -half + 2, 12, 5);
    ctx.fillRect(lx, half - 7, 12, 5);
  }
  for (let ly = -half + 14; ly <= half - 22; ly += 18) {
    ctx.fillRect(-half + 2, ly, 5, 12);
    ctx.fillRect(half - 7, ly, 5, 12);
  }

  // Round Corner Log Posts with pixel cap rings
  const corners = [
    [-half + 4, -half + 4],
    [half - 4, -half + 4],
    [-half + 4, half - 4],
    [half - 4, half - 4],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillStyle = '#8F593C';
    ctx.strokeStyle = '#2D1C12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E0AE7B';
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rich soil fill: clearly distinct dark moist vs cracked sandy dry soil
  const moist = Math.max(0, Math.min(1, plot.waterLevel));
  const isDry = plot.stage !== 'withered' && (plot.needsWater || moist < 0.3);
  ctx.fillStyle =
    plot.stage === 'withered'
      ? '#A99684'
      : isDry
        ? '#D9B484'
        : '#73452A';
  ctx.strokeStyle = '#3B2418';
  ctx.lineWidth = 2;
  roundRectPath(ctx, -half + 9, -half + 9, PLOT_SIZE - 18, PLOT_SIZE - 18, 6);
  ctx.fill();
  ctx.stroke();

  // Soil visual cues: dry cracks vs moist soil furrows
  if (isDry) {
    ctx.strokeStyle = '#9C734B';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-30, -18);
    ctx.lineTo(-14, -10);
    ctx.lineTo(-22, 4);
    ctx.moveTo(14, -22);
    ctx.lineTo(28, -12);
    ctx.moveTo(12, 16);
    ctx.lineTo(26, 22);
    ctx.lineTo(18, 30);
    ctx.moveTo(-26, 20);
    ctx.lineTo(-10, 26);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(42, 22, 10, 0.32)';
    for (let fy = -24; fy <= 24; fy += 18) {
      ctx.fillRect(-32, fy, 64, 3);
    }
  }

  // Mossy / weedy visual growth along bed border & corners
  if (plot.hasWeeds && plot.stage !== 'withered') {
    // Soft moss patches creeping inward from planter rim
    ctx.fillStyle = '#4B8E46';
    ctx.beginPath();
    ctx.ellipse(-26, 28, 13, 6.5, 0.15, 0, Math.PI * 2);
    ctx.ellipse(26, 27, 13, 6.5, -0.15, 0, Math.PI * 2);
    ctx.ellipse(24, -24, 11, 5.5, -0.25, 0, Math.PI * 2);
    ctx.ellipse(-22, -22, 10, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Lighter moss highlight dots + crisp pixel weed blades
    ctx.fillStyle = '#79C468';
    ctx.fillRect(-30, 26, 6, 3);
    ctx.fillRect(22, 25, 6, 3);
    ctx.fillRect(20, -25, 5, 3);

    ctx.fillStyle = '#5CA44E';
    ctx.strokeStyle = '#244A23';
    ctx.lineWidth = 1.6;
    const weedSpots = [
      { wx: -26, wy: 27 },
      { wx: 26, wy: 26 },
      { wx: 24, wy: -20 },
    ];
    for (const w of weedSpots) {
      ctx.beginPath();
      ctx.moveTo(w.wx - 7, w.wy + 4);
      ctx.lineTo(w.wx - 4, w.wy - 8);
      ctx.lineTo(w.wx, w.wy + 1);
      ctx.lineTo(w.wx + 4, w.wy - 9);
      ctx.lineTo(w.wx + 7, w.wy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Subtle Berry type corner gem tucked onto the upper-left corner post
  const meta = BERRY_META[plot.berryType];
  ctx.fillStyle = meta.color;
  ctx.strokeStyle = '#2D1C12';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-half + 12, -half + 12, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (plot.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 120, 100, ${plot.hitFlash * 2})`;
    roundRectPath(ctx, -half, -half, PLOT_SIZE, PLOT_SIZE, 10);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlotPlant(
  ctx: CanvasRenderingContext2D,
  plot: BerryPlotState,
  t: number
): void {
  const meta = BERRY_META[plot.berryType];
  const sway = Math.sin(t * 2.1 + plot.id) * 2.2;
  const pop =
    plot.popTimer > 0
      ? 1 + Math.sin((plot.popTimer / 0.35) * Math.PI) * 0.2
      : 1;

  ctx.save();
  ctx.translate(plot.x, plot.y + 4);
  ctx.scale(pop, pop);

  if (plot.stage === 'withered') {
    ctx.strokeStyle = '#735B49';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(-4, -8, -14, -14);
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(6, -12, 14, -10);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const isDry = plot.needsWater || plot.waterLevel < 0.3;

  if (plot.stage === 'seedling') {
    ctx.strokeStyle = isDry ? '#8D8E45' : '#4B8B4F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(sway * 0.4, isDry ? -3 : -7);
    ctx.stroke();

    ctx.fillStyle = isDry ? '#C5C76C' : '#8CD17D';
    ctx.strokeStyle = isDry ? '#787A35' : '#4B8B4F';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(-7 + sway * 0.4, isDry ? -5 : -9, 7, 4, isDry ? -0.75 : -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(7 + sway * 0.4, isDry ? -5 : -9, 7, 4, isDry ? 0.75 : 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (plot.stage === 'sprout') {
    ctx.fillStyle = '#6D4C3D';
    ctx.fillRect(-3, -6, 6, 14);

    ctx.fillStyle = isDry ? '#A3AF54' : '#73C468';
    ctx.strokeStyle = isDry ? '#6E7433' : '#3B7843';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sway * 0.5, isDry ? -11 : -14, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-11 + sway * 0.5, -7, 10, 0, Math.PI * 2);
    ctx.arc(11 + sway * 0.5, -7, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDry ? '#CBD47D' : '#A0E093';
    ctx.fillRect(-4 + Math.round(sway * 0.5), isDry ? -20 : -23, 6, 4);
  } else {
    ctx.fillStyle = 'rgba(42, 60, 32, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 25, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Detailed tree trunk with bark shade
    ctx.fillStyle = '#7C583B';
    ctx.strokeStyle = '#4A3321';
    ctx.lineWidth = 1.6;
    ctx.fillRect(-4.5, -6, 9, 16);
    ctx.strokeRect(-4.5, -6, 9, 16);

    // Multi-layered lush Pokopia canopy (warm olive when parched, bright emerald when healthy)
    ctx.fillStyle = isDry ? '#97A84F' : '#53A65D';
    ctx.strokeStyle = isDry ? '#626C31' : '#326639';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-15 + sway * 0.5, isDry ? -8 : -10, 15, 0, Math.PI * 2);
    ctx.arc(15 + sway * 0.5, isDry ? -8 : -10, 15, 0, Math.PI * 2);
    ctx.arc(sway * 0.6, isDry ? -20 : -23, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sunny leaf highlight puffs
    ctx.fillStyle = isDry ? '#BDC86D' : '#7DD183';
    ctx.beginPath();
    ctx.arc(sway * 0.6 - 4, isDry ? -23 : -26, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDry ? '#D9DF94' : '#A4E8A6';
    ctx.beginPath();
    ctx.arc(sway * 0.6 - 6, isDry ? -27 : -30, 6, 0, Math.PI * 2);
    ctx.fill();

    if (plot.stage === 'flowering') {
      const blossoms = [
        { bx: -12, by: -14 },
        { bx: 11, by: -12 },
        { bx: 0, by: -29 },
      ];
      for (const bl of blossoms) {
        ctx.fillStyle = '#FFFDF5';
        ctx.beginPath();
        ctx.arc(bl.bx + sway * 0.5, bl.by, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = meta.color;
        ctx.beginPath();
        ctx.arc(bl.bx + sway * 0.5, bl.by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (plot.stage === 'ripe') {
      const berries = [
        { bx: -13, by: -10 },
        { bx: 13, by: -9 },
        { bx: 0, by: -26 },
      ];
      for (const b of berries) {
        drawBerryFruit(ctx, plot.berryType, b.bx + sway * 0.5, b.by, 1.15);
      }

      // Gentle golden harvest sparkles when ripe and clean
      if (!plot.hasWeeds) {
        const twinkle = 0.65 + Math.sin(t * 5 + plot.id) * 0.35;
        ctx.fillStyle = `rgba(255, 243, 140, ${twinkle})`;
        for (const [sx, sy] of [
          [-20, -28],
          [21, -22],
        ]) {
          ctx.fillRect(sx - 1, sy - 4, 2, 8);
          ctx.fillRect(sx - 4, sy - 1, 8, 2);
        }
      }
    }
  }

  ctx.restore();
}

function drawBerryFruit(
  ctx: CanvasRenderingContext2D,
  type: BerryType,
  x: number,
  y: number,
  scale = 1
): void {
  const meta = BERRY_META[type];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = meta.color;
  ctx.strokeStyle = meta.shadow;
  ctx.lineWidth = 1.8;

  if (type === 'pecha') {
    ctx.beginPath();
    ctx.arc(-2.5, -1, 5, 0, Math.PI * 2);
    ctx.arc(2.5, -1, 5, 0, Math.PI * 2);
    ctx.moveTo(-7, 1);
    ctx.lineTo(0, 8);
    ctx.lineTo(7, 1);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'sitrus') {
    ctx.beginPath();
    ctx.ellipse(0, 1, 7, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = meta.highlight;
  ctx.beginPath();
  ctx.arc(-2.5, -2.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = meta.leaf;
  ctx.beginPath();
  ctx.ellipse(0, -7, 4, 2, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlotStatusOverlay(
  ctx: CanvasRenderingContext2D,
  plot: BerryPlotState,
  t: number
): void {
  if (plot.stage === 'withered') return;

  ctx.save();
  const half = PLOT_SIZE / 2;

  // Golden harvest rim glow when ripe and clean
  if (plot.stage === 'ripe' && !plot.hasWeeds) {
    const alpha = 0.48 + Math.sin(t * 4 + plot.id) * 0.25;
    ctx.strokeStyle = `rgba(255, 224, 102, ${alpha})`;
    ctx.lineWidth = 3.5;
    roundRectPath(
      ctx,
      plot.x - half - 2,
      plot.y - half - 2,
      PLOT_SIZE + 4,
      PLOT_SIZE + 4,
      12
    );
    ctx.stroke();
  }

  // Single compact water-droplet cue at top-right rim ONLY when thirsty (no heavy bobbing circles)
  if (plot.needsWater) {
    const bob = Math.sin(t * 4 + plot.id) * 2;
    const bx = plot.x + half - 14;
    const by = plot.y - half + 12 + bob;

    ctx.fillStyle = '#3B82F6';
    ctx.strokeStyle = '#FFFDF7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by - 8);
    ctx.quadraticCurveTo(bx + 7, by + 1, bx, by + 7);
    ctx.quadraticCurveTo(bx - 7, by + 1, bx, by - 8);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  // Single clean slim bar tucked along bottom rim (vitality warning OR growth progress)
  if (plot.vitality < 76) {
    const bw = 54;
    const ratio = plot.vitality / 100;
    ctx.fillStyle = 'rgba(45, 28, 18, 0.78)';
    roundRectPath(ctx, plot.x - bw / 2, plot.y + 42, bw, 6, 3);
    ctx.fill();
    ctx.fillStyle = ratio > 0.45 ? '#F59E0B' : '#EF4444';
    roundRectPath(ctx, plot.x - bw / 2 + 1, plot.y + 43, Math.max(4, (bw - 2) * ratio), 4, 2);
    ctx.fill();
  } else if (plot.stage !== 'ripe') {
    const bw = 50;
    ctx.fillStyle = 'rgba(45, 28, 18, 0.55)';
    roundRectPath(ctx, plot.x - bw / 2, plot.y + 42, bw, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#6FD18E';
    roundRectPath(
      ctx,
      plot.x - bw / 2 + 1,
      plot.y + 43,
      Math.max(4, (bw - 2) * plot.growthProgress),
      3,
      1.5
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  view: ClientWorldView,
  isLocal: boolean,
  t: number
): void {
  const stepBounce = Math.abs(Math.sin(player.walkPhase)) * 3.5;
  const squashAmt = player.squashTimer > 0 ? Math.sin((player.squashTimer / 0.18) * Math.PI) * 0.16 : 0;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Subtle highlight ring under local player so you never lose yourself in 6-player co-op
  if (isLocal) {
    ctx.strokeStyle = 'rgba(255, 248, 214, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 14, 19, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (player.whistleAnimTimer > 0) {
    ctx.strokeStyle = 'rgba(231, 111, 81, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + (0.35 - player.whistleAnimTimer) * 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(48, 38, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(1 + squashAmt, 1 - squashAmt);
  ctx.translate(0, -stepBounce);

  // Cozy backpack peeking behind when facing up/side
  ctx.fillStyle = '#8C5E3C';
  ctx.strokeStyle = '#4A3B32';
  ctx.lineWidth = 1.8;
  roundRectPath(ctx, -12, -4, 24, 12, 5);
  ctx.fill();
  ctx.stroke();

  // Animated boots
  const footSwing = Math.sin(player.walkPhase) * 4;
  ctx.fillStyle = '#6D4C3D';
  ctx.beginPath();
  ctx.ellipse(-6, 11 + footSwing * 0.5, 4.8, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(6, 11 - footSwing * 0.5, 4.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Overalls + golden buttons
  ctx.fillStyle = '#F7DFB2';
  ctx.strokeStyle = '#4A3B32';
  ctx.lineWidth = 2.2;
  roundRectPath(ctx, -11, -2, 22, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#E9A825';
  ctx.fillRect(-5, 3, 2.5, 2.5);
  ctx.fillRect(2.5, 3, 2.5, 2.5);

  // Cozy trainer scarf
  ctx.fillStyle = player.scarfColor;
  roundRectPath(ctx, -10, -4, 20, 5, 2.5);
  ctx.fill();

  // Chibi Head
  ctx.fillStyle = '#FFE2C8';
  ctx.strokeStyle = '#4A3B32';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -11, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rosy cheeks + Blinking eyes
  const ex = player.facingX * 2.5;
  const ey = player.facingY * 1.6;
  ctx.fillStyle = '#F4978E';
  ctx.beginPath();
  ctx.arc(-6.5 + ex, -7 + ey, 2, 0, Math.PI * 2);
  ctx.arc(6.5 + ex, -7 + ey, 2, 0, Math.PI * 2);
  ctx.fill();

  const blinking = (t + player.slotIndex * 1.7) % 4.5 > 4.34;
  ctx.fillStyle = '#3B2D25';
  if (blinking) {
    ctx.fillRect(-5.5 + ex, -10 + ey, 3, 1.5);
    ctx.fillRect(2.5 + ex, -10 + ey, 3, 1.5);
  } else {
    ctx.beginPath();
    ctx.arc(-4 + ex, -10 + ey, 1.7, 0, Math.PI * 2);
    ctx.arc(4 + ex, -10 + ey, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Signature Cap
  ctx.fillStyle = player.capColor;
  ctx.beginPath();
  ctx.arc(0, -14, 12.2, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(ex * 1.1, -13 + ey * 0.5, 11, 4, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // White Poké emblem
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, -19, 3.6, 0, Math.PI * 2);
  ctx.fill();

  const heldRack = player.heldRackId
    ? view.snapshot.racks.find((r) => r.rackId === player.heldRackId)
    : undefined;

  if (player.heldTool) {
    const sideX = player.facingX >= 0 ? 18 : -18;
    drawToolIcon(ctx, player.heldTool, sideX, 2, 0.85, heldRack);

    // Compact overhead tool counter ONLY when holding a counter tool (pail/basket)
    if (
      heldRack &&
      (player.heldTool === 'wailmer_pail' || player.heldTool === 'harvest_basket')
    ) {
      const badgeY = -42 + Math.sin(t * 3 + player.slotIndex) * 1.3;
      ctx.fillStyle = 'rgba(255, 253, 245, 0.96)';
      ctx.strokeStyle = TOOL_CONFIG[player.heldTool].accentColor;
      ctx.lineWidth = 2;
      roundRectPath(ctx, -22, badgeY - 10, 44, 20, 10);
      ctx.fill();
      ctx.stroke();

      drawToolIcon(ctx, player.heldTool, -9, badgeY, 0.48, heldRack);

      ctx.fillStyle =
        player.heldTool === 'wailmer_pail'
          ? heldRack.pailWater > 0
            ? '#2563EB'
            : '#DC2626'
          : '#B45309';
      ctx.font = '800 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const counterText =
        player.heldTool === 'wailmer_pail'
          ? `${heldRack.pailWater}/${heldRack.maxPailWater}`
          : `${heldRack.basketBerries.length}/${heldRack.maxBasketCapacity}`;
      ctx.fillText(counterText, 0, badgeY + 0.5);
    }
  }

  // Clean high-contrast rounded Nameplate Pill neatly below boots
  const label = isLocal ? `${player.name} (Anda)` : player.name;
  ctx.font = '700 10.5px "Plus Jakarta Sans", sans-serif';
  const textW = ctx.measureText(label).width;
  const pillW = Math.max(54, textW + 22);
  const pillH = 18;
  const pillY = 21;

  ctx.fillStyle = isLocal ? '#4A2816' : 'rgba(74, 40, 22, 0.45)';
  roundRectPath(ctx, -pillW / 2, pillY + 2, pillW, pillH, 9);
  ctx.fill();

  ctx.fillStyle = isLocal ? '#FFF8D6' : 'rgba(255, 253, 245, 0.94)';
  ctx.strokeStyle = isLocal ? '#4A2816' : '#85674D';
  ctx.lineWidth = isLocal ? 2 : 1.5;
  roundRectPath(ctx, -pillW / 2, pillY, pillW, pillH, 9);
  ctx.fill();
  ctx.stroke();

  // Tiny cap-color dot on left of nameplate
  ctx.fillStyle = player.capColor;
  ctx.beginPath();
  ctx.arc(-pillW / 2 + 8.5, pillY + pillH / 2, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3B2314';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, -pillW / 2 + 15, pillY + pillH / 2 + 0.5);

  ctx.restore();
}

function drawCritter(
  ctx: CanvasRenderingContext2D,
  c: WildPokemonState,
  t: number
): void {
  const isFlying = c.kind === 'taillow' && c.state !== 'stunned';
  const hop =
    c.state === 'stunned'
      ? 0
      : isFlying
        ? 5 + Math.sin(t * 10 + c.id) * 3.5
        : Math.abs(Math.sin(c.walkPhase)) * 3.5;

  ctx.save();
  ctx.translate(c.x, c.y);

  // Ground shadow (slightly smaller/softer when Taillow hovers)
  ctx.fillStyle = isFlying ? 'rgba(30, 22, 18, 0.24)' : 'rgba(42, 30, 22, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 14, isFlying ? 12 : 16, isFlying ? 5 : 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -hop);
  ctx.scale(c.facingX * (1 + c.squash * 0.22), 1 - c.squash * 0.22);

  if (c.kind === 'wurmple') {
    // Pixel-art Wurmple (crimson caterpillar, yellow horns, cream underside, white feet)
    const wiggle = Math.sin(c.walkPhase) * 1.4;
    ctx.strokeStyle = '#1E130E';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    // Twin yellow rear tail horns
    ctx.fillStyle = '#F7C625';
    ctx.beginPath();
    ctx.moveTo(-13, -1);
    ctx.lineTo(-18, -11);
    ctx.lineTo(-9, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Segmented rear crimson body
    ctx.fillStyle = '#E8364F';
    ctx.beginPath();
    ctx.ellipse(-8, 4 + wiggle * 0.3, 9, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream segmented belly (rear + upright chest)
    ctx.fillStyle = '#F2DDB0';
    ctx.beginPath();
    ctx.ellipse(-7, 7.5 + wiggle * 0.3, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tall crimson dorsal head spike
    ctx.fillStyle = '#E8364F';
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.lineTo(1, -24);
    ctx.lineTo(7, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Upright neck/head crimson back
    ctx.beginPath();
    ctx.ellipse(4, -3, 7.5, 11.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream chest & plump face snout
    ctx.fillStyle = '#F2DDB0';
    ctx.beginPath();
    ctx.ellipse(7, 2, 5.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9.5, -7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Yellow forehead horn
    ctx.fillStyle = '#F7C625';
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.lineTo(13, -20);
    ctx.lineTo(10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bright yellow oval eye with dark pupil
    ctx.fillStyle = '#F7C625';
    ctx.strokeStyle = '#1E130E';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(5, -8.5, 2.5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1E130E';
    ctx.beginPath();
    ctx.arc(5.4, -8.5, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // White stubby pixel feet
    ctx.fillStyle = '#EEF2F7';
    ctx.strokeStyle = '#1E130E';
    ctx.lineWidth = 1.6;
    for (const [fx, fy] of [
      [-13, 9],
      [-8, 10],
      [-3, 10],
      [3, 10],
      [9, 9],
    ]) {
      ctx.beginPath();
      ctx.arc(fx, fy + wiggle * (fx < 0 ? 0.3 : -0.3), 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (c.kind === 'zigzagoon') {
    // Pixel-art Zigzagoon (spiky brown & cream zigzag fur, raccoon mask, spiky tail)
    ctx.strokeStyle = '#1E130E';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    // Spiky jagged tail
    ctx.fillStyle = '#F4DEC0';
    ctx.beginPath();
    ctx.moveTo(-10, -1);
    ctx.lineTo(-22, -9);
    ctx.lineTo(-18, -3);
    ctx.lineTo(-24, 1);
    ctx.lineTo(-17, 4);
    ctx.lineTo(-21, 9);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main spiky body silhouette (brown base)
    ctx.fillStyle = '#8F5636';
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jagged cream fur zigzag band across back
    ctx.fillStyle = '#F4DEC0';
    ctx.beginPath();
    ctx.moveTo(-9, -7);
    ctx.lineTo(-5, -13);
    ctx.lineTo(-2, -6);
    ctx.lineTo(2, -12);
    ctx.lineTo(5, -5);
    ctx.lineTo(8, 3);
    ctx.lineTo(3, 9);
    ctx.lineTo(-1, 3);
    ctx.lineTo(-5, 9);
    ctx.lineTo(-9, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spiky head & ears
    ctx.fillStyle = '#8F5636';
    ctx.beginPath();
    ctx.moveTo(4, -7);
    ctx.lineTo(2, -16);
    ctx.lineTo(8, -10);
    ctx.lineTo(13, -15);
    ctx.lineTo(13, -6);
    ctx.lineTo(18, 0);
    ctx.lineTo(13, 6);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark raccoon eye mask + amber eye
    ctx.fillStyle = '#2B201C';
    ctx.beginPath();
    ctx.ellipse(10.5, -2.5, 4.2, 3.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B85D24';
    ctx.beginPath();
    ctx.arc(10.5, -2.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(10.8, -3.5, 1.2, 1.2);

    // Snout nose
    ctx.fillStyle = '#1E130E';
    ctx.beginPath();
    ctx.arc(17.5, -0.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Little cream clawed paws
    ctx.fillStyle = '#F4DEC0';
    ctx.strokeStyle = '#1E130E';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-8, 9, 5, 3);
    ctx.strokeRect(-8, 9, 5, 3);
    ctx.fillRect(5, 9, 5, 3);
    ctx.strokeRect(5, 9, 5, 3);
  } else {
    // Pixel-art Taillow (royal navy wings/head, crimson forehead & chest bib, white belly, forked tail)
    const flap = Math.sin(t * 17 + c.id) * 5.5;
    ctx.strokeStyle = '#121628';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    // Forked swallow tail feathers
    ctx.fillStyle = '#1E3372';
    ctx.beginPath();
    ctx.moveTo(-9, 2);
    ctx.lineTo(-24, -7);
    ctx.lineTo(-17, 2);
    ctx.lineTo(-24, 9);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Upper flapping wing
    ctx.fillStyle = '#2A479C';
    ctx.beginPath();
    ctx.ellipse(-2, -7 - flap * 0.45, 9.5, 5, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rounded body (royal navy back)
    ctx.fillStyle = '#233B84';
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Snowy white belly
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.ellipse(3.5, 4.5, 8.5, 7, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Crimson-pink chest bib & forehead blaze
    ctx.fillStyle = '#EA4C73';
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(12, -2);
    ctx.lineTo(6.5, 7);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, -9.5);
    ctx.lineTo(11.5, -5.5);
    ctx.lineTo(7, -2.5);
    ctx.closePath();
    ctx.fill();

    // Sharp golden beak
    ctx.fillStyle = '#F7C625';
    ctx.beginPath();
    ctx.moveTo(11, -5.5);
    ctx.lineTo(20, -2.5);
    ctx.lineTo(11, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Expressive white-sclera eye
    ctx.fillStyle = '#FFFDF8';
    ctx.beginPath();
    ctx.ellipse(6.5, -4.5, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#121628';
    ctx.beginPath();
    ctx.arc(7.2, -4.5, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(7.4, -5.6, 1.2, 1.2);

    // Golden talons
    ctx.fillStyle = '#F7C625';
    ctx.fillRect(0, 10, 4, 3);
    ctx.fillRect(6, 10, 4, 3);
  }

  if (c.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (c.state === 'stunned') {
    for (let s = 0; s < 3; s++) {
      const ang = t * 5 + (s * Math.PI * 2) / 3;
      const sx = c.x + Math.cos(ang) * 14;
      const sy = c.y - 24 + Math.sin(ang) * 4;
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (c.state !== 'fleeing') {
    const startX = c.x - ((c.maxHp - 1) * 11) / 2;
    for (let p = 0; p < c.maxHp; p++) {
      ctx.fillStyle =
        p < c.hp
          ? c.kind === 'taillow'
            ? '#3B82F6'
            : c.kind === 'zigzagoon'
              ? '#F59E0B'
              : '#EF4444'
          : 'rgba(100, 80, 70, 0.35)';
      ctx.strokeStyle = '#FFFDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(startX + p * 11, c.y - 28, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawTelegraph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ratio: number,
  t: number,
  kind: CritterKind
): void {
  const pulse = 1 + Math.sin(t * 14) * 0.14;
  const accent = CRITTER_META[kind].accentColor;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  ctx.fillStyle =
    kind === 'taillow'
      ? 'rgba(46, 69, 131, 0.34)'
      : kind === 'zigzagoon'
        ? 'rgba(139, 90, 60, 0.3)'
        : 'rgba(232, 54, 79, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, (kind === 'taillow' ? 25 : 22) * (1 - ratio * 0.3), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.strokeStyle = '#FFFDF7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 14px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind === 'taillow' ? '!!' : '!', 0, 1);

  ctx.restore();
}

function drawForestBorder(ctx: CanvasRenderingContext2D, t: number): void {
  const greens = [
    { outer: '#459B43', mid: '#63B855', inner: '#89D86B', outline: '#224520' },
    { outer: '#3D8E3B', mid: '#58AA4B', inner: '#7EC961', outline: '#203F1E' },
    { outer: '#51A64D', mid: '#72C45E', inner: '#9AE47B', outline: '#264E23' },
  ];
  const autumns = [
    { outer: '#B87B3A', mid: '#D9A15B', inner: '#F2C97D', outline: '#4D2F16' },
    { outer: '#C28744', mid: '#E2AF68', inner: '#F6D78F', outline: '#52341A' },
  ];

  for (const tree of FOREST_TREES) {
    const pal = tree.autumn
      ? autumns[tree.shade % autumns.length]
      : greens[tree.shade % greens.length];
    const sway = Math.sin(t * 1.4 + tree.x * 0.01) * 1.3;
    ctx.save();
    ctx.translate(tree.x + sway, tree.y);

    // Shadow
    ctx.fillStyle = 'rgba(32, 46, 22, 0.22)';
    ctx.beginPath();
    ctx.ellipse(2, tree.r * 0.65, tree.r * 0.8, tree.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thick wood trunk
    ctx.fillStyle = '#73452A';
    ctx.strokeStyle = '#2D1C12';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-8, tree.r * 0.15, 16, tree.r * 0.55);
    ctx.strokeRect(-8, tree.r * 0.15, 16, tree.r * 0.55);

    // Crisp pixel-clustered canopy with dark outline
    ctx.fillStyle = pal.outer;
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-tree.r * 0.25, tree.r * 0.08, tree.r * 0.65, 0, Math.PI * 2);
    ctx.arc(tree.r * 0.25, tree.r * 0.08, tree.r * 0.65, 0, Math.PI * 2);
    ctx.arc(0, -tree.r * 0.18, tree.r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mid & bright foliage puffs
    ctx.fillStyle = pal.mid;
    ctx.beginPath();
    ctx.arc(-tree.r * 0.12, -tree.r * 0.16, tree.r * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.inner;
    ctx.beginPath();
    ctx.arc(-tree.r * 0.22, -tree.r * 0.3, tree.r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // Hanging wild fruits on select green trees (like reference image)
    if (tree.fruits) {
      ctx.fillStyle = '#F25F6E';
      ctx.strokeStyle = '#5C1E26';
      ctx.lineWidth = 1.2;
      for (const [fx, fy] of [
        [-tree.r * 0.34, 0],
        [tree.r * 0.24, -tree.r * 0.22],
        [tree.r * 0.06, tree.r * 0.14],
      ]) {
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

function drawButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  color: string
): void {
  const flap = Math.abs(Math.sin(phase * 3)) * 0.8 + 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(70, 55, 45, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(-3 * flap, 0, 4.5 * flap, 3.2, -0.3, 0, Math.PI * 2);
  ctx.ellipse(3 * flap, 0, 4.5 * flap, 3.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.alpha);

  if (p.kind === 'ring') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4 * p.alpha + 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.kind === 'float_text' && p.text) {
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(255, 252, 245, 0.95)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  } else if (p.kind === 'note') {
    ctx.fillStyle = p.color;
    ctx.font = '700 14px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♪', p.x, p.y);
  } else {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawInteractionPrompt(
  ctx: CanvasRenderingContext2D,
  prompt: NonNullable<ClientWorldView['localPrompt']>
): void {
  const text = `SPACE · ${prompt.label}`;

  ctx.save();
  ctx.font = '700 11.5px "Plus Jakarta Sans", sans-serif';
  const textW = ctx.measureText(text).width;
  const boxW = textW + 22;
  const boxH = 24;
  const px = Math.max(60, Math.min(WORLD_WIDTH - 60, prompt.x));
  const py = Math.max(68, prompt.y);

  ctx.fillStyle = 'rgba(55, 42, 32, 0.2)';
  roundRectPath(ctx, px - boxW / 2, py - boxH / 2 + 2, boxW, boxH, 7);
  ctx.fill();

  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = prompt.accentColor;
  ctx.lineWidth = 2;
  roundRectPath(ctx, px - boxW / 2, py - boxH / 2, boxW, boxH, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#42332A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px, py + 0.5);
  ctx.restore();
}

function drawWeatherParticles(
  ctx: CanvasRenderingContext2D,
  view: ClientWorldView,
  t: number
): void {
  const weather = view.snapshot.weather;
  if (weather === 'sunny') return;

  ctx.save();
  if (weather === 'rainy') {
    ctx.strokeStyle = 'rgba(165, 212, 255, 0.62)';
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    for (const wp of view.weatherParticles) {
      ctx.globalAlpha = wp.alpha;
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y);
      ctx.lineTo(wp.x - wp.len * 0.24, wp.y + wp.len);
      ctx.stroke();
    }
  } else if (weather === 'heatwave') {
    for (const wp of view.weatherParticles) {
      const shimmer = 0.22 + Math.sin(t * 3 + wp.x * 0.05) * 0.14;
      ctx.globalAlpha = Math.max(0.08, shimmer);
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAtmosphereAndLanterns(
  ctx: CanvasRenderingContext2D,
  view: ClientWorldView,
  t: number
): void {
  const snap = view.snapshot;
  const dayProgress =
    snap.phase === 'LOBBY'
      ? 0.12
      : Math.max(
          0,
          Math.min(1, 1 - snap.timeRemaining / Math.max(1, snap.totalDuration))
        );

  const goldenFactor = Math.max(0, Math.min(1, (dayProgress - 0.4) / 0.35));
  const twilightFactor = Math.max(0, Math.min(1, (dayProgress - 0.72) / 0.28));

  ctx.save();

  // Subtle morning -> golden hour -> twilight tint
  if (goldenFactor > 0) {
    const warmAlpha =
      goldenFactor * 0.14 * (1 - twilightFactor * 0.45);
    ctx.fillStyle = `rgba(245, 148, 66, ${warmAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
  if (twilightFactor > 0) {
    const duskAlpha = twilightFactor * 0.24;
    ctx.fillStyle = `rgba(48, 42, 92, ${duskAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // Weather atmospheric wash
  if (snap.weather === 'rainy') {
    ctx.fillStyle = 'rgba(72, 115, 168, 0.14)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  } else if (snap.weather === 'heatwave') {
    ctx.fillStyle = 'rgba(255, 185, 68, 0.11)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // Additive warm glowing halos around lanterns as dusk or rain sets in
  const lanternPower =
    snap.weather === 'rainy'
      ? Math.max(0.45, Math.max(goldenFactor * 0.65, twilightFactor))
      : Math.max(goldenFactor * 0.65, twilightFactor);

  if (lanternPower > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    const flicker = 1 + Math.sin(t * 4.5) * 0.04;
    const lanterns = [
      { x: WAREHOUSE_BOUNDS.x + WAREHOUSE_BOUNDS.width - 14, y: WAREHOUSE_BOUNDS.y + 58, r: 135 },
      { x: WAREHOUSE_BOUNDS.x + 14, y: WAREHOUSE_BOUNDS.y + 58, r: 110 },
      { x: WATER_WELL_POS.x + 30, y: WATER_WELL_POS.y - 30, r: 110 },
      { x: BERRY_MASTER_POS.x + 75, y: BERRY_MASTER_POS.y - 24, r: 130 },
    ];
    for (const l of lanterns) {
      const rad = l.r * (0.75 + lanternPower * 0.35) * flicker;
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, rad);
      g.addColorStop(0, `rgba(255, 224, 130, ${(0.42 * lanternPower).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(245, 165, 66, ${(0.2 * lanternPower).toFixed(3)})`);
      g.addColorStop(1, 'rgba(245, 165, 66, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawBerryMasterSpeech(
  ctx: CanvasRenderingContext2D,
  text: string,
  remainingTimer: number
): void {
  const alpha = Math.max(0, Math.min(1, remainingTimer / 0.35));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '700 11.5px "Plus Jakarta Sans", sans-serif';
  const paddingX = 12;
  const textW = ctx.measureText(text).width;
  const boxW = Math.min(250, textW + paddingX * 2);
  const boxH = 28;
  // Position cleanly to the left of Berry Master so it never overlaps the top-center HUD
  const anchorX = BERRY_MASTER_POS.x - 24;
  const boxX = anchorX - boxW;
  const boxY = BERRY_MASTER_POS.y - 26;

  ctx.fillStyle = 'rgba(55, 42, 32, 0.16)';
  roundRectPath(ctx, boxX + 2, boxY + 2, boxW, boxH, 10);
  ctx.fill();

  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = '#8F6843';
  ctx.lineWidth = 2;
  roundRectPath(ctx, boxX, boxY, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  // Speech bubble tail pointing right toward Berry Master
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.moveTo(anchorX - 2, boxY + 9);
  ctx.lineTo(anchorX + 10, boxY + 14);
  ctx.lineTo(anchorX - 2, boxY + 19);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8F6843';
  ctx.beginPath();
  ctx.moveTo(anchorX, boxY + 9);
  ctx.lineTo(anchorX + 10, boxY + 14);
  ctx.lineTo(anchorX, boxY + 19);
  ctx.stroke();

  ctx.fillStyle = '#42332A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2 + 0.5, boxW - 14);
  ctx.restore();
}
