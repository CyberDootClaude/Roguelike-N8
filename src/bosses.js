// Stage bosses. Each boss has a unique model and a set of telegraphed attack patterns.
import * as THREE from 'three';
import { buildMesh, glowEyes } from './models.js';
import { clamp, rand, TAU } from './util.js';
import { PLAY_HALF } from './world.js';

// A timed action: events fire at their `at` time, `tick` runs every frame.
function action(dur, events = [], tick = null) {
  return { t: 0, dur, events: events.map((e) => ({ ...e, done: false })), tick };
}
const ev = (at, fn) => ({ at, fn });

const ATTACK_NAMES = {
  roots: 'Root Eruption', seeds: 'Seed Barrage', slam: 'Ground Slam', saplings: 'Call of the Grove', thornring: 'Thorn Ring',
  spiral: 'Sun Spiral', curse: 'Curse Beams', sandport: 'Sandstorm Step', mummies: 'Raise the Servants', sunfall: 'Sunfall',
  skulls: 'Homing Skulls', hands: 'Grave Hands', soulnova: 'Soul Nova', raise: 'Raise Dead', deathstar: 'Death Star',
  charge: 'Glacial Charge', shards: 'Ice Shards', hail: 'Hailstorm', stomp: 'Tremor Stomp', pack: 'Howl of the Pack',
  breath: 'Inferno Breath', meteors: 'Meteor Rain', dive: 'Dive Bomb', inferno: 'Inferno Rings', brood: 'Brood Summons',
  prismbeams: 'Prism Beams', shardnova: 'Shard Nova', cage: 'Crystal Cage', shatter: 'Shatter Swarm', mirror: 'Mirror Step',
};

// ─────────────────────────── models ───────────────────────────
function part(parts, opts) { return buildMesh(parts, opts); }

function treantModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'cyl', size: [1.3, 1.8, 5, 9], seg: 9, pos: [0, 3.2, 0], color: 0x6b4a2a },
    { shape: 'cyl', size: [0.5, 0.9, 2.2, 6], seg: 6, pos: [-1.3, 0.9, 0.3], rot: [0.3, 0, 0.6], color: 0x5a3c22 },
    { shape: 'cyl', size: [0.5, 0.9, 2.2, 6], seg: 6, pos: [1.3, 0.9, 0.3], rot: [0.3, 0, -0.6], color: 0x5a3c22 },
    { shape: 'cyl', size: [0.5, 0.9, 2.2, 6], seg: 6, pos: [0, 0.9, -1.3], rot: [-0.6, 0, 0], color: 0x5a3c22 },
    { shape: 'ico', size: [3.0], detail: 1, pos: [0, 7.2, 0], color: 0x3f8a34 },
    { shape: 'ico', size: [1.8], pos: [2.1, 6.5, 0.6], color: 0x4f9a3e },
    { shape: 'ico', size: [1.8], pos: [-2.0, 6.8, -0.5], color: 0x35802c },
    { shape: 'ico', size: [1.4], pos: [0.4, 9.0, -0.4], color: 0x5aa846 },
    { shape: 'box', size: [1.6, 0.3, 0.3], pos: [0, 3.2, 1.45], color: 0x2a1a0e },
    { shape: 'sphere', size: [0.2], pos: [1.0, 8.0, 1.8], color: 0xff5a5a },
    { shape: 'sphere', size: [0.2], pos: [-1.3, 7.4, 2.2], color: 0xff5a5a },
    ...glowEyes(4.3, 1.45, 0.55, 0.28, 0xffe45a),
  ]);
  g.add(body);
  const mkArm = (side) => {
    const arm = new THREE.Group();
    arm.add(part([
      { shape: 'cyl', size: [0.35, 0.5, 3.4, 6], seg: 6, pos: [0, -1.7, 0], color: 0x6b4a2a },
      { shape: 'ico', size: [0.9], pos: [0, -3.5, 0], color: 0x5a3c22 },
      { shape: 'cone', size: [0.2, 1.0, 5], seg: 5, pos: [side * 0.4, -3.9, 0.5], rot: [2.5, 0, 0], color: 0x3a2a18 },
    ]));
    arm.position.set(side * 1.7, 5.0, 0);
    arm.rotation.z = side * 0.5;
    g.add(arm);
    return arm;
  };
  g.userData = { armL: mkArm(-1), armR: mkArm(1), body };
  return g;
}

function pharaohModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'cone', size: [1.6, 4.2, 8], seg: 8, pos: [0, 2.1, 0], rot: [0, 0, 0], color: 0xf2ead0 },
    { shape: 'cyl', size: [1.25, 1.35, 0.4, 8], seg: 8, pos: [0, 2.2, 0], color: 0xd8a830 },
    { shape: 'box', size: [1.6, 1.7, 1.0], pos: [0, 4.3, 0], color: 0x2a6ab0 },
    { shape: 'box', size: [1.9, 0.5, 1.1], pos: [0, 5.1, 0], color: 0xd8a830 },
    { shape: 'box', size: [0.9, 1.0, 0.9], pos: [0, 5.9, 0], color: 0x3a2a1a },
    { shape: 'box', size: [0.8, 0.3, 0.2], pos: [0, 5.95, 0.46], color: 0xd8a830 },
    // nemes headdress
    { shape: 'box', size: [1.5, 1.4, 1.1], pos: [0, 6.1, -0.2], color: 0x2a6ab0 },
    { shape: 'box', size: [1.55, 0.2, 1.15], pos: [0, 6.6, -0.2], color: 0xf2c84a },
    { shape: 'box', size: [1.55, 0.2, 1.15], pos: [0, 6.1, -0.2], color: 0xf2c84a },
    { shape: 'box', size: [0.45, 1.6, 0.3], pos: [-0.75, 5.1, 0.2], color: 0x2a6ab0 },
    { shape: 'box', size: [0.45, 1.6, 0.3], pos: [0.75, 5.1, 0.2], color: 0x2a6ab0 },
    { shape: 'cone', size: [0.2, 0.5, 5], seg: 5, pos: [0, 7.0, 0.3], color: 0xf2c84a },
    { shape: 'box', size: [0.2, 0.8, 0.2], pos: [0, 5.4, 0.5], color: 0x2a6ab0 },
    ...glowEyes(6.0, 0.46, 0.2, 0.1, 0x6affff),
  ]);
  g.add(body);
  const staff = part([
    { shape: 'cyl', size: [0.1, 0.1, 6, 6], seg: 6, pos: [0, 0, 0], color: 0xd8a830 },
    { shape: 'torus', size: [0.45, 0.12], pos: [0, 3.4, 0], color: 0xf2c84a },
    { shape: 'sphere', size: [0.3], pos: [0, 3.4, 0], color: 0xff5a3a },
  ], { emissive: 0x442200 });
  staff.position.set(1.4, 4, 0.5);
  g.add(staff);
  const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), new THREE.MeshBasicMaterial({ color: 0xffd23a }));
  sun.position.set(0, 8.5, 0);
  g.add(sun);
  g.userData = { body, staff, sun };
  return g;
}

function lichModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'cone', size: [1.8, 5, 9], seg: 9, pos: [0, 2.2, 0], color: 0x2a1a3a },
    { shape: 'cone', size: [1.5, 4.6, 9], seg: 9, pos: [0, 2.6, 0.1], color: 0x3a2450 },
    { shape: 'box', size: [2.6, 0.7, 1.2], pos: [0, 4.6, 0], color: 0x2a1a3a },
    { shape: 'sphere', size: [0.75], pos: [0, 5.5, 0.1], color: 0xe8e4d4 },
    { shape: 'box', size: [0.6, 0.35, 0.5], pos: [0, 5.05, 0.35], color: 0xd8d2c0 },
    { shape: 'cyl', size: [0.75, 0.7, 0.35, 8], seg: 8, pos: [0, 6.2, 0.05], color: 0xd8b040 },
    { shape: 'cone', size: [0.14, 0.6, 4], seg: 4, pos: [0, 6.6, 0.6], color: 0xd8b040 },
    { shape: 'cone', size: [0.14, 0.6, 4], seg: 4, pos: [0.55, 6.6, 0.3], color: 0xd8b040 },
    { shape: 'cone', size: [0.14, 0.6, 4], seg: 4, pos: [-0.55, 6.6, 0.3], color: 0xd8b040 },
    { shape: 'cone', size: [0.14, 0.6, 4], seg: 4, pos: [0.4, 6.6, -0.45], color: 0xd8b040 },
    { shape: 'cone', size: [0.14, 0.6, 4], seg: 4, pos: [-0.4, 6.6, -0.45], color: 0xd8b040 },
    { shape: 'box', size: [0.3, 1.8, 0.3], pos: [-1.3, 3.9, 0.4], rot: [0.5, 0, 0.2], color: 0xe8e4d4 },
    ...glowEyes(5.6, 0.72, 0.26, 0.13, 0x5affb0),
  ]);
  g.add(body);
  const staff = part([
    { shape: 'cyl', size: [0.1, 0.12, 6.5, 6], seg: 6, pos: [0, 0, 0], color: 0x3a2a2a },
    { shape: 'sphere', size: [0.25], pos: [-0.2, 3.3, 0], color: 0xe8e4d4 },
  ]);
  staff.position.set(1.6, 3.5, 0.6);
  g.add(staff);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshBasicMaterial({ color: 0x5affb0 }));
  orb.position.set(1.6, 7.4, 0.6);
  g.add(orb);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 4, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9a5aff }));
  halo.position.y = 0.4;
  g.add(halo);
  g.userData = { body, staff, orb, halo };
  return g;
}

function glaciorModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'box', size: [3.8, 3.4, 2.6], pos: [0, 4.2, 0], color: 0x8fd4f0 },
    { shape: 'box', size: [3.0, 1.0, 2.4], pos: [0, 2.3, 0], color: 0x6ab4d6 },
    { shape: 'box', size: [1.6, 1.4, 1.5], pos: [0, 6.4, 0.3], color: 0xa6e2f7 },
    { shape: 'box', size: [1.4, 0.3, 0.2], pos: [0, 6.3, 1.06], color: 0x1a3a5a },
    { shape: 'oct', size: [0.9], pos: [-1.4, 6.6, -0.4], scale: [0.6, 2.2, 0.6], color: 0xd8f6ff },
    { shape: 'oct', size: [0.9], pos: [1.4, 6.8, -0.4], scale: [0.6, 2.5, 0.6], color: 0xd8f6ff },
    { shape: 'oct', size: [0.8], pos: [0, 7.4, -0.9], scale: [0.6, 2.4, 0.6], color: 0xbfeeff },
    { shape: 'oct', size: [0.6], pos: [-1.9, 5.8, 0.5], scale: [0.6, 1.8, 0.6], rot: [0, 0, 0.7], color: 0xbfeeff },
    { shape: 'oct', size: [0.6], pos: [1.9, 5.8, 0.5], scale: [0.6, 1.8, 0.6], rot: [0, 0, -0.7], color: 0xbfeeff },
    { shape: 'box', size: [1.1, 2.0, 1.1], pos: [-1.0, 1.0, 0], color: 0x5aa2c6 },
    { shape: 'box', size: [1.1, 2.0, 1.1], pos: [1.0, 1.0, 0], color: 0x5aa2c6 },
    ...glowEyes(6.5, 1.0, 0.35, 0.16, 0xffffff),
  ], { emissive: 0x0a2a3a });
  g.add(body);
  const mkArm = (side) => {
    const arm = new THREE.Group();
    arm.add(part([
      { shape: 'box', size: [1.1, 3.4, 1.1], pos: [0, -1.7, 0], color: 0x7cc6e6 },
      { shape: 'dodeca', size: [1.2], pos: [0, -3.6, 0], color: 0xa6e2f7 },
    ], { emissive: 0x0a2a3a }));
    arm.position.set(side * 2.5, 5.4, 0);
    g.add(arm);
    return arm;
  };
  g.userData = { body, armL: mkArm(-1), armR: mkArm(1) };
  return g;
}

function dragonModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'sphere', size: [1.8], pos: [0, 0, 0], scale: [1, 0.9, 1.6], color: 0x8a1a10, seg: 10 },
    { shape: 'sphere', size: [1.3], pos: [0, -0.4, 0.3], scale: [0.9, 0.7, 1.4], color: 0xe8a040 },
    { shape: 'cyl', size: [0.55, 0.8, 2.6, 7], seg: 7, pos: [0, 1.2, 2.6], rot: [1.0, 0, 0], color: 0x8a1a10 },
    { shape: 'box', size: [1.3, 1.0, 1.9], pos: [0, 2.2, 3.8], color: 0x9a2214 },
    { shape: 'box', size: [1.0, 0.45, 1.2], pos: [0, 1.85, 4.9], color: 0x7a160c },
    { shape: 'cone', size: [0.16, 1.2, 5], seg: 5, pos: [-0.45, 3.0, 3.3], rot: [-0.8, 0, 0], color: 0x2a1a10 },
    { shape: 'cone', size: [0.16, 1.2, 5], seg: 5, pos: [0.45, 3.0, 3.3], rot: [-0.8, 0, 0], color: 0x2a1a10 },
    { shape: 'cyl', size: [0.3, 0.9, 4.5, 6], seg: 6, pos: [0, -0.2, -3.4], rot: [-1.35, 0, 0], color: 0x8a1a10 },
    { shape: 'cone', size: [0.5, 1.0, 4], seg: 4, pos: [0, 0.3, -5.8], rot: [-1.57, 0, 0], color: 0x2a1a10 },
    { shape: 'cone', size: [0.2, 0.9, 4], seg: 4, pos: [0, 1.6, 0.8], color: 0x2a1a10 },
    { shape: 'cone', size: [0.2, 0.9, 4], seg: 4, pos: [0, 1.6, -0.4], color: 0x2a1a10 },
    { shape: 'cone', size: [0.2, 0.9, 4], seg: 4, pos: [0, 1.4, -1.6], color: 0x2a1a10 },
    { shape: 'box', size: [0.45, 1.6, 0.45], pos: [-1.0, -1.6, 0.8], color: 0x6a140c },
    { shape: 'box', size: [0.45, 1.6, 0.45], pos: [1.0, -1.6, 0.8], color: 0x6a140c },
    { shape: 'box', size: [0.45, 1.6, 0.45], pos: [-1.0, -1.6, -1.0], color: 0x6a140c },
    { shape: 'box', size: [0.45, 1.6, 0.45], pos: [1.0, -1.6, -1.0], color: 0x6a140c },
    ...glowEyes(2.4, 4.7, 0.42, 0.14, 0xffee33),
  ], { emissive: 0x2a0500 });
  g.add(body);
  const mkWing = (side) => {
    const w = new THREE.Group();
    w.add(part([
      { shape: 'box', size: [5.5, 0.12, 3.2], pos: [side * 2.9, 0, -0.3], color: 0x5a0e08 },
      { shape: 'box', size: [5.8, 0.3, 0.3], pos: [side * 2.9, 0.1, 1.2], color: 0x3a0a05 },
      { shape: 'box', size: [3.0, 0.1, 2.0], pos: [side * 4.5, 0, -1.8], rot: [0, side * 0.4, 0], color: 0xff5a1a },
    ], { emissive: 0x2a0500 }));
    w.position.set(side * 1.2, 1.0, 0.6);
    g.add(w);
    return w;
  };
  g.userData = { body, wingL: mkWing(-1), wingR: mkWing(1) };
  return g;
}

// ─────────────────────────── boss defs ───────────────────────────
function crystalQueenModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'oct', size: [1.6], pos: [0, 2.6, 0], scale: [0.9, 2.1, 0.9], color: 0x7a4ac8 },
    { shape: 'oct', size: [1.2], pos: [0, 2.3, 0.15], scale: [0.8, 1.7, 0.6], color: 0xb58aff },
    { shape: 'sphere', size: [0.55], pos: [0, 5.4, 0.1], color: 0xe8e0ff },
    { shape: 'oct', size: [0.3], pos: [0, 6.3, 0], scale: [0.6, 1.8, 0.6], color: 0x8ad8ff },
    { shape: 'oct', size: [0.25], pos: [0.45, 6.1, 0], scale: [0.6, 1.6, 0.6], rot: [0, 0, -0.4], color: 0xff8ae0 },
    { shape: 'oct', size: [0.25], pos: [-0.45, 6.1, 0], scale: [0.6, 1.6, 0.6], rot: [0, 0, 0.4], color: 0xff8ae0 },
    { shape: 'box', size: [0.25, 1.8, 0.25], pos: [-1.3, 3.8, 0.2], rot: [0, 0, 0.6], color: 0x9a6ae0 },
    { shape: 'box', size: [0.25, 1.8, 0.25], pos: [1.3, 3.8, 0.2], rot: [0, 0, -0.6], color: 0x9a6ae0 },
    { shape: 'oct', size: [0.4], pos: [-1.9, 4.6, 0.3], color: 0x6affd8 },
    { shape: 'oct', size: [0.4], pos: [1.9, 4.6, 0.3], color: 0x6affd8 },
    ...glowEyes(5.45, 0.5, 0.18, 0.09, 0x3a0a6a),
  ], { emissive: 0x2a0a4a });
  g.add(body);
  const ring = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const shard = part([{ shape: 'oct', size: [0.45], scale: [0.6, 1.8, 0.6], color: i % 2 ? 0x8ad8ff : 0xff8ae0 }], { emissive: 0x2a1040 });
    shard.position.set(Math.sin(a) * 3, 3, Math.cos(a) * 3);
    ring.add(shard);
  }
  g.add(ring);
  g.userData = { body, halo: ring };
  return g;
}

