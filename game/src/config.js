// Emberfall tuning and content tables: every number that shapes the game lives
// here so a balance pass touches one file and nothing else.

// The canvas is a fixed 1280x720 stage; the page scales it to the window.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// The arena is the whole stage with a soft margin the player cannot cross.
export const ARENA = { x: 28, y: 28, w: VIEW_W - 56, h: VIEW_H - 56 };

// The hearth sits in the middle of the arena. It is the light the Keeper
// defends; it glows, pulses, and is where enemies never spawn.
export const HEARTH = { x: VIEW_W / 2, y: VIEW_H / 2, r: 46 };

// How many waves make a full run. Wave 10 ends with the Hollow King.
export const FINAL_WAVE = 10;

// Palette: warm ember light against cold ash dark.
export const PALETTE = {
  bgTop: '#171019',
  bgBottom: '#0a0608',
  arenaLine: 'rgba(255, 176, 92, 0.16)',
  hearthCore: '#ffd98a',
  hearthGlow: 'rgba(255, 150, 60, 0.55)',
  ember: '#ff9a3c',
  emberBright: '#ffc46b',
  player: '#ffe9b0',
  playerRing: '#ff9a3c',
  bullet: '#ffd76b',
  enemyBolt: '#c78bff',
  text: '#ffe9c4',
  textDim: 'rgba(255, 233, 196, 0.62)',
  danger: '#ff5a4e',
  heal: '#7dff9a',
  shield: '#7dd8ff',
};

export const PLAYER = {
  radius: 16,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.19,
  bulletSpeed: 560,
  bulletDamage: 13,
  bulletRadius: 5,
  bulletRange: 620,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 2.1,
  dashInvuln: 0.28,
  pickupRadius: 64,
  contactGrace: 0.45,
};

// One entry per enemy kind. behaviour picks the steering routine, the rest
// tunes it. hp and damage scale with the wave inside entities.js.
export const ENEMY_KINDS = {
  mite: {
    name: 'Ash Mite',
    behaviour: 'chase',
    radius: 13,
    speed: 118,
    hp: 22,
    damage: 9,
    score: 50,
    color: '#e8b34b',
    glow: 'rgba(232, 179, 75, 0.5)',
  },
  spitter: {
    name: 'Cinder Spitter',
    behaviour: 'shoot',
    radius: 16,
    speed: 72,
    hp: 34,
    damage: 8,
    score: 90,
    color: '#c78bff',
    glow: 'rgba(199, 139, 255, 0.5)',
    shootInterval: 2.4,
    boltSpeed: 210,
    preferRange: 280,
  },
  wraith: {
    name: 'Gloom Wraith',
    behaviour: 'dash',
    radius: 14,
    speed: 96,
    hp: 30,
    damage: 12,
    score: 120,
    color: '#7dd8ff',
    glow: 'rgba(125, 216, 255, 0.5)',
    telegraphTime: 0.55,
    dashSpeed: 520,
    dashTime: 0.28,
    recoverTime: 0.9,
  },
  brute: {
    name: 'Slag Brute',
    behaviour: 'chase',
    radius: 26,
    speed: 52,
    hp: 150,
    damage: 18,
    score: 200,
    color: '#ff6b4a',
    glow: 'rgba(255, 107, 74, 0.5)',
    knockResist: 0.85,
  },
  boss: {
    name: 'The Hollow King',
    behaviour: 'boss',
    radius: 52,
    speed: 58,
    hp: 1450,
    damage: 24,
    score: 5000,
    color: '#b46bff',
    glow: 'rgba(180, 107, 255, 0.6)',
    shootInterval: 1.7,
    boltSpeed: 190,
    summonInterval: 7.5,
  },
};

// How a wave is composed. counts grow with the wave number; the table gives
// the base count and the per-wave growth for each kind.
export const WAVE_TABLE = [
  { mite: 6, spitter: 0, wraith: 0, brute: 0 },
  { mite: 8, spitter: 2, wraith: 0, brute: 0 },
  { mite: 9, spitter: 3, wraith: 2, brute: 0 },
  { mite: 10, spitter: 4, wraith: 3, brute: 1 },
  { mite: 12, spitter: 4, wraith: 4, brute: 1 },
  { mite: 12, spitter: 6, wraith: 5, brute: 2 },
  { mite: 14, spitter: 6, wraith: 6, brute: 2 },
  { mite: 14, spitter: 8, wraith: 7, brute: 3 },
  { mite: 16, spitter: 8, wraith: 8, brute: 3 },
  { mite: 0, spitter: 0, wraith: 0, brute: 0 }, // wave 10 is the boss
];

// One wave in six enemies is an elite from wave 3 on: tougher, gilded, and
// always drops a pickup.
export const ELITE_FROM_WAVE = 3;
export const ELITE_EVERY = 6;
export const ELITE_HP_MULT = 2.6;
export const ELITE_SIZE_MULT = 1.28;
export const ELITE_SCORE_MULT = 3;

// Enemy health and damage creep a little each wave so late waves stay tense.
export const WAVE_HP_GROWTH = 0.09;
export const WAVE_DAMAGE_GROWTH = 0.05;

// Pickups: what drops, how often, and what each one does while it lasts.
export const PICKUPS = {
  health: { color: '#7dff9a', label: '+20 HP', duration: 0 },
  spread: { color: '#ffd76b', label: 'TRIPLE FLAME', duration: 14 },
  rapid: { color: '#ff9a3c', label: 'RAPID WICK', duration: 12 },
  shield: { color: '#7dd8ff', label: 'WARD SHIELD', duration: 16 },
};
export const PICKUP_DROP_CHANCE = 0.14;
export const PICKUP_LIFETIME = 14;
export const PICKUP_MAGNET_SPEED = 420;

// Combo: kills chained inside the window raise the score multiplier, up to x5.
export const COMBO_WINDOW = 3.0;
export const COMBO_MAX = 5;

// The three upgrades offered between waves. Each has an id, a name, a short
// line for the card, and an apply step in entities.js.
export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Wick', desc: 'Shoot 18% faster. The lantern spits embers like rain.' },
  { id: 'twin', name: 'Twin Flame', desc: '+1 bullet per shot, fanned wide. More light, more hits.' },
  { id: 'heavy', name: 'Heavy Ember', desc: '+35% bullet damage. Each ember hits like a hammer.' },
  { id: 'swift', name: 'Swift Boots', desc: '+12% move speed. Outrun the dark, outflank the horde.' },
  { id: 'longfuse', name: 'Long Fuse', desc: '+25% bullet speed and range. Reach across the arena.' },
  { id: 'hide', name: 'Thick Hide', desc: '+25 max health and heal 25 now. The Keeper endures.' },
  { id: 'magnet', name: 'Ember Magnet', desc: 'Pickups fly to you from twice as far. Nothing wasted.' },
  { id: 'dash', name: 'Dash Mastery', desc: 'Dash recharges 35% faster. Blink through the gloom.' },
  { id: 'pierce', name: 'Piercing Light', desc: 'Bullets pierce +1 enemy. One shot, a whole line of ash.' },
  { id: 'ward', name: 'Guardian Ward', desc: 'A shield that blocks one hit, renewed every wave.' },
];

// Feel: particles, shake and hit-stop budgets.
export const FEEL = {
  shakeMax: 14,
  hitStopKill: 0.045,
  hitStopBoss: 0.09,
  particlesPerKill: 16,
  floatRise: 46,
};
