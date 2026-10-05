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

  // ───────────── Crystal Caverns (patch 1.1) ─────────────
  crystalcrawler: def('chaser', {
    name: 'Crystal Crawler', added: '1.1.0',
    material: { emissive: 0x1a0a30 },
    parts: [
      { shape: 'sphere', size: [0.5], pos: [0, 0.45, 0], scale: [1, 0.7, 1.2], color: 0x5a4a8a },
      { shape: 'oct', size: [0.25], pos: [0, 0.9, -0.1], scale: [0.6, 1.6, 0.6], color: 0xb58aff },
      { shape: 'oct', size: [0.2], pos: [0.25, 0.85, -0.3], scale: [0.6, 1.4, 0.6], rot: [0, 0, -0.4], color: 0x8ad8ff },
      { shape: 'oct', size: [0.2], pos: [-0.25, 0.85, -0.3], scale: [0.6, 1.4, 0.6], rot: [0, 0, 0.4], color: 0xff8ae0 },
      { shape: 'box', size: [1.1, 0.06, 0.08], pos: [0, 0.2, 0.15], color: 0x2a2244 },
      { shape: 'box', size: [1.1, 0.06, 0.08], pos: [0, 0.2, -0.2], color: 0x2a2244 },
      ...glowEyes(0.55, 0.55, 0.14, 0.06, 0x6affd8),
    ],
  }),
  gembeetle: def('charger', {
    name: 'Gem Beetle', added: '1.1.0', speed: 3.4,
    material: { emissive: 0x100820 },
    parts: [
      { shape: 'sphere', size: [0.6], pos: [0, 0.5, 0], scale: [1, 0.6, 1.3], color: 0x2a6a8a },
      { shape: 'oct', size: [0.45], pos: [0, 0.85, -0.1], scale: [1.4, 0.5, 1.6], color: 0x6ad8ff },
      { shape: 'cone', size: [0.12, 0.7, 5], seg: 5, pos: [0, 0.6, 0.95], rot: [1.3, 0, 0], color: 0xd8f6ff },
      { shape: 'box', size: [1.4, 0.06, 0.1], pos: [0, 0.2, 0.3], color: 0x1a2a3a },
      { shape: 'box', size: [1.4, 0.06, 0.1], pos: [0, 0.2, -0.3], color: 0x1a2a3a },
      ...glowEyes(0.6, 0.72, 0.18, 0.06, 0xffffff),
    ],
  }),
  prismwisp: def('flier', {
    name: 'Prism Wisp', added: '1.1.0', hover: 2.8, shoots: true, range: 16, fireCd: 2.6, projSpeed: 11, projColor: 0xff8ae0,
    material: { emissive: 0x3a1a5a },
    parts: [
      { shape: 'tetra', size: [0.55], pos: [0, 0, 0], color: 0xe0c8ff },
      { shape: 'tetra', size: [0.55], pos: [0, 0, 0], rot: [Math.PI, 0, 0], color: 0xb58aff },
      { shape: 'torus', size: [0.6, 0.04], pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: 0x8ad8ff },
      ...glowEyes(0.1, 0.35, 0.1, 0.05, 0x1a0a30),
    ],
  }),
  shardling: def('splitter', {
    name: 'Shardling', added: '1.1.0', splitInto: 'shardlet', splitCount: 4,
    material: { emissive: 0x200a30 },
    parts: [
      { shape: 'ico', size: [0.8], pos: [0, 0.85, 0], color: 0x8a5ac8 },
      { shape: 'oct', size: [0.35], pos: [0.5, 1.3, 0], scale: [0.6, 1.5, 0.6], rot: [0, 0, -0.6], color: 0xff8ae0 },
      { shape: 'oct', size: [0.35], pos: [-0.5, 1.3, 0], scale: [0.6, 1.5, 0.6], rot: [0, 0, 0.6], color: 0x8ad8ff },
      { shape: 'oct', size: [0.35], pos: [0, 1.6, -0.2], scale: [0.6, 1.5, 0.6], color: 0xb58aff },
      ...glowEyes(1.0, 0.72, 0.22, 0.09, 0xffffff),
    ],
  }),
  shardlet: def('runner', {
    name: 'Shardlet', added: '1.1.0', hp: 5, radius: 0.35, xp: 0,
    material: { emissive: 0x200a30 },
    parts: [
      { shape: 'oct', size: [0.35], pos: [0, 0.4, 0], scale: [0.8, 1.3, 0.8], color: 0xc89aff },
      ...glowEyes(0.45, 0.25, 0.08, 0.04, 0xffffff),
    ],
  }),
  mirrormage: def('teleporter', {
    name: 'Mirror Mage', added: '1.1.0', shoots: true, range: 17, fireCd: 2.4, projSpeed: 13, projColor: 0x8ad8ff, blinkCd: 3.5, burst: 3,
    parts: [
      { shape: 'cone', size: [0.55, 1.5, 6], seg: 6, pos: [0, 0.75, 0], color: 0x3a2a6a },
      { shape: 'sphere', size: [0.3], pos: [0, 1.7, 0], color: 0xd8d0f0 },
      { shape: 'cone', size: [0.35, 0.7, 6], seg: 6, pos: [0, 2.2, 0], color: 0x3a2a6a },
      { shape: 'box', size: [0.5, 0.7, 0.05], pos: [0.55, 1.2, 0.2], color: 0xc8f0ff },
      { shape: 'box', size: [0.56, 0.76, 0.03], pos: [0.55, 1.2, 0.18], color: 0x8a6ad8 },
      ...glowEyes(1.72, 0.26, 0.1, 0.05, 0x6affd8),
    ],
  }),
  geodegolem: def('tank', {
    name: 'Geode Golem', added: '1.1.0', hp: 100,
    material: { emissive: 0x100820 },
    parts: [
      { shape: 'dodeca', size: [1.1], pos: [0, 1.4, 0], color: 0x4a4460 },
      { shape: 'oct', size: [0.5], pos: [0, 1.5, 0.95], scale: [1, 1.4, 0.5], color: 0xc46bff },
      { shape: 'oct', size: [0.35], pos: [0.5, 1.9, 0.75], scale: [0.7, 1.3, 0.5], color: 0x6ad8ff },
      { shape: 'oct', size: [0.35], pos: [-0.5, 1.1, 0.8], scale: [0.7, 1.3, 0.5], color: 0xff8ae0 },
      { shape: 'dodeca', size: [0.5], pos: [0, 2.6, 0.1], color: 0x5a5474 },
      { shape: 'dodeca', size: [0.6], pos: [-1.3, 1.3, 0.2], color: 0x3e3854 },
      { shape: 'dodeca', size: [0.6], pos: [1.3, 1.3, 0.2], color: 0x3e3854 },
      { shape: 'box', size: [0.5, 0.7, 0.5], pos: [-0.45, 0.35, 0], color: 0x2e2a40 },
      { shape: 'box', size: [0.5, 0.7, 0.5], pos: [0.45, 0.35, 0], color: 0x2e2a40 },
      ...glowEyes(2.65, 0.5, 0.18, 0.08, 0xb58aff),
    ],
  }),
};

