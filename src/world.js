// Terrain, props, hazards and interactables for one stage.
import * as THREE from 'three';
import { PROPS } from './data/stages.js';
import { buildGeometry, buildMesh } from './models.js';
import { makeNoise, mulberry32, clamp, lerp, TAU } from './util.js';

export const WORLD_HALF = 150;
export const PLAY_HALF = 138;
const SEG = 150;

export class World {
  constructor(scene, stage, seed) {
    this.scene = scene;
    this.stage = stage;
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.root = new THREE.Group();
    scene.add(this.root);
    this.colliders = []; // static circles {x,z,r}
    this.colGrid = new Map();
    this.interactables = [];
    this.patches = []; // quicksand patches {x,z,r}
    this.hazardLevel = -Infinity;
    this.time = 0;

    this.buildTerrain();
    this.buildEnvironment();
    this.buildProps();
    this.placeInteractables();
  }

  // ───────────────────────── terrain ─────────────────────────
  rawHeight(x, z, noise) {
    const t = this.stage.terrain;
    let h;
    if (t.ridged) {
      const n = noise.fbm(x * t.freq, z * t.freq, 4);
      h = (1 - Math.abs(n) * 2.2) * t.amp * 0.8 + noise.fbm(x * t.freq * 0.4 + 30, z * t.freq * 0.4, 3) * t.amp;
    } else {
      h = noise.fbm(x * t.freq, z * t.freq, 5) * t.amp * 1.6;
      h += noise.fbm(x * t.freq * 3.1 + 11, z * t.freq * 3.1, 2) * t.amp * 0.18;
    }
    if (t.flatten) h *= 1 - t.flatten;
    // gentle spawn area
    const r = Math.hypot(x, z);
    const spawnFlat = clamp(r / 22, 0, 1);
    h = lerp(h * 0.25, h, spawnFlat);
    // mountain rim at the edge of the map
    if (r > PLAY_HALF - 8) h += Math.pow(r - (PLAY_HALF - 8), 1.7) * 0.35;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (edge > PLAY_HALF - 4) h += Math.pow(edge - (PLAY_HALF - 4), 1.6) * 0.5;
    return h;
  }