export const BOSSES = {
  treant: {
    name: 'Gnarlroot, the Elder Treant', title: 'Guardian of the Verdant Woods', color: '#7fdc5a',
    model: treantModel, radius: 2.4, height: 10, speed: 3.2, hover: 0, hp: 3500,
    attacks: ['roots', 'seeds', 'slam', 'saplings', 'thornring'],
  },
  pharaoh: {
    name: 'Sekh-Amun, the Sun King', title: 'Tyrant of the Scorched Dunes', color: '#ffd23a',
    model: pharaohModel, radius: 1.8, height: 8, speed: 3.8, hover: 1.2, hp: 4000,
    attacks: ['spiral', 'curse', 'sandport', 'mummies', 'sunfall'],
  },
  lich: {
    name: 'Morthos, the Lich King', title: 'Lord of the Hollow Graveyard', color: '#5affb0',
    model: lichModel, radius: 1.8, height: 8, speed: 3.4, hover: 0.8, hp: 4400,
    attacks: ['skulls', 'hands', 'soulnova', 'raise', 'deathstar'],
  },
  glacior: {
    name: 'Glacior, the Frost Colossus', title: 'Heart of the Frostbite Tundra', color: '#9fe8ff',
    model: glaciorModel, radius: 2.8, height: 9, speed: 3.0, hover: 0, hp: 4800,
    attacks: ['charge', 'shards', 'hail', 'stomp', 'pack'],
  },
  ignar: {
    name: 'Ignar, the Infernal Wyrm', title: 'Sovereign of the Molten Caldera', color: '#ff7a2a',
    model: dragonModel, radius: 2.8, height: 6, speed: 4.2, hover: 4.5, hp: 5200,
    attacks: ['breath', 'meteors', 'dive', 'inferno', 'brood'],
  },
  prismatrix: {
    name: 'Prismatrix, the Crystal Queen', title: 'Heart of the Crystal Caverns', color: '#c89aff', added: '1.1.0',
    model: crystalQueenModel, radius: 2.0, height: 7, speed: 3.6, hover: 1.4, hp: 4400,
    attacks: ['prismbeams', 'shardnova', 'cage', 'shatter', 'mirror'],
  },
};

export class Boss {
  constructor(game, id, x, z) {
    this.game = game;
    this.id = id;
    const def = BOSSES[id];
    this.def = def;
    const sc = game.enemies.scaling();
    const hp = game.mods.bossHp * def.hp * game.stage.bossMult * Math.pow(4, game.run.loop) * (1 + game.player.stats.curse * 0.4);
    this.dmg = sc.dmg;
    this.group = def.model();
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.group.scale.setScalar(0.01);
    game.scene.add(this.group);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(def.radius * 1.3, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    game.scene.add(this.shadow);
    // enemy-compatible handle so weapons can target the boss
    this.e = {
      boss: true, alive: true, x, z, y: game.world.groundAt(x, z), hp, maxHp: hp,
      radius: def.radius, height: def.height, def: { name: def.name }, hitFlash: 0,
      kx: 0, kz: 0, slowT: 0, freezeT: 0, poisonT: 0, poisonDps: 0, poisonAcc: 0, elite: false,
      invuln: true, onDeath: () => this.die(),
    };
    game.enemies.list.push(this.e);
    this.spawnT = 0;
    this.cur = null;
    this.cooldown = 2.5;
    this.phase = 1;
    this.lastAttack = null;
    this.contactCd = 0;
    this.ry = 0;
    this.t = 0;
    this.hoverOffset = 0;
    this.airborne = false;
    this.dead = false;
    game.audio.play('boss');
  }

  get x() { return this.e.x; }
  get z() { return this.e.z; }

  update(dt) {
    if (this.dead) return;
    if (this.dying) { this.updateDying(dt); return; }
    const g = this.game, p = g.player, e = this.e, def = this.def;
    this.t += dt;
    // intro: grow out of the ground
    if (this.spawnT < 1.5) {
      this.spawnT += dt;
      const k = Math.min(1, this.spawnT / 1.5);
      this.group.scale.setScalar(k);
      if (k >= 1) e.invuln = false;
      this.syncMesh(dt);
      return;
    }
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.poisonT > 0) {
      e.poisonT -= dt;
      const d = e.poisonDps * dt;
      e.hp -= d; e.poisonAcc += d;
      if (e.poisonAcc > e.maxHp * 0.01) { g.fx.text(e.x, e.y + def.height, e.z, String(Math.round(e.poisonAcc)), '#8aff5a', 0.9); e.poisonAcc = 0; }
      if (e.hp <= 0) { g.enemies.kill(e); return; }
    }
    if (this.phase === 1 && e.hp < e.maxHp * 0.5) {
      this.phase = 2;
      g.hitStop(0.15);
      g.ui.toast(`${def.name.split(',')[0]} is enraged!`, def.color);
      g.fx.ring(e.x, e.y, e.z, 1, 14, 0xff3030, 0.8);
      g.audio.play('boss');
    }

    const dx = p.x - e.x, dz = p.z - e.z;
    const dist = Math.hypot(dx, dz) || 0.01;
    // movement while not busy
    let move = !this.cur || this.cur.mobile;
    if (move && !this.airborne) {
      const want = def.hover > 0 ? 9 : 4;
      const spd = def.speed * (this.phase === 2 ? 1.25 : 1) * (e.slowT > 0 ? 0.8 : 1);
      if (dist > want) {
        e.x += (dx / dist) * spd * dt;
        e.z += (dz / dist) * spd * dt;
      } else if (def.hover > 0) {
        e.x += (-dz / dist) * spd * 0.6 * dt;
        e.z += (dx / dist) * spd * 0.6 * dt;
      }
    }
    e.slowT -= dt;
    e.x = clamp(e.x, -PLAY_HALF + 3, PLAY_HALF - 3);
    e.z = clamp(e.z, -PLAY_HALF + 3, PLAY_HALF - 3);
    if (!this.cur || !this.cur.lockFacing) {
      const target = Math.atan2(dx, dz);
      let d = target - this.ry;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.ry += d * Math.min(1, dt * 4);
    }

    // attacks
    if (this.cur) {
      const a = this.cur;
      a.t += dt;
      for (const evn of a.events) if (!evn.done && a.t >= evn.at) { evn.done = true; evn.fn(); }
      a.tick?.(dt, a.t);
      if (a.t >= a.dur) { this.cur = null; this.cooldown = this.phase === 2 ? 0.8 : 1.4; }
    } else {
      this.cooldown -= dt;
      if (this.cooldown <= 0) this.startAttack();
    }

    // solid body: shove the player out
    if (!this.airborne && dist < def.radius + p.radius && p.y - e.y < def.height * 0.7) {
      const push = def.radius + p.radius;
      p.x = e.x - (dx / dist) * -push;
      p.z = e.z - (dz / dist) * -push;
    }
    // contact damage
    this.contactCd -= dt;
    const pyRel = p.y - e.y;
    if (dist < def.radius + 0.6 && this.contactCd <= 0 && pyRel < def.height && pyRel > -2 && !this.airborne) {
      p.hurt(22 * this.dmg, { source: def.name });
      this.contactCd = 0.8;
    }
    this.syncMesh(dt);
  }

