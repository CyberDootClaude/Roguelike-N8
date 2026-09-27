// Fast logic simulation: steps the game without rendering, with a simple bot, across every stage.
// Usage: node tools/sim.mjs [charId] [stageMinutes]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(`http://localhost:${port}/`);
await page.waitForTimeout(1000);
const char = process.argv[2] || 'knight';
const minutes = Number(process.argv[3] || 5);

await page.evaluate((c) => { const g = window.__game; g.ui.selectedChar = c; g.startRun(c); g.renderer.render = () => {}; g.pause = () => {}; }, char);

// Bot tick executed inside the page.
const simulate = (secs, bossPhase) => page.evaluate(({ secs, bossPhase }) => {
  const g = window.__game;
  const dt = 1 / 30;
  let deaths = 0;
  const K = g.input.keys;
  for (let i = 0; i < secs / dt; i++) {
    if (g.state === 'modal') { g.pickChoice(Math.floor(Math.random() * g.modal.choices.length)); continue; }
    if (g.state === 'dead') { deaths++; g.player.dead = false; g.player.hp = g.player.stats.maxHp; g.state = 'play'; g.ui.hide(); }
    if (g.state !== 'play') break;
    const p = g.player;
    // steer: away from close enemies, toward gems, kite around the boss
    let mx = 0, mz = 0;
    for (const e of g.enemies.list) {
      if (!e.alive || e.boss) continue;
      const dx = p.x - e.x, dz = p.z - e.z, d2 = dx * dx + dz * dz;
      if (d2 < 64) { mx += dx / d2; mz += dz / d2; }
    }
    if (g.boss && !g.boss.dead) {
      // orbit the boss at ~9 units
      const dx = p.x - g.boss.x, dz = p.z - g.boss.z, d = Math.hypot(dx, dz) || 1;
      mx += (-dz / d) * 1.5 + (dx / d) * (9 - d) * 0.3; mz += (dx / d) * 1.5 + (dz / d) * (9 - d) * 0.3;
    }
    let best = null, bd = 400;
    for (const it of g.pickups.items) {
      const d2 = (it.x - p.x) ** 2 + (it.z - p.z) ** 2;
      if (d2 < bd) { bd = d2; best = it; }
    }
    if (best) { const d = Math.sqrt(bd) || 1; mx += (best.x - p.x) / d * 0.25; mz += (best.z - p.z) / d * 0.25; }
    const t = g.time;
    mx += Math.sin(t * 0.3) * 0.05 - p.x * 0.0015; mz += Math.cos(t * 0.3) * 0.05 - p.z * 0.0015;
    g.camYaw = Math.atan2(mx, mz);
    K.clear(); K.add('KeyW');
    if (Math.random() < 0.02) g.input.pressed.add('Space');
    // hop over shockwaves
    for (const w of g.hazards.waves) { const d = Math.hypot(p.x - w.x, p.z - w.z); if (d - w.r < 2.5 && d - w.r > 0) g.input.pressed.add('Space'); }
    g.update(dt);
    g.input.endFrame();
    // shopping: open affordable chests
    if (i % 300 === 0) {
      for (const it of g.world.interactables) {
        if (it.type === 'chest' && (it.free || g.run.gold >= (window.__cost || 0))) { g.interact(it); break; }
      }
    }
  }
  K.clear();
  return {
    t: Math.round(g.stageTime), lvl: g.run.level, hp: Math.round(g.player.hp) + '/' + Math.round(g.player.stats.maxHp), kills: g.run.kills,
    gold: g.run.gold, alive: g.enemies.list.length, deaths, weapons: g.weapons.list.map((w) => w.id + w.level).join(','),
    items: Object.keys(g.run.items).length, state: g.state, boss: g.boss ? Math.round(g.boss.e.hp) + '/' + Math.round(g.boss.e.maxHp) : '-', err: String(g.lastError || ''),
  };
}, { secs, bossPhase });

for (let s = 0; s < 5; s++) {
  const t0 = Date.now();
  let r = await simulate(minutes * 60);
  console.log(`stage ${s + 1} after ${minutes}min`, JSON.stringify(r), `(${((Date.now() - t0) / 1000).toFixed(0)}s real)`);
  await page.evaluate(() => { const g = window.__game; const p = g.world.portal; g.player.placeAt(p.x + 12, p.z + 12); g.summonBoss(); });
  let bossTime = 0;
  for (; bossTime < 180; bossTime += 15) {
    r = await simulate(15, true);
    const dead = await page.evaluate(() => window.__game.boss.dead);
    if (dead) break;
  }
  console.log(`  boss fight ~${bossTime + 15}s`, JSON.stringify(r));
  await page.evaluate(() => {
    const g = window.__game;
    if (!g.boss.dead) { g.boss.e.untargetable = false; g.boss.e.invuln = false; g.combat.damage(g.boss.e, 1e12, {}); }
    const p = g.world.portal; g.player.placeAt(p.x + 1, p.z + 1);
    let n = 0; while (g.state === 'modal' && n++ < 40) g.pickChoice(0);
    g.interact(p);
    if (g.state === 'stageclear' || g.state === 'victory') g.nextStage();
  });
}
console.log('errors:', errors.length ? [...new Set(errors)].slice(0, 10).join('\n') : 'none');
await browser.close();
server.close();