  buildTerrain() {
    const noise = makeNoise(this.seed);
    const n = SEG + 1;
    const step = (WORLD_HALF * 2) / SEG;
    this.step = step;
    const heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -WORLD_HALF + i * step, z = -WORLD_HALF + j * step;
        heights[j * n + i] = this.rawHeight(x, z, noise);
      }
    }
    // hazard level: low areas flood with lava / ice
    const hz = this.stage.hazard;
    if (hz === 'lava' || hz === 'ice') {
      const sorted = Array.from(heights).filter((_, k) => {
        const i = k % n, j = Math.floor(k / n);
        const x = -WORLD_HALF + i * step, z = -WORLD_HALF + j * step;
        return Math.hypot(x, z) < PLAY_HALF;
      }).sort((a, b) => a - b);
      this.hazardLevel = sorted[Math.floor(sorted.length * (hz === 'lava' ? 0.13 : 0.2))];
      for (let k = 0; k < heights.length; k++) {
        const i = k % n, j = Math.floor(k / n);
        const x = -WORLD_HALF + i * step, z = -WORLD_HALF + j * step;
        if (Math.hypot(x, z) < 20) heights[k] = Math.max(heights[k], this.hazardLevel + 0.6);
        if (heights[k] < this.hazardLevel) {
          heights[k] = hz === 'ice' ? this.hazardLevel - 0.05 : Math.max(heights[k], this.hazardLevel - 0.9);
        }
      }
    }
    this.heights = heights;
    this.n = n;

    const pos = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    const g = this.stage.ground;
    const cLow = new THREE.Color(g.low), cHigh = new THREE.Color(g.high);
    const cSteep = new THREE.Color(g.steep), cAcc = new THREE.Color(g.accent);
    const tmp = new THREE.Color();
    let minH = Infinity, maxH = -Infinity;
    for (const h of heights) { if (h < minH) minH = h; if (h > maxH) maxH = h; }
    const r = mulberry32(this.seed + 7);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = -WORLD_HALF + i * step, z = -WORLD_HALF + j * step;
        pos[k * 3] = x; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = z;
        const hx = heights[j * n + Math.min(i + 1, n - 1)] - heights[j * n + Math.max(i - 1, 0)];
        const hz2 = heights[Math.min(j + 1, n - 1) * n + i] - heights[Math.max(j - 1, 0) * n + i];
        const slope = Math.hypot(hx, hz2) / (2 * step);
        const t = clamp((heights[k] - minH) / (Math.min(maxH, 14) - minH + 0.001), 0, 1);
        tmp.copy(cLow).lerp(cHigh, t);
        tmp.lerp(cSteep, clamp((slope - 0.35) * 2.2, 0, 1));
        if (r() < 0.12) tmp.lerp(cAcc, 0.6);
        const jit = 0.94 + r() * 0.1;
        col[k * 3] = tmp.r * jit; col[k * 3 + 1] = tmp.g * jit; col[k * 3 + 2] = tmp.b * jit;
      }
    }
    const idx = [];
    for (let j = 0; j < SEG; j++) {
      for (let i = 0; i < SEG; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.terrain = new THREE.Mesh(geo, mat);
    this.root.add(this.terrain);

    if (hz === 'lava' || hz === 'ice') {
      const pg = new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2, 1, 1);
      pg.rotateX(-Math.PI / 2);
      const pm = hz === 'lava'
        ? new THREE.MeshBasicMaterial({ color: 0xff5a10 })
        : new THREE.MeshPhongMaterial({ color: 0xbfe8ff, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.9 });
      this.hazardPlane = new THREE.Mesh(pg, pm);
      this.hazardPlane.position.y = this.hazardLevel + (hz === 'lava' ? -0.35 : 0.02);
      this.root.add(this.hazardPlane);
    }
  }

  heightAt(x, z) {
    const n = this.n, step = this.step;
    const fx = (x + WORLD_HALF) / step, fz = (z + WORLD_HALF) / step;
    const i = clamp(Math.floor(fx), 0, SEG - 1), j = clamp(Math.floor(fz), 0, SEG - 1);
    const u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
    const H = this.heights;
    const ha = H[j * n + i], hb = H[j * n + i + 1], hc = H[(j + 1) * n + i], hd = H[(j + 1) * n + i + 1];
    if (u + v <= 1) return ha + (hb - ha) * u + (hc - ha) * v;
    return hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - v);
  }

  // surface the player walks on (ice sits on top of the terrain)
  groundAt(x, z) {
    const h = this.heightAt(x, z);
    if (this.stage.hazard === 'ice') return Math.max(h, this.hazardLevel + 0.02);
    return h;
  }

  slopeAt(x, z) {
    const e = 0.8;
    return {
      x: (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e),
      z: (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e),
    };
  }

  // What the player is standing in: 'lava' | 'ice' | 'quicksand' | null
  surfaceAt(x, z) {
    const hz = this.stage.hazard;
    if (hz === 'lava') return this.heightAt(x, z) < this.hazardLevel - 0.05 ? 'lava' : null;
    if (hz === 'ice') return this.heightAt(x, z) <= this.hazardLevel + 0.01 ? 'ice' : null;
    if (hz === 'quicksand') {
      for (const p of this.patches) if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return 'quicksand';
    }
    return null;
  }

  isHazard(x, z) {
    const s = this.surfaceAt(x, z);
    return s === 'lava' || s === 'quicksand';
  }

  // ─────────────────────── lights / sky ───────────────────────
  buildEnvironment() {
    const s = this.stage;
    this.scene.background = new THREE.Color(s.sky);
    this.scene.fog = new THREE.Fog(s.fog, s.fogNear, s.fogFar);
    const hemi = new THREE.HemisphereLight(s.hemi[0], s.hemi[1], s.hemi[2]);
    this.root.add(hemi);
    const sun = new THREE.DirectionalLight(s.sun[0], s.sun[1]);
    sun.position.set(60, 100, 40);
    this.root.add(sun);

    // big distant decorations
    const r = this.rng;
    if (s.id === 'graveyard') {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf2f0d8, fog: false }));
      moon.position.set(-160, 120, -220);
      this.root.add(moon);
    }
    if (s.id === 'dunes') {
      const sunBall = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false }));
      sunBall.position.set(180, 140, -200);
      this.root.add(sunBall);
    }
    // floating particles (leaves / sand / wisps / snow / embers)
    const pCount = 400;
    const pGeo = new THREE.BufferGeometry();
    const pp = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pp[i * 3] = (r() - 0.5) * 120; pp[i * 3 + 1] = r() * 30; pp[i * 3 + 2] = (r() - 0.5) * 120;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pColor = { woods: 0xc8f07a, dunes: 0xfff0c0, graveyard: 0x9fb8ff, tundra: 0xffffff, caldera: 0xff8a2a }[s.id];
    this.particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: pColor, size: s.id === 'tundra' ? 0.35 : 0.22, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    this.particles.frustumCulled = false;
    this.root.add(this.particles);
  }

  // ───────────────────────── props ─────────────────────────
  addCollider(x, z, r) {
    const c = { x, z, r };
    this.colliders.push(c);
    const cs = 8;
    const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
    const z0 = Math.floor((z - r) / cs), z1 = Math.floor((z + r) / cs);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = i * 1000 + j;
      let b = this.colGrid.get(k);
      if (!b) { b = []; this.colGrid.set(k, b); }
      b.push(c);
    }
  }

  // Push a circle out of static colliders. Returns adjusted {x,z} in `out`.
  pushOut(x, z, r, out) {
    const cs = 8;
    const k = Math.floor(x / cs) * 1000 + Math.floor(z / cs);
    const b = this.colGrid.get(k);
    out.x = x; out.z = z;
    if (b) {
      for (let i = 0; i < b.length; i++) {
        const c = b[i];
        const dx = out.x - c.x, dz = out.z - c.z;
        const rr = r + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          out.x = c.x + (dx / d) * rr;
          out.z = c.z + (dz / d) * rr;
        }
      }
    }
    out.x = clamp(out.x, -PLAY_HALF, PLAY_HALF);
    out.z = clamp(out.z, -PLAY_HALF, PLAY_HALF);
    return out;
  }

  freeSpot(minR = 12, maxR = PLAY_HALF - 6, clearance = 3, tries = 60) {
    const r = this.rng;
    for (let t = 0; t < tries; t++) {
      const a = r() * TAU, d = minR + r() * (maxR - minR);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) > PLAY_HALF - 4 || Math.abs(z) > PLAY_HALF - 4) continue;
      if (this.isHazard(x, z) || this.surfaceAt(x, z) === 'ice') continue;
      let ok = true;
      for (const c of this.colliders) {
        if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + clearance) ** 2) { ok = false; break; }
      }
      if (!ok) continue;
      for (const it of this.interactables) {
        if ((it.x - x) ** 2 + (it.z - z) ** 2 < 64) { ok = false; break; }
      }
      if (ok) return { x, z };
    }
    const a = r() * TAU, d = minR + r() * (maxR - minR);
    return { x: Math.cos(a) * d, z: Math.sin(a) * d };
  }

  buildProps() {
    const r = this.rng;
    const glowKinds = { lantern: 0x553300, crystal: 0x662200, vent: 0x441100, obelisk: 0x201500 };
    if (this.stage.hazard === 'quicksand') {
      for (let i = 0; i < 16; i++) {
        const a = r() * TAU, d = 25 + r() * 105;
        const p = { x: Math.cos(a) * d, z: Math.sin(a) * d, r: 4 + r() * 5 };
        this.patches.push(p);
        const g = new THREE.CircleGeometry(p.r, 20);
        g.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x9a7040, transparent: true, opacity: 0.85, depthWrite: false }));
        m.position.set(p.x, this.heightAt(p.x, p.z) + 0.12, p.z);
        m.renderOrder = 1;
        this.root.add(m);
        const swirl = new THREE.Mesh(new THREE.RingGeometry(p.r * 0.3, p.r * 0.45, 20).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x7a5530, transparent: true, opacity: 0.6, depthWrite: false }));
        swirl.position.copy(m.position).y += 0.02;
        this.root.add(swirl);
        p.swirl = swirl;
      }
    }
    const dummy = new THREE.Object3D();
    for (const pd of this.stage.props) {
      const geo = buildGeometry(PROPS[pd.kind]);
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      if (glowKinds[pd.kind]) mat.emissive = new THREE.Color(glowKinds[pd.kind]);
      const inst = new THREE.InstancedMesh(geo, mat, pd.count);
      let placed = 0;
      for (let k = 0; k < pd.count * 3 && placed < pd.count; k++) {
        const x = (r() * 2 - 1) * (PLAY_HALF + 6), z = (r() * 2 - 1) * (PLAY_HALF + 6);
        if (Math.hypot(x, z) < 12) continue;
        if (this.isHazard(x, z) || (this.stage.hazard && this.surfaceAt(x, z) === 'ice' && pd.collide)) continue;
        const s = pd.scale[0] + r() * (pd.scale[1] - pd.scale[0]);
        dummy.position.set(x, this.heightAt(x, z) - 0.1, z);
        dummy.rotation.set(0, r() * TAU, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        inst.setMatrixAt(placed++, dummy.matrix);
        if (pd.collide) this.addCollider(x, z, pd.collide * s);
      }
      inst.count = placed;
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      this.root.add(inst);
    }
  }

  // ─────────────────────── interactables ───────────────────────
  addInteractable(it) {
    it.mesh.position.set(it.x, this.heightAt(it.x, it.z), it.z);
    this.root.add(it.mesh);
    this.interactables.push(it);
    if (it.collide) this.addCollider(it.x, it.z, it.collide);
    return it;
  }

  placeInteractables() {
    // Boss portal far from spawn.
    const pp = this.freeSpot(85, PLAY_HALF - 12, 5);
    this.portal = this.addInteractable({ type: 'portal', x: pp.x, z: pp.z, mesh: makePortal(), state: 'dormant', radius: 5 });

    for (let i = 0; i < 16; i++) {
      const p = this.freeSpot(14, PLAY_HALF - 8, 2.5);
      this.addChest(p.x, p.z, false);
    }
    for (let i = 0; i < 7; i++) {
      const p = this.freeSpot(20, PLAY_HALF - 8, 4);
      const golden = this.rng() < 0.15;
      this.addInteractable({ type: 'charge', golden, x: p.x, z: p.z, mesh: makeChargeShrine(golden), progress: 0, radius: 5, collide: 0.8 });
    }
    const special = ['greed', 'challenge', 'challenge', 'magnet', 'magnet', 'greed'];
    for (const type of special) {
      const p = this.freeSpot(25, PLAY_HALF - 8, 4);
      const mesh = type === 'greed' ? makeGreedShrine() : type === 'challenge' ? makeChallengeShrine() : makeMagnetShrine();
      this.addInteractable({ type, x: p.x, z: p.z, mesh, radius: 3.5, collide: 0.9 });
    }
    for (let i = 0; i < 45; i++) {
      const p = this.freeSpot(8, PLAY_HALF - 6, 1.5);
      this.addInteractable({ type: 'pot', x: p.x, z: p.z, mesh: makePot(this.stage.id, this.rng), radius: 1.2 });
    }
  }

  addChest(x, z, free) {
    return this.addInteractable({ type: 'chest', free, x, z, mesh: makeChest(free), radius: 3 });
  }

  removeInteractable(it) {
    this.root.remove(it.mesh);
    const i = this.interactables.indexOf(it);
    if (i >= 0) this.interactables.splice(i, 1);
    it.removed = true;
  }

  update(dt, player) {
    this.time += dt;
    const t = this.time;
    for (const it of this.interactables) {
      const m = it.mesh;
      if (it.type === 'portal') {
        m.userData.ring.rotation.z += dt * (it.state === 'open' ? 2.5 : 0.6);
        m.userData.disc.rotation.z -= dt * 1.5;
        const c = it.state === 'open' ? 0x40ffd0 : it.state === 'active' ? 0xff3040 : 0x9a40ff;
        m.userData.disc.material.color.setHex(c);
        m.userData.beam.material.color.setHex(c);
        m.userData.beam.material.opacity = 0.18 + Math.sin(t * 3) * 0.06;
      } else if (it.type === 'charge') {
        m.userData.crystal.position.y = 2.6 + Math.sin(t * 2 + it.x) * 0.2;
        m.userData.crystal.rotation.y += dt * 1.5;
        const ring = m.userData.fill;
        ring.scale.setScalar(Math.max(0.001, it.progress));
      } else if (it.type === 'chest') {
        if (m.userData.glow) m.userData.glow.rotation.y += dt;
      } else if (it.type === 'magnet' || it.type === 'greed') {
        if (m.userData.spin) m.userData.spin.rotation.y += dt * 1.2;
      }
    }
    for (const p of this.patches) p.swirl.rotation.y += dt * 0.8;
    if (this.hazardPlane && this.stage.hazard === 'lava') {
      const k = 0.85 + Math.sin(t * 1.7) * 0.15;
      this.hazardPlane.material.color.setRGB(1 * k, 0.35 * k, 0.06);
    }
    // particles follow the player loosely & drift
    if (this.particles && player) {
      const pa = this.particles.geometry.attributes.position.array;
      const fall = { woods: 0.6, dunes: -0.1, graveyard: -0.3, tundra: 2.2, caldera: -1.5 }[this.stage.id];
      for (let i = 0; i < pa.length; i += 3) {
        pa[i + 1] -= fall * dt;
        pa[i] += Math.sin(t + i) * dt * 0.6 + (this.stage.id === 'dunes' ? dt * 4 : 0);
        const dx = pa[i] - player.x, dz = pa[i + 2] - player.z;
        if (dx > 60) pa[i] -= 120; else if (dx < -60) pa[i] += 120;
        if (dz > 60) pa[i + 2] -= 120; else if (dz < -60) pa[i + 2] += 120;
        const base = player.y;
        if (pa[i + 1] < base - 5) pa[i + 1] += 35; else if (pa[i + 1] > base + 30) pa[i + 1] -= 35;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }
}

// ───────────────────── interactable models ─────────────────────
function makeChest(free) {
  const g = new THREE.Group();
  const body = buildMesh([
    { shape: 'box', size: [1.4, 0.8, 0.9], pos: [0, 0.4, 0], color: free ? 0x6a3aa0 : 0x8a5a2a },
    { shape: 'box', size: [1.46, 0.12, 0.96], pos: [0, 0.12, 0], color: 0xd8b040 },
    { shape: 'box', size: [1.46, 0.12, 0.96], pos: [0, 0.72, 0], color: 0xd8b040 },
    { shape: 'box', size: [1.4, 0.45, 0.9], pos: [0, 1.02, 0], color: free ? 0x7a4ab8 : 0x9a6a36 },
    { shape: 'box', size: [0.25, 0.3, 0.1], pos: [0, 0.8, 0.48], color: 0xf2d060 },
  ]);
  g.add(body);
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: free ? 0xc080ff : 0xffd24a, transparent: true, opacity: 0.55, depthWrite: false }));
  glow.position.y = 0.06;
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

