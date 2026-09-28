// Runtime weapon logic: each owned weapon fires automatically based on its kind.
import * as THREE from 'three';
import { WEAPONS, WEAPON_UPGRADES } from './data/loot.js';
import { buildMesh } from './models.js';
import { rand, TAU } from './util.js';

const _list = [];

export class WeaponInstance {
  constructor(id) {
    this.id = id;
    this.def = WEAPONS[id];
    this.level = 1;
    this.stats = { ...this.def.base };
    this.cd = 0.3;
    this.state = {};
  }

  // roll 1-2 stat upgrades scaled by rarity; returns [{key, value}]
  rollUpgrade(rarity) {
    const ups = Object.entries(this.def.ups);
    const nRolls = rarity.mult >= 1.9 ? 3 : rarity.mult >= 1.25 ? 2 : 1;
    const out = [];
    const pool = ups.map(([k, w]) => ({ k, w }));
    for (let i = 0; i < nRolls && pool.length; i++) {
      let tot = pool.reduce((a, b) => a + b.w, 0), x = Math.random() * tot, idx = 0;
      for (; idx < pool.length; idx++) { x -= pool[idx].w; if (x <= 0) break; }
      idx = Math.min(idx, pool.length - 1);
      const k = pool[idx].k;
      pool.splice(idx, 1);
      const u = WEAPON_UPGRADES[k];
      let v = u.amount;
      if (u.fmt === 'int') v = rarity.mult >= 2.4 ? 2 : 1;
      else v *= rarity.mult;
      out.push({ key: k, value: v });
    }
    return out;
  }

