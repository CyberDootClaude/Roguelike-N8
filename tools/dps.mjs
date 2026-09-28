// Measures damage per second against the stage-1 boss for a fixed build.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('ERR', e));
await page.goto(`http://localhost:${server.address().port}/?god`);
await page.waitForTimeout(800);
const weapons = process.argv[2] ? process.argv.slice(2) : Object.keys(await page.evaluate(async () => (await import('/src/data/loot.js')).WEAPONS));
for (const w of weapons) {
  const r = await page.evaluate((w) => {
    const g = window.__game;
    g.startRun('knight'); g.renderer.render = () => {}; g.pause = () => {};
    g.weapons.list.length = 0; g.weapons.add(w);
    g.spawning = false;
    const p = g.world.portal; g.player.placeAt(p.x + 6, p.z + 6); g.summonBoss();
    const b = g.boss;
    for (let i = 0; i < 60; i++) { g.update(1 / 30); g.input.endFrame(); }
    g.enemies.list.filter((e) => !e.boss).forEach((e) => { e.alive = false; e.pool.remove(e.vis); });
    const h0 = b.e.hp; let t = 0;
    for (let i = 0; i < 600; i++) {
      // stay 6 units from the boss
      const a = Math.atan2(g.player.x - b.x, g.player.z - b.z);
      g.player.x = b.x + Math.sin(a) * 6; g.player.z = b.z + Math.cos(a) * 6;
      b.cur = null; b.cooldown = 99;
      g.update(1 / 30); g.input.endFrame(); t += 1 / 30;
    }
    return Math.round((h0 - b.e.hp) / t);
  }, w);
  console.log(w.padEnd(10), 'boss dps', r);
}
await browser.close(); server.close();
