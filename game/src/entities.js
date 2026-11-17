// The world of Emberfall: every entity, how it moves, how it fights, and
// how a wave rises and falls. Rendering lives in render.js; this file owns
// state and rules only.

import {
  ARENA,
  COMBO_MAX,
  COMBO_WINDOW,
  ELITE_EVERY,
  ELITE_FROM_WAVE,
  ELITE_HP_MULT,
  ELITE_SCORE_MULT,
  ELITE_SIZE_MULT,
  ENEMY_KINDS,
  FEEL,
  FINAL_WAVE,
  HEARTH,
  PICKUP_DROP_CHANCE,
  PICKUP_LIFETIME,
  PICKUP_MAGNET_SPEED,
  PICKUPS,
  PLAYER,
  UPGRADES,
  WAVE_DAMAGE_GROWTH,
  WAVE_HP_GROWTH,
  WAVE_TABLE,
} from './config.js';
import { chance, edgeSpawn, pick, range } from './rng.js';
import { moveVector } from './input.js';

// A fresh world for a new run. rng drives every random choice in the run.
export function createWorld(rng) {
  return {
    rng,
    time: 0,
    state: 'title', // title | play | upgrade | paused | victory | over
    player: createPlayer(),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    particles: [],
    floaters: [],
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    score: 0,
    best: 0,
    kills: 0,
    combo: 1,
    comboTimer: 0,
    comboBest: 1,
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    upgradesTaken: [],
    offered: [],
    bossSpawned: false,
    shake: 0,
    hitStop: 0,
    flash: 0,
    banner: null,
    bannerTimer: 0,
    runTime: 0,
  };
}

export function createPlayer() {
  return {
    x: HEARTH.x,
    y: HEARTH.y + 170,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    bulletDamage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletRange: PLAYER.bulletRange,
    bulletCount: 1,
    pierce: 0,
    dashCooldown: PLAYER.dashCooldown,
    dashTimer: 0,
    dashTimeLeft: 0,
    dashDirX: 0,
    dashDirY: -1,
    invuln: 0,
    contactTimer: 0,
    pickupRadius: PLAYER.pickupRadius,
    // Timed power-ups, in seconds left.
    spreadTimer: 0,
    rapidTimer: 0,
    shieldTimer: 0,
    shieldUp: false,
    ward: false,
    wardReady: false,
    dead: false,
  };
}

// One enemy of a kind, scaled to the wave. Elites are bigger, tougher and
// worth more, and always drop a pickup when they fall.
export function createEnemy(kindId, wave, rng, x, y, elite) {
  const def = ENEMY_KINDS[kindId];
  const hpScale = 1 + (wave - 1) * WAVE_HP_GROWTH;
  const dmgScale = 1 + (wave - 1) * WAVE_DAMAGE_GROWTH;
  const enemy = {
    kind: kindId,
    def,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: def.radius * (elite ? ELITE_SIZE_MULT : 1),
    speed: def.speed * range(rng, 0.9, 1.12),
    hp: Math.round(def.hp * hpScale * (elite ? ELITE_HP_MULT : 1)),
    maxHp: 0,
    damage: Math.round(def.damage * dmgScale),
    score: def.score * (elite ? ELITE_SCORE_MULT : 1),
    elite,
    flash: 0,
    shootTimer: range(rng, 0.8, def.shootInterval || 2),
    // Wraith dash state machine: stalk -> telegraph -> dash -> recover.
    dashState: 'stalk',
    dashTimer: range(rng, 0.6, 1.6),
    dashDirX: 0,
    dashDirY: 0,
    // Boss state.
    summonTimer: def.summonInterval || 0,
    burstCount: 0,
    burstTimer: 0,
    phase: 1,
  };
  enemy.maxHp = enemy.hp;
  return enemy;
}

function makeBullet(x, y, angle, speed, damage, rangeLeft, pierce, friendly) {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: friendly ? PLAYER.bulletRadius : 6,
    damage,
    rangeLeft,
    pierce,
    friendly,
    life: 0,
  };
}

function makeParticle(x, y, vx, vy, life, size, color) {
  return { x, y, vx, vy, life, maxLife: life, size, color };
}

function makeFloater(x, y, text, color) {
  return { x, y, text, color, life: 0.9, maxLife: 0.9 };
}