function makeChargeShrine(golden) {
  const g = new THREE.Group();
  g.add(buildMesh([
    { shape: 'cyl', size: [1.2, 1.4, 0.4, 8], seg: 8, pos: [0, 0.2, 0], color: 0x8a8a92 },
    { shape: 'cyl', size: [0.35, 0.5, 1.6, 6], seg: 6, pos: [0, 1.2, 0], color: 0xa0a0a8 },
    { shape: 'box', size: [1.2, 0.2, 0.2], pos: [0, 1.9, 0], color: 0x707078 },
  ]));
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55),
    new THREE.MeshLambertMaterial({ color: golden ? 0xffc93a : 0x5ac8ff, emissive: golden ? 0x7a5000 : 0x0a4a7a, flatShading: true }));
  crystal.scale.set(0.8, 1.4, 0.8);
  crystal.position.y = 2.6;
  g.add(crystal);
  const ringMat = new THREE.MeshBasicMaterial({ color: golden ? 0xffd24a : 0x5ac8ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.8, 5, 40).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.15;
  g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(5, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: golden ? 0xffd24a : 0x5ac8ff, transparent: true, opacity: 0.25, depthWrite: false }));
  fill.position.y = 0.12;
  g.add(fill);
  g.userData = { crystal, fill };
  return g;
}

