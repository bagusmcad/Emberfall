// Seeded randomness for Emberfall. Gameplay uses one generator per run so a
// run can be replayed; the screenshot scenes use a fixed seed so their
// frames are identical every time they render.

// mulberry32: a small, fast, well-behaved seeded generator.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A uniform float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A uniform integer in [min, max] inclusive.
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// One element of an array, uniformly.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// True with probability p (0..1).
export function chance(rng, p) {
  return rng() < p;
}

// A random point on the arena edge, kept away from the hearth and from a
// given point (the player) by at least minPlayerDist.
export function edgeSpawn(rng, arena, hearth, player, minPlayerDist) {
  for (let tries = 0; tries < 24; tries++) {
    const side = Math.floor(rng() * 4);
    let x;
    let y;
    if (side === 0) {
      x = range(rng, arena.x, arena.x + arena.w);
      y = arena.y + 12;
    } else if (side === 1) {
      x = range(rng, arena.x, arena.x + arena.w);
      y = arena.y + arena.h - 12;
    } else if (side === 2) {
      x = arena.x + 12;
      y = range(rng, arena.y, arena.y + arena.h);
    } else {
      x = arena.x + arena.w - 12;
      y = range(rng, arena.y, arena.y + arena.h);
    }
    const dx = x - hearth.x;
    const dy = y - hearth.y;
    if (dx * dx + dy * dy < (hearth.r + 90) * (hearth.r + 90)) continue;
    const px = x - player.x;
    const py = y - player.y;
    if (px * px + py * py < minPlayerDist * minPlayerDist) continue;
    return { x, y };
  }
  return { x: arena.x + 40, y: arena.y + 40 };
}