for (const [id, e] of Object.entries(ENEMIES)) e.id = id;

// ───────────── Realm variants (patch 1.2) ─────────────
// `like(base, colors, extra)` reuses a body plan with a new palette and stats:
// colors maps old hex -> new hex; any colour not listed is shifted by `tint` if given.
function like(baseId, colors, extra) {
  const base = ENEMIES[baseId];
  const tint = extra.tint;
  const parts = base.parts.map((p) => {
    let c = p.color ?? 0xffffff;
    if (colors[c] !== undefined) c = colors[c];
    else if (tint) c = mixHex(c, tint, 0.55);
    return { ...p, color: c };
  });
  const out = { ...base, ...extra, parts, added: '1.2.0' };
  delete out.tint;
  return out;
}

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

Object.assign(ENEMIES, {
  // Mushroom Grove
  sporeling: like('sproutling', { 0x6cc24a: 0x9a6ac8, 0x3d8a2a: 0xf2e6d0, 0x86d95a: 0xff7ad0 }, { name: 'Sporeling' }),
  fungalimp: like('goblin', { 0x8fbf3f: 0xc89aff, 0x7a5230: 0x4a3a6a }, { name: 'Fungal Imp' }),
  puffcap: like('boomshroom', { 0xd8342c: 0x3ab8d8, 0xffffff: 0xd8f6ff }, { name: 'Puffcap', blastRadius: 3.6 }),
  myconid: like('thornspitter', { 0xd6456a: 0xb87ae0, 0x2f7a2a: 0xe8dcc8, 0x49a33a: 0x8a6ac8 }, { name: 'Myconid Shaman', projColor: 0xd89aff, burst: 2 }),
  glowmoth: like('buzzbee', { 0xf5c518: 0x6affd8, 0x222222: 0x2a4a5a, 0xe8f6ff: 0xd8b0ff }, { name: 'Glow Moth', material: { emissive: 0x0a3a3a } }),
  shroombrute: like('mossgolem', { 0x4f8f3a: 0xd8342c }, { name: 'Shroom Brute', tint: 0x8a6a9a, hp: 85 }),
  // Sunken Oasis
  reefcrab: like('scorpion', { 0xc8612c: 0xe8503a, 0xb4552a: 0xd84a32, 0xd9733a: 0xff7a4a }, { name: 'Reef Crab', speed: 3.4 }),
  bogfrog: like('snowimp', { 0xf4fbff: 0x5ab84a, 0x9fd8ff: 0x3a8a3a, 0xbfe6ff: 0x4a9a3a, 0xff8a3a: 0xd84a6a }, { name: 'Bog Frog', speed: 6.4 }),
  nagaarcher: like('bonearcher', { 0xdcd6c6: 0x3ab8a8, 0xe8e4d8: 0x4ac8b8, 0xd0cabb: 0x2a9a8a, 0x4a2c5a: 0xd8a83a }, { name: 'Naga Archer', projColor: 0x6ad8ff }),
  gull: like('vulture', { 0x5a3c26: 0xf2f2f2, 0x3e2a1a: 0xd8dce0, 0xe59aa0: 0xffffff }, { name: 'Storm Gull', speed: 5.6 }),
  puffer: like('cinderbomber', { 0x2a2a2a: 0xf2c84a, 0x1a1a1a: 0xd8a83a }, { name: 'Pufferfish', material: {}, blastRadius: 3.4 }),
  coralgolem: like('sandgolem', { 0xd6b56b: 0xff8a9a, 0xcaa75d: 0xff7a8a, 0xbf9b52: 0xe86a7a, 0xb89450: 0xd85a6a }, { name: 'Coral Golem' }),
  // Sky Isles
  harpy: like('vulture', { 0x5a3c26: 0x5a7ad8, 0x3e2a1a: 0x3a5ab8, 0xe59aa0: 0xf2c49a }, { name: 'Harpy', speed: 5.2 }),
  cloudsprite: like('ghost', { 0xcfe8ff: 0xffffff, 0xe6f3ff: 0xf2f8ff }, { name: 'Cloud Sprite', shoots: true, range: 14, fireCd: 3, projSpeed: 10, projColor: 0xbfe8ff }),
  skyram: like('frostwolf', { 0x9aa9b8: 0xf2ead8, 0xaebccb: 0xe8dcc8, 0xd9e3ec: 0xffffff, 0x7d8c9b: 0x8a6a4a }, { name: 'Sky Ram' }),
  windarcher: like('bonearcher', { 0xdcd6c6: 0xe8f0ff, 0xe8e4d8: 0xf2c49a, 0xd0cabb: 0x8ab0e8, 0x4a2c5a: 0x3a6ad8 }, { name: 'Wind Archer', projColor: 0xffffff, projSpeed: 20 }),
  stormcloud: like('snowball', { 0xf7fbff: 0x8a94a8 }, { name: 'Storm Cloud', splitInto: 'cloudlet', flying: true, hover: 1.5, material: { emissive: 0x101830 } }),
  cloudlet: like('snowlet', { 0xf7fbff: 0xb8c4d8 }, { name: 'Cloudlet' }),
  stonesentinel: like('icegolem', {}, { name: 'Stone Sentinel', tint: 0x8a8478, material: { emissive: 0x101010 } }),
  // Clockwork Foundry
  cogcrawler: like('crystalcrawler', {}, { name: 'Cog Crawler', tint: 0xb8862a, material: { emissive: 0x1a1000 } }),
  sparkdrone: like('icewisp', { 0xbff0ff: 0xffb84a, 0x7fd8ff: 0xff8a2a }, { name: 'Spark Drone', projColor: 0xffd84a, material: { emissive: 0x4a2a00 } }),
  gearhound: like('lavahound', { 0xff6a10: 0xd8a83a, 0xff8a2a: 0xe8c04a }, { name: 'Gear Hound', tint: 0x6a6a72 }),
  boilerbot: like('cinderbomber', { 0x2a2a2a: 0x8a6a4a, 0x6a5a4a: 0xb8862a }, { name: 'Boiler Bot' }),
  rivetgunner: like('cactusgunner', { 0x3e9a4a: 0x7a7e88, 0x4aa856: 0x9a9ea8, 0xc9772e: 0xb8862a, 0xd68a3c: 0xd8a83a }, { name: 'Rivet Gunner', projColor: 0xffaa3a }),
  juggernaut: like('obsidianbrute', { 0xff5a10: 0x6ad8ff }, { name: 'Iron Juggernaut', tint: 0x7a808a, material: { emissive: 0x001a2a } }),
});
for (const [id, e] of Object.entries(ENEMIES)) e.id = id;
