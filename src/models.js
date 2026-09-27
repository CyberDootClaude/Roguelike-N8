// Builds low-poly models out of primitive parts and merges them into a single
// vertex-coloured BufferGeometry, so each enemy type renders as one InstancedMesh.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function primitive(p) {
  const s = p.size || [1, 1, 1];
  switch (p.shape) {
    case 'box': return new THREE.BoxGeometry(s[0], s[1], s[2]);
    case 'sphere': return new THREE.SphereGeometry(s[0], p.seg || 8, p.segY || 6);
    case 'ico': return new THREE.IcosahedronGeometry(s[0], p.detail || 0);
    case 'oct': return new THREE.OctahedronGeometry(s[0], 0);
    case 'dodeca': return new THREE.DodecahedronGeometry(s[0], 0);
    case 'cone': return new THREE.ConeGeometry(s[0], s[1], p.seg || 7);
    case 'cyl': return new THREE.CylinderGeometry(s[0], s[1] ?? s[0], s[2] ?? 1, p.seg || 8);
    case 'torus': return new THREE.TorusGeometry(s[0], s[1], 5, p.seg || 10);
    case 'tetra': return new THREE.TetrahedronGeometry(s[0], 0);
    default: throw new Error('unknown shape ' + p.shape);
  }
}

// parts: [{shape,size,pos,rot,scale,color}]
export function buildGeometry(parts) {
  const positions = [], normals = [], colors = [];
  for (const p of parts) {
    let g = primitive(p);
    if (g.index) g = g.toNonIndexed();
    _e.set(...(p.rot || [0, 0, 0]));
    _q.setFromEuler(_e);
    _v.set(...(p.pos || [0, 0, 0]));
    _s.set(...(p.scale || [1, 1, 1]));
    _m.compose(_v, _q, _s);
    g.applyMatrix4(_m);
    g.computeVertexNormals();
    _c.set(p.color ?? 0xffffff);
    const pa = g.attributes.position.array, na = g.attributes.normal.array;
    for (let i = 0; i < pa.length; i++) { positions.push(pa[i]); normals.push(na[i]); }
    for (let i = 0; i < pa.length / 3; i++) colors.push(_c.r, _c.g, _c.b);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

export function buildMesh(parts, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...opts });
  return new THREE.Mesh(buildGeometry(parts), mat);
}

// Helpers for common "creature" bits.
export const eyes = (y, z, spread = 0.18, r = 0.09, color = 0x111111) => [
  { shape: 'sphere', size: [r], pos: [-spread, y, z], color: 0xffffff, seg: 6, segY: 4 },
  { shape: 'sphere', size: [r], pos: [spread, y, z], color: 0xffffff, seg: 6, segY: 4 },
  { shape: 'sphere', size: [r * 0.55], pos: [-spread, y, z + r * 0.6], color, seg: 5, segY: 4 },
  { shape: 'sphere', size: [r * 0.55], pos: [spread, y, z + r * 0.6], color, seg: 5, segY: 4 },
];

export const glowEyes = (y, z, spread = 0.18, r = 0.08, color = 0xff3322) => [
  { shape: 'sphere', size: [r], pos: [-spread, y, z], color, seg: 5, segY: 4 },
  { shape: 'sphere', size: [r], pos: [spread, y, z], color, seg: 5, segY: 4 },
];

// A pool of instances drawn by a single InstancedMesh. Items are plain objects
// with x,y,z,(ry,rx,sx,sy,sz,cr,cg,cb). Removal is swap-and-pop.
export class InstancePool {
  constructor(scene, geometry, material, capacity, { colored = false, frustum = false } = {}) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = frustum;
    this.mesh.count = 0;
    this.colored = colored;
    if (colored) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.capacity = capacity;
    this.items = [];
    scene.add(this.mesh);
  }
  add(item) {
    if (this.items.length >= this.capacity) return null;
    this.items.push(item);
    return item;
  }
  remove(item) {
    const i = this.items.indexOf(item);
    if (i >= 0) {
      this.items[i] = this.items[this.items.length - 1];
      this.items.pop();
    }
  }
  clear() { this.items.length = 0; this.mesh.count = 0; }
  sync() {
    const arr = this.items, n = arr.length;
    const cols = this.colored ? this.mesh.instanceColor.array : null;
    for (let i = 0; i < n; i++) {
      const it = arr[i];
      _e.set(it.rx || 0, it.ry || 0, it.rz || 0);
      _q.setFromEuler(_e);
      _v.set(it.x, it.y, it.z);
      const s = it.s ?? 1;
      _s.set((it.sx ?? 1) * s, (it.sy ?? 1) * s, (it.sz ?? 1) * s);
      _m.compose(_v, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      if (cols) {
        cols[i * 3] = it.cr ?? 1; cols[i * 3 + 1] = it.cg ?? 1; cols[i * 3 + 2] = it.cb ?? 1;
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (cols) this.mesh.instanceColor.needsUpdate = true;
  }
  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.dispose();
  }
}
