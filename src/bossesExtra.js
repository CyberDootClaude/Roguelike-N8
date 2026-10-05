// Bosses added in patch 1.2. Each is data: a model plus `moves`, which combine the reusable
// attack patterns on the Boss class (mvCircles, mvRadial, mvFan, mvShockwaves, mvLines,
// mvSummon, mvHoming, mvDive, mvCharge). First four attacks are used from the start,
// the fifth joins when the boss enrages.
import * as THREE from 'three';
import { buildMesh, glowEyes } from './models.js';
import { TAU } from './util.js';

const part = (parts, opts) => buildMesh(parts, opts);

function sporemotherModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'cyl', size: [1.3, 1.9, 5.5, 10], pos: [0, 2.75, 0], color: 0xf2e6d0 },
    { shape: 'sphere', size: [4.2], pos: [0, 6.2, 0], scale: [1, 0.45, 1], color: 0x8a3ab8, seg: 14, segY: 8 },
    { shape: 'sphere', size: [3.9], pos: [0, 5.9, 0], scale: [1, 0.3, 1], color: 0xd8b0ff, seg: 14, segY: 6 },
    { shape: 'sphere', size: [0.5], pos: [1.8, 7.4, 1.2], color: 0xffe0ff },
    { shape: 'sphere', size: [0.45], pos: [-2.0, 7.2, -0.6], color: 0xffe0ff },
    { shape: 'sphere', size: [0.4], pos: [0.3, 7.8, -1.9], color: 0xffe0ff },
    { shape: 'sphere', size: [0.35], pos: [-0.8, 7.6, 2.0], color: 0xffe0ff },
    { shape: 'torus', size: [0.55, 0.14], pos: [0, 2.8, 1.45], color: 0x3a1a2a },
    { shape: 'cyl', size: [0.25, 0.5, 2.6, 6], seg: 6, pos: [-1.8, 0.9, 0.6], rot: [0.3, 0, 0.9], color: 0xe0d0b8 },
    { shape: 'cyl', size: [0.25, 0.5, 2.6, 6], seg: 6, pos: [1.8, 0.9, 0.6], rot: [0.3, 0, -0.9], color: 0xe0d0b8 },
    { shape: 'cyl', size: [0.25, 0.5, 2.6, 6], seg: 6, pos: [0, 0.9, -1.9], rot: [-0.9, 0, 0], color: 0xe0d0b8 },
    { shape: 'cone', size: [0.6, 1.4, 8], seg: 8, pos: [1.2, 8.0, 0], color: 0x3ab8d8 },
    { shape: 'cone', size: [0.45, 1.0, 8], seg: 8, pos: [-1.0, 7.9, 0.8], color: 0xff7ad0 },
    ...glowEyes(4.0, 1.5, 0.5, 0.24, 0x6affd8),
  ], { emissive: 0x1a0a2a });
  g.add(body);
  g.userData = { body };
  return g;
}

function leviathanModel() {
  const g = new THREE.Group();
  const segs = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    segs.push({ shape: 'sphere', size: [1.25 - t * 0.35], pos: [0, 0.8 + Math.sin(t * Math.PI * 0.9) * 5.5, -3 + t * 4.2], color: i % 2 ? 0x2a7aa8 : 0x3a8ab8, seg: 10 });
    segs.push({ shape: 'cone', size: [0.25, 0.9, 4], seg: 4, pos: [0, 1.9 + Math.sin(t * Math.PI * 0.9) * 5.5, -3 + t * 4.2], color: 0x6affd8 });
  }
  const body = part([
    ...segs,
    { shape: 'box', size: [1.6, 1.2, 2.2], pos: [0, 5.2, 2.2], color: 0x2a6a98 },
    { shape: 'box', size: [1.3, 0.4, 1.6], pos: [0, 4.4, 2.8], color: 0xe8f0d8 },
    { shape: 'cone', size: [0.2, 1.1, 4], seg: 4, pos: [-0.6, 6.1, 1.6], rot: [-0.6, 0, 0.3], color: 0xe8f0d8 },
    { shape: 'cone', size: [0.2, 1.1, 4], seg: 4, pos: [0.6, 6.1, 1.6], rot: [-0.6, 0, -0.3], color: 0xe8f0d8 },
    { shape: 'box', size: [2.6, 0.08, 1.0], pos: [-1.3, 4.0, 1.4], rot: [0, 0.3, 0.5], color: 0x6affd8 },
    { shape: 'box', size: [2.6, 0.08, 1.0], pos: [1.3, 4.0, 1.4], rot: [0, -0.3, -0.5], color: 0x6affd8 },
    ...glowEyes(5.5, 3.3, 0.5, 0.16, 0xffe04a),
  ], { emissive: 0x001a2a });
  g.add(body);
  g.userData = { body };
  return g;
}

function rocModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'sphere', size: [1.8], pos: [0, 0, 0], scale: [1, 0.9, 1.5], color: 0x3a6ad8, seg: 10 },
    { shape: 'sphere', size: [1.3], pos: [0, -0.4, 0.4], scale: [0.9, 0.7, 1.3], color: 0xe8f0ff },
    { shape: 'sphere', size: [0.9], pos: [0, 1.0, 2.4], color: 0x4a7ae8 },
    { shape: 'cone', size: [0.35, 1.2, 6], seg: 6, pos: [0, 0.8, 3.5], rot: [1.57, 0, 0], color: 0xf2c84a },
    { shape: 'cone', size: [0.25, 1.4, 5], seg: 5, pos: [0, 2.0, 2.0], rot: [-0.6, 0, 0], color: 0xf2f2f2 },
    { shape: 'box', size: [1.6, 0.1, 2.4], pos: [0, 0.2, -2.6], rot: [0.3, 0, 0], color: 0x2a4ab8 },
    { shape: 'box', size: [0.3, 1.4, 0.3], pos: [-0.6, -1.6, 0.3], color: 0xf2c84a },
    { shape: 'box', size: [0.3, 1.4, 0.3], pos: [0.6, -1.6, 0.3], color: 0xf2c84a },
    ...glowEyes(1.2, 3.2, 0.42, 0.13, 0xffffff),
  ], { emissive: 0x0a1030 });
  g.add(body);
  const mkWing = (side) => {
    const w = new THREE.Group();
    w.add(part([
      { shape: 'box', size: [5.2, 0.14, 2.8], pos: [side * 2.7, 0, 0], color: 0x3a6ad8 },
      { shape: 'box', size: [2.8, 0.12, 1.6], pos: [side * 4.6, 0, -1.2], rot: [0, side * 0.3, 0], color: 0xe8f0ff },
      { shape: 'box', size: [5.4, 0.25, 0.3], pos: [side * 2.8, 0.1, 1.2], color: 0x2a4ab8 },
    ], { emissive: 0x0a1030 }));
    w.position.set(side * 1.3, 0.6, 0.4);
    g.add(w);
    return w;
  };
  g.userData = { body, wingL: mkWing(-1), wingR: mkWing(1) };
  return g;
}