function makePickup(kind, x, y) {
  return { kind, x, y, vx: 0, vy: 0, radius: 13, life: PICKUP_LIFETIME, bob: 0 };
}

// Burst of sparks at a point, used for hits, deaths and pickups.
export function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push(
      makeParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, range(world.rng, 0.3, 0.7), range(world.rng, 2, 4.5), color),
    );
  }
}

export function addShake(world, amount) {
  world.shake = Math.min(FEEL.shakeMax, world.shake + amount);
}

export function addFloater(world, x, y, text, color) {
  world.floaters.push(makeFloater(x, y, text, color));
}

export function setBanner(world, text, sub) {
  world.banner = { text, sub: sub || '' };
  world.bannerTimer = 2.2;
}

// The wave's roster, shuffled, with elites marked. Wave 10 is only the boss.
export function buildWaveQueue(wave, rng) {
  if (wave === FINAL_WAVE) return ['boss'];
  const row = WAVE_TABLE[wave - 1];
  const queue = [];
  for (const kind of ['mite', 'spitter', 'wraith', 'brute']) {
    for (let i = 0; i < (row[kind] || 0); i++) queue.push(kind);
  }
  // Fisher-Yates shuffle with the run's generator.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  return queue;
}

export function startWave(world, wave) {
  world.wave = wave;
  world.waveActive = true;
  world.spawnQueue = buildWaveQueue(wave, world.rng);
  world.spawnTimer = 0.4;
  world.bossSpawned = false;
  setBanner(world, wave === FINAL_WAVE ? 'THE HOLLOW KING' : `WAVE ${wave}`, wave === FINAL_WAVE ? 'Defeat him. Keep the light.' : 'The dark comes. Hold the hearth.');
}

export function offerUpgrades(world) {
  const pool = UPGRADES.filter((u) => !world.upgradesTaken.includes(u.id) || u.id === 'hide');
  const offered = [];
  const bag = pool.slice();
  while (offered.length < 3 && bag.length > 0) {
    const i = Math.floor(world.rng() * bag.length);
    offered.push(bag.splice(i, 1)[0]);
  }
  world.offered = offered;
  world.state = 'upgrade';
}

// Apply one upgrade to the player. Called from the upgrade screen.
export function applyUpgrade(world, id) {
  const p = world.player;
  if (id === 'rapid') p.fireInterval *= 0.82;
  else if (id === 'twin') p.bulletCount += 1;
  else if (id === 'heavy') p.bulletDamage *= 1.35;
  else if (id === 'swift') p.speed *= 1.12;
  else if (id === 'longfuse') {
    p.bulletSpeed *= 1.25;
    p.bulletRange *= 1.25;
  } else if (id === 'hide') {
    p.maxHp += 25;
    p.hp = Math.min(p.maxHp, p.hp + 25);
  } else if (id === 'magnet') p.pickupRadius *= 2;
  else if (id === 'dash') p.dashCooldown *= 0.65;
  else if (id === 'pierce') p.pierce += 1;
  else if (id === 'ward') {
    p.ward = true;
    p.wardReady = true;
    p.shieldUp = true;
    p.shieldTimer = 999;
  }
  world.upgradesTaken.push(id);
}

function dropPickup(world, x, y, forceKind) {
  const kind = forceKind || pick(world.rng, ['health', 'spread', 'rapid', 'shield']);
  world.pickups.push(makePickup(kind, x, y));
}

function awardScore(world, base, x, y) {
  const gained = base * world.combo;
  world.score += gained;
  addFloater(world, x, y, `+${gained}`, world.combo > 1 ? '#ffd76b' : '#ffe9c4');
}

function registerKill(world, enemy) {
  world.kills += 1;
  world.combo = Math.min(COMBO_MAX, world.combo + 1);
  world.comboTimer = COMBO_WINDOW;
  world.comboBest = Math.max(world.comboBest, world.combo);
  awardScore(world, enemy.score, enemy.x, enemy.y);
  burst(world, enemy.x, enemy.y, enemy.def.color, enemy.kind === 'boss' ? 60 : FEEL.particlesPerKill, enemy.kind === 'boss' ? 320 : 220);
  addShake(world, enemy.kind === 'brute' ? 6 : enemy.kind === 'boss' ? 14 : 3);
  world.hitStop = enemy.kind === 'boss' ? FEEL.hitStopBoss : FEEL.hitStopKill;
  if (enemy.elite || chance(world.rng, PICKUP_DROP_CHANCE)) {
    dropPickup(world, enemy.x, enemy.y, enemy.elite ? 'health' : undefined);
  }
}