function makeGreedShrine() {
  const g = new THREE.Group();
  g.add(buildMesh([
    { shape: 'box', size: [1.6, 0.5, 1.6], pos: [0, 0.25, 0], color: 0x6a5a3a },
    { shape: 'box', size: [1.0, 1.4, 1.0], pos: [0, 1.2, 0], color: 0x8a7a4a },
  ]));
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.18, 16).rotateX(Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x5a4000 }));
  coin.position.y = 2.8;
  g.add(coin);
  g.userData.spin = coin;
  return g;
}

function makeChallengeShrine() {
  return buildMesh([
    { shape: 'box', size: [1.8, 0.4, 1.4], pos: [0, 0.2, 0], color: 0x5a5a60 },
    { shape: 'box', size: [1.3, 2.6, 1.0], pos: [0, 1.7, 0], color: 0x7a7a82 },
    { shape: 'box', size: [1.5, 0.5, 1.2], pos: [0, 3.2, -0.05], color: 0x6a6a72 },
    { shape: 'box', size: [0.3, 1.0, 0.4], pos: [0, 2.0, 0.6], color: 0x6a6a72 },
    { shape: 'box', size: [0.3, 0.15, 0.1], pos: [-0.3, 2.5, 0.52], color: 0xff2a2a },
    { shape: 'box', size: [0.3, 0.15, 0.1], pos: [0.3, 2.5, 0.52], color: 0xff2a2a },
    { shape: 'box', size: [0.6, 0.12, 0.1], pos: [0, 1.4, 0.52], color: 0x2a2a2a },
  ], { emissive: 0x1a0000 });
}