function gearlordModel() {
  const g = new THREE.Group();
  const body = part([
    { shape: 'box', size: [3.6, 3.2, 2.4], pos: [0, 4.6, 0], color: 0xb8862a },
    { shape: 'box', size: [3.0, 1.0, 2.2], pos: [0, 2.6, 0], color: 0x6a6a72 },
    { shape: 'box', size: [1.8, 1.4, 1.6], pos: [0, 6.9, 0.2], color: 0x8a8a92 },
    { shape: 'box', size: [1.6, 0.35, 0.2], pos: [0, 7.0, 1.02], color: 0xff3a2a },
    { shape: 'cyl', size: [0.08, 0.08, 1.2, 5], seg: 5, pos: [0.5, 8.1, 0], color: 0x3a3a42 },
    { shape: 'sphere', size: [0.2], pos: [0.5, 8.75, 0], color: 0xff3a2a },
    { shape: 'cyl', size: [0.4, 0.5, 1.6, 8], pos: [-1.2, 6.6, -1.3], color: 0x4a3a32 },
    { shape: 'cyl', size: [0.4, 0.5, 1.6, 8], pos: [1.2, 6.6, -1.3], color: 0x4a3a32 },
    { shape: 'box', size: [1.1, 2.2, 1.2], pos: [-0.9, 1.1, 0], color: 0x5a5a62 },
    { shape: 'box', size: [1.1, 2.2, 1.2], pos: [0.9, 1.1, 0], color: 0x5a5a62 },
    { shape: 'box', size: [1.3, 0.4, 1.6], pos: [-0.9, 0.2, 0.2], color: 0xb8862a },
    { shape: 'box', size: [1.3, 0.4, 1.6], pos: [0.9, 0.2, 0.2], color: 0xb8862a },
  ], { emissive: 0x1a1000 });
  g.add(body);
  const gear = part([
    { shape: 'torus', size: [1.0, 0.22], color: 0xd8a83a, seg: 12 },
    { shape: 'cyl', size: [0.4, 0.4, 0.3, 8], rot: [Math.PI / 2, 0, 0], color: 0x6affd8 },
    ...Array.from({ length: 8 }, (_, i) => ({ shape: 'box', size: [0.3, 0.45, 0.3], pos: [Math.sin((i / 8) * TAU) * 1.25, Math.cos((i / 8) * TAU) * 1.25, 0], rot: [0, 0, -(i / 8) * TAU], color: 0xd8a83a })),
  ], { emissive: 0x2a1a00 });
  gear.position.set(0, 4.8, 1.25);
  g.add(gear);
  const mkArm = (side) => {
    const arm = new THREE.Group();
    arm.add(part([
      { shape: 'box', size: [0.9, 3.2, 0.9], pos: [0, -1.6, 0], color: 0x6a6a72 },
      { shape: 'cyl', size: [0.6, 0.5, 1.0, 8], pos: [0, -3.5, 0], color: 0xb8862a },
      { shape: 'cyl', size: [0.25, 0.25, 0.6, 6], seg: 6, pos: [0, -4.1, 0], color: 0x3a3a42 },
    ], { emissive: 0x1a1000 }));
    arm.position.set(side * 2.3, 5.8, 0);
    g.add(arm);
    return arm;
  };
  g.userData = { body, halo: gear, armL: mkArm(-1), armR: mkArm(1) };
  gear.rotation.order = 'ZXY';
  return g;
}

export const EXTRA_ATTACK_NAMES = {
  sporecloud: 'Spore Cloud', puffnova: 'Puff Nova', rootsnare: 'Root Snare', sporelings: 'Spawn Sporelings', capslam: 'Cap Slam',
  tidalwave: 'Tidal Wave', waterspouts: 'Waterspouts', bubblefan: 'Bubble Barrage', riptide: 'Riptide', crabcall: 'Call of the Reef',
  divebomb: 'Sky Dive', featherstorm: 'Feather Storm', thunder: 'Thunderhead', galeburst: 'Gale Burst', harpycall: 'Harpy Flock',
  rocketbarrage: 'Rocket Barrage', laserstar: 'Laser Grid', overdrive: 'Overdrive', stompquake: 'Piston Quake', drones: 'Deploy Drones',
};

