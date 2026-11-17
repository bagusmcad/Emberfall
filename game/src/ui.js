// Overlay screens for Emberfall: title, pause, the between-wave upgrade
// choice, victory and game over. Each draw function paints one screen over
// the world; the upgrade draw returns its card rectangles so main.js can
// turn a click into a choice.

import { PALETTE, VIEW_H, VIEW_W } from './config.js';

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(6, 3, 5, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centreText(ctx, text, y, font, color, glow) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 26;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.restore();
}

function statLine(ctx, label, value, y, x) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(value, VIEW_W - x, y);
  ctx.restore();
}

export function drawTitle(ctx, world, time) {
  dim(ctx, 0.62);
  const bob = Math.sin(time * 1.4) * 6;
  centreText(ctx, 'EMBERFALL', 218 + bob, 'bold 92px "Trebuchet MS", sans-serif', '#ffd98a', 'rgba(255, 154, 60, 0.9)');
  centreText(ctx, 'LAST LIGHT OF THE HEARTH', 288, '20px "Trebuchet MS", sans-serif', PALETTE.ember, null);
  centreText(
    ctx,
    'The dark has swallowed the valley. One lantern still burns — and you carry it.',
    336,
    '16px "Trebuchet MS", sans-serif',
    PALETTE.textDim,
    null,
  );
  centreText(ctx, 'Survive 10 waves. Slay the Hollow King. Keep the light.', 364, '16px "Trebuchet MS", sans-serif', PALETTE.textDim, null);

  if (world.best > 0) {
    centreText(ctx, `BEST SCORE  ${world.best.toLocaleString('en-US')}`, 420, 'bold 18px "Trebuchet MS", sans-serif', '#ffd76b', null);
  }

  const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreText(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 492, 'bold 22px "Trebuchet MS", sans-serif', PALETTE.text, null);
  ctx.restore();

  centreText(ctx, 'WASD / ARROWS — move      MOUSE — aim      HOLD CLICK — shoot', 560, '15px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
  centreText(ctx, 'SPACE — dash through danger (briefly untouchable)      P — pause      M — mute', 586, '15px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
  centreText(ctx, 'Between waves, choose one of three upgrades. Pickups drop from the fallen.', 626, '14px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
}

export function drawPause(ctx) {
  dim(ctx, 0.6);
  centreText(ctx, 'PAUSED', 300, 'bold 64px "Trebuchet MS", sans-serif', PALETTE.text, 'rgba(255, 154, 60, 0.7)');
  centreText(ctx, 'The hearth waits. The dark does not.', 372, '16px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
  centreText(ctx, 'Press P or click to keep fighting', 430, 'bold 18px "Trebuchet MS", sans-serif', PALETTE.text, null);
}

// The upgrade choice: three cards in a row. Returns the three hit rectangles
// so the caller can map a mouse click to a card index.
export function drawUpgrade(ctx, world) {
  dim(ctx, 0.66);
  centreText(ctx, `WAVE ${world.wave} CLEARED`, 118, 'bold 40px "Trebuchet MS", sans-serif', '#ffd98a', 'rgba(255, 154, 60, 0.8)');
  centreText(ctx, 'Choose one blessing of the hearth', 162, '17px "Trebuchet MS", sans-serif', PALETTE.textDim, null);

  const cardW = 300;
  const cardH = 230;
  const gap = 28;
  const totalW = cardW * 3 + gap * 2;
  const startX = (VIEW_W - totalW) / 2;
  const y = 220;
  const rects = [];
  world.offered.forEach((up, i) => {
    const x = startX + i * (cardW + gap);
    rects.push({ x, y, w: cardW, h: cardH, index: i });
    ctx.save();
    // Card body.
    ctx.fillStyle = 'rgba(38, 22, 16, 0.92)';
    ctx.strokeStyle = 'rgba(255, 176, 92, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    // Number key.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.ember;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText(`[${i + 1}]`, x + cardW / 2, y + 30);
    // Name.
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText(up.name, x + cardW / 2, y + 74);
    // Divider flame.
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 108, 4, 0, Math.PI * 2);
    ctx.fill();
    // Description, wrapped to the card width.
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px "Trebuchet MS", sans-serif';
    const words = up.desc.split(' ');
    const lines = [''];
    for (const word of words) {
      const line = lines[lines.length - 1];
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > cardW - 44 && line) lines.push(word);
      else lines[lines.length - 1] = test;
    }
    lines.forEach((line, li) => {
      ctx.fillText(line, x + cardW / 2, y + 140 + li * 22);
    });
    ctx.restore();
  });
  centreText(ctx, 'Click a card, or press 1, 2 or 3', 500, '15px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
  return rects;
}

function drawRunStats(ctx, world, startY) {
  const p = world.player;
  const accuracy = world.shotsFired > 0 ? Math.min(100, Math.round((world.shotsHit / world.shotsFired) * 100)) : 0;
  const minutes = Math.floor(world.runTime / 60);
  const seconds = Math.floor(world.runTime % 60);
  const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const x = 430;
  let y = startY;
  statLine(ctx, 'FINAL SCORE', world.score.toLocaleString('en-US'), y, x);
  y += 34;
  statLine(ctx, 'WAVE REACHED', `${Math.max(1, world.wave)} / 10`, y, x);
  y += 34;
  statLine(ctx, 'FOES SLAIN', `${world.kills}`, y, x);
  y += 34;
  statLine(ctx, 'BEST COMBO', `x${world.comboBest}`, y, x);
  y += 34;
  statLine(ctx, 'ACCURACY', `${accuracy}%  (${world.shotsHit}/${world.shotsFired} hits)`, y, x);
  y += 34;
  statLine(ctx, 'TIME SURVIVED', timeText, y, x);
  y += 34;
  statLine(ctx, 'UPGRADES TAKEN', `${world.upgradesTaken.length}`, y, x);
  return y;
}

export function drawVictory(ctx, world, time) {
  dim(ctx, 0.6);
  const bob = Math.sin(time * 1.4) * 5;
  centreText(ctx, 'THE LIGHT ENDURES', 150 + bob, 'bold 64px "Trebuchet MS", sans-serif', '#ffd98a', 'rgba(255, 200, 90, 0.9)');
  centreText(ctx, 'The Hollow King is ash. Dawn breaks over the valley.', 216, '18px "Trebuchet MS", sans-serif', PALETTE.text, null);
  centreText(ctx, 'You kept the last light alive.', 244, '16px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
  drawRunStats(ctx, world, 300);
  const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreText(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', 590, 'bold 20px "Trebuchet MS", sans-serif', PALETTE.text, null);
  ctx.restore();
}

export function drawGameOver(ctx, world, time) {
  dim(ctx, 0.68);
  centreText(ctx, 'THE LIGHT GOES OUT', 150, 'bold 60px "Trebuchet MS", sans-serif', '#ff6b5a', 'rgba(255, 60, 40, 0.7)');
  centreText(ctx, 'The dark takes the hearth… this time.', 216, '18px "Trebuchet MS", sans-serif', PALETTE.text, null);
  centreText(ctx, 'The lantern is relit. The Keeper rises again.', 244, '16px "Trebuchet MS", sans-serif', PALETTE.textDim, null);
  drawRunStats(ctx, world, 300);
  const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreText(ctx, 'PRESS R OR CLICK TO TRY AGAIN', 590, 'bold 20px "Trebuchet MS", sans-serif', PALETTE.text, null);
  ctx.restore();
}
