// Screenshots of every menu/modal plus a phone-sized touch session.
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'test-output');
fs.mkdirSync(out, { recursive: true });
const types = { '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const watch = (page) => {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
};

// Desktop screens
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watch(page);
  await page.goto(url + '?god');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const g = window.__game; g.meta.shards = 500; });
  await page.click('[data-act=shop]');
  await page.waitForTimeout(200);
  await page.click('[data-act=buy][data-id=might]');
  await page.screenshot({ path: `${out}/ui-shop.png` });
  await page.click('[data-act=back]');
  await page.click('[data-act=settings]');
  await page.click('[data-act=set][data-key=showFps]');
  await page.screenshot({ path: `${out}/ui-settings.png` });
  await page.click('[data-act=back]');
  await page.click('[data-act=start]');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const g = window.__game; g.gainXp(40); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/ui-levelup.png` });
  await page.click('[data-act=banish][data-i="0"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/ui-banish.png` });
  await page.evaluate(() => { const g = window.__game; let n = 0; while (g.state === 'modal' && n++ < 20) g.pickChoice(0); });
  await page.evaluate(() => { const g = window.__game; g.state = 'play'; g.pause(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/ui-pause.png` });
  await page.click('[data-act=resume]');
  await page.evaluate(() => { const g = window.__game; g.godMode = false; g.player.hurt(99999, { ignoreIframes: true, source: 'Test' }); });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/ui-gameover.png` });
  console.log('meta', JSON.stringify(await page.evaluate(() => window.__game.meta)));
  await page.close();
}

// Phone (landscape) with touch
{
  const ctx = await browser.newContext({ ...devices['Pixel 7 landscape'] });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(url + '?god');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/m-menu.png` });
  await page.tap('[data-act=start]');
  await page.waitForTimeout(1500);
  // drag the joystick forward on the left half
  const vp = page.viewportSize();
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const x0 = vp.width * 0.2, y0 = vp.height * 0.7;
  await touch('touchStart', x0, y0);
  for (let i = 1; i <= 5; i++) { await touch('touchMove', x0, y0 - i * 12); await page.waitForTimeout(50); }
  await page.waitForTimeout(1500);
  const moved = await page.evaluate(() => { const g = window.__game; return { x: g.player.x, z: g.player.z, axis: g.input.axis }; });
  await page.screenshot({ path: `${out}/m-play.png` });
  await touch('touchEnd', 0, 0);
  console.log('touch move', JSON.stringify(moved));
  await ctx.close();
}
console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