  applyUpgrade(rolls) {
    this.level++;
    for (const { key, value } of rolls) {
      const fmt = WEAPON_UPGRADES[key].fmt;
      if (key === 'damage') this.stats.damage += this.def.base.damage * value;
      else if (key === 'cooldown') this.stats.cooldown *= 1 - value;
      else if (fmt === 'int') this.stats[key] += value;
      else if (key === 'crit') this.stats.crit += value;
      else if (key === 'speed') this.stats.speed *= 1 + value;
      else this.stats[key] *= 1 + value;
    }
  }
}

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.bladeGroup = new THREE.Group();
    game.scene.add(this.bladeGroup);
    this.blades = [];
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.16, depthWrite: false });
    this.aura = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), auraMat);
    this.auraRing = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.5, depthWrite: false }));
    this.aura.visible = this.auraRing.visible = false;
    game.scene.add(this.aura, this.auraRing);
    this.bladeGeo = buildMesh([
      { shape: 'box', size: [0.12, 0.08, 1.3], pos: [0, 0, 0], color: 0xe8f0ff },
      { shape: 'box', size: [0.4, 0.1, 0.1], pos: [0, 0, -0.45], color: 0x40e0d0 },
    ], { emissive: 0x224444 });
  }

  dispose() {
    this.game.scene.remove(this.bladeGroup, this.aura, this.auraRing);
  }

  has(id) { return this.list.some((w) => w.id === id); }
  get(id) { return this.list.find((w) => w.id === id); }
  add(id) {
    const w = new WeaponInstance(id);
    this.list.push(w);
    return w;
  }

  eff(w) {
    const st = this.game.player.stats;
    return {
      damage: w.stats.damage,
      cooldown: Math.max(0.08, w.stats.cooldown / st.attackSpeed),
      count: Math.max(1, Math.round(w.stats.count + st.projectiles)),
      size: w.stats.size * st.area,
      speed: w.stats.speed * st.projSpeed,
      duration: w.stats.duration * st.duration,
      pierce: w.stats.pierce,
      crit: w.stats.crit,
      kb: w.stats.knockback,
    };
  }

  update(dt) {
    const game = this.game;
    let hasAura = false, hasOrbit = false;
    for (const w of this.list) {
      const s = this.eff(w);
      if (w.def.kind === 'aura') { hasAura = true; this.updateAura(w, s, dt); continue; }
      if (w.def.kind === 'orbit') { hasOrbit = true; this.updateOrbit(w, s, dt); continue; }
      w.cd -= dt;
      if (w.cd <= 0) {
        const fired = this.fire(w, s);
        w.cd = fired ? s.cooldown : 0.15;
      }
    }
    this.aura.visible = this.auraRing.visible = hasAura;
    if (!hasOrbit) this.setBladeCount(0);
    void game;
  }

  // Random target from a list, but aim at a nearby boss half the time.
  pickTarget(list, spread = list.length) {
    const b = this.game.boss;
    if (b && !b.dead && list.includes(b.e) && Math.random() < 0.5) return b.e;
    return list[Math.floor(Math.random() * Math.min(list.length, spread))];
  }

  nearest(range) {
    const p = this.game.player;
    return this.game.enemies.nearest(p.x, p.z, range);
  }

  fire(w, s) {
    const game = this.game, p = game.player, C = game.combat;
    const px = p.x, py = p.y + 1.2, pz = p.z;
    switch (w.def.kind) {
      case 'swing': {
        const target = this.nearest(6 * s.size + 2);
        const base = target ? Math.atan2(target.x - px, target.z - pz) : p.facing;
        const radius = 4.6 * s.size, spread = 1.3;
        for (let i = 0; i < s.count; i++) {
          const ang = base + (i * TAU) / s.count;
          game.fx.arc(px, p.y, pz, ang, radius, spread, 0xfff2c0, 0.22);
          const cx = Math.sin(ang), cz = Math.cos(ang);
          for (const e of game.enemies.query(px, pz, radius + 2)) {
            const dx = e.x - px, dz = e.z - pz;
            const d = Math.hypot(dx, dz);
            if (d > radius + e.radius) continue;
            if (e.y > p.y + 4 || e.y + e.height < p.y - 2) continue;
            if (d > 1 && (dx * cx + dz * cz) / d < Math.cos(spread)) continue;
            C.damage(e, s.damage, { crit: s.crit, kb: s.kb, silent: true });
          }
        }
        game.audio.play('swing');
        return true;
      }
      case 'projectile': {
        const target = this.nearest(32);
        if (!target) return false;
        const ty = target.y + target.height * 0.5;
        const baseAng = Math.atan2(target.x - px, target.z - pz);
        const dh = Math.hypot(target.x - px, target.z - pz);
        const pitch = Math.atan2(ty - py, dh);
        const kind = w.def.proj;
        for (let i = 0; i < s.count; i++) {
          const off = (i - (s.count - 1) / 2) * 0.12;
          const a = baseAng + off;
          const sp = s.speed;
          C.spawnProjectile({
            kind, x: px, y: py, z: pz,
            vx: Math.sin(a) * Math.cos(pitch) * sp, vy: Math.sin(pitch) * sp, vz: Math.cos(a) * Math.cos(pitch) * sp,
            dmg: s.damage, pierce: s.pierce, life: s.duration, crit: s.crit, kb: s.kb,
            radius: 0.45 * s.size, size: s.size,
          });
        }
        game.audio.play('shoot');
        return true;
      }
      case 'fireball': {
        const targets = game.enemies.inRange(px, pz, 24, _list);
        if (!targets.length) return false;
        for (let i = 0; i < s.count; i++) {
          const t = this.pickTarget(targets, 12);
          const ty = t.y + t.height * 0.5;
          const d = Math.hypot(t.x - px, ty - py, t.z - pz) || 1;
          const r = 2.6 * s.size;
          const boom = (pr) => C.explode(pr.x, pr.y, pr.z, r, s.damage, { crit: s.crit, kb: s.kb, color: 0xff7a1a });
          C.spawnProjectile({
            kind: 'fireball', x: px, y: py + 0.5, z: pz,
            vx: ((t.x - px) / d) * s.speed, vy: ((ty - py) / d) * s.speed, vz: ((t.z - pz) / d) * s.speed,
            life: s.duration, pierce: 0, radius: 0.5 * s.size, size: s.size,
            explodes: true, onHit: boom, onExpire: boom,
          });
        }
        game.audio.play('shoot');
        return true;
      }
      case 'lightning': {
        const targets = game.enemies.inRange(px, pz, 20, _list);
        if (!targets.length) return false;
        const t = this.pickTarget(targets);
        C.chain(t, s.damage, s.count, 7 * s.size, { crit: s.crit, kb: s.kb, fromSky: true });
        return true;
      }
      case 'boomerang': {
        const target = this.nearest(25);
        const base = target ? Math.atan2(target.x - px, target.z - pz) : p.facing;
        for (let i = 0; i < s.count; i++) {
          const a = base + (i - (s.count - 1) / 2) * 0.35;
          C.spawnProjectile({
            kind: 'boomerang', x: px, y: py, z: pz, vx: 0, vy: 0, vz: 0,
            dirX: Math.sin(a), dirZ: Math.cos(a), speed: s.speed, outTime: 0.55 * s.duration,
            dmg: s.damage, pierce: 999, life: 6, crit: s.crit, kb: s.kb, radius: 0.8 * s.size, size: s.size * 1.2,
          });
        }
        game.audio.play('swing');
        return true;
      }
      case 'puddle': {
        const targets = game.enemies.inRange(px, pz, 16, _list);
        if (!targets.length) return false;
        for (let i = 0; i < s.count; i++) {
          const t = this.pickTarget(targets);
          const tx = t.x + rand(-1, 1), tz = t.z + rand(-1, 1);
          const T = 0.6;
          const ty = game.world.heightAt(tx, tz);
          C.spawnProjectile({
            kind: 'flask', x: px, y: py, z: pz, lob: true, hits: false,
            vx: (tx - px) / T, vz: (tz - pz) / T, vy: (ty - py + 0.5 * 26 * T * T) / T,
            life: 3, pierce: 0, size: 1,
            onLand: (pr) => {
              C.addPuddle(pr.x, pr.z, 2.4 * s.size, s.duration, s.damage, s.crit);
              game.fx.burst(pr.x, pr.y + 0.3, pr.z, 0x8aff4a, 8, 4);
              game.audio.play('break');
            },
          });
        }
        return true;
      }
      case 'beam': {
        const target = this.nearest(22 * s.size);
        if (!target) return false;
        const base = Math.atan2(target.x - px, target.z - pz);
        const len = 20 * s.size, width = 1.1 * s.size;
        for (let i = 0; i < s.count; i++) {
          const a = base + (i - (s.count - 1) / 2) * 0.3;
          const dx = Math.sin(a), dz = Math.cos(a);
          const ex = px + dx * len, ez = pz + dz * len;
          game.fx.beam(px, py, pz, ex, py, ez, width * 0.6, 0xfff29a, 0.3);
          game.fx.beam(px, py, pz, ex, py, ez, width * 0.25, 0xffffff, 0.3);
          for (const e of game.enemies.query(px + dx * len / 2, pz + dz * len / 2, len / 2 + 2)) {
            const rx = e.x - px, rz = e.z - pz;
            const along = rx * dx + rz * dz;
            if (along < 0 || along > len) continue;
            const perp = Math.abs(rx * dz - rz * dx);
            if (perp > width + e.radius) continue;
            if (e.y > p.y + 5 || e.y + e.height < p.y - 2) continue;
            C.damage(e, s.damage, { crit: s.crit, kb: s.kb, silent: true });
          }
        }
        game.audio.play('zap');
        return true;
      }
      case 'meteor': {
        const targets = game.enemies.inRange(px, pz, 22, _list);
        if (!targets.length) return false;
        for (let i = 0; i < s.count; i++) {
          const t = this.pickTarget(targets);
          const tx = t.x + rand(-1.5, 1.5), tz = t.z + rand(-1.5, 1.5);
          const gy = game.world.heightAt(tx, tz);
          const r = 3.2 * s.size;
          game.fx.ring(tx, gy, tz, r, r, 0xff5a1a, 0.6, 0.5);
          const delay = i * 0.12;
          C.spawnProjectile({
            kind: 'meteor', x: tx - 6, y: gy + 22 + delay * 30, z: tz - 3, vx: 10, vy: -36, vz: 5,
            life: 3, hits: false, size: s.size,
            onLand: (pr) => C.explode(pr.x, gy + 0.5, pr.z, r, s.damage, { crit: s.crit, kb: s.kb, color: 0xff6a1a }),
          });
        }
        return true;
      }
      case 'mine': {
        for (let i = 0; i < s.count; i++) {
          const a = Math.random() * TAU, d = i === 0 ? 0 : rand(1, 2.5);
          C.addMine(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, 3 * s.size, s.duration, s.damage, s.crit, s.kb);
        }
        return true;
      }
      case 'nova': {
        const off = Math.random() * TAU;
        for (let i = 0; i < s.count; i++) {
          const a = off + (i * TAU) / s.count;
          C.spawnProjectile({
            kind: 'disc', x: px, y: py - 0.3, z: pz,
            vx: Math.sin(a) * s.speed, vy: 0, vz: Math.cos(a) * s.speed,
            dmg: s.damage, pierce: s.pierce, life: s.duration, crit: s.crit, kb: s.kb,
            radius: 0.6 * s.size, size: s.size * 1.3,
          });
        }
        game.audio.play('shoot');
        return true;
      }
    }
    return false;
  }

  updateAura(w, s, dt) {
    const game = this.game, p = game.player;
    const r = 3.6 * s.size;
    const gy = game.world.groundAt(p.x, p.z);
    this.aura.position.set(p.x, gy + 0.1, p.z);
    this.aura.scale.setScalar(r);
    this.auraRing.position.set(p.x, gy + 0.12, p.z);
    this.auraRing.scale.setScalar(r);
    this.auraRing.rotation.y += dt;
    w.cd -= dt;
    if (w.cd <= 0) {
      w.cd = s.cooldown;
      for (const e of game.enemies.query(p.x, p.z, r + 2)) {
        if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 > (r + e.radius) ** 2) continue;
        if (Math.abs(e.y - p.y) > 5) continue;
        game.combat.damage(e, s.damage, { crit: s.crit, slow: 0.7, silent: true, noProc: Math.random() > 0.35 });
      }
      if (Math.random() < 0.5) game.fx.burst(p.x + rand(-r, r) * 0.7, gy + 0.3, p.z + rand(-r, r) * 0.7, 0xcff4ff, 3, 2);
    }
  }

  setBladeCount(n) {
    while (this.blades.length < n) {
      const m = this.bladeGeo.clone();
      this.bladeGroup.add(m);
      this.blades.push(m);
    }
    while (this.blades.length > n) this.bladeGroup.remove(this.blades.pop());
  }

  updateOrbit(w, s, dt) {
    const game = this.game, p = game.player;
    this.setBladeCount(s.count);
    w.state.angle = (w.state.angle || 0) + dt * 3.2 * s.speed;
    w.state.hits = w.state.hits || new Map();
    const r = 3.8 * s.size;
    const now = game.time;
    for (let i = 0; i < s.count; i++) {
      const a = w.state.angle + (i * TAU) / s.count;
      const bx = p.x + Math.sin(a) * r, bz = p.z + Math.cos(a) * r, by = p.y + 1.1;
      const m = this.blades[i];
      m.position.set(bx, by, bz);
      m.rotation.y = a + Math.PI / 2;
      m.scale.setScalar(s.size);
      for (const e of game.enemies.query(bx, bz, 2.5)) {
        const rr = 0.9 * s.size + e.radius;
        if ((e.x - bx) ** 2 + (e.z - bz) ** 2 > rr * rr) continue;
        if (by < e.y - 0.8 || by > e.y + e.height + 1) continue;
        const last = w.state.hits.get(e) || -99;
        if (now - last < s.cooldown) continue;
        w.state.hits.set(e, now);
        game.combat.damage(e, s.damage, { crit: s.crit, kb: s.kb, fromX: p.x, fromZ: p.z, silent: true });
      }
    }
    if (w.state.hits.size > 400) w.state.hits.clear();
  }
}