function damageEnemy(world, enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.09;
  world.damageDealt += amount;
  burst(world, enemy.x, enemy.y, '#ffffff', 3, 120);
  if (enemy.hp <= 0) {
    registerKill(world, enemy);
    return true;
  }
  return false;
}

function hurtPlayer(world, amount, fromX, fromY) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTimeLeft > 0 || p.dead) return;
  if (p.shieldUp) {
    p.shieldUp = false;
    p.shieldTimer = 0;
    if (p.ward) p.wardReady = false;
    burst(world, p.x, p.y, '#7dd8ff', 18, 240);
    addShake(world, 5);
    return 'shield';
  }
  p.hp -= amount;
  p.invuln = 0.6;
  world.flash = 0.35;
  addShake(world, 8);
  burst(world, p.x, p.y, '#ff5a4e', 14, 200);
  // A knock shove away from the source of the hit.
  const dx = p.x - fromX;
  const dy = p.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  p.vx += (dx / d) * 260;
  p.vy += (dy / d) * 260;
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    world.state = 'over';
    burst(world, p.x, p.y, '#ff9a3c', 70, 340);
    addShake(world, 14);
  }
  return 'hurt';
}

function firePlayerBullets(world) {
  const p = world.player;
  const count = p.bulletCount + (p.spreadTimer > 0 ? 1 : 0);
  const spreadStep = 0.14;
  const baseAngle = p.angle;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spreadStep;
    const angle = baseAngle + offset;
    const nx = p.x + Math.cos(angle) * (p.radius + 8);
    const ny = p.y + Math.sin(angle) * (p.radius + 8);
    const speed = p.bulletSpeed * (p.rapidTimer > 0 ? 1.15 : 1);
    world.bullets.push(makeBullet(nx, ny, angle, speed, p.bulletDamage, p.bulletRange, p.pierce, true));
  }
  world.shotsFired += count;
  p.fireTimer = p.fireInterval * (p.rapidTimer > 0 ? 0.62 : 1);
  burst(world, p.x + Math.cos(baseAngle) * 22, p.y + Math.sin(baseAngle) * 22, '#ffd76b', 3, 90);
}

function enemyShootAt(world, enemy, tx, ty, speed) {
  const angle = Math.atan2(ty - enemy.y, tx - enemy.x);
  world.enemyBullets.push(
    makeBullet(enemy.x, enemy.y, angle, speed, enemy.damage, 900, 0, false),
  );
}

// ---- per-frame updates -----------------------------------------------------

