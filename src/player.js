// Player controller: movement (run, jump, multi-jump, slide), stats, health.
import * as THREE from 'three';
import { buildMesh } from './models.js';
import { BASE_STATS } from './data/loot.js';
import { clamp, TAU } from './util.js';

const GRAVITY = 32;
const JUMP_V = 12.5;
const BASE_SPEED = 8.5;
const _o = { x: 0, z: 0 };

export class Player {
  constructor(game, char) {
    this.game = game;
    this.char = char;
    this.stats = { ...BASE_STATS };
    this.addStats(char.stats);
    this.hp = this.stats.maxHp;
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.radius = 0.5;
    this.onGround = true;
    this.jumpsLeft = this.stats.jumps;
    this.sliding = false;
    this.slideT = 0;
    this.facing = 0;
    this.iframes = 0;
    this.hazardTick = 0;
    this.dead = false;
    this.walkT = 0;
    this.shieldFlash = 0;
    this.lastHurtBy = '';
    this.mesh = makePlayerMesh(char);
    game.scene.add(this.mesh);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    game.scene.add(this.shadow);
  }

  addStats(mods, mult = 1) {
    const before = this.stats.maxHp;
    for (const [k, v] of Object.entries(mods)) {
      this.stats[k] = (this.stats[k] ?? 0) + v * mult;
    }
    if (this.stats.maxHp > before && this.hp !== undefined) this.hp += this.stats.maxHp - before;
    this.stats.armor = Math.min(this.stats.armor, 0.8);
    this.stats.evasion = Math.min(this.stats.evasion, 0.6);
  }

  get speed() { return BASE_SPEED * this.stats.speed; }

  placeAt(x, z) {
    this.x = x; this.z = z;
    this.y = this.game.world.groundAt(x, z);
    this.vx = this.vy = this.vz = 0;
    this.onGround = true;
  }

  update(dt, input, camYaw) {
    const game = this.game, world = game.world;
    if (this.dead) return;
    this.iframes = Math.max(0, this.iframes - dt);

    // Wish direction relative to the camera.
    let ix = 0, iz = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) iz += 1;
    if (input.down('KeyS') || input.down('ArrowDown')) iz -= 1;
    if (input.down('KeyA')) ix -= 1;
    if (input.down('KeyD')) ix += 1;
    if (!ix && !iz && (input.axis.x || input.axis.y)) { ix = input.axis.x; iz = input.axis.y; }
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -fz, rz = fx;
    let wx = fx * iz + rx * ix, wz = fz * iz + rz * ix;
    const wl = Math.hypot(wx, wz);
    const analog = Math.min(1, wl); // partial stick tilt walks slower
    if (wl > 0) { wx /= wl; wz /= wl; }

    const surface = world.surfaceAt(this.x, this.z);
    let speed = this.speed;
    if (surface === 'quicksand' && this.onGround) speed *= 0.5;
    if (this.zoneSlow) speed *= 1 - this.zoneSlow;
    const hs = Math.hypot(this.vx, this.vz);

    // Slide
    const slideKey = input.down('ShiftLeft') || input.down('ShiftRight') || input.down('KeyC') || input.down('ControlLeft');
    if (slideKey && this.onGround && !this.sliding && (wl > 0 || hs > 2)) {
      this.sliding = true;
      this.slideT = 0;
      const dx = wl > 0 ? wx : this.vx / hs, dz = wl > 0 ? wz : this.vz / hs;
      const boost = Math.max(hs, speed * 1.65);
      this.vx = dx * boost; this.vz = dz * boost;
      game.audio.play('swing');
    }
    if (this.sliding) {
      this.slideT += dt;
      if (!slideKey || (this.onGround && hs < speed * 0.75) || this.slideT > 3) this.sliding = false;
    }

