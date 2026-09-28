// Player settings and persistent meta-progression, stored in localStorage.

const SETTINGS_KEY = 'bonkrealms.settings';
const META_KEY = 'bonkrealms.meta';

export const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
  sensitivity: 1,
  invertY: false,
  quality: 'high', // low | medium | high
  damageNumbers: true,
  screenShake: true,
  showFps: false,
  hints: {},
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export const loadSettings = () => read(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveSettings = (s) => write(SETTINGS_KEY, s);

// ───────────────────────── meta progression ─────────────────────────
// Soul Shards are earned at the end of every run and buy permanent boosts.
export const META_UPGRADES = [
  { id: 'vigor', name: 'Vigor', icon: '❤️', desc: '+10 Max HP', stats: { maxHp: 10 }, max: 5, cost: 15 },
  { id: 'might', name: 'Might', icon: '⚔️', desc: '+4% Damage', stats: { damage: 0.04 }, max: 5, cost: 20 },
  { id: 'haste', name: 'Haste', icon: '⏩', desc: '+3% Attack Speed', stats: { attackSpeed: 0.03 }, max: 5, cost: 20 },
  { id: 'swift', name: 'Swiftness', icon: '👟', desc: '+3% Move Speed', stats: { speed: 0.03 }, max: 3, cost: 15 },
  { id: 'armor', name: 'Toughness', icon: '🛡️', desc: '+2% Armor', stats: { armor: 0.02 }, max: 5, cost: 20 },
  { id: 'regen', name: 'Recovery', icon: '💚', desc: '+0.2 HP Regen', stats: { regen: 0.2 }, max: 5, cost: 15 },
  { id: 'luck', name: 'Fortune', icon: '🍀', desc: '+4% Luck', stats: { luck: 0.04 }, max: 5, cost: 25 },
  { id: 'wisdom', name: 'Wisdom', icon: '📘', desc: '+5% XP Gain', stats: { xpGain: 0.05 }, max: 5, cost: 20 },
  { id: 'greed', name: 'Greed', icon: '💰', desc: '+8% Gold Gain', stats: { goldGain: 0.08 }, max: 5, cost: 15 },
  { id: 'magnet', name: 'Magnetism', icon: '🧲', desc: '+10% Pickup Range', stats: { pickup: 0.1 }, max: 3, cost: 15 },
  { id: 'reroll', name: 'Second Thoughts', icon: '🎲', desc: '+1 Reroll per run', stats: {}, max: 3, cost: 40 },
  { id: 'banish', name: 'Banisher', icon: '🚫', desc: '+1 Banish per run', stats: {}, max: 3, cost: 40 },
  { id: 'revive', name: 'Undying', icon: '🐦‍🔥', desc: 'Start each run with a revive', stats: { revives: 1 }, max: 1, cost: 250 },
];

export function metaCost(up, level) {
  return Math.round(up.cost * Math.pow(1.6, level));
}

export const loadMeta = () => read(META_KEY, { shards: 0, levels: {}, totalRuns: 0 });
export const saveMeta = (m) => write(META_KEY, m);

// Stat bonuses granted by purchased meta upgrades.
export function metaStats(meta) {
  const out = {};
  for (const up of META_UPGRADES) {
    const lv = meta.levels[up.id] || 0;
    for (const [k, v] of Object.entries(up.stats)) out[k] = (out[k] || 0) + v * lv;
  }
  return out;
}

export function shardsForRun(sum) {
  return Math.floor(sum.kills / 60 + (sum.stage - 1) * 12 + sum.level * 0.6 + sum.bosses * 20 + sum.time / 60);
}
