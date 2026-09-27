// Game bootstrap, state machine, stage flow, camera and interaction.
import * as THREE from 'three';
import { STAGES } from './data/stages.js';
import { CHARACTERS, ITEMS, RARITIES } from './data/loot.js';
import { World } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Combat } from './combat.js';
import { WeaponSystem } from './weapons.js';
import { Hazards } from './hazards.js';
import { Pickups } from './pickups.js';
import { FX } from './fx.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Boss, BOSSES } from './bosses.js';
import { buildLevelChoices, applyChoice, rollChestItem, giveItem, buildShrineChoices, chestCost } from './progression.js';
import { clamp, formatTime } from './util.js';

const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 500);
    window.addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    });
    this.input = new Input(this.canvas);
    this.audio = new Audio();
    this.fx = new FX(this);
    this.ui = new UI(this);
    this.ui.onAction = (act, data) => this.onUiAction(act, data);
    this.state = 'menu';
    this.time = 0;
    this.camYaw = 0;
    this.camPitch = 0.42;
    this.camShake = 0;
    this.modalQueue = [];
    this.godMode = params.has('god');
    this.records = this.loadRecords();

    this.canvas.addEventListener('click', () => {
      this.audio.init();
      if (this.state === 'play') this.input.lock();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.state === 'play' && !this.skipPauseOnUnlock) this.pause();
      this.skipPauseOnUnlock = false;
    });

    this.buildMenuScene();
    this.ui.showMenu(this.records);
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ─────────────────────── persistence ───────────────────────
  loadRecords() {
    try { return JSON.parse(localStorage.getItem('bonkrealms.records') || '{}'); } catch { return {}; }
  }
  saveRecord(sum, won) {
    const id = this.run.char.id;
    const r = this.records[id] || { bestStage: 0, bestKills: 0, wins: 0 };
    r.bestStage = Math.max(r.bestStage, sum.stage);
    r.bestKills = Math.max(r.bestKills, sum.kills);
    if (won) r.wins++;
    this.records[id] = r;
    try { localStorage.setItem('bonkrealms.records', JSON.stringify(this.records)); } catch { /* storage unavailable */ }
  }

  // ─────────────────────── menu backdrop ───────────────────────
  buildMenuScene() {
    this.disposeStageObjects();
    this.stage = STAGES[0];
    this.stageIndex = 0;
    this.world = new World(this.scene, this.stage, 1234);
    this.menuOrbit = 0;
  }

  disposeStageObjects() {
    if (this.world) { this.world.dispose(); this.world = null; }
  }

  // ─────────────────────── run / stage flow ───────────────────────
  startRun(charId) {
    this.audio.init();
    const char = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
    this.teardownRun();
    this.run = {
      char, loop: 0, kills: 0, gold: 0, goldEarned: 0, damageDealt: 0, level: 1, xp: 0, xpNext: this.xpFor(1),
      tomes: {}, items: {}, rerolls: 2, totalTime: 0, pendingLevels: 0,
    };
    this.stageDuration = this.ui.runLength;
    this.enemies = new EnemyManager(this);
    this.combat = new Combat(this);
    this.hazards = new Hazards(this);
    this.pickups = new Pickups(this);
    this.player = null;
    this.loadStage(0, char);
    this.weapons = new WeaponSystem(this);
    this.weapons.add(char.weapon);
    if (params.has('debug')) this.debugBoost();
    this.state = 'play';
    this.ui.hide();
    this.ui.showHud(true);
    this.input.lock();
  }

  teardownRun() {
    if (this.boss) { this.boss.dispose(); this.boss = null; }
    if (this.enemies) this.enemies.reset();
    if (this.combat) { this.combat.clear(); for (const p of Object.values(this.combat.pools)) p.dispose(this.scene); }
    if (this.hazards) { this.hazards.clear(); this.hazards.bulletPool.dispose(this.scene); }
    if (this.pickups) { this.pickups.clear(); for (const p of Object.values(this.pickups.pools)) p.dispose(this.scene); }
    if (this.weapons) this.weapons.dispose();
    if (this.player) this.player.dispose();
    this.fx.clear();
    this.enemies = this.combat = this.hazards = this.pickups = this.weapons = this.player = null;
    this.modalQueue = [];
  }

  loadStage(index, char) {
    this.stageIndex = index;
    this.stage = STAGES[index];
    this.disposeStageObjects();
    this.enemies.reset();
    this.combat.clear();
    this.hazards.clear();
    this.pickups.clear();
    this.fx.clear();
    if (this.boss) { this.boss.dispose(); this.boss = null; }
    const seed = (Math.random() * 1e9) | 0;
    this.world = new World(this.scene, this.stage, seed);
    if (!this.player) this.player = new Player(this, char);
    this.player.placeAt(0, 0);
    this.player.dead = false;
    this.stageTime = 0;
    this.overtime = 0;
    this.finalSwarm = false;
    this.bossActive = false;
    this.spawning = true;
    this.stageKills = 0;
    this.stageChests = 0;
    this.camYaw = Math.atan2(this.world.portal.x, this.world.portal.z) + Math.PI * 0.7;
    this.ui.buildMinimapBase();
    const n = index + 1 + this.run.loop * STAGES.length;
    this.ui.setBanner(`Stage ${n}: ${this.stage.name}`, this.stage.subtitle, '#ffe8a0', 4);
  }

  xpFor(level) { return Math.floor(6 + Math.pow(level, 1.4) * 2.4 * (1 + level / 40)); }

  gainXp(v) {
    const run = this.run;
    run.xp += v * this.player.stats.xpGain;
    while (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = this.xpFor(run.level);
      run.pendingLevels++;
    }
    if (run.pendingLevels > 0 && this.state === 'play') this.openLevelUp();
  }

  openLevelUp() {
    if (this.run.pendingLevels <= 0) return;
    this.run.pendingLevels--;
    this.audio.play('levelup');
    const choices = buildLevelChoices(this);
    this.openModal({
      kind: 'level',
      choices,
      render: () => this.ui.showChoices(`Level ${this.run.level - this.run.pendingLevels}!`, 'Choose an upgrade', this.modal.choices, { rerolls: this.run.rerolls }),
      pick: (c) => applyChoice(this, c),
      reroll: () => { this.modal.choices = buildLevelChoices(this); },
    });
    this.player.heal(this.player.stats.maxHp * 0.05);
  }

  openModal(m) {
    this.state = 'modal';
    this.modal = m;
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    m.render();
  }

  closeModal() {
    this.modal = null;
    this.ui.hide();
    if (this.run.pendingLevels > 0) { this.openLevelUp(); return; }
    this.state = 'play';
    this.input.lock();
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    this.ui.showPause();
  }

  resume() {
    this.state = 'play';
    this.ui.hide();
    this.input.lock();
  }

  summary() {
    return {
      stage: this.stageIndex + 1 + this.run.loop * STAGES.length, stageName: this.stage.name, level: this.run.level,
      kills: this.run.kills, gold: this.run.goldEarned, damage: this.run.damageDealt, time: this.run.totalTime,
      killedBy: this.player?.lastHurtBy,
    };
  }

  onPlayerDeath() {
    this.state = 'dead';
    this.audio.play('death');
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    const sum = this.summary();
    this.saveRecord(sum, false);
    setTimeout(() => {
      if (this.state === 'dead') this.ui.showGameOver(sum);
    }, 1200);
  }

  summonBoss() {
    const portal = this.world.portal;
    portal.state = 'active';
    this.bossActive = true;
    const a = Math.atan2(this.player.x - portal.x, this.player.z - portal.z);
    const bx = portal.x + Math.sin(a) * 9, bz = portal.z + Math.cos(a) * 9;
    this.boss = new Boss(this, this.stage.boss, bx, bz);
    const def = BOSSES[this.stage.boss];
    this.ui.setBanner(def.name, def.title, def.color, 4);
    this.ui.shake(0.6);
  }

  onBossDefeated() {
    this.bossActive = false;
    this.world.portal.state = 'open';
    this.player.heal(this.player.stats.maxHp * 0.3);
    this.ui.setBanner('BOSS DEFEATED', 'Loot up, then step into the portal', '#40ffd0', 4);
    this.audio.play('levelup');
  }

  enterPortal() {
    const sum = this.summary();
    this.audio.play('portal');
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    const last = this.stageIndex === STAGES.length - 1;
    if (last && this.run.loop === 0 && !this.run.wonOnce) {
      this.run.wonOnce = true;
      this.state = 'victory';
      this.saveRecord(sum, true);
      this.ui.showVictory(sum);
    } else {
      this.state = 'stageclear';
      this.saveRecord(sum, false);
      const nextIdx = (this.stageIndex + 1) % STAGES.length;
      this.ui.showStageClear(sum, STAGES[nextIdx]);
    }
  }

  nextStage() {
    let next = this.stageIndex + 1;
    if (next >= STAGES.length) { next = 0; this.run.loop++; }
    this.run.rerolls += 1;
    this.loadStage(next);
    this.player.heal(this.player.stats.maxHp * 0.5);
    this.state = 'play';
    this.ui.hide();
    this.input.lock();
  }

  quitToMenu() {
    this.teardownRun();
    this.state = 'menu';
    this.ui.showHud(false);
    this.buildMenuScene();
    this.records = this.loadRecords();
    this.ui.showMenu(this.records);
  }

  onUiAction(act, data) {
    this.audio.init();
    switch (act) {
      case 'char': this.ui.selectedChar = data.id; this.ui.showMenu(this.records); break;
      case 'len': this.ui.runLength = Number(data.v); this.ui.showMenu(this.records); break;
      case 'start': this.startRun(this.ui.selectedChar); break;
      case 'help': this.ui.showHelp(); break;
      case 'back': this.ui.showMenu(this.records); break;
      case 'resume': this.resume(); break;
      case 'quit': this.quitToMenu(); break;
      case 'retry': { const c = this.run.char.id; this.startRun(c); break; }
      case 'next': this.nextStage(); break;
      case 'endless': this.nextStage(); break;
      case 'pick': this.pickChoice(Number(data.i)); break;
      case 'reroll': this.rerollChoice(); break;
      case 'skip': if (this.modal) { this.closeModal(); } break;
    }
  }

  pickChoice(i) {
    const m = this.modal;
    if (!m || !m.choices[i]) return;
    m.pick(m.choices[i]);
    this.audio.play('buy');
    this.closeModal();
  }

  rerollChoice() {
    const m = this.modal;
    if (!m || !m.reroll || this.run.rerolls <= 0) return;
    this.run.rerolls--;
    m.reroll();
    m.render();
  }

  // ─────────────────────── interaction ───────────────────────
  updateInteract(dt) {
    const p = this.player, w = this.world;
    let best = null, bd = Infinity;
    for (const it of w.interactables) {
      const d2 = (it.x - p.x) ** 2 + (it.z - p.z) ** 2;
      if (!it.seen && (d2 < 45 * 45 || (it.type === 'portal' && (d2 < 70 * 70 || this.stageTime > this.stageDuration * 0.5)))) it.seen = true;
      if (it.used) continue;
      if (it.type === 'charge') {
        const inside = d2 < it.radius * it.radius;
        if (inside) {
          it.progress = Math.min(1, it.progress + dt / (it.golden ? 5 : 3.5));
          if (it.progress >= 1) { this.completeShrine(it); }
        } else it.progress = Math.max(0, it.progress - dt * 0.15);
        continue;
      }
      if (it.type === 'pot') {
        if (d2 < 1.6 * 1.6) this.breakPot(it);
        continue;
      }
      const r = it.radius + 0.5;
      if (d2 < r * r && d2 < bd) { bd = d2; best = it; }
    }
    if (!best) { this.ui.prompt(null); return; }
    const K = '<kbd>E</kbd>';
    let text = '';
    switch (best.type) {
      case 'chest': {
        const cost = best.free ? 0 : chestCost(this);
        text = best.free ? `${K}Open Chest (free)` : `${K}Open Chest — <b style="color:${this.run.gold >= cost ? '#ffd24a' : '#ff6a6a'}">${cost} gold</b>`;
        break;
      }
      case 'greed': text = `${K}Shrine of Greed — +25% gold, +10% difficulty`; break;
      case 'challenge': text = `${K}Shrine of Challenge — summon an elite pack for a free chest`; break;
      case 'magnet': text = `${K}Magnet Shrine — pull in every XP gem`; break;
      case 'portal':
        if (best.state === 'dormant') text = `${K}Summon ${BOSSES[this.stage.boss].name.split(',')[0]} (Boss)`;
        else if (best.state === 'active') text = 'The portal is sealed while the boss lives';
        else text = `${K}Enter Portal → next realm`;
        break;
    }
    this.ui.prompt(text);
    if (this.input.wasPressed('KeyE')) this.interact(best);
  }

  interact(it) {
    const p = this.player;
    switch (it.type) {
      case 'chest': {
        let cost = it.free ? 0 : chestCost(this);
        if (cost > 0 && Math.random() < p.stats.keyChance) { cost = 0; this.ui.toast('🗝️ Skeleton Key: free chest!', '#ffd24a'); }
        if (this.run.gold < cost) { this.audio.play('deny'); this.ui.toast(`Need ${cost} gold`, '#ff6a6a', 1.5); return; }
        this.run.gold -= cost;
        if (!it.free) this.stageChests++;
        this.world.removeInteractable(it);
        const { id, item } = rollChestItem(this, it.free ? 1 : 0);
        giveItem(this, id);
        const r = RARITIES[item.rarity];
        this.audio.play('chest');
        this.fx.burst(it.x, p.y + 1, it.z, r.color, 25, 7);
        this.ui.toast(`${item.icon} ${item.name} (${r.name}) — ${item.desc}`, r.color, 5);
        this.ui.setBanner(`${item.icon} ${item.name}`, item.desc, r.color, 2.5);
        break;
      }
      case 'greed':
        it.used = true;
        p.addStats({ goldGain: 0.25, curse: 0.1 });
        this.audio.play('shrine');
        this.ui.toast('💰 Greed accepted. Gold +25%, enemies grow bolder.', '#f2c84a');
        it.mesh.userData.spin.visible = false;
        break;
      case 'challenge':
        it.used = true;
        this.enemies.startChallenge(it.x, it.z);
        this.audio.play('boss');
        this.ui.toast('⚔️ Challenge accepted! Defeat the pack.', '#ff5a5a');
        break;
      case 'magnet':
        it.used = true;
        this.pickups.attractAll();
        this.audio.play('shrine');
        this.ui.toast('🧲 All XP gems are flying to you!', '#ff8ad0');
        it.mesh.userData.spin.visible = false;
        break;
      case 'portal':
        if (it.state === 'dormant') this.summonBoss();
        else if (it.state === 'open') this.enterPortal();
        break;
    }
  }

  completeShrine(it) {
    it.used = true;
    it.mesh.userData.crystal.visible = false;
    it.mesh.userData.fill.visible = false;
    this.audio.play('shrine');
    this.fx.ring(it.x, this.world.heightAt(it.x, it.z), it.z, 1, 6, it.golden ? 0xffd24a : 0x5ac8ff, 0.6);
    const choices = buildShrineChoices(this, it.golden);
    this.openModal({
      kind: 'shrine', choices,
      render: () => this.ui.showChoices(it.golden ? 'Golden Shrine' : 'Charge Shrine', 'Choose a blessing', this.modal.choices, { canSkip: false }),
      pick: (c) => this.player.addStats({ [c.stat]: c.amount }),
    });
  }

  breakPot(it) {
    this.world.removeInteractable(it);
    this.audio.play('break');
    this.fx.burst(it.x, this.player.y + 0.6, it.z, 0xc8804a, 12, 5);
    const r = Math.random();
    const y = this.world.heightAt(it.x, it.z) + 0.6;
    if (r < 0.55) for (let i = 0; i < 3; i++) this.pickups.coin(it.x, y, it.z, Math.ceil(2 * (1 + this.stageIndex * 0.6)));
    else if (r < 0.75) this.pickups.heart(it.x, y, it.z);
    else if (r < 0.8) this.pickups.magnet(it.x, y, it.z);
    else this.pickups.gem(it.x, y, it.z, 5 * (1 + this.stageIndex));
  }

  // ─────────────────────── main loop ───────────────────────
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    try {
      this.update(dt);
    } catch (err) {
      console.error(err);
      this.lastError = err;
    }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    const inp = this.input;
    this.time += dt;
    if (inp.wasPressed('KeyM')) { this.audio.setMuted(!this.audio.muted); }

    if (this.state === 'menu') {
      this.menuOrbit += dt * 0.08;
      const r = 40;
      const x = Math.sin(this.menuOrbit) * r, z = Math.cos(this.menuOrbit) * r;
      this.camera.position.set(x, this.world.heightAt(x, z) + 16, z);
      this.camera.lookAt(0, 4, 0);
      this.world.update(dt, { x: 0, y: 0, z: 0 });
      this.ui.update(dt);
      return;
    }

    if (this.state === 'modal') {
      const m = this.modal;
      for (let i = 0; i < 3; i++) if (inp.wasPressed(`Digit${i + 1}`)) this.pickChoice(i);
      if (inp.wasPressed('KeyR')) this.rerollChoice();
      this.ui.update(0);
      void m;
      return;
    }
    if (this.state === 'paused') {
      if (inp.wasPressed('KeyP')) this.resume();
      return;
    }
    if (this.state !== 'play' && this.state !== 'dead') { this.ui.update(0); return; }

    if (this.state === 'play' && (inp.wasPressed('KeyP') || inp.wasPressed('Escape'))) { this.pause(); return; }

    const playing = this.state === 'play';
    if (playing) {
      this.stageTime += dt;
      this.run.totalTime += dt;
      if (!this.finalSwarm && this.stageTime >= this.stageDuration) {
        this.finalSwarm = true;
        this.ui.setBanner('THE FINAL SWARM', 'Time is up. They will not stop coming.', '#ff4a4a', 4);
        this.audio.play('boss');
      }
      if (this.finalSwarm) this.overtime += dt;
    }

    // camera input
    this.camYaw -= inp.mouseDX * 0.0028;
    this.camPitch = clamp(this.camPitch + inp.mouseDY * 0.0022, -0.15, 1.2);
    if (inp.down('ArrowLeft')) this.camYaw += dt * 2.4;
    if (inp.down('ArrowRight')) this.camYaw -= dt * 2.4;

    if (playing) this.player.update(dt, inp, this.camYaw);
    this.enemies.update(playing ? dt : 0);
    if (playing) {
      if (this.boss && !this.boss.dead) this.boss.update(dt);
      this.weapons.update(dt);
      this.combat.update(dt);
      this.hazards.update(dt);
      this.pickups.update(dt);
      this.updateInteract(dt);
    }
    this.world.update(dt, this.player);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.ui.update(dt);
  }

  updateCamera(dt) {
    const p = this.player;
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    const tx = p.x, ty = p.y + 2.2, tz = p.z;
    // pull the camera in front of anything tall standing between it and the player
    let want = p.sliding ? 9 : 10.5;
    const bx = -fx * cp, bz = -fz * cp;
    const obstacles = this.world.colliders;
    for (let i = 0; i < obstacles.length; i++) {
      const c = obstacles[i];
      const rx = c.x - tx, rz = c.z - tz;
      if (rx * rx + rz * rz > 150) continue;
      const along = rx * bx + rz * bz;
      if (along <= 0.5 || along > want) continue;
      const perp = Math.abs(rx * bz - rz * bx);
      const rr = c.r * 1.5 + 0.4;
      if (perp < rr) want = Math.max(3, along - Math.sqrt(rr * rr - perp * perp) - 0.3);
    }
    if (this.boss && !this.boss.dead) {
      const rx = this.boss.x - tx, rz = this.boss.z - tz;
      const along = rx * bx + rz * bz, perp = Math.abs(rx * bz - rz * bx), rr = this.boss.def.radius * 1.6;
      if (along > 0 && along < want + rr && perp < rr) want = Math.max(3, along - rr);
    }
    this.camDist = this.camDist ?? want;
    this.camDist += (want - this.camDist) * (1 - Math.exp(-dt * (want < this.camDist ? 20 : 3)));
    const dist = this.camDist;
    let cx = tx - fx * cp * dist, cy = ty + sp * dist + 1.2, cz = tz - fz * cp * dist;
    const gy = this.world.groundAt(cx, cz) + 1;
    if (cy < gy) cy = gy;
    if (this.camShake > 0) {
      this.camShake = Math.max(0, this.camShake - dt * 1.5);
      const s = this.camShake * 0.6;
      cx += (Math.random() - 0.5) * s; cy += (Math.random() - 0.5) * s; cz += (Math.random() - 0.5) * s;
    }
    const k = 1 - Math.exp(-dt * 18);
    if (!this._camInit) { this.camera.position.set(cx, cy, cz); this._camInit = true; }
    this.camera.position.x += (cx - this.camera.position.x) * k;
    this.camera.position.y += (cy - this.camera.position.y) * k;
    this.camera.position.z += (cz - this.camera.position.z) * k;
    this.camera.lookAt(tx + fx * 2, ty, tz + fz * 2);
  }

  // ─────────────────────── debug helpers ───────────────────────
  debugBoost() {
    this.run.gold = 5000;
    for (const id of ['bow', 'firestaff', 'stormrod']) if (!this.weapons.has(id)) this.weapons.add(id);
    this.player.addStats({ damage: 2, maxHp: 400 });
  }
}

const game = new Game();
window.__game = game;
export default game;
export { formatTime, ITEMS };