    if (this.onGround) {
      if (this.sliding) {
        // low friction, slope pushes you downhill, slight steering
        const sl = world.slopeAt(this.x, this.z);
        this.vx -= sl.x * 28 * dt;
        this.vz -= sl.z * 28 * dt;
        const fr = Math.max(0, 1 - 1.1 * dt);
        this.vx *= fr; this.vz *= fr;
        if (wl > 0) {
          const h2 = Math.hypot(this.vx, this.vz);
          this.vx += wx * 10 * dt; this.vz += wz * 10 * dt;
          const h3 = Math.hypot(this.vx, this.vz) || 1;
          this.vx *= h2 / h3; this.vz *= h2 / h3;
        }
      } else {
        const accel = surface === 'ice' ? 5 : 55;
        const tx = wx * speed * analog, tz = wz * speed * analog;
        const k = Math.min(1, accel * dt / Math.max(speed, 1));
        this.vx += (tx - this.vx) * k * 1.6;
        this.vz += (tz - this.vz) * k * 1.6;
      }
    } else {
      // air control preserving momentum (bunny-hop friendly)
      if (wl > 0) {
        const cap = Math.max(speed, hs);
        this.vx += wx * 30 * dt; this.vz += wz * 30 * dt;
        const h2 = Math.hypot(this.vx, this.vz);
        if (h2 > cap) { this.vx *= cap / h2; this.vz *= cap / h2; }
      }
    }
    const maxH = speed * 3.2;
    const h4 = Math.hypot(this.vx, this.vz);
    if (h4 > maxH) { this.vx *= maxH / h4; this.vz *= maxH / h4; }

    // Jump
    if (input.wasPressed('Space') && this.jumpsLeft > 0) {
      this.vy = JUMP_V * (this.onGround ? 1 : 0.92);
      this.jumpsLeft--;
      this.onGround = false;
      game.audio.play('jump');
      if (!this.onGround && this.jumpsLeft < this.stats.jumps - 1) game.fx.ring(this.x, this.y, this.z, 0.4, 1.5, 0xffffff, 0.3);
    }

    // Integrate
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    world.pushOut(nx, nz, this.radius, _o);
    nx = _o.x; nz = _o.z;
    // interactable colliders don't live in the prop grid: those that collide were added there too
    this.x = nx; this.z = nz;

