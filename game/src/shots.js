// Deterministic screenshot scenes for Emberfall. A scene is picked with
// ?shot=<scene>&seed=<n>: the world is built from a seeded generator, stepped
// forward a fixed number of fixed-length steps with scripted input, and drawn
// once. No wall clock is read in shot mode, so the same URL always renders
// the same frame. main.js sets window.__shotReady once the scene is drawn.

import { ARENA, HEARTH } from './config.js';
import { makeRng } from './rng.js';
import { createScriptedInput } from './input.js';
import { createAudio } from './audio.js';
import {
  burst,
  createEnemy,
  createWorld,
  offerUpgrades,
  setBanner,
  startWave,
  updatePlay,
} from './entities.js';

const STEP = 1 / 60;

// Step the play simulation with a scripted Keeper: circle the hearth, aim at
// the nearest foe, hold fire, and dash once early on.
function stepPlayScene(world, seconds) {
  const input = createScriptedInput();
  const audio = createAudio();
  const steps = Math.round(seconds / STEP);
  const centre = { x: HEARTH.x, y: HEARTH.y };
  for (let i = 0; i < steps; i++) {
    const t = i * STEP;
    // Circle the hearth at a steady radius.
    const angle = t * 0.55;
    const tx = centre.x + Math.cos(angle) * 190;
    const ty = centre.y + Math.sin(angle) * 190;
    input.keys.clear();
    if (tx < world.player.x - 6) input.keys.add('a');
    if (tx > world.player.x + 6) input.keys.add('d');
    if (ty < world.player.y - 6) input.keys.add('w');
    if (ty > world.player.y + 6) input.keys.add('s');
    // Aim at the nearest living foe, or across the arena when none is near.
    let best = null;
    let bestD = Infinity;
    for (const e of world.enemies) {
      const d = (e.x - world.player.x) ** 2 + (e.y - world.player.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) {
      input.mouseX = best.x;
      input.mouseY = best.y;
    } else {
      input.mouseX = ARENA.x + ARENA.w / 2;
      input.mouseY = ARENA.y + 60;
    }
    input.mouseDown = true;
    // One dash early in the scene, for a dash trail in the frame.
    input.pressedDash = i === 150;
    updatePlay(world, STEP, input, audio);
    input.pressedDash = false;
    if (world.state !== 'play') break;
  }
  return world;
}

function scatterEmbers(world, count) {
  for (let i = 0; i < count; i++) {
    const x = ARENA.x + world.rng() * ARENA.w;
    const y = ARENA.y + world.rng() * ARENA.h;
    burst(world, x, y, i % 2 ? '#ff9a3c' : '#ffd76b', 1, 30);
  }
}

function buildTitle(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 12450;
  world.time = 6.5;
  // A few foes prowl the edges behind the title, purely as scenery.
  const kinds = ['mite', 'spitter', 'wraith', 'brute', 'mite', 'spitter'];
  for (let i = 0; i < kinds.length; i++) {
    const angle = (i / kinds.length) * Math.PI * 2 + 0.4;
    const x = HEARTH.x + Math.cos(angle) * 330;
    const y = HEARTH.y + Math.sin(angle) * 210;
    world.enemies.push(createEnemy(kinds[i], 2, rng, x, y, i === 4));
  }
  scatterEmbers(world, 10);
  world.state = 'title';
  return world;
}

function buildBoss(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 18750;
  world.state = 'play';
  // A run deep into its final wave: eight upgrades taken, a high score, and
  // the Keeper hurt but still fighting — the frame should read as a siege.
  world.score = 16420;
  world.kills = 148;
  world.comboBest = 9;
  world.shotsFired = 860;
  world.shotsHit = 664;
  world.runTime = 612;
  world.time = 612;
  world.upgradesTaken = ['rapid', 'twin', 'heavy', 'hide', 'swift', 'longfuse', 'magnet', 'pierce'];
  world.player.hp = 100;
  world.player.x = HEARTH.x - 150;
  world.player.y = HEARTH.y + 150;
  world.player.angle = -0.7;
  // Live power-ups, so the HUD's bottom-right shows active timers.
  world.player.spreadTimer = 6;
  world.player.rapidTimer = 4;
  world.player.shieldUp = true;
  world.player.ward = true;
  world.player.shieldTimer = 8;
  // Wave 10 is the Hollow King alone; his guard joins him so the frame is
  // a siege, not a duel: two gilded elite brutes, an elite wraith and a
  // spitter flanking the hearth while the King fires radial bursts.
  startWave(world, 10);
  const guard = [
    ['brute', -260, -140, true],
    ['brute', 280, 120, true],
    ['wraith', -300, 160, true],
    ['spitter', 300, -160, false],
  ];
  for (const [kind, dx, dy, elite] of guard) {
    world.enemies.push(createEnemy(kind, 10, rng, HEARTH.x + dx, HEARTH.y + dy, elite));
  }
  // Seven seconds of real combat: radial bursts in flight, summoned mites,
  // and the Keeper's bullets already flying. Short enough that the scripted
  // Keeper survives the King's volleys.
  stepPlayScene(world, 7);
  // Mid-fight, not the opening and not the kill: the King's health bar sits
  // just past half, the combo meter is high, and the banner is fresh.
  let boss = world.enemies.find((e) => e.kind === 'boss');
  if (!boss) {
    boss = createEnemy('boss', 10, rng, HEARTH.x + 40, HEARTH.y - 180, false);
    world.enemies.push(boss);
  }
  boss.hp = Math.round(boss.maxHp * 0.55);
  // A second ring of the King's call closes in around the hearth, so the
  // frame is full of foes on every side instead of one duel in the middle.
  const ring = [
    ['mite', -320, -190], ['mite', -360, 60], ['mite', -180, 250],
    ['mite', 330, -120], ['mite', 360, 140], ['mite', 140, 280],
    ['spitter', -430, -60], ['spitter', 430, 200],
    ['wraith', 300, -230],
  ];
  for (const [kind, dx, dy] of ring) {
    world.enemies.push(createEnemy(kind, 10, rng, HEARTH.x + dx, HEARTH.y + dy, false));
  }
  // The Keeper is hurt but alive: a low, orange health bar, not a corpse.
  // Power-up timers are refreshed here (the sim consumed them) so the HUD's
  // bottom-right shows the run's active boons, and the Keeper steps clear
  // of the King so both read in the frame.
  world.player.hp = 38;
  world.player.spreadTimer = 6;
  world.player.rapidTimer = 4;
  world.player.shieldUp = true;
  world.player.ward = true;
  world.player.shieldTimer = 8;
  world.player.x = HEARTH.x - 280;
  world.player.y = HEARTH.y + 130;
  world.player.angle = Math.atan2(boss.y - world.player.y, boss.x - world.player.x);
  world.combo = 9;
  world.comboTimer = 2.4;
  setBanner(world, 'THE HOLLOW KING', 'Defeat him. Keep the light.');
  scatterEmbers(world, 6);
  return world;
}

function buildPlay(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 9870;
  world.state = 'play';
  // Wave 5, six seconds in: the arena is still full of foes, bullets are
  // flying, and the combo meter is already climbing.
  startWave(world, 5);
  stepPlayScene(world, 6);
  return world;
}

function buildUpgrade(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 12450;
  world.state = 'play';
  world.wave = 3;
  world.score = 4860;
  world.kills = 41;
  world.comboBest = 4;
  world.shotsFired = 380;
  world.shotsHit = 289;
  world.runTime = 214;
  world.player.hp = 64;
  world.player.x = HEARTH.x - 120;
  world.player.y = HEARTH.y + 120;
  world.player.angle = -0.6;
  world.time = 214;
  // Leftover pickups and embers from the cleared wave.
  burst(world, HEARTH.x + 140, HEARTH.y - 60, '#7dff9a', 8, 60);
  burst(world, HEARTH.x - 200, HEARTH.y + 40, '#ffd76b', 8, 60);
  scatterEmbers(world, 8);
  // Offer the upgrades; the seeded generator picks which three.
  offerUpgrades(world);
  return world;
}

function buildVictory(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 18750;
  world.state = 'victory';
  world.wave = 10;
  world.score = 18750;
  world.kills = 163;
  world.comboBest = 9;
  world.shotsFired = 940;
  world.shotsHit = 712;
  world.runTime = 648;
  world.upgradesTaken = ['rapid', 'twin', 'heavy', 'hide', 'swift', 'longfuse', 'magnet', 'pierce'];
  world.player.hp = 38;
  world.player.x = HEARTH.x - 90;
  world.player.y = HEARTH.y + 140;
  world.player.angle = -1.2;
  world.time = 648;
  // Celebration embers rising from the fallen King's place.
  for (let i = 0; i < 5; i++) {
    burst(world, HEARTH.x + (rng() - 0.5) * 500, HEARTH.y + (rng() - 0.5) * 300, i % 2 ? '#ffd76b' : '#ff9a3c', 12, 120);
  }
  scatterEmbers(world, 10);
  return world;
}

// Build one of the four named scenes. Unknown names fall back to title.
export function buildShotScene(scene, seed) {
  if (scene === 'boss') return buildBoss(seed);
  if (scene === 'play') return buildPlay(seed);
  if (scene === 'upgrade') return buildUpgrade(seed);
  if (scene === 'victory') return buildVictory(seed);
  return buildTitle(seed);
}
