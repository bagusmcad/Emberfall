// All canvas drawing for Emberfall: the arena, the hearth, every entity, and
// the HUD. This file never changes game state; it only paints the world.

import { ARENA, HEARTH, PALETTE, PICKUPS, VIEW_H, VIEW_W } from './config.js';

// Draw the whole play scene: background, arena, entities, HUD.
export function drawWorld(ctx, world) {
  drawBackground(ctx, world);
  ctx.save();
  // Screen shake: a small random offset that decays in entities.js.
  if (world.shake > 0.2) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawArena(ctx, world);
  drawHearth(ctx, world);
  for (const pk of world.pickups) drawPickup(ctx, pk, world.time);
  for (const e of world.enemies) drawEnemy(ctx, e, world.time);
  drawPlayer(ctx, world);
  for (const b of world.bullets) drawBullet(ctx, b);
  for (const b of world.enemyBullets) drawEnemyBolt(ctx, b);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();
  drawBanner(ctx, world);
  drawHud(ctx, world);
  // A red flash over the whole screen when the Keeper is hurt.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 40, ${world.flash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawBackground(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Faint drifting embers in the dark, seeded by time so they never jump.
  ctx.save();
  for (let i = 0; i < 42; i++) {
    const x = ((i * 173.3 + world.time * 12) % (VIEW_W + 40)) - 20;
    const y = (i * 97.7 + Math.sin(world.time * 0.4 + i) * 18) % VIEW_H;
    const a = 0.08 + 0.1 * Math.abs(Math.sin(world.time * 0.5 + i * 2.1));
    ctx.fillStyle = `rgba(255, 154, 60, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArena(ctx, world) {
  ctx.save();
  ctx.strokeStyle = PALETTE.arenaLine;
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  // Corner marks, like a lantern's frame.
  ctx.strokeStyle = 'rgba(255, 176, 92, 0.4)';
  ctx.lineWidth = 3;
  const c = 18;
  const corners = [
    [ARENA.x, ARENA.y, 1, 1],
    [ARENA.x + ARENA.w, ARENA.y, -1, 1],
    [ARENA.x, ARENA.y + ARENA.h, 1, -1],
    [ARENA.x + ARENA.w, ARENA.y + ARENA.h, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * c, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * c);
    ctx.stroke();
  }
  // A soft pool of light around the hearth.
  const glow = ctx.createRadialGradient(HEARTH.x, HEARTH.y, 10, HEARTH.x, HEARTH.y, 260);
  glow.addColorStop(0, 'rgba(255, 150, 60, 0.10)');
  glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.restore();
}

function drawHearth(ctx, world) {
  const pulse = 1 + Math.sin(world.time * 2.2) * 0.06;
  const r = HEARTH.r * pulse;
  ctx.save();
  // Outer glow.
  const glow = ctx.createRadialGradient(HEARTH.x, HEARTH.y, 4, HEARTH.x, HEARTH.y, r * 2.4);
  glow.addColorStop(0, PALETTE.hearthGlow);
  glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(HEARTH.x, HEARTH.y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Stone ring.
  ctx.strokeStyle = '#4a3a2c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(HEARTH.x, HEARTH.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(HEARTH.x, HEARTH.y, r - 5, 0, Math.PI * 2);
  ctx.stroke();
  // The flame: three layered teardrops that flicker with time.
  const flick = Math.sin(world.time * 7) * 2 + Math.sin(world.time * 13.7) * 1.2;
  drawFlame(ctx, HEARTH.x, HEARTH.y + 6, 26 + flick, '#ff6b1f');
  drawFlame(ctx, HEARTH.x, HEARTH.y + 8, 18 + flick * 0.7, '#ff9a3c');
  drawFlame(ctx, HEARTH.x, HEARTH.y + 10, 10 + flick * 0.5, '#ffd98a');
  ctx.restore();
}

function drawFlame(ctx, x, y, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.bezierCurveTo(x + h * 0.55, y - h * 0.4, x + h * 0.4, y + h * 0.25, x, y + h * 0.2);
  ctx.bezierCurveTo(x - h * 0.4, y + h * 0.25, x - h * 0.55, y - h * 0.4, x, y - h);
  ctx.fill();
  ctx.restore();
}

function drawPickup(ctx, pk, time) {
  const def = PICKUPS[pk.kind];
  const bob = Math.sin(time * 3 + pk.bob) * 3;
  const blink = pk.life < 3 ? (Math.sin(time * 12) > 0 ? 1 : 0.35) : 1;
  ctx.save();
  ctx.globalAlpha = blink;
  const glow = ctx.createRadialGradient(pk.x, pk.y + bob, 2, pk.x, pk.y + bob, 26);
  glow.addColorStop(0, def.color);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = blink * 0.5;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pk.x, pk.y + bob, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = blink;
  ctx.fillStyle = def.color;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pk.x, pk.y + bob, pk.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A tiny glyph per kind so pickups read at a glance.
  ctx.fillStyle = '#14100c';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = pk.kind === 'health' ? '+' : pk.kind === 'spread' ? 'x3' : pk.kind === 'rapid' ? '»' : '◊';
  ctx.fillText(glyph, pk.x, pk.y + bob + 0.5);
  ctx.restore();
}

function drawEnemy(ctx, e, time) {
  ctx.save();
  // Elite aura: a gilded ring.
  if (e.elite) {
    ctx.strokeStyle = 'rgba(255, 215, 107, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Body glow.
  const glow = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.radius * 2.1);
  glow.addColorStop(0, e.def.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  const flashing = e.flash > 0;
  ctx.fillStyle = flashing ? '#ffffff' : e.def.color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 2;
  if (e.kind === 'mite') {
    // A spiky little cinder: a hexagon with jagged points.
    drawSpiky(ctx, e.x, e.y, e.radius, 6, time * 2 + e.x);
  } else if (e.kind === 'spitter') {
    // A round maw with a glowing core.
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a1030';
    ctx.beginPath();
    ctx.arc(e.x + Math.cos(e.angle) * 4, e.y + Math.sin(e.angle) * 4, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'wraith') {
    // A teardrop wisp; it brightens while telegraphing its dash.
    const tele = e.dashState === 'telegraph';
    ctx.globalAlpha = tele ? 0.65 + 0.35 * Math.sin(time * 30) : 0.9;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(e.angle) * e.radius * 1.3, e.y + Math.sin(e.angle) * e.radius * 1.3);
    ctx.arc(e.x, e.y, e.radius, e.angle + 2.2, e.angle - 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (e.kind === 'brute') {
    // A heavy slab: a rounded square with cracks.
    roundRect(ctx, e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(e.x - e.radius * 0.5, e.y - e.radius * 0.4);
    ctx.lineTo(e.x, e.y);
    ctx.lineTo(e.x + e.radius * 0.4, e.y - e.radius * 0.5);
    ctx.stroke();
  } else if (e.kind === 'boss') {
    // The Hollow King: a great crowned ring with a hollow core.
    const wobble = Math.sin(time * 1.6) * 0.08;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + wobble;
      const x1 = e.x + Math.cos(a) * (e.radius - 4);
      const y1 = e.y + Math.sin(a) * (e.radius - 4);
      const x2 = e.x + Math.cos(a) * (e.radius + 16);
      const y2 = e.y + Math.sin(a) * (e.radius + 16);
      ctx.strokeStyle = e.def.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Hollow core: a dark eye that watches the Keeper.
    ctx.fillStyle = '#12060f';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath();
    ctx.arc(e.x + Math.cos(e.angle) * 6, e.y + Math.sin(e.angle) * 6, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes: two small bright dots facing the player, on every kind but the boss.
  if (e.kind !== 'boss') {
    const ex = Math.cos(e.angle);
    const ey = Math.sin(e.angle);
    const px = -ey;
    const py = ex;
    ctx.fillStyle = '#fff6e0';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(e.x + ex * e.radius * 0.35 + px * s * e.radius * 0.35, e.y + ey * e.radius * 0.35 + py * s * e.radius * 0.35, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Health bar for anything hurt, and always for the boss.
  if (e.hp < e.maxHp || e.kind === 'boss') {
    const w = e.kind === 'boss' ? 130 : e.radius * 2;
    const x = e.x - w / 2;
    const y = e.y - e.radius - (e.kind === 'boss' ? 18 : 10);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = e.kind === 'boss' ? '#b46bff' : '#ff5a4e';
    ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
  }
  ctx.restore();
}

function drawSpiky(ctx, x, y, r, points, phase) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + phase * 0.05;
    const rr = i % 2 === 0 ? r : r * 0.62;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.dead) return;
  ctx.save();
  // Blink while invulnerable after a hit or a dash.
  if (p.invuln > 0 && Math.sin(world.time * 40) > 0) ctx.globalAlpha = 0.45;
  // Shield ring.
  if (p.shieldUp) {
    ctx.strokeStyle = 'rgba(125, 216, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 9 + Math.sin(world.time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Lantern glow around the Keeper.
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 64);
  glow.addColorStop(0, 'rgba(255, 217, 138, 0.35)');
  glow.addColorStop(1, 'rgba(255, 217, 138, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 64, 0, Math.PI * 2);
  ctx.fill();
  // Body: a hooded keeper, drawn as a circle with a cloak wedge.
  ctx.fillStyle = PALETTE.player;
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The lantern the Keeper carries, pointing at the aim.
  const lx = p.x + Math.cos(p.angle) * (p.radius + 2);
  const ly = p.y + Math.sin(p.angle) * (p.radius + 2);
  ctx.fillStyle = PALETTE.emberBright;
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Aim tick.
  ctx.strokeStyle = 'rgba(255, 233, 176, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * (p.radius + 12), p.y + Math.sin(p.angle) * (p.radius + 12));
  ctx.lineTo(p.x + Math.cos(p.angle) * (p.radius + 20), p.y + Math.sin(p.angle) * (p.radius + 20));
  ctx.stroke();
  ctx.restore();
}

function drawBullet(ctx, b) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 107, 0.5)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.fillStyle = PALETTE.bullet;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemyBolt(ctx, b) {
  ctx.save();
  ctx.fillStyle = PALETTE.enemyBolt;
  ctx.shadowColor = PALETTE.enemyBolt;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, world) {
  ctx.save();
  for (const pt of world.particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(ctx, world) {
  ctx.save();
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floaters) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function drawBanner(ctx, world) {
  if (!world.banner || world.bannerTimer <= 0) return;
  const a = Math.min(1, world.bannerTimer / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
  ctx.shadowColor = 'rgba(255, 154, 60, 0.8)';
  ctx.shadowBlur = 24;
  ctx.fillText(world.banner.text, VIEW_W / 2, 120);
  ctx.shadowBlur = 0;
  ctx.font = '17px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(world.banner.sub, VIEW_W / 2, 152);
  ctx.restore();
}

// The HUD: health bar, score, wave, dash cooldown, combo and timers.
export function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  // Top-left: score, best, wave.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText(`${world.score.toLocaleString('en-US')}`, 36, 26);
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`BEST ${Math.max(world.best, world.score).toLocaleString('en-US')}`, 36, 62);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${Math.max(1, world.wave)} / 10`, VIEW_W - 36, 28);
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  const remaining = world.enemies.length + world.spawnQueue.length;
  ctx.fillText(world.waveActive ? `${remaining} FOE${remaining === 1 ? '' : 'S'} LEFT` : 'BETWEEN WAVES', VIEW_W - 36, 56);

  // Combo meter under the score.
  if (world.combo > 1) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd76b';
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.fillText(`COMBO x${world.combo}`, 36, 84);
    ctx.fillStyle = 'rgba(255, 215, 107, 0.35)';
    ctx.fillRect(36, 106, 120, 5);
    ctx.fillStyle = '#ffd76b';
    ctx.fillRect(36, 106, 120 * (world.comboTimer / 3), 5);
  }

  // Bottom-left: health bar and dash cooldown.
  const barW = 260;
  const barX = 36;
  const barY = VIEW_H - 52;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, 22);
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = hpFrac > 0.5 ? '#7dff9a' : hpFrac > 0.25 ? '#ffb13c' : '#ff5a4e';
  ctx.fillRect(barX, barY, barW * hpFrac, 18);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, barX + 6, barY + 3);
  // Dash pip.
  const dashReady = p.dashTimer <= 0;
  ctx.fillStyle = dashReady ? '#ff9a3c' : 'rgba(255, 154, 60, 0.3)';
  ctx.beginPath();
  ctx.arc(barX + barW + 24, barY + 9, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText(dashReady ? 'DASH READY [SPACE]' : 'DASH…', barX + barW + 38, barY + 4);

  // Bottom-right: active timed power-ups.
  let py = VIEW_H - 52;
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  if (p.spreadTimer > 0) {
    ctx.fillStyle = PICKUPS.spread.color;
    ctx.fillText(`TRIPLE FLAME ${Math.ceil(p.spreadTimer)}s`, VIEW_W - 36, py);
    py -= 20;
  }
  if (p.rapidTimer > 0) {
    ctx.fillStyle = PICKUPS.rapid.color;
    ctx.fillText(`RAPID WICK ${Math.ceil(p.rapidTimer)}s`, VIEW_W - 36, py);
    py -= 20;
  }
  if (p.shieldUp) {
    ctx.fillStyle = PICKUPS.shield.color;
    ctx.fillText(p.ward ? 'GUARDIAN WARD' : `WARD SHIELD ${Math.ceil(p.shieldTimer)}s`, VIEW_W - 36, py);
  }
  ctx.restore();
}