  syncMesh(dt) {
    const e = this.e, def = this.def, g = this.game;
    const ground = g.world.groundAt(e.x, e.z);
    e.y = ground + (def.hover ? def.hover + Math.sin(this.t * 1.6) * 0.4 : 0) + this.hoverOffset;
    this.group.position.set(e.x, e.y + (this.id === 'ignar' ? 2 : 0), e.z);
    this.group.rotation.y = this.ry;
    this.shadow.position.set(e.x, ground + 0.1, e.z);
    const ud = this.group.userData;
    const t = this.t;
    if (ud.armL) {
      if (!this.cur || !this.cur.armPose) {
        ud.armL.rotation.x = Math.sin(t * 2) * 0.3;
        ud.armR.rotation.x = -Math.sin(t * 2) * 0.3;
      }
    }
    if (ud.wingL) {
      const f = Math.sin(t * (this.airborne ? 9 : 5)) * 0.5;
      ud.wingL.rotation.z = f; ud.wingR.rotation.z = -f;
    }
    if (ud.sun) { ud.sun.rotation.y += dt * 2; ud.sun.scale.setScalar(1 + Math.sin(t * 4) * 0.15); }
    if (ud.halo) ud.halo.rotation.y += dt;
    if (ud.orb) ud.orb.scale.setScalar(1 + Math.sin(t * 5) * 0.15);
    if (ud.body) ud.body.position.y = Math.sin(t * 2) * 0.1;
    // hit flash via emissive on body
    const m = ud.body?.material;
    if (m && m.emissive) {
      if (!m.userData.baseEm) m.userData.baseEm = m.emissive.clone();
      if (e.hitFlash > 0) m.emissive.setRGB(0.6, 0.6, 0.6);
      else m.emissive.copy(m.userData.baseEm);
    }
  }

  startAttack() {
    const list = this.def.attacks.filter((a, i) => (i < 4 || this.phase === 2) && a !== this.lastAttack);
    const name = list[Math.floor(Math.random() * list.length)];
    this.lastAttack = name;
    this.cur = this.makeAttack(name);
    this.castName = ATTACK_NAMES[name] || '';
    this.castT = 1.6;
  }

  // helpers
  aimAngle() { const p = this.game.player; return Math.atan2(p.x - this.e.x, p.z - this.e.z); }
  mouthY() { return this.e.y + this.def.height * 0.6; }

