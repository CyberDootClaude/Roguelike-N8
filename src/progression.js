// Level-up choices, chest loot and shrine rewards.
import { WEAPONS, TOMES, ITEMS, RARITIES, SHRINE_BUFFS, WEAPON_UPGRADES, rollRarity, fmtStat } from './data/loot.js';
import { shuffle } from './util.js';

export const MAX_WEAPONS = 4;
export const MAX_TOMES = 4;
export const MAX_TOME_LEVEL = 10;

export function buildLevelChoices(game, n = 3) {
  const run = game.run, W = game.weapons, luck = game.player.stats.luck;
  const pool = [];
  for (const w of W.list) {
    pool.push({ type: 'weapon-up', id: w.id, weight: 3 });
  }
  if (W.list.length < MAX_WEAPONS) {
    for (const id of Object.keys(WEAPONS)) if (!W.has(id)) pool.push({ type: 'weapon-new', id, weight: 1 });
  }
  const tomeIds = Object.keys(run.tomes);
  for (const id of tomeIds) {
    const t = TOMES[id];
    if (run.tomes[id] < (t.max || MAX_TOME_LEVEL)) pool.push({ type: 'tome-up', id, weight: 2.5 });
  }
  if (tomeIds.length < MAX_TOMES) {
    for (const id of Object.keys(TOMES)) if (!run.tomes[id]) pool.push({ type: 'tome-new', id, weight: 1 });
  }
  const picks = [];
  const avail = pool.filter((p) => !run.banished?.has(p.id));
  while (picks.length < n && avail.length) {
    let tot = avail.reduce((a, b) => a + b.weight, 0), x = Math.random() * tot, i = 0;
    for (; i < avail.length; i++) { x -= avail[i].weight; if (x <= 0) break; }
    i = Math.min(i, avail.length - 1);
    picks.push(avail[i]);
    avail.splice(i, 1);
  }
  if (!picks.length) {
    return [{ type: 'gold', rarity: RARITIES[0], title: 'Pile of Gold', icon: '💰', lines: ['+25 gold'], amount: 25 }];
  }
  return picks.map((p) => describe(game, p, rollRarity(luck)));
}

function describe(game, p, rarity) {
  const c = { ...p, rarity };
  if (p.type === 'weapon-new') {
    const d = WEAPONS[p.id];
    c.title = d.name; c.icon = d.icon; c.tag = 'New Weapon';
    c.lines = [d.desc];
    c.rarity = RARITIES[0];
  } else if (p.type === 'weapon-up') {
    const w = game.weapons.get(p.id);
    c.rolls = w.rollUpgrade(rarity);
    c.title = w.def.name; c.icon = w.def.icon; c.tag = `Lv ${w.level} → ${w.level + 1}`;
    c.lines = c.rolls.map(({ key, value }) => {
      const u = WEAPON_UPGRADES[key];
      return `${u.label} ${fmtStat(u.fmt, value)}`;
    });
  } else {
    const t = TOMES[p.id];
    const amt = t.noScale ? t.per : t.per * rarity.mult;
    if (t.noScale) c.rarity = RARITIES[2];
    c.amount = amt;
    c.title = t.name; c.icon = t.icon;
    const lvl = game.run.tomes[p.id] || 0;
    c.tag = p.type === 'tome-new' ? 'New Tome' : `Lv ${lvl} → ${lvl + 1}`;
    c.lines = [`${t.desc} ${fmtStat(t.fmt, amt)}`];
    if (p.id === 'cursed') c.lines.push('Enemies are tougher & more numerous, but drop more.');
  }
  return c;
}

export function applyChoice(game, c) {
  const run = game.run, P = game.player;
  switch (c.type) {
    case 'weapon-new': game.weapons.add(c.id); break;
    case 'weapon-up': game.weapons.get(c.id).applyUpgrade(c.rolls); break;
    case 'tome-new':
    case 'tome-up': {
      const t = TOMES[c.id];
      run.tomes[c.id] = (run.tomes[c.id] || 0) + 1;
      P.addStats({ [t.stat]: c.amount });
      if (t.stat === 'curse') { P.addStats({ xpGain: c.amount * 0.5 }); }
      break;
    }
    case 'gold': run.gold += c.amount; break;
  }
}

export function rollChestItem(game, minTier = 0) {
  const rarity = rollRarity(game.player.stats.luck, minTier);
  let tier = RARITIES.indexOf(rarity);
  let options = [];
  while (!options.length && tier >= 0) {
    options = Object.entries(ITEMS).filter(([, it]) => it.rarity === tier);
    tier--;
  }
  const [id, item] = options[Math.floor(Math.random() * options.length)];
  return { id, item };
}

export function giveItem(game, id) {
  const it = ITEMS[id];
  game.run.items[id] = (game.run.items[id] || 0) + 1;
  game.player.addStats(it.stats);
}

export function buildShrineChoices(game, golden) {
  const luck = game.player.stats.luck;
  const picks = shuffle(SHRINE_BUFFS.slice()).slice(0, 3);
  return picks.map((b) => {
    const rarity = rollRarity(luck, golden ? 3 : 0);
    const v = b.per * rarity.mult * (golden ? 1.5 : 1);
    return { type: 'shrine', stat: b.stat, amount: v, rarity, title: b.label, icon: '✨', lines: [`${b.label} ${fmtStat(b.fmt, v)}`] };
  });
}

export function chestCost(game) {
  const opened = game.stageChests;
  const base = (18 + opened * 9 + opened * opened * 0.8) * (1 + game.stageIndex * 0.8) * Math.pow(3, game.run.loop);
  return Math.max(1, Math.round(base * (1 - game.player.stats.chestDiscount)));
}
