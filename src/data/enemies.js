// Enemy definitions. Stats are base values for stage 1; the stage multiplier and
// the stage clock scale them up. Models face +Z and stand on y = 0.
import { eyes, glowEyes } from '../models.js';

// AI archetypes: chaser, runner, tank, ranged, flier, exploder, charger, splitter, teleporter
const A = {
  chaser: { hp: 12, speed: 3.7, damage: 8, radius: 0.55, xp: 1 },
  runner: { hp: 7, speed: 5.9, damage: 6, radius: 0.45, xp: 1 },
  tank: { hp: 70, speed: 2.4, damage: 16, radius: 1.1, xp: 5 },
  ranged: { hp: 14, speed: 3.1, damage: 7, radius: 0.55, xp: 2 },
  flier: { hp: 10, speed: 4.6, damage: 7, radius: 0.55, xp: 1 },
  exploder: { hp: 9, speed: 5.2, damage: 24, radius: 0.55, xp: 2 },
  charger: { hp: 26, speed: 3.2, damage: 14, radius: 0.7, xp: 3 },
  splitter: { hp: 34, speed: 3.0, damage: 10, radius: 0.8, xp: 3 },
  teleporter: { hp: 16, speed: 3.4, damage: 9, radius: 0.55, xp: 2 },
};

const def = (ai, extra) => ({ ai, ...A[ai], ...extra });