    const ground = world.groundAt(this.x, this.z);
    if (this.onGround) {
      if (this.y - ground > 0.7 && !this.sliding) {
        this.onGround = false; // walked off a ledge
      } else if (this.y - ground > 1.2) {
        this.onGround = false;
      } else {
        this.y = ground;
        this.vy = 0;
      }
    }
    if (!this.onGround) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= ground) {
        if (this.vy < -14) game.fx.burst(this.x, ground + 0.1, this.z, 0xd8d0c0, 8, 3, 0.35, 0.8);
        this.y = ground;
        this.vy = 0;
        this.onGround = true;
        this.jumpsLeft = this.stats.jumps;
      }
    }
    if (this.onGround) this.jumpsLeft = this.stats.jumps;

    // Hazards
    if (surface === 'lava' && this.y - ground < 0.3) {
      this.hazardTick -= dt;
      if (this.hazardTick <= 0) {
        this.hazardTick = 0.3;
        this.hurt(4 + this.stats.maxHp * 0.035, { ignoreIframes: true, source: 'Lava' });
        game.fx.burst(this.x, this.y + 0.3, this.z, 0xff7a20, 6, 4);
      }
    }

    // slide dust
    if (this.sliding && this.onGround && Math.random() < 0.5) {
      game.fx.burst(this.x, ground + 0.1, this.z, surface === 'ice' ? 0xdff6ff : 0xc8b8a0, 1, 2, 0.4, 0.9);
    }

    // Regen
    if (this.hp < this.stats.maxHp) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);

    // Facing follows movement
    const hv = Math.hypot(this.vx, this.vz);
    if (hv > 0.5) {
      const target = Math.atan2(this.vx, this.vz);
      let d = target - this.facing;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.facing += d * Math.min(1, dt * 14);
    }
    this.walkT += dt * hv * 1.4;
    this.updateMesh(dt, hv);
  }

  updateMesh(dt, hv) {
    const m = this.mesh;
    m.position.set(this.x, this.y, this.z);
    m.rotation.y = this.facing;
    const ud = m.userData;
    if (this.sliding) {
      ud.body.rotation.x = -0.9;
      ud.body.position.y = -0.35;
    } else {
      ud.body.rotation.x = this.onGround ? Math.min(hv * 0.015, 0.15) : -0.1;
      ud.body.position.y = this.onGround ? Math.abs(Math.sin(this.walkT)) * 0.12 * Math.min(1, hv / 4) : 0;
    }
    const sw = this.onGround && !this.sliding ? Math.sin(this.walkT) * 0.7 * Math.min(1, hv / 4) : 0.4;
    ud.legL.rotation.x = sw;
    ud.legR.rotation.x = -sw;
    const flash = this.iframes > 0 && Math.floor(this.iframes * 20) % 2 === 0;
    m.visible = !flash;
    const g = this.game.world.groundAt(this.x, this.z);
    this.shadow.position.set(this.x, g + 0.08, this.z);
    const hh = clamp(1 - (this.y - g) / 8, 0.3, 1);
    this.shadow.scale.setScalar(hh);
  }

  hurt(dmg, { ignoreIframes = false, source = '' } = {}) {
    if (this.dead || this.game.godMode) return false;
    if (!ignoreIframes && this.iframes > 0) return false;
    if (!ignoreIframes && Math.random() < this.stats.evasion) {
      this.game.fx.text(this.x, this.y + 2.2, this.z, 'DODGE', '#9fe8ff', 0.9);
      this.iframes = 0.25;
      return false;
    }
    const final = dmg * (1 - this.stats.armor);
    this.hp -= final;
    if (!ignoreIframes) this.iframes = 0.5;
    this.lastHurtBy = source;
    this.game.fx.text(this.x, this.y + 2.2, this.z, String(Math.max(1, Math.round(final))), '#ff4040', 1);
    this.game.ui.flashDamage();
    this.game.audio.play('hurt');
    if (this.hp <= 0) {
      if (this.stats.revives >= 1) {
        this.stats.revives -= 1;
        this.hp = this.stats.maxHp;
        this.iframes = 3;
        this.game.fx.ring(this.x, this.y + 0.5, this.z, 1, 12, 0xffa030, 0.7);
        this.game.enemies.blastAll(this.x, this.z, 12, 99999);
        this.game.ui.toast('🐦‍🔥 Phoenix Feather! Revived!', '#ffb42a');
        this.game.run.items.phoenix = Math.max(0, (this.game.run.items.phoenix || 1) - 1);
      } else {
        this.hp = 0;
        this.dead = true;
        this.game.onPlayerDeath();
      }
    }
    return true;
  }

  heal(n) {
    if (this.dead) return;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
    const d = this.hp - before;
    if (d >= 1) this.game.fx.text(this.x, this.y + 2.2, this.z, '+' + Math.round(d), '#50ff70', 0.8);
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.game.scene.remove(this.shadow);
  }
}