function updatePlayer(world, dt, input, audio) {
  const p = world.player;
  if (p.dead) return;
  const mv = moveVector(input);
  // Aim follows the mouse.
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  if (p.dashTimeLeft > 0) {
    p.dashTimeLeft -= dt;
    p.vx = p.dashDirX * PLAYER.dashSpeed;
    p.vy = p.dashDirY * PLAYER.dashSpeed;
    if (world.rng() < 0.7) {
      world.particles.push(
        makeParticle(p.x, p.y, -p.vx * 0.1, -p.vy * 0.1, 0.3, 3, '#ff9a3c'),
      );
    }
  } else {
    const accel = 2400;
    p.vx += mv.x * accel * dt;
    p.vy += mv.y * accel * dt;
    // Friction keeps the Keeper from sliding forever.
    const damp = Math.pow(0.0001, dt);
    p.vx *= damp;
    p.vy *= damp;
    const speed = Math.hypot(p.vx, p.vy);
    const max = p.speed;
    if (speed > max) {
      p.vx = (p.vx / speed) * max;
      p.vy = (p.vy / speed) * max;
    }
  }

  if (input.pressedDash && p.dashTimer <= 0 && (mv.x !== 0 || mv.y !== 0)) {
    p.dashTimer = p.dashCooldown;
    p.dashTimeLeft = PLAYER.dashTime;
    p.dashDirX = mv.x;
    p.dashDirY = mv.y;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
    audio.sfx.dash();
    burst(world, p.x, p.y, '#ff9a3c', 8, 160);
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = clamp(p.x, ARENA.x + p.radius, ARENA.x + ARENA.w - p.radius);
  p.y = clamp(p.y, ARENA.y + p.radius, ARENA.y + ARENA.h - p.radius);

  p.dashTimer = Math.max(0, p.dashTimer - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.contactTimer = Math.max(0, p.contactTimer - dt);
  p.fireTimer -= dt;
  p.spreadTimer = Math.max(0, p.spreadTimer - dt);
  p.rapidTimer = Math.max(0, p.rapidTimer - dt);
  p.shieldTimer = Math.max(0, p.shieldTimer - dt);
  if (p.shieldTimer <= 0 && !p.ward) p.shieldUp = false;

  if (input.mouseDown && p.fireTimer <= 0) {
    firePlayerBullets(world);
    audio.sfx.shoot();
  }
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function updateEnemy(world, enemy, dt, audio) {
  const p = world.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.angle = Math.atan2(dy, dx);

  if (enemy.kind === 'mite' || enemy.kind === 'brute') {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  } else if (enemy.kind === 'spitter') {
    // Keep a preferred range: close in when far, back off when too near.
    let move = 0;
    if (dist > enemy.def.preferRange + 40) move = 1;
    else if (dist < enemy.def.preferRange - 60) move = -1;
    enemy.vx = nx * enemy.speed * move;
    enemy.vy = ny * enemy.speed * move;
    // Strafe slowly so the spitter is never a still target.
    const strafe = Math.sin(world.time * 0.7 + enemy.x * 0.01) * 40;
    enemy.vx += -ny * strafe;
    enemy.vy += nx * strafe;
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && dist < 520 && !p.dead) {
      enemyShootAt(world, enemy, p.x, p.y, enemy.def.boltSpeed);
      enemy.shootTimer = enemy.def.shootInterval * range(world.rng, 0.85, 1.2);
      audio.sfx.enemyHit();
    }
  } else if (enemy.kind === 'wraith') {
    if (enemy.dashState === 'stalk') {
      enemy.vx = nx * enemy.speed;
      enemy.vy = ny * enemy.speed;
      enemy.dashTimer -= dt;
      if (enemy.dashTimer <= 0 && dist < 420) {
        enemy.dashState = 'telegraph';
        enemy.dashTimer = enemy.def.telegraphTime;
        enemy.dashDirX = nx;
        enemy.dashDirY = ny;
      }
    } else if (enemy.dashState === 'telegraph') {
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.dashTimer -= dt;
      // Track the player during the wind-up, but only slightly.
      enemy.dashDirX = nx;
      enemy.dashDirY = ny;
      if (enemy.dashTimer <= 0) {
        enemy.dashState = 'dash';
        enemy.dashTimer = enemy.def.dashTime;
      }
    } else if (enemy.dashState === 'dash') {
      enemy.vx = enemy.dashDirX * enemy.def.dashSpeed;
      enemy.vy = enemy.dashDirY * enemy.def.dashSpeed;
      enemy.dashTimer -= dt;
      if (enemy.dashTimer <= 0) {
        enemy.dashState = 'recover';
        enemy.dashTimer = enemy.def.recoverTime;
      }
    } else {
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.dashTimer -= dt;
      if (enemy.dashTimer <= 0) {
        enemy.dashState = 'stalk';
        enemy.dashTimer = range(world.rng, 0.8, 1.8);
      }
    }
  } else if (enemy.kind === 'boss') {
    updateBoss(world, enemy, dt, audio);
  }

  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  enemy.x = clamp(enemy.x, ARENA.x + enemy.radius, ARENA.x + ARENA.w - enemy.radius);
  enemy.y = clamp(enemy.y, ARENA.y + enemy.radius, ARENA.y + ARENA.h - enemy.radius);
}

function updateBoss(world, boss, dt, audio) {
  const p = world.player;
  const dx = p.x - boss.x;
  const dy = p.y - boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  // Phase 2 below half health: faster, angrier, more bullets.
  boss.phase = boss.hp < boss.maxHp / 2 ? 2 : 1;
  const speed = boss.speed * (boss.phase === 2 ? 1.45 : 1);
  boss.vx = nx * speed;
  boss.vy = ny * speed;

  boss.shootTimer -= dt;
  if (boss.shootTimer <= 0 && !p.dead) {
    // Radial burst: a ring of embers, denser in phase 2.
    const count = boss.phase === 2 ? 14 : 10;
    const offset = world.rng() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      world.enemyBullets.push(
        makeBullet(boss.x, boss.y, a, boss.def.boltSpeed, boss.damage, 900, 0, false),
      );
    }
    boss.shootTimer = boss.def.shootInterval * (boss.phase === 2 ? 0.75 : 1);
    audio.sfx.boss();
  }

  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    // The King calls mites from the dark, two at a time (three in phase 2).
    const n = boss.phase === 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spot = edgeSpawn(world.rng, ARENA, HEARTH, p, 220);
      world.enemies.push(createEnemy('mite', world.wave, world.rng, spot.x, spot.y, false));
      burst(world, spot.x, spot.y, '#b46bff', 10, 160);
    }
    boss.summonTimer = boss.def.summonInterval;
    setBanner(world, 'THE KING CALLS', 'Mites crawl from the dark.');
  }
}

