// Emberfall entry point: the game loop, the state machine (title, play,
// upgrade, pause, victory, game over), menu clicks, and the deterministic
// screenshot scenes (?shot=<scene>&seed=<n>).

import { VIEW_H, VIEW_W } from './config.js';
import { makeRng } from './rng.js';
import { consumePresses, createInput } from './input.js';
import { createAudio } from './audio.js';
import { applyUpgrade, createEnemy, createWorld, startWave, updatePlay } from './entities.js';
import { drawWorld } from './render.js';
import {
  drawGameOver,
  drawPause,
  drawTitle,
  drawUpgrade,
  drawVictory,
} from './ui.js';
import { buildShotScene } from './shots.js';

const BEST_KEY = 'emberfall-best-score';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or no storage: the run still counts, it just is not kept.
  }
}

// Start a fresh run: a new seeded world, wave 1, and the music on.
function newRun() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const world = createWorld(makeRng(seed));
  world.best = loadBest();
  world.state = 'play';
  startWave(world, 1);
  return world;
}

function endRun(world) {
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.score);
  }
}

// The title screen plays over a slow ambient scene: foes drift around the
// hearth while the Keeper stands ready. No combat happens here.
function updateTitleAmbient(world, dt) {
  world.time += dt;
  if (world.enemies.length < 6 && Math.random() < dt * 0.5) {
    const kinds = ['mite', 'spitter', 'wraith'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const angle = Math.random() * Math.PI * 2;
    const x = 640 + Math.cos(angle) * 380;
    const y = 360 + Math.sin(angle) * 240;
    world.enemies.push(createEnemy(kind, 2, world.rng, x, y, false));
  }
  // Drift each foe slowly toward the hearth, then away again, like moths.
  for (const e of world.enemies) {
    const dx = 640 - e.x;
    const dy = 360 - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const pull = Math.sin(world.time * 0.5 + e.x * 0.01) * 14;
    e.x += (dx / d) * pull * dt;
    e.y += (dy / d) * pull * dt;
  }
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
}

// Click hit-testing for the upgrade cards and the end screens.
let upgradeRects = [];
let lastClick = null;

canvas.addEventListener('mousedown', (event) => {
  const rect = canvas.getBoundingClientRect();
  lastClick = {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
});

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function render(world) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (world.state === 'title') {
    drawWorld(ctx, world);
    drawTitle(ctx, world, world.time);
  } else if (world.state === 'play' || world.state === 'paused') {
    drawWorld(ctx, world);
    if (world.state === 'paused') drawPause(ctx);
  } else if (world.state === 'upgrade') {
    drawWorld(ctx, world);
    upgradeRects = drawUpgrade(ctx, world);
  } else if (world.state === 'victory') {
    drawWorld(ctx, world);
    drawVictory(ctx, world, world.time);
  } else if (world.state === 'over') {
    drawWorld(ctx, world);
    drawGameOver(ctx, world, world.time);
  }
}

// ---- shot mode: ?shot=<scene>&seed=<n> renders one fixed frame ----------
function runShotMode() {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('shot') || 'title';
  const seed = Number(params.get('seed') || 7) >>> 0;
  const world = buildShotScene(scene, seed);
  world.best = Math.max(world.best, world.score);
  // drawWorld paints the scene and its HUD; the overlay for the scene goes
  // on top, except on the play scene, which is the raw game view.
  drawWorld(ctx, world);
  if (scene === 'upgrade') {
    upgradeRects = drawUpgrade(ctx, world);
  } else if (scene === 'victory') {
    drawVictory(ctx, world, world.time);
  } else if (scene !== 'play' && scene !== 'boss') {
    drawTitle(ctx, world, world.time);
  }
  window.__shotReady = true;
}

// ---- live game ------------------------------------------------------------
function runGame() {
  let world = createWorld(makeRng((Math.random() * 0xffffffff) >>> 0));
  world.best = loadBest();
  world.state = 'title';
  world.time = 0;
  // A few foes for the title backdrop.
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.3;
    world.enemies.push(
      createEnemy(['mite', 'spitter', 'wraith', 'brute', 'mite'][i], 2, world.rng, 640 + Math.cos(angle) * 330, 360 + Math.sin(angle) * 210, false),
    );
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Mute toggle works in every state.
    if (input.pressedMute) {
      audio.setMuted(!audio.muted);
    }

    if (world.state === 'title') {
      updateTitleAmbient(world, dt);
      if (input.pressedStart || lastClick) {
        audio.ensure();
        audio.startMusic();
        audio.sfx.click();
        world = newRun();
      }
    } else if (world.state === 'play') {
      if (input.pressedPause) {
        world.state = 'paused';
        audio.sfx.click();
      } else {
        updatePlay(world, dt, input, audio);
        if (world.state === 'over') {
          endRun(world);
          audio.sfx.gameOver();
        } else if (world.state === 'victory') {
          endRun(world);
        }
      }
    } else if (world.state === 'paused') {
      if (input.pressedPause || lastClick) {
        world.state = 'play';
        audio.sfx.click();
      }
    } else if (world.state === 'upgrade') {
      // Click a card, or press 1, 2 or 3.
      let chosen = -1;
      if (lastClick) {
        for (const r of upgradeRects) {
          if (pointInRect(lastClick.x, lastClick.y, r)) chosen = r.index;
        }
      }
      if (input.keys.has('1')) chosen = 0;
      if (input.keys.has('2')) chosen = 1;
      if (input.keys.has('3')) chosen = 2;
      if (chosen >= 0 && chosen < world.offered.length) {
        const up = world.offered[chosen];
        applyUpgrade(world, up.id);
        audio.sfx.upgrade();
        world.state = 'play';
        startWave(world, world.wave + 1);
      }
    } else if (world.state === 'victory' || world.state === 'over') {
      world.time += dt;
      if (input.pressedRestart || lastClick) {
        audio.sfx.click();
        world = newRun();
      }
    }

    render(world);
    lastClick = null;
    consumePresses(input);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (new URLSearchParams(window.location.search).has('shot')) {
  runShotMode();
} else {
  runGame();
}
