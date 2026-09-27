// Headless smoke test: boots the game, plays through scripted scenarios, screenshots, reports errors.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'test-output');
fs.mkdirSync(out, { recursive: true });
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
const scenario = process.argv[2] || 'basic';
await page.goto(`http://localhost:${port}/?god${scenario === 'debug' ? '&debug' : ''}`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/00-menu.png` });

const G = (fn, arg) => page.evaluate(fn, arg);
const step = async (ms) => page.waitForTimeout(ms);
const autoPick = async () => G(() => { const g = window.__game; let n = 0; while (g.state === 'modal' && n++ < 30) g.pickChoice(0); return g.state; });

await page.click('[data-act=start]');
await step(500);
await page.keyboard.down('KeyW');
await step(1500);
await page.keyboard.press('Space');
await page.keyboard.down('ShiftLeft');
await step(600);
await page.keyboard.up('ShiftLeft');
await page.screenshot({ path: `${out}/01-play.png` });

const stagesToRun = Number(process.argv[3] || 1);
for (let s = 0; s < stagesToRun; s++) {
  // fast-forward the stage clock so harder enemies appear
  await G(() => { const g = window.__game; g.stageTime = 240; g.player.addStats({ damage: 3 }); });
  for (let i = 0; i < 8; i++) { await step(500); await autoPick(); }
  await page.screenshot({ path: `${out}/s${s}-a-fight.png` });
  // teleport next to the portal and summon the boss
  await G(() => { const g = window.__game; const p = g.world.portal; g.player.placeAt(p.x + 6, p.z + 6); g.summonBoss(); });
  for (let i = 0; i < 10; i++) { await step(500); await autoPick(); }
  await page.screenshot({ path: `${out}/s${s}-b-boss.png` });
  const info = await G(() => { const g = window.__game; return { hp: g.boss.e.hp, max: g.boss.e.maxHp, state: g.state, enemies: g.enemies.list.length }; });
  console.log('boss', JSON.stringify(info));
  // let each attack run, then kill it
  for (let i = 0; i < 14; i++) { await step(700); await autoPick(); }
  await page.screenshot({ path: `${out}/s${s}-c-boss2.png` });
  await G(() => { const g = window.__game; g.boss.e.hp = 1; g.combat.damage(g.boss.e, 1e9, {}); });
  await step(800); await autoPick();
  await G(() => { const g = window.__game; const p = g.world.portal; g.player.placeAt(p.x + 1, p.z + 1); g.interact(p); });
  await step(300);
  const st = await G(() => window.__game.state);
  console.log('after portal', st);
  await page.screenshot({ path: `${out}/s${s}-d-clear.png` });
  if (st === 'stageclear' || st === 'victory') await page.click('[data-act=next],[data-act=endless]');
  await step(800);
  await page.screenshot({ path: `${out}/s${s}-e-next.png` });
}
const stats = await G(() => { const g = window.__game; return { state: g.state, stage: g.stageIndex, level: g.run.level, kills: g.run.kills, fps: 0, err: String(g.lastError || '') }; });
console.log('final', JSON.stringify(stats));
console.log('errors:', errors.length ? errors.slice(0, 10).join('\n') : 'none');
await browser.close();
server.close();
