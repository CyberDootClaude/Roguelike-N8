// DOM HUD, menus, modals, minimap and the 2D overlay (damage numbers, health bars, banners).
import * as THREE from 'three';
import { CHARACTERS, WEAPONS, TOMES, ITEMS, RARITIES } from './data/loot.js';
import { STAGES } from './data/stages.js';
import { formatTime, fmtNum, clamp } from './util.js';
import { MAX_WEAPONS, MAX_TOMES } from './progression.js';
import { WORLD_HALF } from './world.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const CHAR_ICONS = { knight: '🛡️', ranger: '🏹', pyro: '🔥', monk: '⚡', gunslinger: '🤠', dancer: '🌀', alchemist: '🧪' };

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
      if (b && this.onAction) this.onAction(b.dataset.act, b.dataset);
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

  shake(a) { this.game.camShake = Math.max(this.game.camShake, a); }

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
    $('hpfill').style.width = `${clamp(p.hp / p.stats.maxHp, 0, 1) * 100}%`;
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
    $('stagename').textContent = `Stage ${g.stageIndex + 1 + run.loop * STAGES.length} · ${g.stage.name}`;
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
    // interactable labels when near
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

  // ───────────────────────── screens ─────────────────────────
  show(html) {
    this.screen.innerHTML = html;
    this.screen.classList.remove('hidden');
  }
  hide() {
    this.screen.classList.add('hidden');
    this.screen.innerHTML = '';
  }

  showMenu(records) {
    const chars = CHARACTERS.map((c) => {
      const r = records?.[c.id];
      const w = WEAPONS[c.weapon];
      return `<div class="char ${c.id === this.selectedChar ? 'sel' : ''}" data-act="char" data-id="${c.id}">
        <div class="ic">${CHAR_ICONS[c.id] || '🙂'}</div>
        <div class="nm">${c.name}</div>
        <div class="pk">${w.icon} ${w.name}<br>${c.perk}</div>
        ${r ? `<div class="best">Best: Stage ${r.bestStage} · ${fmtNum(r.bestKills)} kills${r.wins ? ` · ${r.wins}🏆` : ''}</div>` : ''}
      </div>`;
    }).join('');
    const lengths = [[360, 'Quick (6 min)'], [600, 'Standard (10 min)']];
    this.show(`<div class="panel">
      <h1 class="title-logo">BONK REALMS</h1>
      <div class="sub">A 3D survivor-roguelike. Auto-attack, level up, loot chests, find the portal and bonk the boss of each realm.</div>
      <div class="stage-preview">${STAGES.map((s, i) => `<span class="stage-chip">${i + 1}. ${s.name}</span>`).join('')}</div>
      <div class="chars">${chars}</div>
      <div class="row">Stage timer:
        ${lengths.map(([v, l]) => `<button class="sm toggle ${this.runLength === v ? 'on' : ''}" data-act="len" data-v="${v}">${l}</button>`).join('')}
      </div>
      <div class="row"><button class="primary" data-act="start">▶ Start Run</button><button data-act="help">Controls</button></div>
    </div>`);
  }

  showHelp() {
    this.show(`<div class="panel" style="max-width:640px">
      <h2>How to Play</h2>
      <div class="help">
        <b>WASD</b> move · <b>Mouse</b> look (click to capture) · <b>←/→</b> rotate camera<br>
        <b>Space</b> jump (again in the air with extra jumps) · <b>Shift / C</b> slide — slide downhill to build speed, jump out of a slide to keep momentum<br>
        <b>E</b> interact (chests, shrines, portal) · <b>Esc / P</b> pause · <b>1-3</b> pick upgrade · <b>R</b> reroll · <b>M</b> mute<br><br>
        Weapons fire automatically. Kill monsters for XP gems and gold.<br>
        Spend gold on <b style="color:#ffd24a">chests</b> for items. Stand in <b style="color:#5ac8ff">charge shrines</b> for stat boosts.<br>
        <b style="color:#ff5a5a">Challenge shrines</b> spawn an elite pack guarding a free chest. <b style="color:#f2c84a">Greed shrines</b> trade difficulty for gold.<br>
        Each realm hides a <b style="color:#b060ff">boss portal</b> — look for the beam of light. Summon the boss, defeat it, and step through.<br>
        When the timer hits zero the <b style="color:#ff4a4a">Final Swarm</b> begins. Don't dawdle.<br>
        Shockwaves can be <b>jumped over</b>; enemy bullets fly low — jump them too.
      </div>
      <div class="row"><button class="primary" data-act="back">Back</button></div>
    </div>`);
  }

  cardHtml(c, i) {
    const r = c.rarity || RARITIES[0];
    return `<div class="card" style="border-color:${r.color}" data-act="pick" data-i="${i}">
      <span class="key">${i + 1}</span>
      <div class="ic">${c.icon}</div>
      <div class="ttl">${c.title}</div>
      <div class="tag">${c.tag || ''}</div>
      <div class="rar" style="color:${r.color}">${r.name}</div>
      <ul>${(c.lines || []).map((l) => `<li>${l}</li>`).join('')}</ul>
    </div>`;
  }

  showChoices(title, sub, choices, { rerolls = 0, canSkip = true } = {}) {
    this.show(`<div class="panel">
      <h2>${title}</h2><div class="sub">${sub}</div>
      <div class="cards">${choices.map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row">
        ${rerolls > 0 ? `<button class="sm" data-act="reroll">🎲 Reroll (${rerolls}) [R]</button>` : ''}
        ${canSkip ? '<button class="sm" data-act="skip">Skip</button>' : ''}
      </div>
    </div>`);
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

  showPause() {
    const g = this.game;
    this.show(`<div class="panel" style="max-width:760px">
      <h2>Paused</h2>
      <div class="sub">Stage ${g.stageIndex + 1} · ${g.stage.name} · ${formatTime(g.stageTime)} elapsed · Level ${g.run.level}</div>
      ${this.statsHtml()}
      <div class="help"><b>WASD</b> move · <b>Space</b> jump · <b>Shift</b> slide · <b>E</b> interact · <b>M</b> mute</div>
      <div class="row"><button class="primary" data-act="resume">Resume</button><button data-act="quit">Quit to Menu</button></div>
    </div>`);
  }

  summaryHtml(sum) {
    return `<div class="statgrid">
      <div><span>Stage reached</span><b>${sum.stage}</b></div>
      <div><span>Level</span><b>${sum.level}</b></div>
      <div><span>Kills</span><b>${fmtNum(sum.kills)}</b></div>
      <div><span>Gold earned</span><b>${fmtNum(sum.gold)}</b></div>
      <div><span>Damage dealt</span><b>${fmtNum(sum.damage)}</b></div>
      <div><span>Run time</span><b>${formatTime(sum.time)}</b></div>
    </div>`;
  }

  showGameOver(sum) {
    this.show(`<div class="panel" style="max-width:700px">
      <h1 style="color:#ff5a5a">YOU DIED</h1>
      <div class="sub">Killed by ${sum.killedBy || 'the horde'} in ${sum.stageName}</div>
      ${this.summaryHtml(sum)}
      <div class="row"><button class="primary" data-act="retry">Try Again</button><button data-act="quit">Main Menu</button></div>
    </div>`);
  }

  showStageClear(sum, next) {
    this.show(`<div class="panel" style="max-width:700px">
      <h1 style="color:#40ffd0">REALM CLEARED</h1>
      <div class="sub">${sum.stageName} has fallen. Next: <b>${next.name}</b> — <i>${next.subtitle}</i></div>
      ${this.summaryHtml(sum)}
      <div class="help">You keep your weapons, tomes, items and level. Enemies grow much stronger.</div>
      <div class="row"><button class="primary" data-act="next">Enter ${next.name} ▶</button></div>
    </div>`);
  }

  showVictory(sum) {
    this.show(`<div class="panel" style="max-width:700px">
      <h1 class="title-logo">VICTORY!</h1>
      <div class="sub">All five realm bosses have been bonked. Legendary.</div>
      ${this.summaryHtml(sum)}
      <div class="row"><button class="primary" data-act="endless">Keep Going (Endless Loop) ▶</button><button data-act="quit">Main Menu</button></div>
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
