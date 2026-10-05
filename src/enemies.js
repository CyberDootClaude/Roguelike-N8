// Enemy manager: spawning director, AI archetypes, rendering via instanced pools, death & drops.
import * as THREE from 'three';
import { ENEMIES } from './data/enemies.js';
import { buildGeometry, InstancePool } from './models.js';
import { SpatialHash, clamp, rand, TAU, weightedPick } from './util.js';
import { PLAY_HALF } from './world.js';

const CAP = 320;
const _o = { x: 0, z: 0 };
const _n = [];

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.pools = {};
    this.geos = {};
    this.hash = new SpatialHash(3);
    this.spawnAcc = 0;
    this.waveTimer = 45;
    this.eliteTimer = 80;
    this.challengeGroups = [];
  }

  reset() {
    for (const p of Object.values(this.pools)) {
      p.dispose(this.game.scene);
      p.mesh.material.dispose();
    }
    for (const g of Object.values(this.geos)) g.geo.dispose();
    this.pools = {};
    this.geos = {};
    this.list.length = 0;
    this.hash.clear();
    this.spawnAcc = 0;
    this.waveTimer = 45;
    this.eliteTimer = 80;
    this.challengeGroups = [];
  }

  pool(id) {
    if (!this.pools[id]) {
      const def = ENEMIES[id];
      const geo = buildGeometry(def.parts);
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      this.geos[id] = { geo, height: bb.max.y - Math.min(0, bb.min.y) };
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...(def.material || {}) });
      if (def.material?.emissive) mat.emissive = new THREE.Color(def.material.emissive);
      this.pools[id] = new InstancePool(this.game.scene, geo, mat, 260, { colored: true });
      this.pools[id].mesh.castShadow = true;
    }
    return this.pools[id];
  }

  // ───────────────────── queries ─────────────────────
  query(x, z, r, out) { return this.hash.query(x, z, r, out || []); }

  nearest(x, z, range) {
    // weapons focus a boss that is in range
    const b = this.game.boss;
    if (b && !b.dead && !b.e.untargetable && !b.e.invuln && (b.x - x) ** 2 + (b.z - z) ** 2 < (range + b.def.radius) ** 2) return b.e;
    let best = null, bd = range * range;
    for (const e of this.hash.query(x, z, range, _n)) {
      if (!e.alive || e.untargetable) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  inRange(x, z, r, out = []) {
    out.length = 0;
    for (const e of this.hash.query(x, z, r, _n)) {
      if (!e.alive || e.untargetable) continue;
      if ((e.x - x) ** 2 + (e.z - z) ** 2 < r * r) out.push(e);
    }
    return out;
  }

  blastAll(x, z, r, dmg) {
    for (const e of this.query(x, z, r)) {
      if (e.alive && !e.boss) this.game.combat.damage(e, dmg, { noProc: true, kb: 2, silent: true });
    }
  }

  // ───────────────────── scaling ─────────────────────
  scaling() {
    const g = this.game, run = g.run;
    const min = g.stageTime / 60;
    const curse = g.player.stats.curse;
    const base = g.stage.mult * Math.pow(4, run.loop);
    const over = g.finalSwarm ? 1 + g.overtime / 25 : 1;
    return {
      hp: base * (1 + min * 0.16) * (1 + curse * 0.5) * over * g.mods.enemyHp,
      dmg: Math.pow(base, 0.6) * (1 + min * 0.05) * (1 + curse * 0.2) * (g.finalSwarm ? 1.3 : 1) * g.mods.enemyDmg,
      speed: Math.min(1.3, 1 + min * 0.025) * (g.finalSwarm ? 1.2 : 1) * g.mods.enemySpeed,
      xp: 1 + g.stageIndex * 0.35 + run.loop,
    };
  }

  spawn(id, x, z, opts = {}) {
    if (this.list.length >= CAP + 40 && !opts.force) return null;
    const def = ENEMIES[id];
    const pool = this.pool(id);
    const sc = this.scaling();
    const elite = !!opts.elite;
    const hp = def.hp * sc.hp * (elite ? 12 : 1) * (opts.hpMult || 1);
    const size = (elite ? 1.7 : 1) * this.game.mods.enemySize;
    const vis = { x, y: 0, z, s: size, cr: 1, cg: 1, cb: 1 };
    if (!pool.add(vis)) return null;
    const flying = def.ai === 'flier' || def.flying;
    const e = {
      def, id, x, z, y: this.game.world.heightAt(x, z) + (flying ? def.hover || 2 : 0),
      hp, maxHp: hp, damage: def.damage * sc.dmg * (elite ? 1.6 : 1), speed: def.speed * sc.speed * rand(0.9, 1.1),
      radius: def.radius * size, height: this.geos[id].height * size,
      xp: def.xp * sc.xp * (elite ? 25 : 1), alive: true, elite, boss: false, flying, vis, pool,
      kx: 0, kz: 0, slowT: 0, freezeT: 0, poisonT: 0, poisonDps: 0, poisonAcc: 0, hitFlash: 0,
      t: rand(0, 10), fireCd: rand(1, def.fireCd || 3), blinkCd: rand(1, def.blinkCd || 4), chargeCd: rand(1, 3),
      state: 'walk', stateT: 0, ry: 0, contactCd: 0, challenge: opts.challenge || null,
      baseS: vis.s, spawnT: opts.instant ? 1 : 0,
    };
    this.list.push(e);
    return e;
  }

  spawnPos(minD = 30, maxD = 42) {
    const p = this.game.player, w = this.game.world;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU, d = rand(minD, maxD);
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      if (Math.abs(x) > PLAY_HALF - 2 || Math.abs(z) > PLAY_HALF - 2) continue;
      if (w.surfaceAt(x, z) === 'lava') continue;
      return { x, z };
    }
    const a = Math.random() * TAU;
    return { x: clamp(p.x + Math.sin(a) * minD, -PLAY_HALF + 2, PLAY_HALF - 2), z: clamp(p.z + Math.cos(a) * minD, -PLAY_HALF + 2, PLAY_HALF - 2) };
  }

  rosterPick() {
    const g = this.game;
    const min = g.stageTime / 60;
    const avail = g.stage.roster.filter((r) => r.from <= min + (g.finalSwarm ? 99 : 0));
    return weightedPick(avail).id;
  }

  spawnElite() {
    const pos = this.spawnPos(28, 36);
    const id = this.rosterPick();
    const e = this.spawn(id, pos.x, pos.z, { elite: true, force: true });
    if (e) this.game.ui.toast(`⚠️ Elite ${e.def.name} approaches!`, '#ffcf4a');
    return e;
  }

  startChallenge(x, z) {
    const group = { remaining: 0, x, z };
    const n = 10 + this.game.stageIndex * 3;
    const id = this.rosterPick();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const e = this.spawn(i % 4 === 0 ? this.rosterPick() : id, x + Math.sin(a) * 9, z + Math.cos(a) * 9, { challenge: group, force: true, hpMult: 1.6 });
      if (e) group.remaining++;
    }
    const el = this.spawn(this.rosterPick(), x, z + 11, { elite: true, challenge: group, force: true });
    if (el) group.remaining++;
    this.challengeGroups.push(group);
  }

  // ───────────────────── director ─────────────────────
  direct(dt) {
    const g = this.game;
    const min = g.stageTime / 60;
    const curse = g.player.stats.curse;
    let target = (16 + min * 14) * (1 + curse * 0.6);
    if (g.finalSwarm) target *= 2.2;
    if (g.bossActive) target *= 0.45;
    target = Math.min(CAP, target * g.mods.spawnCap);
    const rate = (3 + min * 2) * (g.finalSwarm ? 3 : 1) * (1 + curse * 0.5) * g.mods.spawnRate;
    this.spawnAcc += dt * rate;
    let alive = this.list.length;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (alive >= target) { this.spawnAcc = Math.min(this.spawnAcc, 2); break; }
      const pos = this.spawnPos();
      if (this.spawn(this.rosterPick(), pos.x, pos.z)) alive++;
    }
    if (!g.bossActive) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveTimer = 55;
        const id = this.rosterPick();
        const n = Math.floor(14 + min * 5);
        const p = g.player;
        const off = Math.random() * TAU;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * TAU;
          const d = 24 + Math.random() * 4;
          const x = clamp(p.x + Math.sin(a) * d, -PLAY_HALF + 2, PLAY_HALF - 2);
          const z = clamp(p.z + Math.cos(a) * d, -PLAY_HALF + 2, PLAY_HALF - 2);
          this.spawn(id, x, z, { force: true });
        }
        g.ui.toast('A horde surrounds you!', '#ff8a6a');
      }
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.eliteTimer = (g.finalSwarm ? 25 : 70) * g.mods.eliteEvery;
        this.spawnElite();
      }
    }
  }

  // ───────────────────── update ─────────────────────
  update(dt) {
    const g = this.game, p = g.player, world = g.world;
    this.hash.clear();
    for (const e of this.list) this.hash.insert(e);
    if (!g.paused && g.spawning) this.direct(dt);

    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (!e.alive) continue;
      if (e.boss) continue; // bosses drive themselves
      e.t += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.contactCd = Math.max(0, e.contactCd - dt);
      // poison
      if (e.poisonT > 0) {
        e.poisonT -= dt;
        const d = e.poisonDps * dt;
        e.hp -= d;
        e.poisonAcc += d;
        if (e.poisonAcc > Math.max(1, e.maxHp * 0.05)) {
          g.fx.text(e.x, e.y + e.height, e.z, String(Math.round(e.poisonAcc)), '#8aff5a', 0.7);
          e.poisonAcc = 0;
        }
        if (e.hp <= 0) { this.kill(e); continue; }
      }
      const dx = p.x - e.x, dz = p.z - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const ux = dx / dist, uz = dz / dist;

      // far away → recycle closer to the player
      if (dist > 75 && !e.elite && !e.challenge) {
        const pos = this.spawnPos(32, 40);
        e.x = pos.x; e.z = pos.z;
        continue;
      }

      let mvx = 0, mvz = 0;
      let spd = e.speed * (e.slowT > 0 ? 0.5 : 1);
      e.slowT -= dt;
      const def = e.def;
      if (e.freezeT > 0) {
        e.freezeT -= dt;
        spd = 0;
      } else {
        switch (def.ai) {
          case 'ranged': {
            const range = def.range;
            if (dist > range * 0.85) { mvx = ux; mvz = uz; }
            else if (dist < range * 0.45) { mvx = -ux; mvz = -uz; }
            else { mvx = -uz * 0.6; mvz = ux * 0.6; }
            this.tryShoot(e, dt, dist);
            break;
          }
          case 'exploder': {
            if (e.state === 'fuse') {
              e.stateT -= dt;
              spd = 0;
              e.hitFlash = Math.floor(e.stateT * 12) % 2 ? 0.1 : 0;
              if (e.stateT <= 0) { this.detonate(e); continue; }
            } else {
              mvx = ux; mvz = uz;
              if (dist < 2.4) { e.state = 'fuse'; e.stateT = 0.7; g.audio.play('warn'); }
            }
            break;
          }
          case 'charger': {
            e.chargeCd -= dt;
            if (e.state === 'walk') {
              mvx = ux; mvz = uz;
              if (dist < 15 && e.chargeCd <= 0) {
                e.state = 'wind'; e.stateT = 0.8;
                e.cdx = ux; e.cdz = uz;
                const gy = world.heightAt(e.x, e.z) + 0.3;
                g.fx.beam(e.x, gy, e.z, e.x + ux * 14, gy, e.z + uz * 14, 0.25, 0xff3030, 0.8);
              }
            } else if (e.state === 'wind') {
              spd = 0; e.stateT -= dt;
              e.vis.rz = Math.sin(e.t * 40) * 0.08;
              if (e.stateT <= 0) { e.state = 'dash'; e.stateT = 0.6; e.vis.rz = 0; }
            } else if (e.state === 'dash') {
              mvx = e.cdx; mvz = e.cdz; spd = 17 * (e.slowT > 0 ? 0.6 : 1);
              e.stateT -= dt;
              if (e.stateT <= 0) { e.state = 'rest'; e.stateT = 0.7; }
            } else {
              spd = 0; e.stateT -= dt;
              if (e.stateT <= 0) { e.state = 'walk'; e.chargeCd = rand(3, 4.5); }
            }
            break;
          }
          case 'teleporter': {
            e.blinkCd -= dt;
            mvx = ux; mvz = uz;
            if (e.blinkCd <= 0 && dist > 7) {
              e.blinkCd = def.blinkCd * rand(0.8, 1.3);
              g.fx.burst(e.x, e.y + 1, e.z, 0xc080ff, 10, 4);
              const a = Math.random() * TAU, d = rand(5, 8);
              e.x = clamp(p.x + Math.sin(a) * d, -PLAY_HALF, PLAY_HALF);
              e.z = clamp(p.z + Math.cos(a) * d, -PLAY_HALF, PLAY_HALF);
              g.fx.burst(e.x, e.y + 1, e.z, 0xc080ff, 10, 4);
            }
            if (def.shoots) this.tryShoot(e, dt, dist);
            break;
          }
          case 'flier': {
            const w = Math.sin(e.t * 2.2) * 0.6;
            mvx = ux - uz * w; mvz = uz + ux * w;
            if (def.shoots) {
              if (dist < def.range * 0.6) { mvx = -uz; mvz = ux; }
              this.tryShoot(e, dt, dist);
            }
            break;
          }
          default:
            mvx = ux; mvz = uz;
        }
      }

      // separation from neighbours
      let sx = 0, sz = 0;
      const neigh = this.hash.query(e.x, e.z, e.radius + 1.2, _n);
      for (let k = 0; k < neigh.length; k++) {
        const o = neigh[k];
        if (o === e || !o.alive) continue;
        const ox = e.x - o.x, oz = e.z - o.z;
        const rr = e.radius + o.radius;
        const d2 = ox * ox + oz * oz;
        if (d2 < rr * rr && d2 > 1e-5) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / rr;
          sx += (ox / d) * push; sz += (oz / d) * push;
        }
      }
      e.x += (mvx * spd + sx * 4 + e.kx) * dt;
      e.z += (mvz * spd + sz * 4 + e.kz) * dt;
      const kd = Math.exp(-8 * dt);
      e.kx *= kd; e.kz *= kd;
      if (!e.flying && e.radius < 1.5) {
        world.pushOut(e.x, e.z, e.radius * 0.8, _o);
        e.x = _o.x; e.z = _o.z;
      } else {
        e.x = clamp(e.x, -PLAY_HALF, PLAY_HALF); e.z = clamp(e.z, -PLAY_HALF, PLAY_HALF);
      }
      const gh = world.groundAt(e.x, e.z);
      if (e.flying) e.y = gh + (def.hover || 2) + Math.sin(e.t * 3) * 0.3;
      else e.y = gh;

      if (mvx || mvz) {
        const target = Math.atan2(mvx, mvz);
        let d = target - e.ry;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        e.ry += d * Math.min(1, dt * 10);
      }

      // contact damage
      if (dist < e.radius + p.radius + 0.1 && e.contactCd <= 0) {
        const pyRel = p.y - e.y;
        if (pyRel < e.height - 0.2 && pyRel > -2) {
          if (p.hurt(e.damage, { source: def.name })) {
            if (p.stats.thorns) g.combat.damage(e, p.stats.thorns, { noCrit: true, noProc: true });
          }
          e.contactCd = 0.5;
        }
      }

      // visuals
      const v = e.vis;
      v.x = e.x; v.z = e.z; v.ry = e.ry;
      const moving = spd > 0 && (mvx || mvz);
      v.y = e.y + (moving && !e.flying ? Math.abs(Math.sin(e.t * spd * 1.8)) * 0.12 : 0);
      const squash = moving ? 1 + Math.sin(e.t * spd * 3.6) * 0.04 : 1;
      v.sy = squash; v.sx = v.sz = 2 - squash;
      // waddle + lean so walkers don't just slide around
      if (!(def.ai === 'charger' && e.state === 'wind')) {
        v.rz = e.flying ? Math.sin(e.t * 2.4) * 0.15 : moving ? Math.sin(e.t * spd * 1.8) * 0.09 : 0;
        v.rx = e.state === 'dash' ? 0.35 : moving && !e.flying ? 0.08 : 0;
      }
      if (e.hitFlash > 0) { v.cr = v.cg = v.cb = 3; }
      else if (e.freezeT > 0) { v.cr = 0.55; v.cg = 0.85; v.cb = 1.8; }
      else if (e.poisonT > 0) { v.cr = 0.7; v.cg = 1.35; v.cb = 0.55; }
      else if (e.elite) { v.cr = 1.45; v.cg = 1.15; v.cb = 0.45; }
      else { v.cr = v.cg = v.cb = 1; }
      v.s = e.baseS;
      if (def.ai === 'exploder' && e.state === 'fuse') v.s = e.baseS * (1 + (0.7 - e.stateT) * 0.5);
      // rise out of the ground when spawning
      if (e.spawnT < 1) {
        e.spawnT = Math.min(1, e.spawnT + dt * 2.2);
        const k = e.spawnT;
        v.s *= 0.35 + 0.65 * k;
        if (!e.flying) v.y -= (1 - k) * e.height * 0.8;
      }
    }

    // compact dead
    let j = 0;
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (e.alive) this.list[j++] = e;
    }
    this.list.length = j;
    for (const pool of Object.values(this.pools)) pool.sync();
  }

  tryShoot(e, dt, dist) {
    const def = e.def, g = this.game, p = g.player;
    e.fireCd -= dt;
    if (e.fireCd > 0 || dist > def.range) return;
    e.fireCd = def.fireCd * rand(0.85, 1.2);
    const sy = e.y + e.height * 0.6;
    const n = def.burst || 1;
    const lead = dist / def.projSpeed;
    const tx = p.x + p.vx * lead * 0.5, tz = p.z + p.vz * lead * 0.5;
    const a = Math.atan2(tx - e.x, tz - e.z);
    const d = Math.hypot(tx - e.x, tz - e.z) || 1;
    const vy = (p.y + 1 - sy) / (d / def.projSpeed);
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * 0.18;
      g.hazards.bullet(e.x, sy, e.z, Math.sin(aa) * def.projSpeed, vy, Math.cos(aa) * def.projSpeed, e.damage, def.projColor, { source: def.name });
    }
  }

  detonate(e) {
    const g = this.game, p = g.player;
    const r = e.def.blastRadius || 3;
    g.fx.explosion(e.x, e.y + 0.6, e.z, r, 0xff6a2a);
    g.audio.play('explode');
    if ((p.x - e.x) ** 2 + (p.z - e.z) ** 2 < r * r && p.y - e.y < 2.5) p.hurt(e.damage, { source: e.def.name });
    this.kill(e, { noDrop: false });
  }

  kill(e, { noDrop = false } = {}) {
    if (!e.alive) return;
    e.alive = false;
    const g = this.game;
    if (e.boss) { e.onDeath?.(); return; }
    e.pool.remove(e.vis);
    g.run.kills++;
    g.stageKills++;
    g.fx.burst(e.x, e.y + e.height * 0.5, e.z, e.elite ? 0xffd24a : e.def.parts[0].color, e.elite ? 24 : 7, 5, 0.5, 1 + e.radius * 0.6);
    if (e.challenge) {
      e.challenge.remaining--;
      if (e.challenge.remaining <= 0) {
        g.ui.toast('Challenge complete! A reward chest appears.', '#ffcf4a');
        g.run.challenges++;
        g.world.addChest(e.challenge.x + 3, e.challenge.z, true);
        g.audio.play('chest');
        this.challengeGroups.splice(this.challengeGroups.indexOf(e.challenge), 1);
      }
    }
    if (e.def.splitInto) {
      for (let i = 0; i < e.def.splitCount; i++) {
        const a = (i / e.def.splitCount) * TAU + Math.random();
        const c = this.spawn(e.def.splitInto, e.x + Math.sin(a) * 0.8, e.z + Math.cos(a) * 0.8, { force: true, instant: true, hpMult: e.elite ? 4 : 1 });
        if (c) { c.kx = Math.sin(a) * 8; c.kz = Math.cos(a) * 8; }
      }
    }
    // Chain Reaction mutator
    if (g.mods.deathBlast && Math.random() < g.mods.deathBlast && (this.blastDepth || 0) < 3) {
      this.blastDepth = (this.blastDepth || 0) + 1;
      g.combat.explode(e.x, e.y + 0.6, e.z, 2.6 + e.radius, e.maxHp * 0.6, { noProc: true, noCrit: true, color: 0xff9a3a });
      this.blastDepth--;
    }
    if (noDrop) return;
    const pk = g.pickups;
    if (e.xp > 0) pk.gem(e.x, e.y + 0.5, e.z, e.xp);
    if (Math.random() < (e.elite ? 1 : 0.2)) pk.coin(e.x, e.y + 0.5, e.z, Math.ceil((1 + Math.random() * 2) * (1 + g.stageIndex * 0.6) * (e.elite ? 12 : 1)));
    if (Math.random() < 0.006) pk.heart(e.x, e.y + 0.5, e.z);
    if (Math.random() < 0.0015) pk.magnet(e.x, e.y + 0.5, e.z);
    if (e.elite) {
      g.hitStop(0.06);
      g.world.addChest(e.x, e.z, true);
      g.ui.toast('Elite slain! It dropped a chest.', '#ffcf4a');
    }
  }
}
