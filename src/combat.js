// Player-side combat: damage pipeline, on-hit procs, player projectiles, puddles, mines.
import * as THREE from 'three';
import { InstancePool, buildGeometry } from './models.js';
import { rand } from './util.js';

const _near = [];

function basicMat(color) { return new THREE.MeshBasicMaterial({ color }); }
function vcMat(extra = {}) { return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...extra }); }

export class Combat {
  constructor(game) {
    this.game = game;
    const s = game.scene;
    this.projectiles = [];
    this.puddles = [];
    this.mines = [];
    this.pools = {
      arrow: new InstancePool(s, buildGeometry([
        { shape: 'box', size: [0.06, 0.06, 1.1], pos: [0, 0, 0], color: 0x8a6a3a },
        { shape: 'cone', size: [0.1, 0.25, 4], seg: 4, pos: [0, 0, 0.62], rot: [Math.PI / 2, 0, 0], color: 0xdddddd },
        { shape: 'box', size: [0.2, 0.02, 0.2], pos: [0, 0, -0.5], color: 0xffffff },
      ]), vcMat({ emissive: 0x222222 }), 300),
      bullet: new InstancePool(s, new THREE.SphereGeometry(0.16, 6, 4), basicMat(0xffe070), 300),
      fireball: new InstancePool(s, new THREE.IcosahedronGeometry(0.4, 0), basicMat(0xff7a1a), 120),
      disc: new InstancePool(s, new THREE.TorusGeometry(0.35, 0.1, 4, 10).rotateX(Math.PI / 2), basicMat(0x7afff0), 300),
      boomerang: new InstancePool(s, buildGeometry([
        { shape: 'box', size: [0.9, 0.08, 0.22], pos: [0.3, 0, 0.2], rot: [0, 0.7, 0], color: 0xd8a04a },
        { shape: 'box', size: [0.9, 0.08, 0.22], pos: [-0.3, 0, 0.2], rot: [0, -0.7, 0], color: 0xb8803a },
      ]), vcMat({ emissive: 0x332200 }), 60),
      flask: new InstancePool(s, buildGeometry([
        { shape: 'sphere', size: [0.25], pos: [0, 0, 0], color: 0x8aff4a },
        { shape: 'cyl', size: [0.08, 0.08, 0.2], pos: [0, 0.3, 0], color: 0xdddddd },
      ]), vcMat({ emissive: 0x224400 }), 60),
      meteor: new InstancePool(s, new THREE.DodecahedronGeometry(0.9, 0), basicMat(0xff5a1a), 60),
      mine: new InstancePool(s, buildGeometry([
        { shape: 'cyl', size: [0.45, 0.5, 0.25, 8], seg: 8, pos: [0, 0.12, 0], color: 0xe8e0c8 },
        { shape: 'sphere', size: [0.12], pos: [0, 0.3, 0], color: 0xff3a2a },
      ]), vcMat({ emissive: 0x220000 }), 120),
    };
    this.puddleGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  }

  clear() {
    this.projectiles.length = 0;
    for (const p of Object.values(this.pools)) p.clear();
    for (const p of this.puddles) { this.game.scene.remove(p.mesh); p.mesh.material.dispose(); }
    this.puddles.length = 0;
    this.mines.length = 0;
  }

  // ─────────────────────── damage pipeline ───────────────────────
  damage(e, amount, opts = {}) {
    if (!e.alive || e.invuln || e.untargetable) return 0;
    const game = this.game, st = game.player.stats;
    let dmg = amount * st.damage;
    if (st.berserk) dmg *= 1 + 0.6 * (1 - game.player.hp / st.maxHp);
    if (st.soulHarvest) dmg *= 1 + 0.01 * Math.floor(game.run.kills / 100) * st.soulHarvest;
    if (e.elite || e.boss) dmg *= 1 + (st.eliteDamage || 0);
    let crit = false;
    if (!opts.noCrit && Math.random() < st.crit + (opts.crit || 0)) {
      crit = true;
      dmg *= st.critDmg;
    }
    dmg *= rand(0.92, 1.08);
    e.hp -= dmg;
    e.hitFlash = 0.12;
    game.run.damageDealt += dmg;

    if (opts.kb && !e.boss) {
      const fx = opts.fromX ?? game.player.x, fz = opts.fromZ ?? game.player.z;
      let dx = e.x - fx, dz = e.z - fz;
      const d = Math.hypot(dx, dz) || 1;
      const mass = e.radius * e.radius * (e.elite ? 4 : 1);
      const k = (opts.kb * 7) / Math.max(0.3, mass);
      e.kx += (dx / d) * k; e.kz += (dz / d) * k;
    }
    if (opts.slow) e.slowT = Math.max(e.slowT, opts.slow);
    if (crit) game.audio.play('crit');
    if (game.settings.damageNumbers && (game.fx.texts.length < 70 || crit)) {
      const n = dmg >= 1 ? Math.round(dmg) : Math.round(dmg * 10) / 10;
      game.fx.text(e.x, e.y + e.height + 0.3, e.z, crit ? n + '!' : String(n), crit ? '#ffb020' : '#ffffff', crit ? 1.3 : 0.9);
    }
    if (!opts.noProc) this.procs(e, dmg);
    if (!opts.silent) game.audio.play('hit');
    if (e.hp <= 0) game.enemies.kill(e);
    return dmg;
  }