export function makePlayerMesh(char) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const skin = char.id === 'gunslinger' ? 0xf2efe6 : 0xf2c49a;
  const parts = [
    { shape: 'box', size: [0.75, 0.8, 0.45], pos: [0, 1.1, 0], color: char.color },
    { shape: 'box', size: [0.8, 0.12, 0.5], pos: [0, 0.8, 0], color: char.accent },
    { shape: 'sphere', size: [0.36], pos: [0, 1.85, 0], color: skin, seg: 10, segY: 8 },
    { shape: 'box', size: [0.2, 0.6, 0.2], pos: [-0.5, 1.15, 0], rot: [0, 0, 0.15], color: char.color },
    { shape: 'box', size: [0.2, 0.6, 0.2], pos: [0.5, 1.15, 0], rot: [0, 0, -0.15], color: char.color },
    { shape: 'sphere', size: [0.07], pos: [-0.13, 1.9, 0.32], color: 0x111111 },
    { shape: 'sphere', size: [0.07], pos: [0.13, 1.9, 0.32], color: 0x111111 },
  ];
  switch (char.hat) {
    case 'helmet':
      parts.push({ shape: 'sphere', size: [0.42], pos: [0, 1.95, 0], scale: [1, 0.85, 1], color: 0xa8b0bc },
        { shape: 'box', size: [0.1, 0.35, 0.1], pos: [0, 2.35, 0], color: 0xd0302a },
        { shape: 'box', size: [0.5, 0.08, 0.08], pos: [0, 1.88, 0.38], color: 0x333a44 });
      parts.push({ shape: 'box', size: [0.5, 0.9, 0.08], pos: [0, 1.1, -0.3], color: char.accent });
      break;
    case 'hood':
      parts.push({ shape: 'cone', size: [0.45, 0.8], pos: [0, 2.15, -0.05], color: char.color });
      parts.push({ shape: 'box', size: [0.25, 0.7, 0.25], pos: [0.25, 1.2, -0.35], rot: [0.3, 0, 0], color: 0x7a5530 });
      break;
    case 'wizard':
      parts.push({ shape: 'cyl', size: [0.6, 0.6, 0.06], pos: [0, 2.1, 0], color: char.color },
        { shape: 'cone', size: [0.38, 1.0], pos: [0, 2.6, -0.05], rot: [-0.15, 0, 0], color: char.color },
        { shape: 'sphere', size: [0.1], pos: [0, 3.05, -0.2], color: char.accent });
      break;
    case 'bald':
      parts.push({ shape: 'sphere', size: [0.1], pos: [0, 2.05, 0.28], color: char.accent },
        { shape: 'torus', size: [0.5, 0.06], pos: [0, 1.4, 0], rot: [Math.PI / 2, 0, 0], color: 0x8a5ae0 });
      break;
    case 'cowboy':
      parts.push({ shape: 'cyl', size: [0.65, 0.65, 0.06], pos: [0, 2.12, 0], color: char.accent },
        { shape: 'cyl', size: [0.3, 0.35, 0.35], pos: [0, 2.3, 0], color: char.accent },
        { shape: 'box', size: [0.4, 0.1, 0.1], pos: [0, 1.5, 0.25], color: 0xd02a2a });
      break;
    case 'bandana':
      parts.push({ shape: 'box', size: [0.74, 0.12, 0.74], pos: [0, 2.0, 0], color: char.accent },
        { shape: 'box', size: [0.12, 0.4, 0.06], pos: [0.1, 1.9, -0.38], rot: [0.3, 0, 0.3], color: char.accent });
      break;
    case 'goggles':
      parts.push({ shape: 'torus', size: [0.1, 0.04], pos: [-0.14, 1.95, 0.33], color: char.accent },
        { shape: 'torus', size: [0.1, 0.04], pos: [0.14, 1.95, 0.33], color: char.accent },
        { shape: 'box', size: [0.4, 0.5, 0.25], pos: [0, 1.15, -0.32], color: 0x6a4a2a });
      break;
  }
  const bodyMesh = buildMesh(parts);
  body.add(bodyMesh);
  const legGeo = [{ shape: 'box', size: [0.24, 0.7, 0.26], pos: [0, -0.35, 0], color: 0x3a3a48 }];
  const legL = buildMesh(legGeo), legR = buildMesh(legGeo);
  legL.position.set(-0.2, 0.72, 0);
  legR.position.set(0.2, 0.72, 0);
  body.add(legL, legR);
  g.userData = { body, legL, legR };
  return g;
}