function collideBullets(world, audio) {
  const p = world.player;
  // Friendly bullets against enemies.
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    let spent = false;
    for (let j = world.enemies.length - 1; j >= 0; j--) {
      const e = world.enemies[j];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = b.radius + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      world.shotsHit += 1;
      const dead = damageEnemy(world, e, b.damage);
      if (dead) {
        world.enemies.splice(j, 1);
        audio.sfx.kill();
        if (e.kind === 'boss') audio.sfx.explosion();
      } else {
        audio.sfx.enemyHit();
        // A little knockback, resisted by brutes.
        const resist = 1 - (e.def.knockResist || 0);
        const d = Math.hypot(b.vx, b.vy) || 1;
        e.x += (b.vx / d) * 6 * resist;
        e.y += (b.vy / d) * 6 * resist;
      }
      if (b.pierce > 0) {
        b.pierce -= 1;
      } else {
        spent = true;
      }
      break;
    }
    if (spent) world.bullets.splice(i, 1);
  }

  // Enemy bolts against the player.
  for (let i = world.enemyBullets.length - 1; i >= 0; i--) {
    const b = world.enemyBullets[i];
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const rr = b.radius + p.radius - 2;
    if (dx * dx + dy * dy <= rr * rr && !p.dead) {
      const result = hurtPlayer(world, b.damage, b.x, b.y);
      if (result === 'hurt') audio.sfx.hurt();
      else if (result === 'shield') audio.sfx.shieldBreak();
      world.enemyBullets.splice(i, 1);
    }
  }

  // Enemy bodies against the player.
  if (!p.dead && p.contactTimer <= 0) {
    for (const e of world.enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const rr = p.radius + e.radius - 2;
      if (dx * dx + dy * dy <= rr * rr) {
        const result = hurtPlayer(world, e.damage, e.x, e.y);
        if (result === 'hurt') audio.sfx.hurt();
        else if (result === 'shield') audio.sfx.shieldBreak();
        p.contactTimer = PLAYER.contactGrace;
        break;
      }
    }
  }
}

function updatePickups(world, dt, audio) {
  const p = world.player;
  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const pk = world.pickups[i];
    pk.life -= dt;
    pk.bob += dt;
    if (pk.life <= 0) {
      world.pickups.splice(i, 1);
      continue;
    }
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Pickups drift toward the Keeper when close.
    if (dist < p.pickupRadius * 2.2) {
      pk.vx += (dx / dist) * PICKUP_MAGNET_SPEED * dt * 3;
      pk.vy += (dy / dist) * PICKUP_MAGNET_SPEED * dt * 3;
    } else {
      pk.vx *= 0.9;
      pk.vy *= 0.9;
    }
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    if (dist < p.radius + pk.radius + 4 && !p.dead) {
      if (pk.kind === 'health') {
        p.hp = Math.min(p.maxHp, p.hp + 20);
        addFloater(world, p.x, p.y - 24, '+20 HP', PICKUPS.health.color);
      } else if (pk.kind === 'spread') {
        p.spreadTimer = PICKUPS.spread.duration;
        addFloater(world, p.x, p.y - 24, 'TRIPLE FLAME', PICKUPS.spread.color);
      } else if (pk.kind === 'rapid') {
        p.rapidTimer = PICKUPS.rapid.duration;
        addFloater(world, p.x, p.y - 24, 'RAPID WICK', PICKUPS.rapid.color);
      } else if (pk.kind === 'shield') {
        p.shieldUp = true;
        p.shieldTimer = PICKUPS.shield.duration;
        addFloater(world, p.x, p.y - 24, 'WARD SHIELD', PICKUPS.shield.color);
      }
      audio.sfx.pickup();
      burst(world, pk.x, pk.y, PICKUPS[pk.kind].color, 10, 140);
      world.pickups.splice(i, 1);
    }
  }
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      world.particles.splice(i, 1);
      continue;
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.98;
    pt.vy *= 0.98;
  }
  for (let i = world.floaters.length - 1; i >= 0; i--) {
    const f = world.floaters[i];
    f.life -= dt;
    f.y -= FEEL.floatRise * dt;
    if (f.life <= 0) world.floaters.splice(i, 1);
  }
}

