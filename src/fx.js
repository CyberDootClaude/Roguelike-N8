// Purely visual effects: particles, rings, flashes, beams, lightning, floating text.
import * as THREE from 'three';
import { InstancePool } from './models.js';
import { rand } from './util.js';

const RING = new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2);
const DISC = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
const SPHERE = new THREE.IcosahedronGeometry(1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2); // along +Z
const _c = new THREE.Color();
const _v = new THREE.Vector3();

export class FX {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.temps = [];
    this.texts = [];
    this.particles = new InstancePool(this.scene, new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffffff }), 900, { colored: true });
  }

  clear() {
    for (const t of this.temps) this.disposeTemp(t);
    this.temps.length = 0;
    this.texts.length = 0;
    this.particles.clear();
  }

  text(x, y, z, str, color = '#fff', scale = 1) {
    if (this.texts.length > 80) this.texts.shift();
    this.texts.push({ x: x + rand(-0.3, 0.3), y, z: z + rand(-0.3, 0.3), str, color, t: 0, life: 0.8, scale });
  }

  burst(x, y, z, color, count = 8, speed = 5, life = 0.5, size = 1) {
    _c.set(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, e = rand(0.2, 1.2);
      const s = speed * rand(0.4, 1);
      this.particles.add({
        x, y, z, vx: Math.cos(a) * s * Math.cos(e), vy: Math.sin(e) * s, vz: Math.sin(a) * s * Math.cos(e),
        life: life * rand(0.6, 1.2), t: 0, s: size * rand(0.7, 1.4), cr: _c.r, cg: _c.g, cb: _c.b, rx: 0, ry: 0,
      });
    }
  }

  addTemp(mesh, dur, update) {
    this.scene.add(mesh);
    const t = { mesh, t: 0, dur, update };
    this.temps.push(t);
    return t;
  }

  disposeTemp(t) {
    this.scene.remove(t.mesh);
    if (t.mesh.material) t.mesh.material.dispose();
    if (t.ownGeo) t.mesh.geometry.dispose();
  }

  ring(x, y, z, r0, r1, color, dur = 0.4, opacity = 0.8) {
    const m = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 0.15, z);
    m.scale.setScalar(r0);
    this.addTemp(m, dur, (k) => {
      m.scale.setScalar(r0 + (r1 - r0) * k);
      m.material.opacity = opacity * (1 - k);
    });
  }

  disc(x, y, z, r, color, dur = 0.3, opacity = 0.5) {
    const m = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.position.set(x, y + 0.12, z);
    m.scale.setScalar(r);
    this.addTemp(m, dur, (k) => { m.material.opacity = opacity * (1 - k); });
  }

  explosion(x, y, z, r, color = 0xff8a2a, dur = 0.35) {
    const m = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }));
    m.position.set(x, y, z);
    this.addTemp(m, dur, (k) => {
      m.scale.setScalar(r * (0.3 + 0.7 * Math.sqrt(k)));
      m.material.opacity = 0.75 * (1 - k);
    });
    this.burst(x, y, z, color, 10, r * 3, 0.5, 1.4);
    this.ring(x, this.game.world.groundAt(x, z), z, r * 0.3, r * 1.1, color, dur, 0.6);
  }

  // Arc sweep for melee (angle = facing, spread = half-angle)
  arc(x, y, z, angle, radius, spread, color = 0xffffff, dur = 0.2) {
    const geo = new THREE.RingGeometry(radius * 0.35, radius, 24, 1, 0, spread * 2).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 0.9, z);
    // RingGeometry theta starts at +X, rotated -90deg about X: theta maps into the XZ plane with z = -sin(theta).
    m.rotation.y = angle - Math.PI / 2 - spread;
    const t = this.addTemp(m, dur, (k) => { m.material.opacity = 0.6 * (1 - k); m.scale.setScalar(0.8 + 0.2 * k); });
    t.ownGeo = true;
  }

  beam(x0, y0, z0, x1, y1, z1, width, color, dur = 0.25) {
    const m = new THREE.Mesh(CYL, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.lookAt(_v.set(x1, y1, z1));
    m.scale.set(width, width, len);
    this.addTemp(m, dur, (k) => { m.material.opacity = 0.85 * (1 - k); m.scale.x = m.scale.y = width * (1 - k * 0.7); });
  }

  lightning(points, color = 0xaad8ff, dur = 0.22) {
    const arr = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const segs = 5;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const j0 = s === 0 ? 0 : 0.5, j1 = s === segs - 1 ? 0 : 0.5;
        arr.push(a.x + (b.x - a.x) * t0 + rand(-j0, j0), a.y + (b.y - a.y) * t0 + rand(-j0, j0), a.z + (b.z - a.z) * t0 + rand(-j0, j0));
        arr.push(a.x + (b.x - a.x) * t1 + rand(-j1, j1), a.y + (b.y - a.y) * t1 + rand(-j1, j1), a.z + (b.z - a.z) * t1 + rand(-j1, j1));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 }));
    const t = this.addTemp(m, dur, (k) => { m.material.opacity = 1 - k; });
    t.ownGeo = true;
    // fat glow segments
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      this.beam(a.x, a.y, a.z, b.x, b.y, b.z, 0.12, color, dur);
    }
  }

  update(dt) {
    for (let i = this.temps.length - 1; i >= 0; i--) {
      const t = this.temps[i];
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      t.update?.(k, dt);
      if (t.t >= t.dur) {
        this.disposeTemp(t);
        this.temps[i] = this.temps[this.temps.length - 1];
        this.temps.pop();
      }
    }
    const ps = this.particles.items;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt;
      if (p.t >= p.life) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      p.vy -= 14 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rx += dt * 8; p.ry += dt * 6;
      p.sx = p.sy = p.sz = 1 - p.t / p.life;
    }
    this.particles.sync();
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      t.y += dt * 1.6;
      if (t.t > t.life) this.texts.splice(i, 1);
    }
  }
}
