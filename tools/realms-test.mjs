// Loads every realm variant, fights for a bit, summons its boss and screenshots both.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'test-output');
fs.mkdirSync(out, { recursive: true });
const types = { '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(`http://localhost:${server.address().port}/?god`);
await page.waitForTimeout(1200);
const only = process.argv.slice(2);
const ids = await page.evaluate(async () => (await import('/src/data/stages.js')).STAGE_SLOTS.flat().filter((s) => s.added).map((s) => s.id));
for (const id of ids.filter((x) => !only.length || only.includes(x))) {
  const r = await page.evaluate(async (id) => {
    const g = window.__game;
    const { STAGE_SLOTS } = await import('/src/data/stages.js');
    const st = STAGE_SLOTS.flat().find((s) => s.id === id);
    g.quitToMenu(); g.mode = 'standard';
    g.startRun('pyro');
    g._render = g._render || g.renderer.render; g.renderer.render = () => {}; g.pause = () => {};
    g.run.realms[0] = st; g.loadStage(0);
    g.stageTime = 240;
    for (let i = 0; i < 30 * 20; i++) { if (g.state === 'modal') g.pickChoice(0); g.update(1 / 30); g.input.endFrame(); }
    const kills = g.run.kills;
    const p = g.world.portal; g.player.placeAt(p.x + 10, p.z + 10); g.summonBoss();
    const attacks = new Set();
    for (let i = 0; i < 30 * 40; i++) {
      if (g.state === 'modal') g.pickChoice(0);
      g.update(1 / 30); g.input.endFrame();
      if (g.boss?.lastAttack) attacks.add(g.boss.lastAttack);
      if (i === 30 * 20) g.boss.e.hp = g.boss.e.maxHp * 0.45; // force enrage
    }
    g.renderer.render = g._render;
    return { id, kills, boss: g.boss.id, hp: Math.round(g.boss.e.hp), attacks: [...attacks], err: String(g.lastError || '') };
  }, id);
  console.log(JSON.stringify(r));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/realm-${id}-boss.png` });
}
console.log('errors:', errors.length ? [...new Set(errors)].slice(0, 10).join('\n') : 'none');
const gameErr = await page.evaluate(() => String(window.__game?.lastError || ''));
if (errors.length || gameErr) process.exitCode = 1;
await browser.close();
server.close();
