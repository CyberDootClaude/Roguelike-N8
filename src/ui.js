// DOM HUD, menus, modals, minimap and the 2D overlay (damage numbers, health bars, banners).
import * as THREE from 'three';
import { CHARACTERS, WEAPONS, TOMES, ITEMS, RARITIES } from './data/loot.js';
import { STAGE_SLOTS, REALM_COUNT } from './data/stages.js';
import { MUTATORS, HEAT_LEVELS } from './data/mutators.js';
import { ACHIEVEMENTS, unlockSource } from './data/achievements.js';
import { GAME_VERSION, PATCHES, isNew } from './data/patches.js';
import { currentDaily, currentWeekly } from './modes.js';
import { topScores, boardsEnabled } from './leaderboard.js';
import { formatTime, fmtNum, clamp } from './util.js';
import { MAX_WEAPONS, MAX_TOMES } from './progression.js';
import { META_UPGRADES, metaCost } from './settings.js';
import { WORLD_HALF } from './world.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const CHAR_ICONS = { knight: '🛡️', ranger: '🏹', pyro: '🔥', monk: '⚡', gunslinger: '🤠', dancer: '🌀', alchemist: '🧪', quartz: '💎' };
const NEW_BADGE = '<span class="newbadge">NEW</span>';

export class UI {
  constructor(game) {
    this.game = game;
    this.overlay = $('overlay');
    this.ctx = this.overlay.getContext('2d');
    this.mm = $('minimap').getContext('2d');
    this.screen = $('screen');
    this.hudT = 0;
    this.banner = null;
    this.selectedChar = 'knight';
    this.runLength = 600;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.screen.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !this.onAction) return;
      e.stopPropagation();
      this.onAction(b.dataset.act, b.dataset);
    });
    this.screen.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.dataset.setting) return;
      this.game.updateSetting(el.dataset.setting, Number(el.value));
      const lbl = el.parentElement.querySelector('b');
      if (lbl) lbl.textContent = `${Math.round(Number(el.value) * 100)}%`;
    });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.overlay.width = innerWidth * dpr;
    this.overlay.height = innerHeight * dpr;
  }

  showHud(v) { $('hud').classList.toggle('hidden', !v); }

  toast(msg, color = '#ffcf4a', dur = 3.5) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.borderLeftColor = color;
    el.textContent = msg;
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 6) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), dur * 1000);
  }

  flashDamage() {
    const v = $('vignette');
    v.style.opacity = '0.9';
    clearTimeout(this._vt);
    this._vt = setTimeout(() => { v.style.opacity = '0'; }, 120);
  }

  shake(a) { if (this.game.settings.screenShake) this.game.camShake = Math.max(this.game.camShake, a); }

  setBanner(title, sub, color = '#fff', dur = 3) {
    this.banner = { title, sub, color, t: 0, dur };
  }

  prompt(html) {
    const el = $('prompt');
    if (!html) { el.classList.add('hidden'); return; }
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.remove('hidden');
  }

  // ───────────────────────── HUD ─────────────────────────
  buildMinimapBase() {
    const w = this.game.world;
    const n = w.n;
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const cx = c.getContext('2d');
    const img = cx.createImageData(n, n);
    const cols = w.terrain.geometry.attributes.color.array;
    for (let k = 0; k < n * n; k++) {
      let r = cols[k * 3], g = cols[k * 3 + 1], b = cols[k * 3 + 2];
      const surf = w.hazardLevel > -Infinity && w.heights[k] < w.hazardLevel;
      if (surf) { if (w.stage.hazard === 'lava') { r = 1; g = 0.35; b = 0.05; } else { r = 0.7; g = 0.88; b = 1; } }
      img.data[k * 4] = r * 230; img.data[k * 4 + 1] = g * 230; img.data[k * 4 + 2] = b * 230; img.data[k * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    for (const p of w.patches) {
      cx.fillStyle = 'rgba(120,80,40,0.9)';
      cx.beginPath();
      cx.arc((p.x + WORLD_HALF) / w.step, (p.z + WORLD_HALF) / w.step, p.r / w.step, 0, Math.PI * 2);
      cx.fill();
    }
    this.mmBase = c;
  }

  updateHud(dt) {
    const g = this.game, p = g.player, run = g.run;
    this.hudT -= dt;
    // fast-changing bits every frame
    const hpk = clamp(p.hp / p.stats.maxHp, 0, 1);
    $('hpfill').style.width = `${hpk * 100}%`;
    document.body.classList.toggle('lowhp', hpk < 0.3 && !p.dead);
    $('xpfill').style.width = `${clamp(run.xp / run.xpNext, 0, 1) * 100}%`;
    const tl = g.stageDuration - g.stageTime;
    const timer = $('timer');
    if (g.finalSwarm) {
      timer.textContent = `FINAL SWARM +${formatTime(g.overtime)}`;
      timer.classList.add('swarm');
    } else {
      timer.textContent = formatTime(tl);
      timer.classList.remove('swarm');
    }
    if (g.boss && !g.boss.dead) {
      $('bossbar').classList.remove('hidden');
      $('bossfill').style.width = `${clamp(g.boss.e.hp / g.boss.e.maxHp, 0, 1) * 100}%`;
    } else $('bossbar').classList.add('hidden');
    if (this.hudT > 0) return;
    this.hudT = 0.2;
    $('hptext').textContent = `${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHp)}`;
    $('lvl').textContent = `LV ${run.level}`;
    $('gold').textContent = `💰 ${fmtNum(run.gold)}`;
    $('kills').textContent = `💀 ${fmtNum(run.kills)}`;
    const mutHtml = g.run.mutators.map((id) => `<span title="${MUTATORS[id].name}: ${MUTATORS[id].desc}">${MUTATORS[id].icon}</span>`).join('');
    if ($('hudmuts').innerHTML !== mutHtml) $('hudmuts').innerHTML = mutHtml;
    $('stagename').textContent = `Stage ${g.stageIndex + 1 + run.loop * REALM_COUNT} · ${g.stage.name}`;
    if (g.boss && !g.boss.dead) $('bossname').textContent = g.boss.def.name;
    let obj = 'Explore, get stronger, find the boss portal';
    if (g.world.portal.state === 'active') obj = 'Defeat the boss!';
    else if (g.world.portal.state === 'open') obj = 'Boss defeated! Enter the portal';
    else if (g.world.portal.seen) obj = 'Portal found — summon the boss when ready';
    if (g.finalSwarm && g.world.portal.state !== 'open') obj = 'The Final Swarm is here — beat the boss!';
    $('objective').textContent = obj;

    const ws = g.weapons.list;
    let wh = '';
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const w = ws[i];
      wh += w ? `<div class="slot" title="${w.def.name}">${w.def.icon}<span class="lv">${w.level}</span></div>` : '<div class="slot empty"></div>';
    }
    $('wslots').innerHTML = wh;
    const tids = Object.keys(run.tomes);
    let th = '';
    for (let i = 0; i < MAX_TOMES; i++) {
      const id = tids[i];
      th += id ? `<div class="slot tome" title="${TOMES[id].name}">${TOMES[id].icon}<span class="lv">${run.tomes[id]}</span></div>` : '<div class="slot tome empty"></div>';
    }
    $('tslots').innerHTML = th;
    $('itemrow').innerHTML = Object.entries(run.items).filter(([, n]) => n > 0)
      .map(([id, n]) => `<span class="it" title="${ITEMS[id].name}: ${ITEMS[id].desc}">${ITEMS[id].icon}${n > 1 ? `<b>x${n}</b>` : ''}</span>`).join('');
    $('lockhint').classList.toggle('hidden', g.input.locked);
  }

  drawMinimap() {
    const g = this.game, p = g.player, w = g.world, ctx = this.mm;
    const S = ctx.canvas.width;
    const R = 70; // world units shown from centre to edge
    const scale = S / (R * 2);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    ctx.clip();
    if (this.mmBase) {
      const px = (p.x + WORLD_HALF) / w.step, pz = (p.z + WORLD_HALF) / w.step;
      const r = R / w.step;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.mmBase, px - r, pz - r, r * 2, r * 2, 0, 0, S, S);
    }
    const toMap = (x, z) => [S / 2 + (x - p.x) * scale, S / 2 + (z - p.z) * scale];
    // enemies
    ctx.fillStyle = 'rgba(255,60,60,0.8)';
    for (const e of g.enemies.list) {
      if (!e.alive || e.boss) continue;
      const [mx, my] = toMap(e.x, e.z);
      if (mx < 0 || my < 0 || mx > S || my > S) continue;
      if (e.elite) { ctx.fillStyle = '#ffb020'; ctx.fillRect(mx - 3, my - 3, 6, 6); ctx.fillStyle = 'rgba(255,60,60,0.8)'; }
      else ctx.fillRect(mx - 1, my - 1, 2, 2);
    }
    // interactables
    for (const it of w.interactables) {
      if (!it.seen) continue;
      let [mx, my] = toMap(it.x, it.z);
      const off = mx < 6 || my < 6 || mx > S - 6 || my > S - 6;
      if (off && it.type !== 'portal') continue;
      if (off) {
        const dx = mx - S / 2, dy = my - S / 2, d = Math.hypot(dx, dy);
        mx = S / 2 + (dx / d) * (S / 2 - 9); my = S / 2 + (dy / d) * (S / 2 - 9);
      }
      switch (it.type) {
        case 'chest': ctx.fillStyle = it.free ? '#c080ff' : '#ffd24a'; ctx.fillRect(mx - 3, my - 3, 6, 6); break;
        case 'charge': if (it.used) break; ctx.fillStyle = it.golden ? '#ffd24a' : '#5ac8ff'; ctx.beginPath(); ctx.arc(mx, my, 4, 0, 7); ctx.fill(); break;
        case 'greed': case 'challenge': case 'magnet':
          if (it.used) break;
          ctx.fillStyle = it.type === 'greed' ? '#f2c84a' : it.type === 'challenge' ? '#ff5a5a' : '#ff8ad0';
          ctx.beginPath(); ctx.moveTo(mx, my - 5); ctx.lineTo(mx + 4, my + 3); ctx.lineTo(mx - 4, my + 3); ctx.fill(); break;
        case 'portal': {
          const col = it.state === 'open' ? '#40ffd0' : it.state === 'active' ? '#ff3040' : '#b060ff';
          ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(mx, my, 6, 0, 7); ctx.fill(); ctx.stroke();
          break;
        }
      }
    }
    if (g.boss && !g.boss.dead) {
      const [mx, my] = toMap(g.boss.x, g.boss.z);
      ctx.fillStyle = '#ff2020'; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.arc(clamp(mx, 6, S - 6), clamp(my, 6, S - 6), 7, 0, 7); ctx.fill(); ctx.stroke();
    }
    // player arrow pointing where the camera faces
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-g.camYaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  drawOverlay(dt) {
    const g = this.game, ctx = this.ctx, cam = g.camera, dpr = this.dpr;
    const W = this.overlay.width, H = this.overlay.height;
    ctx.clearRect(0, 0, W, H);
    if (g.state === 'menu') return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // floating text
    for (const t of g.fx.texts) {
      _v.set(t.x, t.y, t.z).project(cam);
      if (_v.z > 1 || _v.z < -1) continue;
      const x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H;
      const k = t.t / t.life;
      const size = Math.round(18 * t.scale * dpr * (k < 0.15 ? 0.7 + k * 2 : 1));
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.str, x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, x, y);
    }
    ctx.globalAlpha = 1;
    // elite hp bars
    for (const e of g.enemies.list) {
      if (!e.alive || !(e.elite || e.challenge) || e.boss) continue;
      if (e.hp >= e.maxHp && !e.elite) continue;
      _v.set(e.x, e.y + e.height + 0.6, e.z).project(cam);
      if (_v.z > 1) continue;
      const x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H;
      const bw = (e.elite ? 70 : 36) * dpr, bh = 6 * dpr;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, bh + 2);
      ctx.fillStyle = e.elite ? '#ffb020' : '#ff5a5a'; ctx.fillRect(x - bw / 2, y, bw * clamp(e.hp / e.maxHp, 0, 1), bh);
    }
    // off-screen indicators: portal, boss, elites, reward chests
    const marks = [];
    const portal = g.world.portal;
    if (portal.seen || portal.state !== 'dormant') {
      const col = portal.state === 'open' ? '#40ffd0' : portal.state === 'active' ? '#ff4050' : '#c070ff';
      marks.push({ x: portal.x, y: g.world.heightAt(portal.x, portal.z) + 3, z: portal.z, icon: '🌀', col });
    }
    if (g.boss && !g.boss.dead) marks.push({ x: g.boss.x, y: g.boss.e.y + 4, z: g.boss.z, icon: '💀', col: '#ff3030' });
    for (const e of g.enemies.list) if (e.alive && e.elite) marks.push({ x: e.x, y: e.y + 2, z: e.z, icon: '⭐', col: '#ffb020' });
    for (const it of g.world.interactables) if (it.type === 'chest' && it.free) marks.push({ x: it.x, y: g.world.heightAt(it.x, it.z) + 1, z: it.z, icon: '🎁', col: '#c080ff' });
    const p = g.player;
    for (const m of marks) {
      _v.set(m.x, m.y, m.z).project(cam);
      const behind = _v.z > 1;
      let sx = _v.x, sy = -_v.y;
      if (!behind && Math.abs(sx) < 0.92 && Math.abs(sy) < 0.88) {
        // on screen: small distance tag for the portal only
        if (m.icon === '🌀') {
          const d = Math.hypot(m.x - p.x, m.z - p.z);
          if (d > 25) this.tag(ctx, (sx * 0.5 + 0.5) * W, (sy * 0.5 + 0.5) * H - 18 * dpr, `${Math.round(d)}m`, m.col, dpr);
        }
        continue;
      }
      if (behind) { sx = -sx; sy = Math.max(0.3, -sy); }
      const k = 1 / Math.max(Math.abs(sx) / 0.9, sy < 0 ? -sy / 0.5 : sy / 0.82, 1e-3);
      sx *= k; sy *= k;
      const x = (sx * 0.5 + 0.5) * W, y = (sy * 0.5 + 0.5) * H;
      const ang = Math.atan2(sy, sx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = m.col; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.moveTo(18 * dpr, 0); ctx.lineTo(4 * dpr, -9 * dpr); ctx.lineTo(4 * dpr, 9 * dpr); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.font = `${Math.round(18 * dpr)}px sans-serif`;
      ctx.fillText(m.icon, x - Math.cos(ang) * 8 * dpr, y - Math.sin(ang) * 8 * dpr);
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      this.tag(ctx, x - Math.cos(ang) * 8 * dpr, y - Math.sin(ang) * 8 * dpr + 20 * dpr, `${Math.round(d)}m`, m.col, dpr);
    }
    // boss attack callout
    if (g.boss && !g.boss.dead && g.boss.castName && g.boss.castT > 0) {
      g.boss.castT -= dt;
      ctx.globalAlpha = Math.min(1, g.boss.castT * 2);
      ctx.font = `bold ${Math.round(22 * dpr)}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 4 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(g.boss.castName, W / 2, 150 * dpr);
      ctx.fillStyle = g.boss.def.color; ctx.fillText(g.boss.castName, W / 2, 150 * dpr);
      ctx.globalAlpha = 1;
    }
    if (g.settings.showFps) {
      ctx.textAlign = 'left';
      ctx.font = `bold ${Math.round(13 * dpr)}px monospace`;
      ctx.fillStyle = g.fps < 40 ? '#ff6a6a' : '#9fff9f';
      ctx.fillText(`${g.fps} FPS · ${g.enemies?.list.length ?? 0} foes`, 16 * dpr, H - 16 * dpr);
      ctx.textAlign = 'center';
    }
    // banner
    if (this.banner) {
      const b = this.banner;
      b.t += dt;
      const k = b.t / b.dur;
      if (k >= 1) this.banner = null;
      else {
        ctx.globalAlpha = k < 0.1 ? k / 0.1 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        ctx.font = `bold ${Math.round(46 * dpr)}px "Trebuchet MS", sans-serif`;
        ctx.lineWidth = 6 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(b.title, W / 2, H * 0.3);
        ctx.fillStyle = b.color; ctx.fillText(b.title, W / 2, H * 0.3);
        if (b.sub) {
          ctx.font = `bold ${Math.round(20 * dpr)}px "Trebuchet MS", sans-serif`;
          ctx.lineWidth = 4 * dpr;
          ctx.strokeText(b.sub, W / 2, H * 0.3 + 44 * dpr);
          ctx.fillStyle = '#ddd'; ctx.fillText(b.sub, W / 2, H * 0.3 + 44 * dpr);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  tag(ctx, x, y, text, col, dpr) {
    ctx.font = `bold ${Math.round(12 * dpr)}px "Trebuchet MS", sans-serif`;
    ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
  }

  // ───────────────────────── screens ─────────────────────────
  screenIs(name) { return !this.screen.classList.contains('hidden') && this.current === name; }

  show(html, name = '') {
    this.current = name;
    this.screen.innerHTML = html;
    this.screen.classList.remove('hidden');
  }
  hide() {
    this.screen.classList.add('hidden');
    this.screen.innerHTML = '';
  }

  mutatorChips(ids) {
    return ids.map((id) => `<span class="mut" title="${MUTATORS[id].desc}">${MUTATORS[id].icon} ${MUTATORS[id].name}</span>`).join('');
  }

  showMenu(records) {
    const g = this.game;
    const mode = g.mode;
    const daily = currentDaily();
    const weekly = currentWeekly();
    const lockedChar = mode === 'daily' ? daily.char : null;
    const chars = CHARACTERS.map((c) => {
      const r = records?.[c.id];
      const w = WEAPONS[c.weapon];
      const sel = lockedChar ? c.id === lockedChar : c.id === this.selectedChar;
      const unlocked = g.isUnlocked('char', c.id) || c.id === lockedChar;
      if (!unlocked) {
        const src = unlockSource('char', c.id);
        const req = src ? `${src.name}: ${src.desc}` : 'Locked';
        return `<div class="char locked" data-act="lockedchar" data-req="${req}" title="${req}">
          <div class="ic">🔒</div><div class="nm">${c.name}</div><div class="pk">${req}</div></div>`;
      }
      return `<div class="char ${sel ? 'sel' : ''} ${lockedChar && !sel ? 'locked' : ''}" ${lockedChar ? '' : `data-act="char" data-id="${c.id}"`}>
        ${isNew(c.added) ? NEW_BADGE : ''}
        <div class="ic">${CHAR_ICONS[c.id] || '🙂'}</div>
        <div class="nm">${c.name}</div>
        <div class="pk">${w.icon} ${w.name}<br>${c.perk}</div>
        ${r ? `<div class="best">Best: Stage ${r.bestStage} · ${fmtNum(r.bestKills)} kills${r.wins ? ` · ${r.wins}🏆` : ''}${r.bestHeat > 0 ? ` · 🔥${r.bestHeat}` : ''}</div>` : ''}
      </div>`;
    }).join('');
    const lengths = [[360, 'Quick (6 min)'], [600, 'Standard (10 min)']];
    const modes = [['standard', '⚔️ Standard'], ['daily', '📅 Daily Challenge'], ['weekly', `🎪 ${weekly.live ? 'Live Event' : 'Weekly Event'}`]];
    let modeInfo = '';
    if (mode === 'daily') {
      const best = g.meta.daily?.[daily.id];
      modeInfo = `<div class="modeinfo"><b>${daily.name}</b> — same hero, realms and rules for everyone today.
        <div class="muts">${this.mutatorChips(daily.mutators)}</div>
        <span class="muted">Soul Shards ×${daily.shardMult.toFixed(2)}${best ? ` · Today's best: <b>${fmtNum(best)}</b>` : ''}</span></div>`;
    } else if (mode === 'weekly') {
      modeInfo = `<div class="modeinfo"><b>${weekly.name}</b> — ${weekly.desc} <span class="muted">Ends ${weekly.ends}</span>
        <div class="muts">${this.mutatorChips(weekly.mutators)}</div>
        <span class="muted">Soul Shards ×${weekly.shardMult.toFixed(2)}</span></div>`;
    }
    const slots = STAGE_SLOTS.map((slot, i) => `<span class="stage-chip">${i + 1}. ${slot.map((st) => st.name + (isNew(st.added) ? ' ✨' : '')).join(' / ')}</span>`).join('');
    this.show(`<div class="panel">
      <h1 class="title-logo">BONK REALMS</h1>
      <div class="sub">A 3D survivor-roguelike. Auto-attack, level up, loot chests, find the portal and bonk the boss of each realm.</div>
      <div class="stage-preview">${slots}</div>
      <div class="row modes">${modes.map(([v, l]) => `<button class="sm toggle ${mode === v ? 'on' : ''}" data-act="mode" data-v="${v}">${l}</button>`).join('')}</div>
      ${modeInfo}
      <div class="chars">${chars}</div>
      ${this.heatHtml()}
      <div class="row">Stage timer:
        ${lengths.map(([v, l]) => `<button class="sm toggle ${this.runLength === v ? 'on' : ''}" data-act="len" data-v="${v}">${l}</button>`).join('')}
      </div>
      <div class="row"><button class="primary big" data-act="start">▶ Start ${mode === 'daily' ? 'Daily Challenge' : mode === 'weekly' ? weekly.name : 'Run'}</button></div>
      <div class="row">
        <button data-act="shop">💠 Soul Shop <span class="pill">${fmtNum(g.meta.shards)}</span></button>
        <button data-act="settings">⚙️ Settings</button>
        <button data-act="help">❔ How to Play</button>
        <button data-act="achievements">🏆 Achievements <span class="pill">${Object.keys(g.meta.achievements).length}/${ACHIEVEMENTS.length}</span></button>
        <button data-act="boards" data-v="${mode === 'weekly' ? 'weekly' : 'daily'}">🌍 Leaderboards</button>
        <button data-act="whatsnew">📰 What's New</button>
      </div>
      <div class="version">v${GAME_VERSION} · ${PATCHES[0].title}</div>
    </div>`, 'menu');
  }

  heatHtml() {
    const g = this.game, max = g.meta.maxHeat || 0;
    if (g.mode === 'daily') return '';
    if (!max) return '<div class="row muted">🔥 Win a run to unlock <b>Heat</b> difficulty tiers (more Soul Shards).</div>';
    const h = Math.min(g.heat, max);
    const list = HEAT_LEVELS.slice(0, h).map((l, i) => `<li>${i + 1}. ${l.desc}</li>`).join('');
    return `<div class="row heat">🔥 Heat
      <button class="sm" data-act="heat" data-v="-1" ${h <= 0 ? 'disabled' : ''}>−</button>
      <b class="heatnum heat${h}">${h}</b>
      <button class="sm" data-act="heat" data-v="1" ${h >= max ? 'disabled' : ''}>+</button>
      <span class="muted">${h ? `+${Math.round(h * 25)}% Soul Shards` : 'Normal difficulty'} · unlocked up to ${max}</span></div>
      ${h ? `<ul class="heatlist">${list}</ul>` : ''}`;
  }

  showAchievements() {
    const g = this.game, got = g.meta.achievements, st = g.meta.stats;
    const cards = ACHIEVEMENTS.map((a) => {
      const done = !!got[a.id];
      let reward = '';
      if (a.unlock?.char) reward = `Unlocks hero: ${CHARACTERS.find((c) => c.id === a.unlock.char).name}`;
      if (a.unlock?.weapon) reward = `Unlocks weapon: ${WEAPONS[a.unlock.weapon].icon} ${WEAPONS[a.unlock.weapon].name}`;
      return `<div class="ach ${done ? 'done' : ''}">
        <div class="ic">${done ? a.icon : '🔒'}</div>
        <div class="info"><b>${a.name}</b><span>${a.desc}</span>${reward ? `<em>${reward}</em>` : ''}${done ? `<small>Earned ${got[a.id]}</small>` : ''}</div>
      </div>`;
    }).join('');
    this.show(`<div class="panel" style="max-width:960px">
      <h2>🏆 Achievements · ${Object.keys(got).length}/${ACHIEVEMENTS.length}</h2>
      <div class="sub">Lifetime: ${fmtNum(st.kills)} kills · ${st.bosses} bosses · ${st.chests} chests · ${st.heroWins.length} heroes with a win · ${st.realms.length} realms visited</div>
      <div class="achs">${cards}</div>
      <div class="row"><button class="primary" data-act="back">Back</button></div>
    </div>`, 'achievements');
  }

  async showBoards(tab = 'daily') {
    const g = this.game;
    const daily = currentDaily(), weekly = currentWeekly();
    const board = tab === 'daily' ? daily.id : weekly.live ? `live-${weekly.id}` : weekly.id;
    const title = tab === 'daily' ? daily.name : weekly.name;
    const tabs = [['daily', '📅 Daily'], ['weekly', `🎪 ${weekly.live ? 'Live Event' : 'Weekly'}`]]
      .map(([v, l]) => `<button class="sm toggle ${tab === v ? 'on' : ''}" data-act="boards" data-v="${v}">${l}</button>`).join('');
    const nameRow = `<div class="row"><span>Your name:</span><input id="pname" maxlength="16" value="${g.settings.playerName || ''}" placeholder="Player name">
      <button class="sm" data-act="savename" data-v="${tab}">Save</button></div>`;
    const frame = (body) => `<div class="panel" style="max-width:620px">
      <h2>🌍 Leaderboards</h2><div class="row">${tabs}</div>
      <div class="sub"><b>${title}</b> · your best: <b>${fmtNum(g.meta.daily?.[board] || 0)}</b></div>
      ${body}${nameRow}
      <div class="row"><button class="primary" data-act="back">Back</button></div></div>`;
    if (!boardsEnabled()) {
      this.show(frame('<div class="help">Online leaderboards aren\'t switched on for this copy of the game yet.<br>Your personal bests are still tracked. (Developer: see LEADERBOARDS.md.)</div>'), 'boards');
      return;
    }
    this.show(frame('<div class="help">Loading…</div>'), 'boards');
    const rows = await topScores(board, 20);
    if (!this.screenIs('boards')) return;
    const me = g.settings.playerName;
    const body = !rows ? '<div class="help">Couldn\'t reach the leaderboard. Try again later.</div>'
      : !rows.length ? '<div class="help">No scores yet — be the first!</div>'
        : `<table class="board"><tr><th>#</th><th>Name</th><th>Hero</th><th>Realm</th><th>Score</th></tr>${rows.map((r, i) => `<tr class="${r.name === me ? 'me' : ''}">
          <td>${i + 1}</td><td>${r.name.replace(/</g, '&lt;')}</td><td>${CHAR_ICONS[r.hero] || ''}</td><td>${r.stage ?? ''}</td><td>${fmtNum(r.score)}</td></tr>`).join('')}</table>`;
    this.show(frame(body), 'boards');
  }

  showWhatsNew() {
    const patches = PATCHES.map((p, i) => `<div class="patch ${i === 0 ? 'latest' : ''}">
      <div class="ph"><b>v${p.version} — ${p.title}</b><span class="muted">${p.date}</span></div>
      <ul>${p.notes.map((n) => `<li>${n}</li>`).join('')}</ul></div>`).join('');
    this.show(`<div class="panel" style="max-width:720px">
      <h2>📰 What's New</h2>
      ${patches}
      <div class="row"><button class="primary" data-act="back">Let's go!</button></div>
    </div>`, 'whatsnew');
  }

  showHelp() {
    const touch = this.game.input.isTouch;
    const controls = touch
      ? '<b>Left side</b> drag to move · <b>Right side</b> drag to look<br><b>⤒</b> jump (tap again in the air with extra jumps) · <b>⇣</b> hold to slide · <b>✋</b> use chests, shrines and the portal'
      : '<b>WASD</b> move · <b>Mouse</b> look (click to capture) · <b>←/→</b> rotate camera<br><b>Space</b> jump (again in the air with extra jumps) · <b>Shift / C</b> slide — slide downhill to build speed, jump out of a slide to keep momentum<br><b>E</b> interact · <b>Esc / P</b> pause · <b>1-3</b> pick upgrade · <b>R</b> reroll · <b>M</b> mute';
    this.show(`<div class="panel" style="max-width:680px">
      <h2>How to Play</h2>
      <div class="help">
        ${controls}<br><br>
        Weapons fire automatically. Kill monsters for <b style="color:#6ab8ff">XP gems</b> and <b style="color:#ffd24a">gold</b>. Each level lets you pick a weapon, tome or upgrade — rarer rolls are stronger. <b>Banish</b> (✖) removes an option for the rest of the run.<br>
        Spend gold on <b style="color:#ffd24a">chests</b> for items. Stand in <b style="color:#5ac8ff">charge shrines</b> for stat boosts.<br>
        <b style="color:#ff5a5a">Challenge shrines</b> spawn an elite pack guarding a free chest. <b style="color:#f2c84a">Greed shrines</b> trade difficulty for gold.<br>
        Each realm hides a <b style="color:#b060ff">boss portal</b> — follow the beam of light or the 🌀 arrow. Summon the boss, defeat it, and step through.<br>
        When the timer hits zero the <b style="color:#ff4a4a">Final Swarm</b> begins. Don't dawdle.<br>
        Red zones explode after a moment. <b>Jump</b> over shockwave rings and low bullets.<br>
        Every run earns <b class="shard">Soul Shards</b> for permanent upgrades in the Soul Shop.
      </div>
      <div class="row"><button class="primary" data-act="back">Back</button></div>
    </div>`);
  }

  cardHtml(c, i, banishes) {
    const r = c.rarity || RARITIES[0];
    const canBanish = banishes > 0 && c.type !== 'shrine' && c.type !== 'gold' && c.type !== 'evolve';
    return `<div class="card rar-${r.id}" style="--rc:${r.color}" data-act="pick" data-i="${i}">
      <span class="key">${i + 1}</span>
      ${canBanish ? `<button class="banish" data-act="banish" data-i="${i}" title="Banish: never offer this again this run">✖</button>` : ''}
      <div class="ic">${c.icon}</div>
      <div class="ttl">${c.title}</div>
      <div class="tag">${c.tag || ''}${c.isNew ? ' ' + NEW_BADGE : ''}</div>
      <div class="rar" style="color:${r.color}">${r.name}</div>
      <ul>${(c.lines || []).map((l) => `<li>${l}</li>`).join('')}</ul>
    </div>`;
  }

  showChoices(title, sub, choices, { rerolls = 0, banishes = 0, canSkip = true } = {}) {
    this.show(`<div class="panel">
      <h2>${title}</h2><div class="sub">${sub}</div>
      <div class="cards">${choices.map((c, i) => this.cardHtml(c, i, banishes)).join('')}</div>
      <div class="row">
        ${rerolls > 0 ? `<button class="sm" data-act="reroll">🎲 Reroll (${rerolls}) [R]</button>` : ''}
        ${banishes > 0 ? `<span class="muted">✖ Banishes left: ${banishes}</span>` : ''}
        ${canSkip ? '<button class="sm" data-act="skip">Skip</button>' : ''}
      </div>
    </div>`);
    this.screen.querySelectorAll('.card').forEach((el, i) => { el.style.animationDelay = `${i * 60}ms`; });
  }

  statsHtml() {
    const s = this.game.player.stats;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const rows = [
      ['Max HP', Math.round(s.maxHp)], ['Regen', s.regen.toFixed(1) + '/s'], ['Armor', pct(s.armor)], ['Evasion', pct(s.evasion)],
      ['Damage', pct(s.damage)], ['Attack Speed', pct(s.attackSpeed)], ['Crit Chance', pct(s.crit)], ['Crit Damage', pct(s.critDmg)],
      ['Size', pct(s.area)], ['Projectiles', '+' + s.projectiles], ['Proj. Speed', pct(s.projSpeed)], ['Duration', pct(s.duration)],
      ['Move Speed', pct(s.speed)], ['Jumps', s.jumps], ['Luck', pct(s.luck)], ['XP Gain', pct(s.xpGain)],
      ['Gold Gain', pct(s.goldGain)], ['Pickup Range', pct(s.pickup)], ['Difficulty', '+' + pct(s.curse)], ['Revives', s.revives],
    ];
    return `<div class="statgrid">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
  }

  buildHtml() {
    const g = this.game;
    if (!g.weapons) return '';
    const ws = g.weapons.list.map((w) => `<span class="bchip" title="${w.def.name}">${w.def.icon}<b>${w.level}</b></span>`).join('');
    const ts = Object.entries(g.run.tomes).map(([id, lv]) => `<span class="bchip tome" title="${TOMES[id].name}">${TOMES[id].icon}<b>${lv}</b></span>`).join('');
    const its = Object.entries(g.run.items).filter(([, n]) => n > 0)
      .map(([id, n]) => `<span class="bchip item" style="border-color:${RARITIES[ITEMS[id].rarity].color}" title="${ITEMS[id].name}: ${ITEMS[id].desc}">${ITEMS[id].icon}${n > 1 ? `<b>x${n}</b>` : ''}</span>`).join('');
    return `<div class="build"><div>${ws}${ts}</div>${its ? `<div>${its}</div>` : ''}</div>`;
  }

  showPause() {
    const g = this.game;
    this.show(`<div class="panel" style="max-width:780px">
      <h2>Paused</h2>
      <div class="sub">Stage ${g.stageIndex + 1} · ${g.stage.name} · ${formatTime(g.stageTime)} elapsed · Level ${g.run.level}</div>
      ${g.run.mutators.length ? `<div class="muts center">${this.mutatorChips(g.run.mutators)}</div>` : ''}
      ${this.buildHtml()}
      ${this.statsHtml()}
      <div class="row"><button class="primary" data-act="resume">Resume</button><button data-act="settings">⚙️ Settings</button><button data-act="quit">Quit to Menu</button></div>
    </div>`);
  }

  summaryHtml(sum) {
    return `<div class="statgrid">
      <div><span>Stage reached</span><b>${sum.stage}</b></div>
      <div><span>Level</span><b>${sum.level}</b></div>
      <div><span>Kills</span><b>${fmtNum(sum.kills)}</b></div>
      <div><span>Bosses slain</span><b>${sum.bosses || 0}</b></div>
      <div><span>Gold earned</span><b>${fmtNum(sum.gold)}</b></div>
      <div><span>Damage dealt</span><b>${fmtNum(sum.damage)}</b></div>
      <div><span>Run time</span><b>${formatTime(sum.time)}</b></div>
      ${sum.shards !== undefined ? `<div><span>Soul Shards</span><b class="shard">+${sum.shards} 💠</b></div>` : ''}
      ${sum.mode && sum.mode !== 'standard' ? `<div><span>Mode</span><b>${sum.label}</b></div>` : ''}
      ${sum.heat ? `<div><span>Heat</span><b>🔥 ${sum.heat}</b></div>` : ''}
      ${sum.heatUnlocked ? `<div><span>Unlocked</span><b>🔥 Heat ${sum.heatUnlocked}!</b></div>` : ''}
      ${sum.dailyScore !== undefined ? `<div><span>Event score</span><b>${fmtNum(sum.dailyScore)}${sum.dailyScore >= sum.dailyBest ? ' 🏅 best!' : ` (best ${fmtNum(sum.dailyBest)})`}</b></div>` : ''}
    </div>${sum.posted ? `<div class="help">🌍 ${sum.posted}</div>` : ''}${this.buildHtml()}`;
  }

  showGameOver(sum) {
    this.show(`<div class="panel" style="max-width:720px">
      <h1 style="color:#ff5a5a">YOU DIED</h1>
      <div class="sub">Killed by ${sum.killedBy || 'the horde'} in ${sum.stageName}</div>
      ${this.summaryHtml(sum)}
      <div class="help">Spend Soul Shards in the Soul Shop for permanent upgrades.</div>
      <div class="row"><button class="primary" data-act="retry">Try Again</button><button data-act="shop">💠 Soul Shop</button><button data-act="quit">Main Menu</button></div>
    </div>`);
  }

  showStageClear(sum, next) {
    this.show(`<div class="panel" style="max-width:720px">
      <h1 style="color:#40ffd0">REALM CLEARED</h1>
      <div class="sub">${sum.stageName} has fallen. Next: <b>${next.name}</b> — <i>${next.subtitle}</i></div>
      ${this.summaryHtml(sum)}
      <div class="help">You keep your weapons, tomes, items and level. Enemies grow much stronger. +1 reroll, +1 banish.</div>
      <div class="row"><button class="primary" data-act="next">Enter ${next.name} ▶</button></div>
    </div>`);
  }

  showVictory(sum) {
    this.show(`<div class="panel" style="max-width:720px">
      <h1 class="title-logo">VICTORY!</h1>
      <div class="sub">All five realm bosses have been bonked. Legendary.</div>
      ${this.summaryHtml(sum)}
      <div class="row"><button class="primary" data-act="endless">Keep Going (Endless Loop) ▶</button><button data-act="quit">Main Menu</button></div>
    </div>`);
  }

  showShop(meta) {
    const rows = META_UPGRADES.map((up) => {
      const lv = meta.levels[up.id] || 0;
      const maxed = lv >= up.max;
      const cost = metaCost(up, lv);
      const pips = Array.from({ length: up.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      return `<div class="shopitem ${maxed ? 'maxed' : ''}">
        <div class="ic">${up.icon}</div>
        <div class="info"><b>${up.name}</b><span>${up.desc}</span><div class="pips">${pips}</div></div>
        <button class="sm ${!maxed && meta.shards >= cost ? 'primary' : ''}" data-act="buy" data-id="${up.id}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : `${cost} 💠`}</button>
      </div>`;
    }).join('');
    const back = this.game.state === 'dead' ? 'quit' : 'back';
    this.show(`<div class="panel" style="max-width:900px">
      <h2>💠 Soul Shop</h2>
      <div class="sub">Permanent upgrades for every run. You have <b class="shard">${fmtNum(meta.shards)} Soul Shards</b> — earn more by clearing realms, slaying bosses and surviving.</div>
      <div class="shop">${rows}</div>
      <div class="row"><button class="primary" data-act="${back}">Back</button></div>
    </div>`);
  }

  showSettings(st, from) {
    const slider = (key, label, min, max, step) => `<label class="setrow"><span>${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${st[key]}" data-setting="${key}" data-from="${from}">
      <b>${Math.round(st[key] * 100)}%</b></label>`;
    const toggle = (key, label) => `<label class="setrow"><span>${label}</span>
      <button class="sm toggle ${st[key] ? 'on' : ''}" data-act="set" data-key="${key}" data-type="bool" data-from="${from}">${st[key] ? 'On' : 'Off'}</button></label>`;
    const quality = ['low', 'medium', 'high'].map((q) => `<button class="sm toggle ${st.quality === q ? 'on' : ''}" data-act="set" data-key="quality" data-v="${q}" data-from="${from}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('');
    this.show(`<div class="panel" style="max-width:560px">
      <h2>⚙️ Settings</h2>
      ${slider('master', 'Master volume', 0, 1, 0.05)}
      ${slider('music', 'Music', 0, 1, 0.05)}
      ${slider('sfx', 'Sound effects', 0, 1, 0.05)}
      ${slider('sensitivity', 'Look sensitivity', 0.3, 2.5, 0.05)}
      ${toggle('invertY', 'Invert look Y')}
      ${toggle('damageNumbers', 'Damage numbers')}
      ${toggle('screenShake', 'Screen shake')}
      ${toggle('showFps', 'Show FPS')}
      <label class="setrow"><span>Graphics</span><span class="row" style="margin:0">${quality}</span></label>
      <div class="row"><button class="sm" data-act="resethints">Show tips again</button></div>
      <div class="row"><button class="primary" data-act="${from === 'pause' ? 'backpause' : 'back'}">Back</button></div>
    </div>`);
  }

  update(dt) {
    const g = this.game;
    if (g.state !== 'menu') {
      this.updateHud(dt);
      this.drawMinimap();
    }
    this.drawOverlay(dt);
  }
}