  procs(e, dmg) {
    const game = this.game, st = game.player.stats;
    if (st.lifesteal && Math.random() < st.lifesteal) game.player.heal(2);
    if (st.freezeChance && Math.random() < st.freezeChance && !e.boss) {
      e.freezeT = 1.5;
      game.fx.burst(e.x, e.y + 1, e.z, 0x9fe8ff, 5, 3);
    }
    if (st.poison) {
      e.poisonT = 3;
      e.poisonDps = Math.max(e.poisonDps * 0.5, (dmg * st.poison) / 3);
    }
    if (st.explodeChance && Math.random() < st.explodeChance) {
      this.explode(e.x, e.y + 0.8, e.z, 2.8, dmg * 0.6, { noProc: true, color: 0xff9a3a, kb: 0.5 });
    }
    if (st.chainChance && Math.random() < st.chainChance) {
      this.chain(e, dmg * 0.5, 3, 7, { noProc: true });
    }
  }

  explode(x, y, z, r, dmg, opts = {}) {
    const game = this.game;
    game.fx.explosion(x, y, z, r, opts.color ?? 0xff8a2a);
    game.audio.play('explode');
    const list = game.enemies.query(x, z, r + 1.5);
    for (const e of list) {
      const rr = r + e.radius;
      if ((e.x - x) ** 2 + (e.z - z) ** 2 < rr * rr) {
        this.damage(e, dmg, { ...opts, fromX: x, fromZ: z, silent: true });
      }
    }
  }

  chain(first, dmg, jumps, range, opts = {}) {
    const game = this.game;
    const hit = new Set();
    const pts = [];
    let cur = first;
    if (opts.fromSky) pts.push({ x: cur.x, y: cur.y + 14, z: cur.z });
    for (let i = 0; i < jumps && cur; i++) {
      hit.add(cur);
      pts.push({ x: cur.x, y: cur.y + cur.height * 0.6, z: cur.z });
      this.damage(cur, dmg, { ...opts, silent: true });
      let best = null, bd = range * range;
      for (const e of game.enemies.query(cur.x, cur.z, range)) {
        if (hit.has(e) || !e.alive) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
      dmg *= 0.9;
    }
    if (pts.length > 1) game.fx.lightning(pts, opts.color ?? 0xbfe4ff);
    else if (pts.length === 1) game.fx.lightning([{ ...pts[0], y: pts[0].y + 10 }, pts[0]], opts.color ?? 0xbfe4ff);
    game.audio.play('zap');
  }

  // ─────────────────────── projectiles ───────────────────────
  spawnProjectile(p) {
    const pool = this.pools[p.kind];
    const vis = { x: p.x, y: p.y, z: p.z, s: p.size ?? 1 };
    if (!pool.add(vis)) return null;
    p.vis = vis;
    p.hit = p.hit || new Set();
    p.t = 0;
    this.projectiles.push(p);
    return p;
  }

  removeProjectile(i) {
    const p = this.projectiles[i];
    this.pools[p.kind].remove(p.vis);
    this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
    this.projectiles.pop();
  }

  update(dt) {
    const game = this.game, world = game.world, player = game.player;
    const ps = this.projectiles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt;
      if (p.kind === 'boomerang') {
        // out then back to the player
        if (!p.returning && p.t > p.outTime) { p.returning = true; p.hit.clear(); }
        if (p.returning) {
          const dx = player.x - p.x, dy = player.y + 1.2 - p.y, dz = player.z - p.z;
          const d = Math.hypot(dx, dy, dz);
          if (d < 1.2) { this.removeProjectile(i); continue; }
          const sp = p.speed * 1.15;
          p.vx = (dx / d) * sp; p.vy = (dy / d) * sp; p.vz = (dz / d) * sp;
        } else {
          const k = 1 - p.t / p.outTime;
          p.vx = p.dirX * p.speed * (0.3 + k); p.vz = p.dirZ * p.speed * (0.3 + k); p.vy = 0;
        }
        p.vis.ry = (p.vis.ry || 0) + dt * 18;
      } else if (p.lob) {
        p.vy -= 26 * dt;
      } else if (p.kind === 'disc') {
        p.vis.ry = (p.vis.ry || 0) + dt * 14;
      }
      const px0 = p.x, py0 = p.y, pz0 = p.z;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.kind === 'arrow' || p.kind === 'bullet') {
        p.vis.ry = Math.atan2(p.vx, p.vz);
        p.vis.rx = -Math.atan2(p.vy, Math.hypot(p.vx, p.vz));
      } else if (p.kind === 'fireball' || p.kind === 'meteor' || p.kind === 'flask') {
        p.vis.rx = (p.vis.rx || 0) + dt * 6; p.vis.ry = (p.vis.ry || 0) + dt * 4;
        if (Math.random() < 0.5) game.fx.burst(p.x, p.y, p.z, p.kind === 'flask' ? 0x8aff4a : 0xff8a2a, 1, 1, 0.3, 0.8);
      }
      p.vis.x = p.x; p.vis.y = p.y; p.vis.z = p.z;

      const ground = world.heightAt(p.x, p.z);
      let dead = p.t > p.life;
      if (p.lob || p.kind === 'meteor') {
        if (p.y <= ground + 0.1) { p.onLand?.(p); dead = true; }
      } else if (p.kind === 'fireball') {
        if (p.y < ground - 0.2) { dead = true; if (p.onExpire) p.onExpire(p); }
      } else if (p.y < ground + 0.35) {
        // arrows, bullets and discs skim over hills instead of dying on them
        p.y = ground + 0.35;
        if (p.vy < 0) p.vy = 0;
        p.vis.y = p.y;
      }
      if (!dead && p.hits !== false) {
        // swept test along this frame's path so fast projectiles can't tunnel through enemies
        const pr = p.radius ?? 0.4;
        const sx = p.x - px0, sz = p.z - pz0, sl2 = sx * sx + sz * sz;
        const mx = (p.x + px0) / 2, mz = (p.z + pz0) / 2;
        const near = game.enemies.query(mx, mz, pr + 3 + Math.sqrt(sl2) / 2, _near);
        for (let k = 0; k < near.length; k++) {
          const e = near[k];
          if (!e.alive || p.hit.has(e)) continue;
          const rr = pr + e.radius;
          const t = sl2 > 1e-6 ? Math.max(0, Math.min(1, ((e.x - px0) * sx + (e.z - pz0) * sz) / sl2)) : 1;
          const cx = px0 + sx * t, cz = pz0 + sz * t, cy = py0 + (p.y - py0) * t;
          if ((e.x - cx) ** 2 + (e.z - cz) ** 2 > rr * rr) continue;
          if (cy < e.y - 0.6 || cy > e.y + e.height + 0.8) continue;
          p.hit.add(e);
          if (p.onHit) { p.onHit(p, e); if (p.explodes) { dead = true; break; } }
          else this.damage(e, p.dmg, { crit: p.crit, kb: p.kb, fromX: p.x - p.vx * 0.1, fromZ: p.z - p.vz * 0.1 });
          p.pierce--;
          if (p.pierce < 0) { dead = true; break; }
        }
      }
      if (dead) {
        if (p.onExpire && p.t > p.life) p.onExpire(p);
        this.removeProjectile(i);
      }
    }
    for (const pool of Object.values(this.pools)) if (pool !== this.pools.mine) pool.sync();