function makeMagnetShrine() {
  const g = new THREE.Group();
  g.add(buildMesh([
    { shape: 'cyl', size: [1, 1.2, 0.5, 8], seg: 8, pos: [0, 0.25, 0], color: 0x5a5a6a },
    { shape: 'cyl', size: [0.3, 0.4, 1.4, 6], seg: 6, pos: [0, 1.2, 0], color: 0x7a7a8a },
  ]));
  const mag = buildMesh([
    { shape: 'torus', size: [0.7, 0.22], pos: [0, 0, 0], color: 0xd83a3a, seg: 12 },
    { shape: 'box', size: [0.44, 0.5, 0.44], pos: [-0.7, -0.3, 0], color: 0xeeeeee },
    { shape: 'box', size: [0.44, 0.5, 0.44], pos: [0.7, -0.3, 0], color: 0xeeeeee },
  ]);
  mag.position.y = 2.7;
  g.add(mag);
  g.userData.spin = mag;
  return g;
}

function makePot(stageId, r) {
  const col = { woods: 0xb86a3a, dunes: 0xc88a4a, graveyard: 0x6a6a7a, tundra: 0x8ab0c8, caldera: 0x5a3a2a }[stageId];
  const m = buildMesh([
    { shape: 'sphere', size: [0.5], pos: [0, 0.5, 0], color: col, scale: [1, 1.1, 1] },
    { shape: 'cyl', size: [0.25, 0.3, 0.3], pos: [0, 1.05, 0], color: col },
    { shape: 'torus', size: [0.28, 0.06], pos: [0, 1.2, 0], rot: [Math.PI / 2, 0, 0], color: 0x3a2a1a },
  ]);
  m.rotation.y = r() * TAU;
  return m;
}

function makePortal() {
  const g = new THREE.Group();
  g.add(buildMesh([
    { shape: 'cyl', size: [3.6, 4, 0.5, 10], seg: 10, pos: [0, 0.25, 0], color: 0x4a4a55 },
    { shape: 'box', size: [0.9, 6.5, 0.9], pos: [-3.3, 3.2, 0], color: 0x5a5a66 },
    { shape: 'box', size: [0.9, 6.5, 0.9], pos: [3.3, 3.2, 0], color: 0x5a5a66 },
    { shape: 'box', size: [8, 0.9, 1.2], pos: [0, 6.6, 0], color: 0x4a4a55 },
    { shape: 'oct', size: [0.5], pos: [0, 7.4, 0], color: 0xff4af0 },
  ]));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 6, 24),
    new THREE.MeshLambertMaterial({ color: 0x6a3aa0, emissive: 0x3a1a60, flatShading: true }));
  ring.position.y = 3.3;
  g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.45, 7),
    new THREE.MeshBasicMaterial({ color: 0x9a40ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  disc.position.y = 3.3;
  g.add(disc);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 80, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9a40ff, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 40;
  g.add(beam);
  g.userData = { ring, disc, beam };
  return g;
}