export const EXTRA_BOSSES = {
  sporemother: {
    name: 'Sporemother, the Fungal Matriarch', title: 'Queen of the Mushroom Grove', color: '#c89aff', added: '1.2.0',
    model: sporemotherModel, radius: 2.6, height: 9, speed: 2.8, hover: 0, hp: 3500,
    attacks: ['sporecloud', 'puffnova', 'rootsnare', 'capslam', 'sporelings'],
    moves: {
      sporecloud: (b, P2) => b.mvCircles({ n: P2 ? 9 : 6, interval: 0.3, r: 3, warn: 1.2, dmg: 10, color: 0xb87ae0, onPlayer: 2, spread: 10, name: 'Spore Cloud', zone: { dur: 4, dps: 6, slow: 0.4, color: 0xa86ad8 } }),
      puffnova: (b, P2) => b.mvRadial({ waves: P2 ? 4 : 3, count: 22, speed: 8, dmg: 11, color: 0xd8a0ff, name: 'Puff Nova' }),
      rootsnare: (b, P2) => b.mvCircles({ n: P2 ? 10 : 7, interval: 0.28, r: 2.5, warn: 0.85, dmg: 17, color: 0x6adc3a, fx: 0xe0d0b8, onPlayer: 99, name: 'Root Snare' }),
      capslam: (b, P2) => b.mvShockwaves({ n: P2 ? 3 : 2, dmg: 20, color: 0xd8b0ff }),
      sporelings: (b) => b.mvSummon({ kinds: ['sporeling', 'sporeling', 'puffcap'], n: 9, msg: 'The Sporemother releases her brood!', color: '#c89aff' }),
    },
  },
  leviathrax: {
    name: 'Leviathrax, the Tide Serpent', title: 'Terror of the Sunken Oasis', color: '#6ad8ff', added: '1.2.0',
    model: leviathanModel, radius: 2.4, height: 8, speed: 3.6, hover: 0, hp: 4000,
    attacks: ['tidalwave', 'waterspouts', 'bubblefan', 'riptide', 'crabcall'],
    moves: {
      tidalwave: (b, P2) => b.mvShockwaves({ n: P2 ? 3 : 2, interval: 0.55, speed: 15, dmg: 20, color: 0x3ab8f0, windup: 0.8 }),
      waterspouts: (b, P2) => b.mvCircles({ n: P2 ? 16 : 12, interval: 0.11, r: 2.8, warn: 1.2, dmg: 17, color: 0x3ab8f0, fx: 0xbff0ff, onPlayer: 3, spread: 14, name: 'Waterspout' }),
      bubblefan: (b, P2) => b.mvFan({ volleys: 3, count: P2 ? 11 : 9, spread: 1.2, speed: 11, dmg: 12, color: 0x9fe8ff, name: 'Bubble' }),
      riptide: (b, P2) => b.mvLines({ waves: P2 ? 3 : 2, n: 4, width: 2.8, dmg: 20, color: 0x2a8ad8, interval: 0.9, name: 'Riptide' }),
      crabcall: (b) => b.mvSummon({ kinds: ['reefcrab', 'bogfrog'], n: 10, msg: 'Leviathrax calls the reef to war!', color: '#6ad8ff' }),
    },
  },
  zephyra: {
    name: 'Zephyra, the Storm Roc', title: 'Tyrant of the Sky Isles', color: '#8ab8ff', added: '1.2.0',
    model: rocModel, radius: 2.8, height: 6, speed: 4.4, hover: 4.5, hp: 4800,
    attacks: ['divebomb', 'featherstorm', 'thunder', 'galeburst', 'harpycall'],
    moves: {
      divebomb: (b) => b.mvDive({ r: 6.5, dmg: 28, color: 0x8ab8ff, name: 'Sky Dive', wave: 0xd8ecff }),
      featherstorm: (b, P2) => b.mvFan({ volleys: P2 ? 5 : 4, count: 7, spread: 0.9, speed: 16, dmg: 12, color: 0xe8f0ff, interval: 0.35, name: 'Feather' }),
      thunder: (b, P2) => b.mvCircles({ n: P2 ? 14 : 10, interval: 0.18, r: 2.6, warn: 1.0, dmg: 20, color: 0xfff27a, fx: 0xffffff, onPlayer: 4, spread: 12, name: 'Thunderhead' }),
      galeburst: (b, P2) => b.mvRadial({ waves: P2 ? 4 : 3, count: 18, speed: 12, dmg: 12, color: 0xbfe8ff, interval: 0.35, name: 'Gale' }),
      harpycall: (b) => b.mvSummon({ kinds: ['harpy', 'cloudsprite'], n: 10, msg: 'Zephyra summons her flock!', color: '#8ab8ff' }),
    },
  },
  gearlord: {
    name: 'Gearlord Omega', title: 'Overseer of the Clockwork Foundry', color: '#ffb84a', added: '1.2.0',
    model: gearlordModel, radius: 2.6, height: 9, speed: 3.2, hover: 0, hp: 5200,
    attacks: ['rocketbarrage', 'laserstar', 'overdrive', 'stompquake', 'drones'],
    moves: {
      rocketbarrage: (b, P2) => b.mvCircles({ n: P2 ? 22 : 16, interval: 0.09, r: 2.8, warn: 1.25, dmg: 18, color: 0xff7a2a, fx: 0xffb84a, onPlayer: 3, spread: 15, name: 'Rocket' }),
      laserstar: (b, P2) => b.mvLines({ waves: P2 ? 3 : 2, n: 8, width: 2.0, dmg: 22, color: 0xff3a2a, interval: 1.1, name: 'Laser', aimed: false }),
      overdrive: (b, P2) => b.mvCharge({ len: 30, width: 4.5, dmg: 24, color: 0xffb84a, name: 'Overdrive', times: P2 ? 3 : 2 }),
      stompquake: (b, P2) => b.mvShockwaves({ n: P2 ? 4 : 3, interval: 0.5, dmg: 20, color: 0xffa030 }),
      drones: (b) => b.mvSummon({ kinds: ['sparkdrone', 'cogcrawler'], n: 10, msg: 'Gearlord deploys its drones!', color: '#ffb84a' }),
    },
  },
};