    // puddles
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      pd.t += dt; pd.tick -= dt;
      pd.mesh.material.opacity = 0.45 * Math.min(1, (pd.dur - pd.t) * 2);
      if (pd.tick <= 0) {
        pd.tick = 0.4;
        for (const e of game.enemies.query(pd.x, pd.z, pd.r + 1.5)) {
          if ((e.x - pd.x) ** 2 + (e.z - pd.z) ** 2 < (pd.r + e.radius) ** 2 && e.y < pd.y + 2.5) {
            this.damage(e, pd.dmg, { noCrit: false, crit: pd.crit, slow: 0.5, silent: true, noProc: Math.random() > 0.3 });
          }
        }
        game.fx.burst(pd.x + rand(-pd.r, pd.r) * 0.6, pd.y + 0.2, pd.z + rand(-pd.r, pd.r) * 0.6, pd.color, 2, 2, 0.5);
      }
      if (pd.t >= pd.dur) {
        game.scene.remove(pd.mesh);
        pd.mesh.material.dispose();
        this.puddles.splice(i, 1);
      }
    }

    // mines
    const mp = this.pools.mine;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.t += dt;
      m.vis.ry = (m.vis.ry || 0) + dt * 2;
      let boom = m.t > m.life;
      if (!boom && m.t > 0.5) {
        for (const e of game.enemies.query(m.x, m.z, 2.2)) {
          if ((e.x - m.x) ** 2 + (e.z - m.z) ** 2 < (1.4 + e.radius) ** 2) { boom = true; break; }
        }
      }
      if (boom) {
        this.explode(m.x, m.y + 0.5, m.z, m.r, m.dmg, { crit: m.crit, kb: m.kb, color: 0xffd05a });
        mp.remove(m.vis);
        this.mines.splice(i, 1);
      }
    }
    mp.sync();
  }

  addPuddle(x, z, r, dur, dmg, crit, color = 0x6aff3a) {
    const y = this.game.world.heightAt(x, z);
    const mesh = new THREE.Mesh(this.puddleGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }));
    mesh.position.set(x, y + 0.15, z);
    mesh.scale.setScalar(r);
    this.game.scene.add(mesh);
    this.puddles.push({ x, y, z, r, dur, dmg, crit, t: 0, tick: 0, mesh, color });
  }

  addMine(x, z, r, life, dmg, crit, kb) {
    const y = this.game.world.heightAt(x, z);
    const vis = { x, y, z };
    if (!this.pools.mine.add(vis)) return;
    this.mines.push({ x, y, z, r, life, dmg, crit, kb, t: 0, vis });
  }
}
