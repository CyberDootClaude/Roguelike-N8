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
import { loadSettings, saveSettings, loadMeta, saveMeta, metaStats, shardsForRun, META_UPGRADES, metaCost } from './settings.js';

const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.settings = loadSettings();
    this.meta = loadMeta();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.settings.quality !== 'low', powerPreference: 'high-performance' });
    this.applyQuality();
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
    this.audio.setVolumes({ master: this.settings.master, music: this.settings.music, sfx: this.settings.sfx });
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

    const unlockAudio = () => this.audio.init();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    this.fpsT = 0; this.fpsN = 0; this.fps = 60;
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

  applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    const q = this.settings.quality;
    const ratio = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'medium' ? Math.min(dpr, 1.25) : Math.min(dpr, 1.75);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.fx) this.fx.maxParticles = q === 'low' ? 250 : q === 'medium' ? 500 : 900;
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    saveSettings(this.settings);
    if (['master', 'music', 'sfx'].includes(key)) this.audio.setVolumes({ [key]: value });
    if (key === 'quality') this.applyQuality();
  }

  // One-time contextual tips, remembered across sessions.
  hint(id, text) {
    if (this.settings.hints[id]) return;
    this.settings.hints[id] = true;
    saveSettings(this.settings);
    this.ui.toast(`💡 ${text}`, '#9fe8ff', 7);
  }

  // Award Soul Shards for whatever part of the run hasn't been paid out yet.
  payShards() {
    if (!this.run) return 0;
    const total = shardsForRun(this.summary());
    const gain = Math.max(0, total - (this.run.shardsPaid || 0));
    this.run.shardsPaid = total;
    this.meta.shards += gain;
    saveMeta(this.meta);
    return gain;
  }

  buyMeta(id) {
    const up = META_UPGRADES.find((u) => u.id === id);
    const lv = this.meta.levels[id] || 0;
    if (!up || lv >= up.max) return;
    const cost = metaCost(up, lv);
    if (this.meta.shards < cost) { this.audio.play('deny'); return; }
    this.meta.shards -= cost;
    this.meta.levels[id] = lv + 1;
    saveMeta(this.meta);
    this.audio.play('buy');
    this.ui.showShop(this.meta);
  }

  // ─────────────────────── menu backdrop ───────────────────────
  buildMenuScene() {
    this.disposeStageObjects();
    this.stage = STAGES[0];
    this.stageIndex = 0;
    this.world = new World(this.scene, this.stage, 1234);
    this.menuOrbit = 0;
    this.audio.setTheme('menu');
    this.input.setTouchVisible(false);
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
      tomes: {}, items: {}, totalTime: 0, pendingLevels: 0, bosses: 0, shardsPaid: 0, banished: new Set(),
      rerolls: 2 + (this.meta.levels.reroll || 0), banishes: 1 + (this.meta.levels.banish || 0),
    };
    this.meta.totalRuns = (this.meta.totalRuns || 0) + 1;
    saveMeta(this.meta);
    this.stageDuration = this.ui.runLength;
    this.enemies = new EnemyManager(this);
    this.combat = new Combat(this);
    this.hazards = new Hazards(this);
    this.pickups = new Pickups(this);
    this.player = null;
    this.loadStage(0, char);
    this.player.addStats(metaStats(this.meta));
    this.player.hp = this.player.stats.maxHp;
    this.weapons = new WeaponSystem(this);
    this.weapons.add(char.weapon);
    if (params.has('debug')) this.debugBoost();
    this.state = 'play';
    this.ui.hide();
    this.ui.showHud(true);
    this.input.lock();
    this.input.setTouchVisible(true);
    this.hintT = 0;
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
    this.audio.setTheme(this.stage.id, 0);
    const hazardTips = { quicksand: 'Quicksand patches slow you down — slide or jump across them.', ice: 'Frozen lakes are slippery — you keep sliding when you let go.', lava: 'Lava pools burn! Stay on the rocks or jump across.' };
    if (this.stage.hazard && hazardTips[this.stage.hazard]) setTimeout(() => this.state === 'play' && this.hint('hz-' + this.stage.hazard, hazardTips[this.stage.hazard]), 5000);
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
    const p = this.player;
    this.fx.ring(p.x, p.y, p.z, 0.5, 6, 0x6ad8ff, 0.5, 0.9);
    this.fx.burst(p.x, p.y + 1, p.z, 0x9fe8ff, 20, 7);
    const choices = buildLevelChoices(this);
    this.openModal({
      kind: 'level',
      choices,
      render: () => this.ui.showChoices(`Level ${this.run.level - this.run.pendingLevels}!`, 'Choose an upgrade', this.modal.choices, { rerolls: this.run.rerolls, banishes: this.run.banishes }),
      pick: (c) => applyChoice(this, c),
      reroll: () => { this.modal.choices = buildLevelChoices(this); },
      banish: (i) => {
        const c = this.modal.choices[i];
        this.run.banished.add(c.id);
        const others = new Set(this.modal.choices.map((x) => x.id));
        const repl = buildLevelChoices(this, 6).find((x) => !others.has(x.id));
        if (repl) this.modal.choices[i] = repl; else this.modal.choices.splice(i, 1);
      },
    });
    this.player.heal(this.player.stats.maxHp * 0.05);
  }

  openModal(m) {
    this.state = 'modal';
    this.modal = m;
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    this.input.setTouchVisible(false);
    m.render();
  }

  closeModal() {
    this.modal = null;
    this.ui.hide();
    if (this.run.pendingLevels > 0) { this.openLevelUp(); return; }
    this.state = 'play';
    this.input.lock();
    this.input.setTouchVisible(true);
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    this.input.setTouchVisible(false);
    this.ui.showPause();
  }

  resume() {
    this.state = 'play';
    this.ui.hide();
    this.input.lock();
    this.input.setTouchVisible(true);
  }

  summary() {
    return {
      stage: this.stageIndex + 1 + this.run.loop * STAGES.length, stageName: this.stage.name, level: this.run.level,
      kills: this.run.kills, gold: this.run.goldEarned, damage: this.run.damageDealt, time: this.run.totalTime,
      killedBy: this.player?.lastHurtBy, bosses: this.run.bosses,
    };
  }

  onPlayerDeath() {
    this.state = 'dead';
    this.audio.play('death');
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    this.input.setTouchVisible(false);
    const sum = this.summary();
    this.saveRecord(sum, false);
    sum.shards = this.payShards();
    this.ui.shake(0.8);
    setTimeout(() => {
      if (this.state === 'dead') this.ui.showGameOver(sum);
    }, 1600);
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
    this.audio.setTheme(this.stage.id, 1);
    this.hint('boss', 'Red zones explode after a moment. Jump over shockwave rings and low bullets.');
  }

  onBossDefeated() {
    this.bossActive = false;
    this.run.bosses++;
    this.world.portal.state = 'open';
    this.audio.setTheme(this.stage.id, this.finalSwarm ? 2 : 0);
    this.player.heal(this.player.stats.maxHp * 0.3);
    this.ui.setBanner('BOSS DEFEATED', 'Loot up, then step into the portal', '#40ffd0', 4);
    this.audio.play('levelup');
  }

  enterPortal() {
    const sum = this.summary();
    this.audio.play('portal');
    this.skipPauseOnUnlock = true;
    this.input.unlock();
    this.input.setTouchVisible(false);
    const last = this.stageIndex === STAGES.length - 1;
    if (last && this.run.loop === 0 && !this.run.wonOnce) {
      this.run.wonOnce = true;
      this.state = 'victory';
      this.saveRecord(sum, true);
      sum.shards = this.payShards();
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
    this.run.banishes += 1;
    this.loadStage(next);
    this.player.heal(this.player.stats.maxHp * 0.5);
    this.state = 'play';
    this.ui.hide();
    this.input.lock();
    this.input.setTouchVisible(true);
  }

  quitToMenu() {
    if (this.run && !['dead', 'victory', 'menu'].includes(this.state)) this.payShards();
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
      case 'char': this.ui.selectedChar = data.id; this.ui.showMenu(this.records); this.audio.play('click'); break;
      case 'shop': this.ui.showShop(this.meta); break;
      case 'buy': this.buyMeta(data.id); break;
      case 'settings': this.ui.showSettings(this.settings, this.state === 'paused' ? 'pause' : 'menu'); break;
      case 'set': this.updateSetting(data.key, data.type === 'bool' ? !this.settings[data.key] : data.type === 'num' ? Number(data.v) : data.v); this.ui.showSettings(this.settings, data.from); break;
      case 'backpause': this.ui.showPause(); break;
      case 'resethints': this.settings.hints = {}; saveSettings(this.settings); this.ui.toast('Tips will show again', '#9fe8ff'); break;
      case 'banish': this.banishChoice(Number(data.i)); break;
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

  banishChoice(i) {
    const m = this.modal;
    if (!m || !m.banish || this.run.banishes <= 0 || !m.choices[i]) return;
    this.run.banishes--;
    m.banish(i);
    this.audio.play('break');
    if (!m.choices.length) { this.closeModal(); return; }
    m.render();
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
          this.hint('charge', 'Stay inside the ring to charge the shrine and earn a blessing.');
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
    const K = this.input.isTouch ? '<kbd>✋</kbd>' : '<kbd>E</kbd>';
    if (best.type === 'chest') this.hint('chest', 'Chests cost gold and give a random item. The price rises with each one you open.');
    if (best.type === 'portal' && best.state === 'dormant') this.hint('portal', 'Summoning the boss is optional until the timer runs out — but then the Final Swarm arrives.');
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
        this.audio.play(item.rarity >= 3 ? 'legendary' : 'chest');
        const gy = this.world.heightAt(it.x, it.z);
        this.fx.burst(it.x, gy + 1, it.z, r.color, 25 + item.rarity * 10, 7);
        this.fx.beam(it.x, gy, it.z, it.x, gy + 18, it.z, 0.6 + item.rarity * 0.25, r.color, 1.2);
        this.fx.ring(it.x, gy, it.z, 0.5, 4 + item.rarity, r.color, 0.7, 0.8);
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
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    this.fpsT += raw; this.fpsN++;
    if (this.fpsT >= 0.5) { this.fps = Math.round(this.fpsN / this.fpsT); this.fpsT = 0; this.fpsN = 0; }
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
      if (inp.wasPressed('KeyP') || inp.wasPressed('Escape')) this.resume();
      this.ui.update(0);
      return;
    }
    if (this.state !== 'play' && this.state !== 'dead') { this.ui.update(0); return; }

    if (this.state === 'play' && (inp.wasPressed('KeyP') || inp.wasPressed('Escape'))) { this.pause(); return; }

    const playing = this.state === 'play';
    if (playing) {
      this.stageTime += dt;
      this.run.totalTime += dt;
      this.hintT += dt;
      if (this.hintT > 2 && this.hintT < 3) this.hint('move', this.input.isTouch ? 'Drag the left side to move, the right side to look. Weapons fire on their own!' : 'WASD to move, mouse to look, Space to jump, Shift to slide. Weapons fire on their own!');
      if (this.hintT > 20 && this.hintT < 21) this.hint('explore', 'Find the boss portal — follow its beam of light. Grab chests and shrines on the way.');
      if (!this.finalSwarm && this.stageTime >= this.stageDuration - 60 && this.stageTime - dt < this.stageDuration - 60 && this.world.portal.state === 'dormant') {
        this.ui.toast('⏳ One minute until the Final Swarm!', '#ff8a6a', 5);
        this.audio.play('warn');
      }
      if (!this.finalSwarm && this.stageTime >= this.stageDuration) {
        this.finalSwarm = true;
        if (!this.bossActive) this.audio.setTheme(this.stage.id, 2);
        this.ui.setBanner('THE FINAL SWARM', 'Time is up. They will not stop coming.', '#ff4a4a', 4);
        this.audio.play('boss');
      }
      if (this.finalSwarm) this.overtime += dt;
    }

    // camera input
    const sens = this.settings.sensitivity;
    this.camYaw -= inp.mouseDX * 0.0028 * sens;
    this.camPitch = clamp(this.camPitch + inp.mouseDY * 0.0022 * sens * (this.settings.invertY ? -1 : 1), -0.15, 1.2);
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
      if (this.state === 'play') this.updateInteract(dt); else this.ui.prompt(null);
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
