// Run mutators: rule changes used by Daily Challenges, Weekly Events and live events.
// Each mutator writes into `mods` (read by the enemy director, player, bosses and rewards)
// and/or adds player stats. `shards` is the Soul Shard bonus it grants (harder = more).

export const DEFAULT_MODS = {
  enemyHp: 1, enemyDmg: 1, enemySpeed: 1, enemySize: 1, spawnRate: 1, spawnCap: 1,
  eliteEvery: 1, bossHp: 1, goldMult: 1, xpMult: 1, gravity: 1, jump: 1, fog: 1,
  deathBlast: 0, bossChests: 0, chestCost: 1, healMult: 1, timerMult: 1,
};

export const MUTATORS = {
  bloodmoon: {
    name: 'Blood Moon', icon: '🌕', desc: 'Enemies have +40% HP and move 15% faster. +50% XP.', shards: 0.3,
    mods: { enemyHp: 1.4, enemySpeed: 1.15, xpMult: 1.5 },
  },
  goldrush: {
    name: 'Gold Rush', icon: '💰', desc: 'Double gold from every source.', shards: 0,
    mods: { goldMult: 2 },
  },
  glasscannon: {
    name: 'Glass Cannon', icon: '🗡️', desc: '+60% damage, but half max HP.', shards: 0.25,
    stats: { damage: 0.6 }, maxHpMult: 0.5,
  },
  swarm: {
    name: 'The Swarm', icon: '🐝', desc: '60% more enemies, each with 25% less HP.', shards: 0.2,
    mods: { spawnRate: 1.6, spawnCap: 1.35, enemyHp: 0.75 },
  },
  eliteparade: {
    name: 'Elite Parade', icon: '⭐', desc: 'Elites arrive three times as often.', shards: 0.25,
    mods: { eliteEvery: 0.33 },
  },
  giants: {
    name: 'Land of Giants', icon: '🗿', desc: 'Enemies are huge: +60% HP, 15% slower.', shards: 0.2,
    mods: { enemySize: 1.35, enemyHp: 1.6, enemySpeed: 0.85 },
  },
  speeddemons: {
    name: 'Speed Demons', icon: '⚡', desc: 'You and every enemy move 25% faster.', shards: 0.15,
    mods: { enemySpeed: 1.25 }, stats: { speed: 0.25 },
  },
  luckyday: {
    name: 'Lucky Day', icon: '🍀', desc: '+50% luck: rarer upgrades and items.', shards: 0,
    stats: { luck: 0.5 },
  },
  moongravity: {
    name: 'Moon Gravity', icon: '🌙', desc: 'Low gravity: huge floaty jumps.', shards: 0,
    mods: { gravity: 0.45, jump: 1.05 },
  },
  toughcrowd: {
    name: 'Tough Crowd', icon: '🛡️', desc: 'Enemies deal 35% more damage.', shards: 0.3,
    mods: { enemyDmg: 1.35 },
  },
  bossrush: {
    name: 'Mighty Bosses', icon: '👑', desc: 'Bosses have +60% HP but drop two extra chests.', shards: 0.2,
    mods: { bossHp: 1.6, bossChests: 2 },
  },
  chainreaction: {
    name: 'Chain Reaction', icon: '💥', desc: 'Slain enemies sometimes explode, hurting their friends.', shards: 0,
    mods: { deathBlast: 0.25 },
  },
  vampiric: {
    name: 'Vampiric', icon: '🧛', desc: 'Hits have a 4% chance to heal you, but no health regen.', shards: 0.1,
    stats: { lifesteal: 0.04 }, noRegen: true,
  },
  thickfog: {
    name: 'Thick Fog', icon: '🌫️', desc: 'You can barely see. +25% XP.', shards: 0.15,
    mods: { fog: 0.45, xpMult: 1.25 },
  },
};

for (const [id, m] of Object.entries(MUTATORS)) m.id = id;

// Combine a list of mutator ids into one mods object.
export function buildMods(ids) {
  const mods = { ...DEFAULT_MODS };
  for (const id of ids) {
    const m = MUTATORS[id];
    if (!m?.mods) continue;
    for (const [k, v] of Object.entries(m.mods)) {
      mods[k] = k === 'deathBlast' || k === 'bossChests' ? mods[k] + v : mods[k] * v;
    }
  }
  return mods;
}

export function shardBonus(ids) {
  return ids.reduce((a, id) => a + (MUTATORS[id]?.shards || 0), 0);
}

// Heat: stacking difficulty tiers unlocked by winning. Each tier keeps all lower tiers' effects.
export const HEAT_LEVELS = [
  { desc: 'Enemies have +15% HP', mods: { enemyHp: 1.15 } },
  { desc: 'Enemies deal +12% damage', mods: { enemyDmg: 1.12 } },
  { desc: 'Elites arrive 30% more often', mods: { eliteEvery: 0.7 } },
  { desc: '+15% more enemies', mods: { spawnRate: 1.15, spawnCap: 1.1 } },
  { desc: 'Bosses have +25% HP', mods: { bossHp: 1.25 } },
  { desc: 'Enemies move 8% faster', mods: { enemySpeed: 1.08 } },
  { desc: 'Chests cost 25% more', mods: { chestCost: 1.25 } },
  { desc: 'Healing is 30% weaker', mods: { healMult: 0.7 } },
  { desc: 'Enemies have +20% HP and damage', mods: { enemyHp: 1.2, enemyDmg: 1.2 } },
  { desc: 'The Final Swarm comes 20% sooner', mods: { timerMult: 0.8 } },
];
export const MAX_HEAT = HEAT_LEVELS.length;

export function applyHeat(mods, heat) {
  for (let i = 0; i < heat; i++) {
    for (const [k, v] of Object.entries(HEAT_LEVELS[i].mods)) mods[k] *= v;
  }
  return mods;
}
export const heatShardBonus = (heat) => heat * 0.25;
