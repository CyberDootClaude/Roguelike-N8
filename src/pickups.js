// XP gems, gold coins, hearts and magnets lying on the ground.
import * as THREE from 'three';
import { InstancePool, buildGeometry } from './models.js';
import { rand } from './util.js';

const MAX_GEMS = 500;

export class Pickups {
  constructor(game) {
    this.game = game;
    const s = game.scene;
    this.items = [];
    this.pools = {
      gem: new InstancePool(s, new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_GEMS + 20, { colored: true }),
      coin: new InstancePool(s, new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10).rotateX(Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x6a4a00 }), 300),
      heart: new InstancePool(s, buildGeometry([
        { shape: 'sphere', size: [0.22], pos: [-0.15, 0.1, 0], color: 0xff3a5a },
        { shape: 'sphere', size: [0.22], pos: [0.15, 0.1, 0], color: 0xff3a5a },
        { shape: 'cone', size: [0.3, 0.4, 8], pos: [0, -0.17, 0], rot: [Math.PI, 0, 0], color: 0xff3a5a },
      ]), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x440010 }), 40),
      magnet: new InstancePool(s, buildGeometry([
        { shape: 'torus', size: [0.3, 0.1], pos: [0, 0.1, 0], color: 0xff3a3a },
        { shape: 'box', size: [0.2, 0.2, 0.2], pos: [-0.3, -0.12, 0], color: 0xffffff },
        { shape: 'box', size: [0.2, 0.2, 0.2], pos: [0.3, -0.12, 0], color: 0xffffff },
      ]), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x330000 }), 10),
    };
    this.gemCount = 0;
  }

  clear() {
    this.items.length = 0;
    this.gemCount = 0;
    for (const p of Object.values(this.pools)) p.clear();
  }

  add(type, x, y, z, value, extra = {}) {
    const vis = { x, y, z, s: 1 };
    if (!this.pools[type].add(vis)) return null;
    const it = {
      type, x, y, z, value, vis, vx: rand(-2, 2), vy: rand(4, 7), vz: rand(-2, 2),
      magnet: false, t: 0, ...extra,
    };
    this.items.push(it);
    return it;
  }

  gem(x, y, z, value) {
    if (this.gemCount >= MAX_GEMS) {
      // fold into an existing gem to cap draw count
      const g = this.items.find((i) => i.type === 'gem' && !i.magnet);
      if (g) { g.value += value; this.tintGem(g); return; }
    }
    const it = this.add('gem', x, y, z, value);
    if (it) { this.gemCount++; this.tintGem(it); }
  }

  tintGem(it) {
    const v = it.value, vis = it.vis;
    if (v < 5) { vis.cr = 0.35; vis.cg = 0.7; vis.cb = 1.3; vis.s = 1; }
    else if (v < 25) { vis.cr = 0.4; vis.cg = 1.3; vis.cb = 0.5; vis.s = 1.25; }
    else if (v < 120) { vis.cr = 1.4; vis.cg = 0.35; vis.cb = 0.35; vis.s = 1.5; }
    else { vis.cr = 1.4; vis.cg = 0.4; vis.cb = 1.4; vis.s = 1.9; }
  }

  coin(x, y, z, value) { this.add('coin', x, y, z, value); }
  heart(x, y, z) { this.add('heart', x, y, z, 0); }
  magnet(x, y, z) { this.add('magnet', x, y, z, 0); }

  attractAll() {
    for (const it of this.items) if (it.type === 'gem' || it.type === 'coin') it.magnet = true;
  }

  update(dt) {
    const g = this.game, p = g.player, world = g.world;
    const range = 3 * p.stats.pickup;
    const r2 = range * range;
    const px = p.x, py = p.y + 1, pz = p.z;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const dx = px - it.x, dy = py - it.y, dz = pz - it.z;
      const d2 = dx * dx + dz * dz;
      if (!it.magnet && d2 < r2 && it.t > 0.3) it.magnet = true;
      if (it.magnet) {
        const d = Math.sqrt(d2 + dy * dy) || 1;
        const sp = 14 + it.t * 6;
        it.vx = (dx / d) * sp; it.vy = (dy / d) * sp; it.vz = (dz / d) * sp;
        it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
        if (d < 1.1) { this.collect(it); this.remove(i); continue; }
      } else {
        const gy = world.groundAt(it.x, it.z) + 0.45;
        if (it.y > gy || it.vy > 0) {
          it.vy -= 22 * dt;
          it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
          if (it.y < gy) { it.y = gy; it.vy = 0; it.vx = 0; it.vz = 0; }
        } else it.y = gy;
      }
      const v = it.vis;
      v.x = it.x; v.z = it.z;
      v.y = it.y + (it.magnet ? 0 : Math.sin(it.t * 3 + it.x) * 0.12);
      v.ry = it.t * 2.5;
    }
    for (const pool of Object.values(this.pools)) pool.sync();
  }

  remove(i) {
    const it = this.items[i];
    this.pools[it.type].remove(it.vis);
    if (it.type === 'gem') this.gemCount--;
    this.items[i] = this.items[this.items.length - 1];
    this.items.pop();
  }

  collect(it) {
    const g = this.game, p = g.player;
    switch (it.type) {
      case 'gem': g.gainXp(it.value); g.audio.play('gem'); break;
      case 'coin': {
        const v = Math.round(it.value * p.stats.goldGain * (1 + p.stats.curse * 0.5) * g.mods.goldMult);
        g.run.gold += v; g.run.goldEarned += v; g.audio.play('coin');
        break;
      }
      case 'heart': p.heal(p.stats.maxHp * 0.3); g.audio.play('shrine'); break;
      case 'magnet': this.attractAll(); g.ui.toast('🧲 Magnet! All gems are coming to you.', '#ff8a8a'); g.audio.play('shrine'); break;
    }
  }
}
