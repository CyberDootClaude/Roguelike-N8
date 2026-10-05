// Exercises patch content: modes, mutators, Crystal Caverns + Prismatrix, new weapons, What's New.
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
// pretend to be a returning 1.0 player so What's New appears
await page.addInitScript(() => { try { localStorage.setItem('bonkrealms.meta', JSON.stringify({ shards: 50, levels: {}, totalRuns: 3 })); } catch {} });
await page.goto(`http://localhost:${server.address().port}/?god`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/c-whatsnew.png` });
await page.click('[data-act=back]');
await page.click('[data-act=mode][data-v=weekly]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/c-menu-weekly.png` });
await page.click('[data-act=mode][data-v=daily]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/c-menu-daily.png` });

const step = (secs) => page.evaluate((secs) => {
  const g = window.__game;
  for (let i = 0; i < secs * 30; i++) {
    if (g.state === 'modal') { g.pickChoice(0); continue; }
    if (g.state !== 'play') break;
    g.update(1 / 30); g.input.endFrame();
  }
  return { state: g.state, stage: g.stage.id, kills: g.run.kills, mut: g.run.mutators, char: g.run.char.id, boss: g.boss ? [g.boss.id, Math.round(g.boss.e.hp)] : null, err: String(g.lastError || '') };
}, secs);

// Daily run
await page.click('[data-act=start]');
await page.waitForTimeout(500);
console.log('daily', JSON.stringify(await step(20)));
// Crystal Caverns forced, with the new weapons
const r = await page.evaluate(async () => {
  const g = window.__game;
  const { CRYSTAL_CAVERNS } = await import('/src/data/stages.js');
  g.mode = 'standard';
  g.startRun('quartz');
  g._render = g.renderer.render; g.renderer.render = () => {}; g.pause = () => {};
  g.run.realms[0] = CRYSTAL_CAVERNS;
  g.loadStage(0);
  g.weapons.add('totem');
  g.stageTime = 200;
  return g.stage.id;
});
console.log('forced realm', r);
console.log('crystal fight', JSON.stringify(await step(25)));
await page.evaluate(() => { const g = window.__game; g.renderer.render = g._render; });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/c-crystal.png` });
await page.evaluate(() => { const g = window.__game; g.renderer.render = () => {}; const p = g.world.portal; g.player.placeAt(p.x + 8, p.z + 8); g.summonBoss(); });
console.log('queen', JSON.stringify(await step(40)));
await page.evaluate(() => { const g = window.__game; g.renderer.render = g._render; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/c-queen.png` });
console.log('turrets', await page.evaluate(() => window.__game.combat.turrets.length));
// Evolution: max a weapon, own its partner tome, level up -> the evolve card must be offered and work
const evo = await page.evaluate(async () => {
  const g = window.__game;
  g.quitToMenu();
  g.mode = 'standard';
  g.startRun('ranger');
  g._render = g._render || g.renderer.render; g.pause = () => {};
  const w = g.weapons.get('bow');
  w.level = 7;
  g.run.tomes.quantity = 1;
  const { buildLevelChoices, applyChoice } = await import('/src/progression.js');
  const choices = buildLevelChoices(g);
  const card = choices.find((c) => c.type === 'evolve');
  if (card) applyChoice(g, card);
  for (let i = 0; i < 90; i++) { if (g.state === 'modal') g.pickChoice(0); g.update(1 / 30); g.input.endFrame(); }
  g.checkAchievements();
  return { offered: !!card, name: w.def.name, effect: w.effect, evolutions: g.run.evolutions, ach: Object.keys(g.meta.achievements) };
});
console.log('evolution', JSON.stringify(evo));
if (!evo.offered || evo.name !== 'Storm of Arrows') { console.log('FAIL: evolution not offered/applied'); process.exitCode = 1; }
// Heat applies, menus render
const heat = await page.evaluate(() => {
  const g = window.__game;
  g.quitToMenu(); g.meta.maxHeat = 3; g.heat = 3; g.mode = 'standard';
  g.startRun('knight');
  return { heat: g.run.heat, enemyHp: g.mods.enemyHp, timer: g.stageDuration };
});
console.log('heat', JSON.stringify(heat));
if (heat.heat !== 3 || !(heat.enemyHp > 1)) { console.log('FAIL: heat not applied'); process.exitCode = 1; }
await page.evaluate(() => { const g = window.__game; g.quitToMenu(); g.renderer.render = g._render || g.renderer.render; g.ui.showAchievements(); });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/c-achievements.png` });
await page.evaluate(() => window.__game.ui.showBoards('daily'));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/c-boards.png` });
await page.evaluate(() => window.__game.ui.showMenu(window.__game.records));
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/c-menu-heat.png` });
console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
const gameErr = await page.evaluate(() => String(window.__game?.lastError || '')).catch(() => '');
if (gameErr) console.log('game error:', gameErr);
if (errors.length || gameErr) process.exitCode = 1;
await browser.close();
server.close();
