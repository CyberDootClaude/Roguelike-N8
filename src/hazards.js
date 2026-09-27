// Enemy-side threats: bullets, telegraphed AoE (circles, lines), shockwave rings, lingering zones.
import * as THREE from 'three';
import { InstancePool } from './models.js';

const DISC = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
const RING = new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2);
const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); // unit, centered
const _c = new THREE.Color();

export class Hazards {
  constructor(game) {
    this.game = game;
    this.bullets = [];
    this.telegraphs = [];
    this.waves = [];
    this.zones = [];
    this.bulletPool = new InstancePool(game.scene, new THREE.IcosahedronGeometry(0.32, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }), 700, { colored: true });
  }

  clear() {
    for (const t of this.telegraphs) this.removeMeshes(t);
    for (const w of this.waves) this.removeMeshes(w);
    for (const z of this.zones) this.removeMeshes(z);
    this.telegraphs.length = this.waves.length = this.zones.length = 0;
    this.bullets.length = 0;
    this.bulletPool.clear();
  }

  removeMeshes(o) {
    for (const m of o.meshes || []) {
      this.game.scene.remove(m);
      m.material.dispose();
      if (m.userData.ownGeo) m.geometry.dispose();
    }
  }

  mat(color, opacity) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  }

  // Enemy projectile. y is world height; bullets can be jumped over.
  bullet(x, y, z, vx, vy, vz, dmg, color = 0xff4040, opts = {}) {
    _c.set(color);
    const vis = { x, y, z, s: opts.size ?? 1, cr: _c.r * 1.3, cg: _c.g * 1.3, cb: _c.b * 1.3 };
    if (!this.bulletPool.add(vis)) return null;
    const b = { x, y, z, vx, vy, vz, dmg, vis, t: 0, life: opts.life ?? 5, r: 0.45 * (opts.size ?? 1), homing: opts.homing || 0, gravity: opts.gravity || 0, source: opts.source || 'Projectile', onLand: opts.onLand };
    this.bullets.push(b);
    return b;
  }

  // Aimed ring/fan helpers
  radial(x, y, z, count, speed, dmg, color, offset = 0, opts) {
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      this.bullet(x, y, z, Math.sin(a) * speed, 0, Math.cos(a) * speed, dmg, color, opts);
    }
  }

  fan(x, y, z, angle, count, spread, speed, dmg, color, opts) {
    for (let i = 0; i < count; i++) {
      const a = angle + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
      this.bullet(x, y, z, Math.sin(a) * speed, 0, Math.cos(a) * speed, dmg, color, opts);
    }
  }

  // Ground circle that detonates after `warn` seconds.
  circle(x, z, r, warn, dmg, color = 0xff3030, opts = {}) {
    const y = this.game.world.groundAt(x, z) + 0.14;
    const outline = new THREE.Mesh(RING, this.mat(color, 0.8));
    const fill = new THREE.Mesh(DISC, this.mat(color, 0.25));
    outline.position.set(x, y + 0.01, z); outline.scale.setScalar(r);
    fill.position.set(x, y, z); fill.scale.setScalar(0.01);
    this.game.scene.add(outline, fill);
    this.telegraphs.push({ type: 'circle', x, z, r, warn, t: 0, dmg, color, meshes: [outline, fill], fill, opts });
  }

  // Line/rectangle from (x,z) in direction angle.
  line(x, z, angle, len, width, warn, dmg, color = 0xff3030, opts = {}) {
    const dx = Math.sin(angle), dz = Math.cos(angle);
    const cx = x + dx * len / 2, cz = z + dz * len / 2;
    const y = Math.max(this.game.world.groundAt(x, z), this.game.world.groundAt(cx, cz)) + 0.2;
    const fill = new THREE.Mesh(PLANE, this.mat(color, 0.28));
    fill.position.set(cx, y, cz);
    fill.rotation.y = angle;
    fill.scale.set(width, 1, len);
    const edge = new THREE.Mesh(PLANE, this.mat(color, 0.6));
    edge.position.set(cx, y + 0.01, cz);
    edge.rotation.y = angle;
    edge.scale.set(width, 1, 0.01);
    this.game.scene.add(fill, edge);
    this.telegraphs.push({ type: 'line', x, z, angle, dx, dz, len, width, warn, t: 0, dmg, color, meshes: [fill, edge], fill: edge, opts });
  }

  // Expanding ring the player must jump over.
  shockwave(x, z, speed, maxR, dmg, color = 0xffa030, width = 0.9) {
    const y = this.game.world.groundAt(x, z) + 0.3;
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 4, 64).rotateX(Math.PI / 2), this.mat(color, 0.9));
    m.position.set(x, y, z);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 64, 1, true), this.mat(color, 0.35));
    wall.position.set(x, y + 0.3, z);
    m.userData.ownGeo = wall.userData.ownGeo = true;
    this.game.scene.add(m, wall);
    this.waves.push({ x, z, y, r: 1, speed, maxR, dmg, width, meshes: [m, wall], hit: false });
    this.game.audio.play('explode');
  }

  // Lingering damaging/slowing area.
  zone(x, z, r, dur, dps, color = 0xff5020, slow = 0) {
    const y = this.game.world.groundAt(x, z) + 0.13;
    const m = new THREE.Mesh(DISC, this.mat(color, 0.35));
    m.position.set(x, y, z); m.scale.setScalar(r);
    this.game.scene.add(m);
    this.zones.push({ x, z, r, dur, dps, slow, t: 0, meshes: [m], tick: 0 });
  }

  update(dt) {
    const game = this.game, p = game.player, world = game.world;
    const scene = game.scene;
    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.t += dt;
      if (b.homing) {
        const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz) || 1;
        const sp = Math.hypot(b.vx, b.vz);
        b.vx += (dx / d) * sp * b.homing * dt; b.vz += (dz / d) * sp * b.homing * dt;
        const s2 = Math.hypot(b.vx, b.vz) || 1;
        b.vx *= sp / s2; b.vz *= sp / s2;
        const ty = p.y + 1;
        b.vy += (ty - b.y) * dt * 2;
        b.vy *= 0.95;
      }
      if (b.gravity) b.vy -= b.gravity * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.vis.x = b.x; b.vis.y = b.y; b.vis.z = b.z;
      b.vis.rx = b.t * 5; b.vis.ry = b.t * 4;
      let dead = b.t > b.life;
      const g = world.heightAt(b.x, b.z);
      if (b.y < g - 0.3) { dead = true; b.onLand?.(b); }
      if (!dead) {
        const dx = p.x - b.x, dz = p.z - b.z;
        if (dx * dx + dz * dz < (b.r + 0.5) ** 2 && b.y > p.y - 0.3 && b.y < p.y + 2.1) {
          p.hurt(b.dmg, { source: b.source });
          dead = true;
        }
      }
      if (dead) {
        this.bulletPool.remove(b.vis);
        this.bullets[i] = this.bullets[this.bullets.length - 1];
        this.bullets.pop();
      }
    }
    this.bulletPool.sync();

    // telegraphs
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.t += dt;
      const k = Math.min(1, t.t / t.warn);
      if (t.type === 'circle') t.fill.scale.setScalar(Math.max(0.01, t.r * k));
      else t.fill.scale.z = Math.max(0.01, t.len * k), t.fill.position.set(t.x + t.dx * t.len * k / 2, t.fill.position.y, t.z + t.dz * t.len * k / 2);
      if (t.t >= t.warn) {
        let inside = false;
        if (t.type === 'circle') {
          inside = (p.x - t.x) ** 2 + (p.z - t.z) ** 2 < (t.r + 0.4) ** 2;
          if (!t.opts.silent) game.fx.explosion(t.x, world.groundAt(t.x, t.z) + 0.5, t.z, t.r, t.opts.fxColor ?? t.color, 0.35);
        } else {
          const rx = p.x - t.x, rz = p.z - t.z;
          const along = rx * t.dx + rz * t.dz, perp = Math.abs(rx * t.dz - rz * t.dx);
          inside = along > -0.5 && along < t.len + 0.5 && perp < t.width / 2 + 0.4;
          const gy = world.groundAt(t.x, t.z) + 1;
          game.fx.beam(t.x, gy, t.z, t.x + t.dx * t.len, gy, t.z + t.dz * t.len, t.width * 0.45, t.opts.fxColor ?? t.color, 0.35);
        }
        const airborne = p.y - world.groundAt(p.x, p.z) > 1.5;
        if (inside && t.dmg > 0 && !(t.opts.jumpable && airborne)) p.hurt(t.dmg, { source: t.opts.source || 'Boss attack' });
        t.opts.onBoom?.(t);
        this.removeMeshes(t);
        this.telegraphs.splice(i, 1);
      }
    }

    // shockwaves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += w.speed * dt;
      w.meshes[0].scale.setScalar(w.r);
      w.meshes[1].scale.set(w.r, 1, w.r);
      const fade = 1 - w.r / w.maxR;
      w.meshes[0].material.opacity = 0.9 * fade + 0.1;
      w.meshes[1].material.opacity = 0.35 * fade;
      if (!w.hit) {
        const d = Math.hypot(p.x - w.x, p.z - w.z);
        const ground = world.groundAt(p.x, p.z);
        if (Math.abs(d - w.r) < w.width && p.y - ground < 0.9) {
          w.hit = true;
          p.hurt(w.dmg, { source: 'Shockwave' });
        }
      }
      if (w.r >= w.maxR) {
        this.removeMeshes(w);
        this.waves.splice(i, 1);
      }
    }

    // zones
    p.zoneSlow = 0;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt;
      z.meshes[0].material.opacity = 0.35 * Math.min(1, (z.dur - z.t) * 2, z.t * 4);
      const inside = (p.x - z.x) ** 2 + (p.z - z.z) ** 2 < z.r * z.r && p.y - world.groundAt(p.x, p.z) < 1;
      if (inside) {
        if (z.slow) p.zoneSlow = Math.max(p.zoneSlow, z.slow);
        z.tick -= dt;
        if (z.tick <= 0 && z.dps) {
          z.tick = 0.35;
          p.hurt(z.dps * 0.35, { ignoreIframes: true, source: 'Hazard' });
        }
      }
      if (z.t >= z.dur) {
        this.removeMeshes(z);
        this.zones.splice(i, 1);
      }
    }
    void scene;
  }
}