  makeAttack(name) {
    const g = this.game, H = g.hazards, p = g.player, e = this.e;
    const D = this.dmg;
    const P2 = this.phase === 2;
    const ud = this.group.userData;
    switch (name) {
      // ── Treant ──
      case 'roots': {
        const n = P2 ? 10 : 7;
        const evs = [];
        for (let i = 0; i < n; i++) evs.push(ev(0.3 + i * 0.28, () => {
          const lead = 0.5;
          H.circle(p.x + p.vx * lead, p.z + p.vz * lead, 2.6, 0.85, 18 * D, 0x6adc3a, { fxColor: 0x6a4a2a, source: 'Root Eruption' });
        }));
        return action(0.6 + n * 0.28 + 0.9, evs);
      }
      case 'seeds': {
        const evs = [];
        for (let i = 0; i < 3; i++) evs.push(ev(0.4 + i * 0.5, () => {
          H.fan(e.x, this.mouthY(), e.z, this.aimAngle(), P2 ? 9 : 7, 1.1, 13, 12 * D, 0x9cff4a, { source: 'Seed Barrage' });
          g.audio.play('shoot');
        }));
        return action(2.2, evs);
      }
      case 'slam': {
        const a = action(2.4, [
          ev(1.0, () => {
            H.shockwave(e.x, e.z, 13, 32, 20 * D, 0xc89a4a);
            g.fx.explosion(e.x, e.y + 0.5, e.z, 5, 0xa07a4a);
            g.ui.shake(0.5);
            if (Math.hypot(p.x - e.x, p.z - e.z) < 5.5) p.hurt(25 * D, { source: 'Ground Slam' });
          }),
          ...(P2 ? [ev(1.6, () => H.shockwave(e.x, e.z, 16, 32, 20 * D, 0xc89a4a))] : []),
        ], (dt, t) => {
          const k = t < 0.9 ? -t * 2.4 : Math.min(0, -2.16 + (t - 0.9) * 20);
          ud.armL.rotation.x = k; ud.armR.rotation.x = k;
        });
        a.armPose = true;
        H.circle(e.x, e.z, 5.5, 1.0, 0, 0xffaa30, { silent: true });
        return a;
      }
      case 'saplings': {
        return action(1.5, [ev(0.6, () => {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            g.enemies.spawn(i % 4 === 0 ? 'boomshroom' : 'sproutling', e.x + Math.sin(a) * 5, e.z + Math.cos(a) * 5, { force: true });
          }
          g.fx.ring(e.x, e.y, e.z, 1, 7, 0x6adc3a, 0.5);
        })]);
      }
      case 'thornring': {
        return action(2.0, [0, 0.45, 0.9].map((at, i) => ev(at + 0.3, () => {
          H.radial(e.x, e.y + 2, e.z, 26, 10, 12 * D, 0x9cff4a, i * 0.12, { source: 'Thorn Ring' });
          g.audio.play('shoot');
        })));
      }
      // ── Pharaoh ──
      case 'spiral': {
        let acc = 0, ang = Math.random() * TAU;
        const a = action(3.2, [], (dt) => {
          acc += dt;
          while (acc > 0.11) {
            acc -= 0.11;
            ang += 0.23;
            H.radial(e.x, this.mouthY(), e.z, P2 ? 5 : 4, 9, 11 * D, 0xffd23a, ang, { source: 'Sun Spiral' });
          }
        });
        a.mobile = false;
        return a;
      }
      case 'curse': {
        const n = P2 ? 6 : 4;
        const base = this.aimAngle();
        const evs = [ev(0.1, () => {
          for (let i = 0; i < n; i++) H.line(e.x, e.z, base + (i / n) * TAU, 45, 2.6, 1.1, 20 * D, 0x40c0ff, { source: 'Curse Beam', fxColor: 0x80e0ff });
        })];
        if (P2) evs.push(ev(1.0, () => {
          for (let i = 0; i < n; i++) H.line(e.x, e.z, base + ((i + 0.5) / n) * TAU, 45, 2.6, 1.1, 20 * D, 0x40c0ff, { source: 'Curse Beam', fxColor: 0x80e0ff });
        }));
        const a = action(P2 ? 2.6 : 1.8, evs);
        a.mobile = false; a.lockFacing = true;
        return a;
      }
      case 'sandport': {
        return action(1.8, [
          ev(0.2, () => { g.fx.burst(e.x, e.y + 3, e.z, 0xe8c070, 30, 8); this.group.visible = false; e.untargetable = true; }),
          ev(0.8, () => {
            const a = Math.random() * TAU;
            e.x = clamp(p.x + Math.sin(a) * 7, -PLAY_HALF + 3, PLAY_HALF - 3);
            e.z = clamp(p.z + Math.cos(a) * 7, -PLAY_HALF + 3, PLAY_HALF - 3);
            this.group.visible = true; e.untargetable = false;
            g.fx.burst(e.x, e.y + 3, e.z, 0xe8c070, 30, 8);
          }),
          ev(1.2, () => { H.radial(e.x, this.mouthY(), e.z, P2 ? 24 : 16, 11, 12 * D, 0xffb030, 0, { source: 'Sandburst' }); g.audio.play('explode'); }),
        ]);
      }
      case 'mummies': {
        return action(1.4, [ev(0.5, () => {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            g.enemies.spawn(i % 2 ? 'mummy' : 'scarab', p.x + Math.sin(a) * 12, p.z + Math.cos(a) * 12, { force: true });
          }
          g.ui.toast('The Sun King calls his servants!', '#ffd23a');
        })]);
      }
      case 'sunfall': {
        const evs = [];
        const n = P2 ? 18 : 12;
        for (let i = 0; i < n; i++) evs.push(ev(0.1 + i * 0.1, () => {
          const a = Math.random() * TAU, d = i < 3 ? 0 : rand(2, 14);
          H.circle(p.x + Math.sin(a) * d, p.z + Math.cos(a) * d, 3, 1.2, 18 * D, 0xffd23a, { fxColor: 0xffe070, source: 'Sunfall' });
        }));
        return action(0.2 + n * 0.1 + 1.3, evs);
      }
      // ── Lich ──
      case 'skulls': {
        const n = P2 ? 8 : 6;
        return action(1.6, [ev(0.5, () => {
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            H.bullet(e.x + Math.sin(a) * 2, this.mouthY(), e.z + Math.cos(a) * 2, Math.sin(a) * 7, 2, Math.cos(a) * 7, 16 * D, 0x9a5aff, { homing: 1.6, life: 7, size: 1.6, source: 'Homing Skull' });
          }
          g.audio.play('zap');
        })]);
      }
      case 'hands': {
        const evs = [];
        for (let i = 0; i < 6; i++) evs.push(ev(0.2 + i * 0.35, () => {
          H.circle(p.x, p.z, 2.4, 0.8, 18 * D, 0x5affb0, { fxColor: 0x3a8a6a, source: 'Grave Hands' });
          const a = Math.random() * TAU, d = rand(3, 10);
          H.circle(p.x + Math.sin(a) * d, p.z + Math.cos(a) * d, 2.4, 0.9, 18 * D, 0x5affb0, { fxColor: 0x3a8a6a, source: 'Grave Hands' });
        }));
        return action(3.2, evs);
      }
      case 'soulnova': {
        const a = action(2.2, [0, 0.5, 1.0, ...(P2 ? [1.5] : [])].map((at, i) => ev(at + 0.3, () => {
          H.radial(e.x, e.y + 2.5, e.z, 22, 9, 12 * D, 0x5affb0, i * 0.14, { source: 'Soul Nova' });
          g.audio.play('zap');
        })));
        a.mobile = false;
        return a;
      }
      case 'raise': {
        return action(1.6, [ev(0.6, () => {
          const kinds = ['skeleton', 'zombie', 'ghost', 'skeleton'];
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            const x = p.x + Math.sin(a) * 10, z = p.z + Math.cos(a) * 10;
            g.fx.burst(x, g.world.groundAt(x, z), z, 0x5affb0, 6, 3);
            g.enemies.spawn(kinds[i % 4], x, z, { force: true });
          }
          g.ui.toast('The dead rise!', '#5affb0');
        })]);
      }
      case 'deathstar': {
        const off = Math.random() * TAU;
        const a = action(2.6, [
          ev(0.1, () => { for (let i = 0; i < 8; i++) H.line(e.x, e.z, off + (i / 8) * TAU, 40, 2.2, 1.1, 22 * D, 0x9a5aff, { source: 'Death Ray' }); }),
          ev(1.3, () => { for (let i = 0; i < 8; i++) H.line(e.x, e.z, off + ((i + 0.5) / 8) * TAU, 40, 2.2, 1.1, 22 * D, 0x9a5aff, { source: 'Death Ray' }); }),
        ]);
        a.mobile = false; a.lockFacing = true;
        return a;
      }
      // ── Glacior ──
      case 'charge': {
        let dirX = 0, dirZ = 0, charging = false;
        const len = 30;
        const a = action(2.4, [
          ev(0.05, () => {
            const ang = this.aimAngle();
            dirX = Math.sin(ang); dirZ = Math.cos(ang);
            this.ry = ang;
            H.line(e.x, e.z, ang, len, 4.5, 1.0, 24 * D, 0x9fe8ff, { source: 'Glacial Charge', silent: true });
          }),
          ev(1.05, () => { charging = true; g.ui.shake(0.4); }),
          ev(1.75, () => { charging = false; H.shockwave(e.x, e.z, 12, 18, 16 * D, 0x9fe8ff); }),
        ], (dt) => {
          if (charging) { e.x += dirX * (len / 0.7) * dt; e.z += dirZ * (len / 0.7) * dt; if (Math.random() < 0.6) g.fx.burst(e.x, e.y + 0.5, e.z, 0xdff6ff, 3, 4); }
        });
        a.mobile = false; a.lockFacing = true;
        return a;
      }
      case 'shards': {
        return action(2.2, [0.3, 0.8, 1.3].map((at) => ev(at, () => {
          H.fan(e.x, this.mouthY(), e.z, this.aimAngle(), P2 ? 11 : 9, 1.2, 14, 13 * D, 0x9fe8ff, { source: 'Ice Shards' });
          g.audio.play('shoot');
        })));
      }
      case 'hail': {
        const evs = [];
        const n = P2 ? 18 : 13;
        for (let i = 0; i < n; i++) evs.push(ev(0.15 + i * 0.12, () => {
          const a = Math.random() * TAU, d = i < 3 ? rand(0, 1.5) : rand(3, 14);
          const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
          H.circle(x, z, 2.6, 1.3, 16 * D, 0x9fe8ff, { fxColor: 0xdff6ff, source: 'Hailstorm', onBoom: () => H.zone(x, z, 2.6, 4, 0, 0x9fe8ff, 0.5) });
        }));
        return action(0.3 + n * 0.12 + 1.5, evs);
      }
      case 'stomp': {
        const a = action(2.6, [
          ev(0.9, () => { H.shockwave(e.x, e.z, 12, 34, 20 * D, 0x9fe8ff); g.ui.shake(0.5); g.fx.explosion(e.x, e.y + 0.5, e.z, 5, 0xdff6ff); }),
          ev(1.5, () => H.shockwave(e.x, e.z, 15, 34, 20 * D, 0x9fe8ff)),
          ...(P2 ? [ev(2.1, () => H.shockwave(e.x, e.z, 18, 34, 20 * D, 0x9fe8ff))] : []),
        ], (dt, t) => {
          const k = t < 0.8 ? -t * 2.5 : Math.min(0, -2 + (t - 0.8) * 20);
          ud.armL.rotation.x = k; ud.armR.rotation.x = k;
        });
        a.armPose = true; a.mobile = false;
        return a;
      }
      case 'pack': {
        return action(1.4, [ev(0.5, () => {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            g.enemies.spawn(i % 2 ? 'frostwolf' : 'snowimp', p.x + Math.sin(a) * 13, p.z + Math.cos(a) * 13, { force: true });
          }
          g.ui.toast('Glacior howls for the pack!', '#9fe8ff');
        })]);
      }
      // ── Ignar ──
      case 'breath': {
        let acc = 0;
        const a = action(2.4, [], (dt, t) => {
          if (t < 0.5) return;
          acc += dt;
          while (acc > 0.05) {
            acc -= 0.05;
            const base = this.aimAngle();
            this.ry = base;
            const hx = e.x + Math.sin(base) * 4.5, hz = e.z + Math.cos(base) * 4.5;
            for (let k = 0; k < 2; k++) {
              const ang = base + rand(-0.35, 0.35);
              const hy = e.y + 3;
              const tgY = p.y + 1;
              const dist = Math.hypot(p.x - hx, p.z - hz) || 1;
              H.bullet(hx, hy, hz, Math.sin(ang) * 16, (tgY - hy) / (dist / 16), Math.cos(ang) * 16, 10 * D, 0xff6a1a, { source: 'Fire Breath', life: 3 });
            }
          }
        });
        a.mobile = false; a.lockFacing = true;
        return a;
      }
      case 'meteors': {
        const evs = [];
        const n = P2 ? 22 : 15;
        for (let i = 0; i < n; i++) evs.push(ev(0.2 + i * 0.1, () => {
          const a = Math.random() * TAU, d = i < 3 ? rand(0, 1.5) : rand(3, 16);
          const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
          H.circle(x, z, 3, 1.3, 20 * D, 0xff5a1a, { fxColor: 0xff8a2a, source: 'Meteor', onBoom: () => H.zone(x, z, 2.2, 3.5, 12 * D, 0xff5a1a) });
        }));
        return action(0.4 + n * 0.1 + 1.5, evs);
      }
      case 'dive': {
        let tx = 0, tz = 0;
        const a = action(3.0, [
          ev(0.0, () => { this.airborne = true; e.untargetable = true; }),
          ev(0.9, () => {
            tx = p.x; tz = p.z;
            H.circle(tx, tz, 6.5, 1.1, 30 * D, 0xff3a1a, { fxColor: 0xff8a2a, source: 'Dive Bomb' });
          }),
          ev(2.0, () => {
            e.x = tx; e.z = tz;
            this.hoverOffset = 0; this.airborne = false; e.untargetable = false;
            H.shockwave(tx, tz, 14, 26, 18 * D, 0xff6a1a);
            g.ui.shake(0.6);
          }),
        ], (dt, t) => {
          if (t < 0.9) this.hoverOffset = t * 18;
          else if (t < 2.0) this.hoverOffset = 16 - (t - 0.9) * 2;
        });
        a.mobile = false;
        return a;
      }
      case 'inferno': {
        const a = action(2.8, [
          ev(0.5, () => { H.shockwave(e.x, e.z, 12, 30, 18 * D, 0xff6a1a); H.radial(e.x, e.y + 1, e.z, 18, 10, 12 * D, 0xff8a2a, 0, { source: 'Inferno' }); }),
          ev(1.2, () => { H.shockwave(e.x, e.z, 14, 30, 18 * D, 0xff6a1a); H.radial(e.x, e.y + 1, e.z, 18, 10, 12 * D, 0xff8a2a, 0.17, { source: 'Inferno' }); }),
          ev(1.9, () => { H.shockwave(e.x, e.z, 16, 30, 18 * D, 0xff6a1a); }),
        ]);
        a.mobile = false;
        return a;
      }
      case 'brood': {
        return action(1.4, [ev(0.5, () => {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            g.enemies.spawn(i % 3 === 0 ? 'fireimp' : 'emberbat', p.x + Math.sin(a) * 12, p.z + Math.cos(a) * 12, { force: true });
          }
          g.ui.toast('Ignar summons its brood!', '#ff7a2a');
        })]);
      }
      // ── Prismatrix ──
      case 'prismbeams': {
        const base = this.aimAngle();
        const waves = P2 ? 4 : 3;
        const evs = [];
        for (let w = 0; w < waves; w++) evs.push(ev(0.1 + w * 0.55, () => {
          for (let i = 0; i < 5; i++) {
            H.line(e.x, e.z, base + w * 0.32 + (i / 5) * TAU, 40, 2.2, 1.0, 18 * D, w % 2 ? 0x8ad8ff : 0xff8ae0, { source: 'Prism Beam' });
          }
        }));
        const a = action(0.3 + waves * 0.55 + 1.1, evs);
        a.mobile = false; a.lockFacing = true;
        return a;
      }
      case 'shardnova': {
        return action(2.2, [0, 0.45, 0.9, ...(P2 ? [1.35] : [])].map((at, i) => ev(at + 0.3, () => {
          H.radial(e.x, e.y + 2.5, e.z, 24, 10, 12 * D, i % 2 ? 0x8ad8ff : 0xff8ae0, i * 0.13, { source: 'Shard Nova' });
          g.audio.play('zap');
        })));
      }
      case 'cage': {
        // a ring of crystals around the player with one gap, then the middle detonates
        const cx = p.x, cz = p.z, n = 12, gap = Math.floor(Math.random() * n);
        const a = action(2.8, [
          ev(0.1, () => {
            for (let i = 0; i < n; i++) {
              if (i === gap) continue;
              const ang = (i / n) * TAU;
              H.circle(cx + Math.sin(ang) * 6.5, cz + Math.cos(ang) * 6.5, 1.9, 1.6, 20 * D, 0xc89aff, { source: 'Crystal Cage' });
            }
          }),
          ev(0.8, () => H.circle(cx, cz, 5.2, 1.4, 26 * D, 0xff5ad8, { source: 'Crystal Cage' })),
        ]);
        g.hint?.('cage', 'Crystal Cage: look for the gap in the ring and get out before the centre shatters!');
        return a;
      }
      case 'shatter': {
        return action(1.4, [ev(0.5, () => {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            g.enemies.spawn(i % 2 ? 'shardling' : 'crystalcrawler', p.x + Math.sin(a) * 12, p.z + Math.cos(a) * 12, { force: true });
          }
          g.ui.toast('The Crystal Queen shatters into servants!', '#c89aff');
        })]);
      }
      case 'mirror': {
        return action(2.2, [
          ev(0.2, () => { g.fx.burst(e.x, e.y + 3, e.z, 0xc89aff, 30, 8); this.group.visible = false; e.untargetable = true; }),
          ev(0.7, () => {
            e.x = clamp(p.x - (e.x - p.x), -PLAY_HALF + 3, PLAY_HALF - 3);
            e.z = clamp(p.z - (e.z - p.z), -PLAY_HALF + 3, PLAY_HALF - 3);
            this.group.visible = true; e.untargetable = false;
            g.fx.burst(e.x, e.y + 3, e.z, 0xc89aff, 30, 8);
          }),
          ev(1.1, () => {
            for (let i = 0; i < (P2 ? 6 : 4); i++) {
              const ang = (i / (P2 ? 6 : 4)) * TAU;
              H.bullet(e.x + Math.sin(ang) * 2, this.mouthY(), e.z + Math.cos(ang) * 2, Math.sin(ang) * 7, 2, Math.cos(ang) * 7, 15 * D, 0xff8ae0, { homing: 1.4, life: 6, size: 1.4, source: 'Mirror Shard' });
            }
            H.shockwave(e.x, e.z, 13, 24, 16 * D, 0xc89aff);
          }),
        ]);
      }
    }
    return action(0.5);
  }

  // Death plays out over ~1.6s of slow motion before the loot drops.
  die() {
    if (this.dead || this.dying) return;
    const g = this.game;
    this.dying = 1.6;
    this.e.untargetable = true;
    this.cur = null;
    g.hazards.clear();
    g.slowMo(0.3, 1.1);
    g.audio.play('boss');
    g.ui.setBanner(`${this.def.name.split(',')[0]} falls!`, '', this.def.color, 2.2);
  }

  updateDying(dt) {
    const g = this.game, e = this.e;
    this.dying -= dt;
    this.t += dt;
    this.boomT = (this.boomT || 0) - dt;
    if (this.boomT <= 0) {
      this.boomT = 0.12;
      const h = this.def.height;
      g.fx.explosion(e.x + rand(-2, 2), e.y + rand(0.5, h), e.z + rand(-2, 2), rand(1.5, 3), [0xffffff, 0xffd24a, this.def.color === '#ff7a2a' ? 0xff7a2a : 0xff5a3a][Math.floor(Math.random() * 3)], 0.4);
      g.ui.shake(0.35);
    }
    this.group.rotation.z = Math.sin(this.t * 40) * 0.05;
    const k = Math.max(0, this.dying / 1.6);
    this.group.scale.setScalar(0.6 + 0.4 * k);
    if (this.dying <= 0) this.finishDeath();
  }

  finishDeath() {
    this.dead = true;
    this.dying = 0;
    const g = this.game, e = this.e;
    g.hitStop(0.12);
    g.fx.explosion(e.x, e.y + 3, e.z, 8, 0xffffff, 0.8);
    g.fx.burst(e.x, e.y + 3, e.z, 0xffd24a, 60, 12, 1.2, 2);
    g.ui.shake(0.8);
    g.audio.play('explode');
    g.scene.remove(this.group, this.shadow);
    const sc = g.enemies.scaling();
    for (let i = 0; i < 12; i++) g.pickups.gem(e.x + rand(-3, 3), e.y + 1, e.z + rand(-3, 3), 20 * sc.xp);
    for (let i = 0; i < 10; i++) g.pickups.coin(e.x + rand(-3, 3), e.y + 1, e.z + rand(-3, 3), Math.ceil(8 * (1 + g.stageIndex * 0.6)));
    g.pickups.heart(e.x, e.y + 1, e.z);
    g.world.addChest(e.x + 3, e.z, true);
    g.world.addChest(e.x - 3, e.z, true);
    for (let i = 0; i < (g.mods.bossChests || 0); i++) g.world.addChest(e.x + rand(-4, 4), e.z + 3 + i * 2.5, true);
    g.enemies.blastAll(e.x, e.z, 30, 1e7);
    g.run.kills++;
    g.onBossDefeated(this);
  }

  dispose() {
    this.game.scene.remove(this.group, this.shadow);
  }
}