// Spawn the next queued enemy at the arena edge.
function spawnNext(world) {
  const kind = world.spawnQueue.shift();
  if (!kind) return;
  const p = world.player;
  if (kind === 'boss') {
    const spot = { x: ARENA.x + ARENA.w / 2, y: ARENA.y + 70 };
    world.enemies.push(createEnemy('boss', world.wave, world.rng, spot.x, spot.y, false));
    world.bossSpawned = true;
    return;
  }
  const spot = edgeSpawn(world.rng, ARENA, HEARTH, p, 260);
  const index = world.kills + world.enemies.length;
  const elite = world.wave >= ELITE_FROM_WAVE && index > 0 && index % ELITE_EVERY === 0;
  world.enemies.push(createEnemy(kind, world.wave, world.rng, spot.x, spot.y, elite));
  burst(world, spot.x, spot.y, ENEMY_KINDS[kind].color, 8, 120);
}

// The main per-frame step for the play state. Returns nothing; the world
// carries its own state changes (wave clear, victory, game over).
export function updatePlay(world, dt, input, audio) {
  world.time += dt;
  world.runTime += dt;
  if (world.hitStop > 0) {
    world.hitStop -= dt;
    return;
  }
  world.shake = Math.max(0, world.shake - dt * 26);
  world.flash = Math.max(0, world.flash - dt * 1.4);
  if (world.bannerTimer > 0) world.bannerTimer -= dt;

  // Combo decay.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }

  updatePlayer(world, dt, input, audio);
  if (world.state !== 'play') return;

  // Trickle enemies in so a wave arrives as a flow, not a wall.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      spawnNext(world);
      world.spawnTimer = world.wave === FINAL_WAVE ? 1 : 0.55;
    }
  }

  for (const e of world.enemies) updateEnemy(world, e, dt, audio);

  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rangeLeft -= Math.hypot(b.vx, b.vy) * dt;
    b.life += dt;
    if (
      b.rangeLeft <= 0 ||
      b.x < ARENA.x - 20 || b.x > ARENA.x + ARENA.w + 20 ||
      b.y < ARENA.y - 20 || b.y > ARENA.y + ARENA.h + 20
    ) {
      world.bullets.splice(i, 1);
    }
  }
  for (let i = world.enemyBullets.length - 1; i >= 0; i--) {
    const b = world.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rangeLeft -= Math.hypot(b.vx, b.vy) * dt;
    if (
      b.rangeLeft <= 0 ||
      b.x < ARENA.x - 30 || b.x > ARENA.x + ARENA.w + 30 ||
      b.y < ARENA.y - 30 || b.y > ARENA.y + ARENA.h + 30
    ) {
      world.enemyBullets.splice(i, 1);
    }
  }

  collideBullets(world, audio);
  updatePickups(world, dt, audio);
  updateParticles(world, dt);

  // Wave cleared: no enemies left and nothing left to spawn.
  if (world.waveActive && world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.waveActive = false;
    world.combo = 1;
    if (world.wave >= FINAL_WAVE) {
      world.state = 'victory';
      audio.sfx.victory();
    } else {
      const p = world.player;
      if (p.ward) {
        p.wardReady = true;
        p.shieldUp = true;
        p.shieldTimer = 999;
      }
      audio.sfx.waveClear();
      offerUpgrades(world);
    }
  }
}