export const ENEMIES = {
  // ───────────── Stage 1 · Verdant Woods ─────────────
  sproutling: def('chaser', {
    name: 'Sproutling',
    parts: [
      { shape: 'sphere', size: [0.5], pos: [0, 0.5, 0], color: 0x6cc24a, scale: [1, 0.9, 1] },
      { shape: 'cone', size: [0.14, 0.45], pos: [0, 1.1, 0], color: 0x3d8a2a },
      { shape: 'box', size: [0.5, 0.05, 0.22], pos: [0.2, 1.25, 0], rot: [0, 0, 0.5], color: 0x86d95a },
      { shape: 'box', size: [0.5, 0.05, 0.22], pos: [-0.2, 1.25, 0], rot: [0, 0, -0.5], color: 0x86d95a },
      ...eyes(0.62, 0.4),
    ],
  }),
  goblin: def('runner', {
    name: 'Goblin Scout',
    parts: [
      { shape: 'box', size: [0.5, 0.55, 0.35], pos: [0, 0.55, 0], color: 0x7a5230 },
      { shape: 'sphere', size: [0.3], pos: [0, 1.05, 0.02], color: 0x8fbf3f },
      { shape: 'cone', size: [0.1, 0.4], pos: [-0.35, 1.1, 0], rot: [0, 0, 1.3], color: 0x8fbf3f },
      { shape: 'cone', size: [0.1, 0.4], pos: [0.35, 1.1, 0], rot: [0, 0, -1.3], color: 0x8fbf3f },
      { shape: 'box', size: [0.12, 0.3, 0.12], pos: [-0.15, 0.15, 0], color: 0x4a3420 },
      { shape: 'box', size: [0.12, 0.3, 0.12], pos: [0.15, 0.15, 0], color: 0x4a3420 },
      { shape: 'box', size: [0.06, 0.06, 0.5], pos: [0.35, 0.6, 0.3], color: 0xcccccc },
      ...glowEyes(1.1, 0.26, 0.12, 0.06, 0xffee33),
    ],
  }),
  mossgolem: def('tank', {
    name: 'Mossback Golem',
    parts: [
      { shape: 'box', size: [1.5, 1.3, 1.1], pos: [0, 1.25, 0], color: 0x7d7f78 },
      { shape: 'box', size: [1.6, 0.35, 1.2], pos: [0, 2.0, 0], color: 0x4f8f3a },
      { shape: 'box', size: [0.8, 0.6, 0.7], pos: [0, 2.3, 0.15], color: 0x8a8c84 },
      { shape: 'box', size: [0.45, 1.3, 0.45], pos: [-1.0, 1.0, 0.1], color: 0x6c6e67 },
      { shape: 'box', size: [0.45, 1.3, 0.45], pos: [1.0, 1.0, 0.1], color: 0x6c6e67 },
      { shape: 'box', size: [0.5, 0.6, 0.5], pos: [-0.4, 0.3, 0], color: 0x5f615a },
      { shape: 'box', size: [0.5, 0.6, 0.5], pos: [0.4, 0.3, 0], color: 0x5f615a },
      ...glowEyes(2.35, 0.5, 0.18, 0.08, 0x9dff6a),
    ],
  }),
  thornspitter: def('ranged', {
    name: 'Thorn Spitter',
    range: 16, fireCd: 2.6, projSpeed: 11, projColor: 0x9cff4a,
    parts: [
      { shape: 'cyl', size: [0.12, 0.18, 1.0], pos: [0, 0.5, 0], color: 0x2f7a2a },
      { shape: 'sphere', size: [0.42], pos: [0, 1.2, 0], color: 0xd6456a },
      { shape: 'torus', size: [0.2, 0.07], pos: [0, 1.2, 0.36], color: 0x5a1020 },
      { shape: 'box', size: [0.7, 0.05, 0.3], pos: [0.3, 0.35, 0], rot: [0, 0, 0.4], color: 0x49a33a },
      { shape: 'box', size: [0.7, 0.05, 0.3], pos: [-0.3, 0.35, 0], rot: [0, 0, -0.4], color: 0x49a33a },
      { shape: 'cone', size: [0.06, 0.25], pos: [0, 1.62, 0], color: 0xf7f38a },
    ],
  }),
  buzzbee: def('flier', {
    name: 'Buzzbee', hover: 2.2,
    parts: [
      { shape: 'sphere', size: [0.42], pos: [0, 0, 0], color: 0xf5c518, scale: [0.9, 0.9, 1.2] },
      { shape: 'cyl', size: [0.4, 0.4, 0.12], pos: [0, 0, -0.1], rot: [Math.PI / 2, 0, 0], color: 0x222222 },
      { shape: 'cone', size: [0.1, 0.35], pos: [0, 0, -0.62], rot: [-Math.PI / 2, 0, 0], color: 0x222222 },
      { shape: 'box', size: [0.7, 0.03, 0.35], pos: [0.45, 0.3, 0], rot: [0, 0, 0.4], color: 0xe8f6ff },
      { shape: 'box', size: [0.7, 0.03, 0.35], pos: [-0.45, 0.3, 0], rot: [0, 0, -0.4], color: 0xe8f6ff },
      ...eyes(0.1, 0.4, 0.15, 0.1),
    ],
  }),
  boomshroom: def('exploder', {
    name: 'Boom Shroom', blastRadius: 3.2,
    parts: [
      { shape: 'cyl', size: [0.2, 0.26, 0.6], pos: [0, 0.3, 0], color: 0xf1e7d0 },
      { shape: 'sphere', size: [0.55], pos: [0, 0.75, 0], scale: [1, 0.65, 1], color: 0xd8342c },
      { shape: 'sphere', size: [0.1], pos: [0.25, 0.98, 0.15], color: 0xffffff },
      { shape: 'sphere', size: [0.08], pos: [-0.2, 1.0, -0.1], color: 0xffffff },
      { shape: 'sphere', size: [0.09], pos: [0, 1.03, 0.3], color: 0xffffff },
      ...eyes(0.4, 0.2, 0.1, 0.06),
    ],
  }),

  // ───────────── Stage 2 · Scorched Dunes ─────────────
  scarab: def('runner', {
    name: 'Scarab',
    parts: [
      { shape: 'sphere', size: [0.45], pos: [0, 0.35, 0], scale: [0.9, 0.6, 1.2], color: 0x1f5f6a },
      { shape: 'sphere', size: [0.22], pos: [0, 0.35, 0.5], color: 0x123c44 },
      { shape: 'box', size: [1.0, 0.05, 0.06], pos: [0, 0.15, 0.15], color: 0x111111 },
      { shape: 'box', size: [1.0, 0.05, 0.06], pos: [0, 0.15, -0.15], color: 0x111111 },
      { shape: 'cone', size: [0.06, 0.3], pos: [0, 0.45, 0.72], rot: [1.2, 0, 0], color: 0xd9b24a },
      ...glowEyes(0.42, 0.66, 0.1, 0.05, 0xffe07a),
    ],
  }),
  mummy: def('chaser', {
    name: 'Mummy', hp: 16,
    parts: [
      { shape: 'box', size: [0.6, 0.9, 0.4], pos: [0, 0.95, 0], color: 0xe8dcc0 },
      { shape: 'box', size: [0.45, 0.45, 0.45], pos: [0, 1.65, 0], color: 0xefe4ca },
      { shape: 'box', size: [0.47, 0.06, 0.47], pos: [0, 1.6, 0], color: 0xc9b98f },
      { shape: 'box', size: [0.62, 0.06, 0.42], pos: [0, 1.1, 0], color: 0xc9b98f },
      { shape: 'box', size: [0.18, 0.18, 0.7], pos: [-0.25, 1.2, 0.35], color: 0xe0d2b0 },
      { shape: 'box', size: [0.18, 0.18, 0.7], pos: [0.25, 1.2, 0.35], color: 0xe0d2b0 },
      { shape: 'box', size: [0.2, 0.5, 0.2], pos: [-0.15, 0.25, 0], color: 0xd8caa4 },
      { shape: 'box', size: [0.2, 0.5, 0.2], pos: [0.15, 0.25, 0], color: 0xd8caa4 },
      ...glowEyes(1.7, 0.23, 0.1, 0.05, 0x55ffdd),
    ],
  }),
  cactusgunner: def('ranged', {
    name: 'Cactus Gunner', range: 18, fireCd: 2.2, projSpeed: 13, projColor: 0xffd84a, burst: 3,
    parts: [
      { shape: 'cyl', size: [0.35, 0.4, 1.5], pos: [0, 0.75, 0], color: 0x3e9a4a },
      { shape: 'sphere', size: [0.35], pos: [0, 1.5, 0], color: 0x3e9a4a },
      { shape: 'cyl', size: [0.14, 0.14, 0.6], pos: [0.5, 1.0, 0], rot: [0, 0, 1.2], color: 0x4aa856 },
      { shape: 'cyl', size: [0.14, 0.14, 0.5], pos: [0.7, 1.35, 0], color: 0x4aa856 },
      { shape: 'cyl', size: [0.14, 0.14, 0.6], pos: [-0.5, 0.8, 0], rot: [0, 0, -1.2], color: 0x4aa856 },
      { shape: 'cyl', size: [0.7, 0.7, 0.08], pos: [0, 1.85, 0], color: 0xc9772e },
      { shape: 'cone', size: [0.3, 0.4], pos: [0, 2.05, 0], color: 0xd68a3c },
      ...eyes(1.4, 0.32, 0.13, 0.07),
    ],
  }),
  scorpion: def('charger', {
    name: 'Dune Scorpion',
    parts: [
      { shape: 'sphere', size: [0.6], pos: [0, 0.45, 0], scale: [1, 0.5, 1.3], color: 0xc8612c },
      { shape: 'sphere', size: [0.25], pos: [0, 0.7, -0.75], color: 0xb4552a },
      { shape: 'sphere', size: [0.22], pos: [0, 1.05, -0.8], color: 0xb4552a },
      { shape: 'sphere', size: [0.2], pos: [0, 1.35, -0.6], color: 0xb4552a },
      { shape: 'cone', size: [0.1, 0.4], pos: [0, 1.4, -0.3], rot: [1.9, 0, 0], color: 0x2a1a10 },
      { shape: 'box', size: [0.25, 0.15, 0.45], pos: [-0.5, 0.45, 0.8], color: 0xd9733a },
      { shape: 'box', size: [0.25, 0.15, 0.45], pos: [0.5, 0.45, 0.8], color: 0xd9733a },
      { shape: 'box', size: [1.6, 0.06, 0.08], pos: [0, 0.2, 0], color: 0x5a2a12 },
      ...glowEyes(0.62, 0.6, 0.12, 0.05, 0x111111),
    ],
  }),
  vulture: def('flier', {
    name: 'Vulture', hover: 3,
    parts: [
      { shape: 'sphere', size: [0.45], pos: [0, 0, 0], scale: [0.9, 0.8, 1.3], color: 0x5a3c26 },
      { shape: 'sphere', size: [0.22], pos: [0, 0.2, 0.6], color: 0xe59aa0 },
      { shape: 'cone', size: [0.08, 0.25], pos: [0, 0.15, 0.85], rot: [1.57, 0, 0], color: 0xe8c040 },
      { shape: 'box', size: [1.2, 0.05, 0.5], pos: [0.75, 0.1, 0], rot: [0, 0, 0.25], color: 0x3e2a1a },
      { shape: 'box', size: [1.2, 0.05, 0.5], pos: [-0.75, 0.1, 0], rot: [0, 0, -0.25], color: 0x3e2a1a },
      { shape: 'torus', size: [0.22, 0.07], pos: [0, 0.08, 0.38], rot: [0, 0, 0], color: 0xf2efe6 },
    ],
  }),
  sandgolem: def('tank', {
    name: 'Sand Colossus', hp: 80,
    parts: [
      { shape: 'dodeca', size: [0.95], pos: [0, 1.3, 0], color: 0xd6b56b },
      { shape: 'dodeca', size: [0.5], pos: [0, 2.35, 0.1], color: 0xcaa75d },
      { shape: 'dodeca', size: [0.45], pos: [-1.1, 1.2, 0.2], color: 0xbf9b52 },
      { shape: 'dodeca', size: [0.45], pos: [1.1, 1.2, 0.2], color: 0xbf9b52 },
      { shape: 'dodeca', size: [0.4], pos: [-0.45, 0.35, 0], color: 0xb89450 },
      { shape: 'dodeca', size: [0.4], pos: [0.45, 0.35, 0], color: 0xb89450 },
      ...glowEyes(2.4, 0.45, 0.16, 0.08, 0x44ccff),
    ],
  }),

  // ───────────── Stage 3 · Hollow Graveyard ─────────────
  zombie: def('chaser', {
    name: 'Zombie', hp: 18, speed: 3.2,
    parts: [
      { shape: 'box', size: [0.6, 0.7, 0.35], pos: [0, 1.05, 0], color: 0x3a5a8a },
      { shape: 'box', size: [0.45, 0.45, 0.45], pos: [0, 1.65, 0.05], color: 0x7fae6a },
      { shape: 'box', size: [0.16, 0.16, 0.7], pos: [-0.3, 1.25, 0.35], color: 0x7fae6a },
      { shape: 'box', size: [0.16, 0.16, 0.7], pos: [0.3, 1.25, 0.35], color: 0x7fae6a },
      { shape: 'box', size: [0.22, 0.7, 0.22], pos: [-0.15, 0.35, 0], color: 0x3b3326 },
      { shape: 'box', size: [0.22, 0.7, 0.22], pos: [0.15, 0.35, 0], color: 0x3b3326 },
      ...glowEyes(1.72, 0.28, 0.11, 0.05, 0xff2222),
    ],
  }),
  skeleton: def('runner', {
    name: 'Skeleton', hp: 9,
    parts: [
      { shape: 'box', size: [0.4, 0.5, 0.2], pos: [0, 1.0, 0], color: 0xeeeeee },
      { shape: 'box', size: [0.44, 0.06, 0.24], pos: [0, 0.9, 0], color: 0x999999 },
      { shape: 'sphere', size: [0.25], pos: [0, 1.5, 0], color: 0xf4f4f0 },
      { shape: 'box', size: [0.08, 0.7, 0.08], pos: [-0.12, 0.35, 0], color: 0xe0e0e0 },
      { shape: 'box', size: [0.08, 0.7, 0.08], pos: [0.12, 0.35, 0], color: 0xe0e0e0 },
      { shape: 'box', size: [0.08, 0.6, 0.08], pos: [-0.3, 1.0, 0.1], rot: [0.5, 0, 0], color: 0xe0e0e0 },
      { shape: 'box', size: [0.08, 0.6, 0.08], pos: [0.3, 1.0, 0.1], rot: [0.5, 0, 0], color: 0xe0e0e0 },
      ...glowEyes(1.52, 0.2, 0.09, 0.05, 0x33aaff),
    ],
  }),
  ghost: def('teleporter', {
    name: 'Wailing Ghost', hover: 1.2, flying: true, blinkCd: 4.5,
    material: { transparent: true, opacity: 0.75 },
    parts: [
      { shape: 'cone', size: [0.55, 1.3], pos: [0, 0.2, 0], rot: [Math.PI, 0, 0], color: 0xcfe8ff },
      { shape: 'sphere', size: [0.48], pos: [0, 0.75, 0], color: 0xe6f3ff },
      ...glowEyes(0.82, 0.4, 0.15, 0.08, 0x2244ff),
      { shape: 'sphere', size: [0.1], pos: [0, 0.6, 0.44], color: 0x111133 },
    ],
  }),
  bonearcher: def('ranged', {
    name: 'Bone Archer', range: 20, fireCd: 2.4, projSpeed: 17, projColor: 0xdddddd,
    parts: [
      { shape: 'box', size: [0.4, 0.5, 0.2], pos: [0, 1.0, 0], color: 0xdcd6c6 },
      { shape: 'sphere', size: [0.25], pos: [0, 1.5, 0], color: 0xe8e4d8 },
      { shape: 'cone', size: [0.3, 0.35], pos: [0, 1.78, 0], color: 0x4a2c5a },
      { shape: 'box', size: [0.08, 0.7, 0.08], pos: [-0.12, 0.35, 0], color: 0xd0cabb },
      { shape: 'box', size: [0.08, 0.7, 0.08], pos: [0.12, 0.35, 0], color: 0xd0cabb },
      { shape: 'torus', size: [0.4, 0.04], pos: [0.3, 1.1, 0.3], rot: [0, Math.PI / 2, 0], color: 0x6b4423 },
      ...glowEyes(1.52, 0.2, 0.09, 0.05, 0xaa55ff),
    ],
  }),
  gravebloat: def('splitter', {
    name: 'Grave Bloat', splitInto: 'grub', splitCount: 3,
    parts: [
      { shape: 'sphere', size: [0.8], pos: [0, 0.85, 0], color: 0x7a5a8c, scale: [1, 0.95, 1] },
      { shape: 'sphere', size: [0.25], pos: [0.45, 1.2, 0.5], color: 0x9ac24a },
      { shape: 'sphere', size: [0.18], pos: [-0.5, 0.7, 0.55], color: 0x9ac24a },
      { shape: 'torus', size: [0.25, 0.08], pos: [0, 0.75, 0.75], color: 0x3a1f40 },
      ...glowEyes(1.15, 0.7, 0.2, 0.08, 0xffff55),
    ],
  }),
  grub: def('runner', {
    name: 'Grave Grub', hp: 5, radius: 0.35, xp: 0,
    parts: [
      { shape: 'sphere', size: [0.3], pos: [0, 0.25, 0], scale: [0.8, 0.7, 1.4], color: 0xd8cfa8 },
      { shape: 'sphere', size: [0.18], pos: [0, 0.3, 0.38], color: 0xc8bc90 },
      ...glowEyes(0.35, 0.5, 0.07, 0.04, 0x111111),
    ],
  }),
  deathknight: def('tank', {
    name: 'Armored Revenant', hp: 90,
    parts: [
      { shape: 'box', size: [1.0, 1.1, 0.7], pos: [0, 1.4, 0], color: 0x6d7580 },
      { shape: 'box', size: [0.6, 0.6, 0.6], pos: [0, 2.3, 0], color: 0x59616b },
      { shape: 'box', size: [0.62, 0.1, 0.1], pos: [0, 2.35, 0.3], color: 0x111111 },
      { shape: 'cone', size: [0.12, 0.5], pos: [0, 2.8, 0], color: 0xaa2233 },
      { shape: 'box', size: [0.35, 0.35, 0.35], pos: [-0.7, 1.8, 0], color: 0x7a838f },
      { shape: 'box', size: [0.35, 0.35, 0.35], pos: [0.7, 1.8, 0], color: 0x7a838f },
      { shape: 'box', size: [0.1, 1.8, 0.1], pos: [0.8, 1.2, 0.4], color: 0xc0c8d0 },
      { shape: 'box', size: [0.8, 1.0, 0.1], pos: [-0.8, 1.3, 0.3], color: 0x3a2a55 },
      { shape: 'box', size: [0.35, 0.9, 0.35], pos: [-0.25, 0.45, 0], color: 0x4a5058 },
      { shape: 'box', size: [0.35, 0.9, 0.35], pos: [0.25, 0.45, 0], color: 0x4a5058 },
    ],
  }),

  // ───────────── Stage 4 · Frostbite Tundra ─────────────
  snowimp: def('runner', {
    name: 'Snow Imp', hp: 9,
    parts: [
      { shape: 'sphere', size: [0.38], pos: [0, 0.55, 0], color: 0xf4fbff },
      { shape: 'cone', size: [0.08, 0.3], pos: [-0.2, 0.95, 0], rot: [0, 0, 0.3], color: 0x9fd8ff },
      { shape: 'cone', size: [0.08, 0.3], pos: [0.2, 0.95, 0], rot: [0, 0, -0.3], color: 0x9fd8ff },
      { shape: 'cone', size: [0.07, 0.2], pos: [0, 0.5, 0.42], rot: [1.57, 0, 0], color: 0xff8a3a },
      { shape: 'box', size: [0.1, 0.3, 0.1], pos: [-0.14, 0.12, 0], color: 0xbfe6ff },
      { shape: 'box', size: [0.1, 0.3, 0.1], pos: [0.14, 0.12, 0], color: 0xbfe6ff },
      ...eyes(0.65, 0.3, 0.12, 0.07),
    ],
  }),
  frostwolf: def('charger', {
    name: 'Frost Wolf',
    parts: [
      { shape: 'box', size: [0.6, 0.55, 1.3], pos: [0, 0.85, 0], color: 0x9aa9b8 },
      { shape: 'box', size: [0.45, 0.45, 0.55], pos: [0, 1.15, 0.8], color: 0xaebccb },
      { shape: 'box', size: [0.25, 0.22, 0.35], pos: [0, 1.05, 1.15], color: 0xd9e3ec },
      { shape: 'cone', size: [0.1, 0.25], pos: [-0.14, 1.48, 0.75], color: 0x7d8c9b },
      { shape: 'cone', size: [0.1, 0.25], pos: [0.14, 1.48, 0.75], color: 0x7d8c9b },
      { shape: 'box', size: [0.15, 0.6, 0.15], pos: [-0.2, 0.3, 0.45], color: 0x7d8c9b },
      { shape: 'box', size: [0.15, 0.6, 0.15], pos: [0.2, 0.3, 0.45], color: 0x7d8c9b },
      { shape: 'box', size: [0.15, 0.6, 0.15], pos: [-0.2, 0.3, -0.45], color: 0x7d8c9b },
      { shape: 'box', size: [0.15, 0.6, 0.15], pos: [0.2, 0.3, -0.45], color: 0x7d8c9b },
      { shape: 'cone', size: [0.12, 0.6], pos: [0, 1.0, -0.85], rot: [-1.0, 0, 0], color: 0xd9e3ec },
      ...glowEyes(1.25, 1.08, 0.12, 0.05, 0x55e0ff),
    ],
  }),
  yeti: def('chaser', {
    name: 'Yeti Brute', hp: 22, radius: 0.7,
    parts: [
      { shape: 'sphere', size: [0.7], pos: [0, 1.1, 0], color: 0xf2f6fa, scale: [1, 1.1, 0.9] },
      { shape: 'sphere', size: [0.35], pos: [0, 1.9, 0.1], color: 0xe8eef4 },
      { shape: 'box', size: [0.4, 0.25, 0.1], pos: [0, 1.85, 0.38], color: 0x6a8aa0 },
      { shape: 'box', size: [0.28, 1.0, 0.28], pos: [-0.75, 1.0, 0.1], color: 0xe8eef4 },
      { shape: 'box', size: [0.28, 1.0, 0.28], pos: [0.75, 1.0, 0.1], color: 0xe8eef4 },
      { shape: 'box', size: [0.3, 0.5, 0.3], pos: [-0.3, 0.25, 0], color: 0xd6e0ea },
      { shape: 'box', size: [0.3, 0.5, 0.3], pos: [0.3, 0.25, 0], color: 0xd6e0ea },
      ...eyes(1.95, 0.4, 0.1, 0.06),
    ],
  }),
  icewisp: def('flier', {
    name: 'Ice Wisp', hover: 2.6, shoots: true, range: 15, fireCd: 3, projSpeed: 10, projColor: 0x9fe8ff,
    material: { emissive: 0x2a6f90 },
    parts: [
      { shape: 'oct', size: [0.45], pos: [0, 0, 0], color: 0xbff0ff, scale: [1, 1.6, 1] },
      { shape: 'oct', size: [0.2], pos: [0.5, 0.2, 0], color: 0x7fd8ff },
      { shape: 'oct', size: [0.2], pos: [-0.5, -0.2, 0], color: 0x7fd8ff },
      ...glowEyes(0.15, 0.32, 0.1, 0.05, 0x0033aa),
    ],
  }),
  snowball: def('splitter', {
    name: 'Rolling Snowball', splitInto: 'snowlet', splitCount: 3, speed: 3.6,
    parts: [
      { shape: 'ico', size: [0.85], detail: 1, pos: [0, 0.85, 0], color: 0xf7fbff },
      { shape: 'box', size: [0.12, 0.12, 0.12], pos: [0.3, 1.05, 0.75], color: 0x223344 },
      { shape: 'box', size: [0.12, 0.12, 0.12], pos: [-0.3, 1.05, 0.75], color: 0x223344 },
      { shape: 'cone', size: [0.1, 0.4], pos: [0, 0.85, 0.95], rot: [1.57, 0, 0], color: 0xff8a3a },
    ],
  }),
  snowlet: def('runner', {
    name: 'Snowlet', hp: 6, radius: 0.4, xp: 0,
    parts: [
      { shape: 'ico', size: [0.4], detail: 1, pos: [0, 0.4, 0], color: 0xf7fbff },
      ...eyes(0.5, 0.32, 0.1, 0.06),
    ],
  }),
  icegolem: def('tank', {
    name: 'Glacial Golem', hp: 95,
    material: { emissive: 0x0d2a3a },
    parts: [
      { shape: 'box', size: [1.3, 1.4, 1.0], pos: [0, 1.4, 0], color: 0x8fd4f0 },
      { shape: 'oct', size: [0.45], pos: [0, 2.45, 0], color: 0xb6ecff },
      { shape: 'oct', size: [0.5], pos: [-0.5, 2.2, -0.2], color: 0x6fc2ea, scale: [0.7, 1.6, 0.7] },
      { shape: 'oct', size: [0.5], pos: [0.55, 2.3, -0.3], color: 0x6fc2ea, scale: [0.7, 1.9, 0.7] },
      { shape: 'box', size: [0.5, 1.3, 0.5], pos: [-0.95, 1.1, 0.1], color: 0x7cc6e6 },
      { shape: 'box', size: [0.5, 1.3, 0.5], pos: [0.95, 1.1, 0.1], color: 0x7cc6e6 },
      { shape: 'box', size: [0.45, 0.7, 0.45], pos: [-0.35, 0.35, 0], color: 0x6ab4d6 },
      { shape: 'box', size: [0.45, 0.7, 0.45], pos: [0.35, 0.35, 0], color: 0x6ab4d6 },
      ...glowEyes(2.5, 0.35, 0.14, 0.07, 0xffffff),
    ],
  }),

  // ───────────── Stage 5 · Molten Caldera ─────────────
  magmaslime: def('splitter', {
    name: 'Magma Slime', splitInto: 'emberblob', splitCount: 2,
    material: { emissive: 0x551a00 },
    parts: [
      { shape: 'sphere', size: [0.8], pos: [0, 0.65, 0], scale: [1, 0.8, 1], color: 0xff6a1a, seg: 9 },
      { shape: 'sphere', size: [0.3], pos: [0.3, 1.1, -0.2], color: 0xffc23a },
      { shape: 'sphere', size: [0.2], pos: [-0.35, 1.0, 0.2], color: 0x3a1a0a },
      ...eyes(0.9, 0.62, 0.2, 0.1),
    ],
  }),
  emberblob: def('runner', {
    name: 'Ember Blob', hp: 7, radius: 0.4, xp: 0,
    material: { emissive: 0x551a00 },
    parts: [
      { shape: 'sphere', size: [0.38], pos: [0, 0.32, 0], scale: [1, 0.8, 1], color: 0xff8a2a },
      ...eyes(0.42, 0.3, 0.1, 0.06),
    ],
  }),
  fireimp: def('teleporter', {
    name: 'Fire Imp', shoots: true, range: 16, fireCd: 2.5, projSpeed: 12, projColor: 0xff7a1a, blinkCd: 4,
    parts: [
      { shape: 'sphere', size: [0.4], pos: [0, 0.8, 0], color: 0xc3261a },
      { shape: 'cone', size: [0.08, 0.35], pos: [-0.22, 1.2, 0], rot: [0, 0, 0.4], color: 0x2a0a05 },
      { shape: 'cone', size: [0.08, 0.35], pos: [0.22, 1.2, 0], rot: [0, 0, -0.4], color: 0x2a0a05 },
      { shape: 'box', size: [0.6, 0.04, 0.3], pos: [0.45, 0.9, -0.2], rot: [0, 0.3, 0.5], color: 0x7a1a10 },
      { shape: 'box', size: [0.6, 0.04, 0.3], pos: [-0.45, 0.9, -0.2], rot: [0, -0.3, -0.5], color: 0x7a1a10 },
      { shape: 'cone', size: [0.06, 0.5], pos: [0, 0.5, -0.4], rot: [-1.2, 0, 0], color: 0x2a0a05 },
      ...glowEyes(0.9, 0.34, 0.13, 0.06, 0xffee33),
    ],
  }),
  lavahound: def('charger', {
    name: 'Lava Hound', speed: 3.6,
    material: { emissive: 0x401000 },
    parts: [
      { shape: 'box', size: [0.65, 0.6, 1.3], pos: [0, 0.85, 0], color: 0x2a2320 },
      { shape: 'box', size: [0.5, 0.45, 0.6], pos: [0, 1.15, 0.8], color: 0x332a26 },
      { shape: 'box', size: [0.66, 0.08, 1.1], pos: [0, 1.17, 0], color: 0xff6a10 },
      { shape: 'cone', size: [0.08, 0.3], pos: [-0.15, 1.5, 0.75], color: 0xff8a2a },
      { shape: 'cone', size: [0.08, 0.3], pos: [0.15, 1.5, 0.75], color: 0xff8a2a },
      { shape: 'box', size: [0.16, 0.6, 0.16], pos: [-0.22, 0.3, 0.45], color: 0x1a1512 },
      { shape: 'box', size: [0.16, 0.6, 0.16], pos: [0.22, 0.3, 0.45], color: 0x1a1512 },
      { shape: 'box', size: [0.16, 0.6, 0.16], pos: [-0.22, 0.3, -0.45], color: 0x1a1512 },
      { shape: 'box', size: [0.16, 0.6, 0.16], pos: [0.22, 0.3, -0.45], color: 0x1a1512 },
      ...glowEyes(1.25, 1.1, 0.13, 0.06, 0xffdd33),
    ],
  }),
  obsidianbrute: def('tank', {
    name: 'Obsidian Brute', hp: 110,
    material: { emissive: 0x220800 },
    parts: [
      { shape: 'dodeca', size: [1.0], pos: [0, 1.4, 0], color: 0x2b2533 },
      { shape: 'box', size: [0.2, 1.4, 0.05], pos: [0.2, 1.4, 0.9], rot: [0, 0, 0.4], color: 0xff5a10 },
      { shape: 'box', size: [0.2, 1.0, 0.05], pos: [-0.3, 1.2, 0.92], rot: [0, 0, -0.5], color: 0xff5a10 },
      { shape: 'dodeca', size: [0.5], pos: [0, 2.5, 0.1], color: 0x3a3244 },
      { shape: 'dodeca', size: [0.55], pos: [-1.2, 1.3, 0.2], color: 0x241f2b },
      { shape: 'dodeca', size: [0.55], pos: [1.2, 1.3, 0.2], color: 0x241f2b },
      { shape: 'box', size: [0.5, 0.7, 0.5], pos: [-0.4, 0.35, 0], color: 0x1d1922 },
      { shape: 'box', size: [0.5, 0.7, 0.5], pos: [0.4, 0.35, 0], color: 0x1d1922 },
      ...glowEyes(2.55, 0.48, 0.18, 0.08, 0xffaa22),
    ],
  }),
  emberbat: def('flier', {
    name: 'Ember Bat', hover: 2.4, speed: 5.4,
    parts: [
      { shape: 'sphere', size: [0.32], pos: [0, 0, 0], color: 0x3a1a1a },
      { shape: 'box', size: [0.9, 0.04, 0.45], pos: [0.55, 0.05, 0], rot: [0, 0, 0.3], color: 0xff5a1a },
      { shape: 'box', size: [0.9, 0.04, 0.45], pos: [-0.55, 0.05, 0], rot: [0, 0, -0.3], color: 0xff5a1a },
      { shape: 'cone', size: [0.07, 0.2], pos: [-0.12, 0.32, 0], color: 0x3a1a1a },
      { shape: 'cone', size: [0.07, 0.2], pos: [0.12, 0.32, 0], color: 0x3a1a1a },
      ...glowEyes(0.08, 0.28, 0.1, 0.05, 0xffee33),
    ],
  }),
  cinderbomber: def('exploder', {
    name: 'Cinder Bomber', blastRadius: 3.8, hp: 12,
    material: { emissive: 0x401000 },
    parts: [
      { shape: 'sphere', size: [0.6], pos: [0, 0.7, 0], color: 0x2a2a2a, seg: 9 },
      { shape: 'cyl', size: [0.12, 0.12, 0.3], pos: [0, 1.35, 0], color: 0x6a5a4a },
      { shape: 'sphere', size: [0.12], pos: [0, 1.55, 0], color: 0xffd23a },
      { shape: 'box', size: [0.12, 0.35, 0.12], pos: [-0.25, 0.15, 0], color: 0x1a1a1a },
      { shape: 'box', size: [0.12, 0.35, 0.12], pos: [0.25, 0.15, 0], color: 0x1a1a1a },
      ...glowEyes(0.85, 0.52, 0.18, 0.08, 0xff4411),
    ],
  }),
};

for (const [id, e] of Object.entries(ENEMIES)) e.id = id;
