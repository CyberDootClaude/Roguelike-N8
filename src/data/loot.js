// Weapons, tomes, items, shrine buffs, characters and rarity tables.

export const RARITIES = [
  { id: 'common', name: 'Common', color: '#cfd6de', mult: 1.0, weight: 60 },
  { id: 'uncommon', name: 'Uncommon', color: '#5fd35f', mult: 1.25, weight: 25 },
  { id: 'rare', name: 'Rare', color: '#4aa8ff', mult: 1.55, weight: 10 },
  { id: 'epic', name: 'Epic', color: '#c46bff', mult: 1.9, weight: 4 },
  { id: 'legendary', name: 'Legendary', color: '#ffb42a', mult: 2.4, weight: 1 },
];

// Luck bends the table toward higher tiers.
export function rollRarity(luck = 0, minTier = 0) {
  const ws = RARITIES.map((r, i) => (i < minTier ? 0 : r.weight * Math.pow(1 + Math.max(0, luck), i * 1.1)));
  let total = ws.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < ws.length; i++) {
    x -= ws[i];
    if (x <= 0) return RARITIES[i];
  }
  return RARITIES[0];
}

// Weapon upgrade stat rolls: how much one "roll" of each stat is worth at common rarity.
export const WEAPON_UPGRADES = {
  damage: { label: 'Damage', amount: 0.22, fmt: 'pctBase' },
  cooldown: { label: 'Cooldown', amount: 0.07, fmt: 'pctDown' },
  count: { label: 'Projectiles', amount: 1, fmt: 'int' },
  size: { label: 'Size', amount: 0.12, fmt: 'pct' },
  speed: { label: 'Projectile Speed', amount: 0.14, fmt: 'pct' },
  pierce: { label: 'Pierce', amount: 1, fmt: 'int' },
  duration: { label: 'Duration', amount: 0.14, fmt: 'pct' },
  crit: { label: 'Crit Chance', amount: 0.04, fmt: 'pctAbs' },
  knockback: { label: 'Knockback', amount: 0.25, fmt: 'pct' },
};

export const WEAPONS = {
  hammer: {
    name: 'Bonk Hammer', icon: '🔨', kind: 'swing',
    desc: 'Slams everything in front of you. Very bonk.',
    base: { damage: 20, cooldown: 1.1, count: 1, size: 1, speed: 1, pierce: 0, duration: 1, crit: 0, knockback: 1.6 },
    ups: { damage: 4, cooldown: 3, size: 3, count: 1, knockback: 1, crit: 1 },
  },
  bow: {
    name: 'Hunter Bow', icon: '🏹', kind: 'projectile',
    desc: 'Fires piercing arrows at the nearest enemy.',
    base: { damage: 15, cooldown: 0.9, count: 1, size: 1, speed: 34, pierce: 2, duration: 1.2, crit: 0.05, knockback: 0.4 },
    ups: { damage: 4, cooldown: 3, count: 2, pierce: 2, speed: 1, crit: 2 },
    proj: 'arrow',
  },
  firestaff: {
    name: 'Ember Staff', icon: '🔥', kind: 'fireball',
    desc: 'Hurls fireballs that explode on impact.',
    base: { damage: 18, cooldown: 1.6, count: 1, size: 1, speed: 20, pierce: 0, duration: 1.4, crit: 0, knockback: 0.8 },
    ups: { damage: 4, cooldown: 3, count: 2, size: 3, speed: 1 },
  },
  stormrod: {
    name: 'Storm Rod', icon: '⚡', kind: 'lightning',
    desc: 'Calls lightning that chains between foes.',
    base: { damage: 19, cooldown: 1.3, count: 4, size: 1, speed: 1, pierce: 0, duration: 1, crit: 0.05, knockback: 0.2 },
    ups: { damage: 4, cooldown: 3, count: 3, crit: 1, size: 1 },
  },
  frostaura: {
    name: 'Frost Aura', icon: '❄️', kind: 'aura',
    desc: 'A freezing ring that damages and slows nearby enemies.',
    base: { damage: 5, cooldown: 0.5, count: 1, size: 1, speed: 1, pierce: 0, duration: 1, crit: 0, knockback: 0 },
    ups: { damage: 4, size: 4, cooldown: 2 },
  },
  blades: {
    name: 'Orbit Blades', icon: '🌀', kind: 'orbit',
    desc: 'Spinning blades circle around you.',
    base: { damage: 11, cooldown: 0.4, count: 3, size: 1, speed: 1, pierce: 0, duration: 1, crit: 0, knockback: 0.6 },
    ups: { damage: 4, count: 3, size: 3, speed: 2 },
  },
  boomerang: {
    name: 'Boomerang', icon: '🪃', kind: 'boomerang',
    desc: 'Flies out and back, cutting through everything.',
    base: { damage: 13, cooldown: 1.5, count: 1, size: 1, speed: 22, pierce: 99, duration: 1, crit: 0, knockback: 0.5 },
    ups: { damage: 4, cooldown: 3, count: 2, size: 2, speed: 2, duration: 1 },
    proj: 'boomerang',
  },
  flask: {
    name: 'Toxic Flask', icon: '🧪', kind: 'puddle',
    desc: 'Lobs flasks that leave poison puddles.',
    base: { damage: 5, cooldown: 1.9, count: 1, size: 1, speed: 1, pierce: 0, duration: 3.2, crit: 0, knockback: 0 },
    ups: { damage: 4, cooldown: 3, count: 2, size: 3, duration: 3 },
  },
  revolver: {
    name: 'Revolver', icon: '🔫', kind: 'projectile',
    desc: 'Rapid, high-crit shots at the nearest target.',
    base: { damage: 10, cooldown: 0.5, count: 1, size: 0.8, speed: 48, pierce: 1, duration: 0.8, crit: 0.15, knockback: 0.3 },
    ups: { damage: 4, cooldown: 3, count: 2, pierce: 1, crit: 3 },
    proj: 'bullet',
  },
  beam: {
    name: 'Sunbeam', icon: '☀️', kind: 'beam',
    desc: 'Burns a line through every enemy in its path.',
    base: { damage: 22, cooldown: 2.1, count: 1, size: 1, speed: 1, pierce: 0, duration: 1, crit: 0.05, knockback: 0.3 },
    ups: { damage: 4, cooldown: 3, count: 2, size: 3, crit: 1 },
  },
  meteor: {
    name: 'Sky Hammer', icon: '☄️', kind: 'meteor',
    desc: 'Drops meteors onto groups of enemies.',
    base: { damage: 34, cooldown: 2.6, count: 1, size: 1, speed: 1, pierce: 0, duration: 1, crit: 0, knockback: 1.2 },
    ups: { damage: 4, cooldown: 3, count: 3, size: 3 },
  },
  mines: {
    name: 'Bone Mines', icon: '💣', kind: 'mine',
    desc: 'Drops mines that explode when enemies step close.',
    base: { damage: 30, cooldown: 1.7, count: 1, size: 1, speed: 1, pierce: 0, duration: 9, crit: 0, knockback: 1.4 },
    ups: { damage: 4, cooldown: 3, count: 2, size: 3, duration: 1 },
  },
  chakram: {
    name: 'Chakram Nova', icon: '💫', kind: 'nova',
    desc: 'Bursts a ring of spinning discs in all directions.',
    base: { damage: 8, cooldown: 1.9, count: 6, size: 1, speed: 20, pierce: 1, duration: 0.9, crit: 0, knockback: 0.5 },
    ups: { damage: 4, cooldown: 3, count: 3, pierce: 2, duration: 1 },
    proj: 'disc',
  },
  prism: {
    name: 'Prism Scatter', icon: '🔷', kind: 'shotgun', added: '1.1.0',
    desc: 'Blasts a cone of crystal shards at close range.',
    base: { damage: 7, cooldown: 0.95, count: 4, size: 1, speed: 26, pierce: 0, duration: 0.55, crit: 0.05, knockback: 0.8 },
    ups: { damage: 4, cooldown: 3, count: 3, pierce: 1, duration: 1, crit: 1 },
  },
  totem: {
    name: 'Guardian Totem', icon: '🗿', kind: 'turret', added: '1.1.0',
    desc: 'Plants a totem that shoots nearby enemies for a while.',
    base: { damage: 7, cooldown: 6, count: 1, size: 1, speed: 30, pierce: 0, duration: 6, crit: 0, knockback: 0.3 },
    ups: { damage: 4, cooldown: 2, count: 1, pierce: 1 },
  },
};

export const TOMES = {
  power: { name: 'Tome of Power', icon: '⚔️', stat: 'damage', per: 0.09, fmt: 'pct', desc: 'Damage' },
  haste: { name: 'Tome of Haste', icon: '⏩', stat: 'attackSpeed', per: 0.08, fmt: 'pct', desc: 'Attack Speed' },
  area: { name: 'Tome of Reach', icon: '⭕', stat: 'area', per: 0.1, fmt: 'pct', desc: 'Size' },
  quantity: { name: 'Tome of Plenty', icon: '➕', stat: 'projectiles', per: 1, fmt: 'int', desc: 'Projectiles', noScale: true, max: 5 },
  swift: { name: 'Tome of Swiftness', icon: '👟', stat: 'speed', per: 0.07, fmt: 'pct', desc: 'Move Speed' },
  vitality: { name: 'Tome of Vitality', icon: '❤️', stat: 'maxHp', per: 20, fmt: 'flat', desc: 'Max HP' },
  regen: { name: 'Tome of Renewal', icon: '💚', stat: 'regen', per: 0.5, fmt: 'flat', desc: 'HP Regen /s' },
  armor: { name: 'Tome of Stone', icon: '🛡️', stat: 'armor', per: 0.04, fmt: 'pct', desc: 'Armor' },
  wisdom: { name: 'Tome of Wisdom', icon: '📘', stat: 'xpGain', per: 0.12, fmt: 'pct', desc: 'XP Gain' },
  fortune: { name: 'Tome of Fortune', icon: '🍀', stat: 'luck', per: 0.08, fmt: 'pct', desc: 'Luck' },
  magnet: { name: 'Tome of Attraction', icon: '🧲', stat: 'pickup', per: 0.25, fmt: 'pct', desc: 'Pickup Range' },
  precision: { name: 'Tome of Precision', icon: '🎯', stat: 'crit', per: 0.05, fmt: 'pctAbs', desc: 'Crit Chance' },
  velocity: { name: 'Tome of Velocity', icon: '💨', stat: 'projSpeed', per: 0.12, fmt: 'pct', desc: 'Projectile Speed' },
  evasion: { name: 'Tome of Shadows', icon: '👻', stat: 'evasion', per: 0.04, fmt: 'pctAbs', desc: 'Evasion' },
  greed: { name: 'Tome of Greed', icon: '💰', stat: 'goldGain', per: 0.15, fmt: 'pct', desc: 'Gold Gain' },
  cursed: { name: 'Cursed Tome', icon: '💀', stat: 'curse', per: 0.12, fmt: 'pct', desc: 'Difficulty (+XP & gold)' },
  duration: { name: 'Tome of Ages', icon: '⌛', stat: 'duration', per: 0.1, fmt: 'pct', desc: 'Duration' },
};

// Items: permanent passives from chests. `stats` are added once per copy.
export const ITEMS = {
  // Common
  meatbun: { name: 'Meat Bun', icon: '🍖', rarity: 0, stats: { maxHp: 25 }, desc: '+25 Max HP' },
  penny: { name: 'Lucky Penny', icon: '🪙', rarity: 0, stats: { luck: 0.06 }, desc: '+6% Luck' },
  shoes: { name: 'Running Shoes', icon: '👟', rarity: 0, stats: { speed: 0.06 }, desc: '+6% Move Speed' },
  vest: { name: 'Leather Vest', icon: '🦺', rarity: 0, stats: { armor: 0.03 }, desc: '+3% Armor' },
  battery: { name: 'Spare Battery', icon: '🔋', rarity: 0, stats: { attackSpeed: 0.06 }, desc: '+6% Attack Speed' },
  whetstone: { name: 'Whetstone', icon: '🪨', rarity: 0, stats: { damage: 0.06 }, desc: '+6% Damage' },
  coffee: { name: 'Bitter Coffee', icon: '☕', rarity: 0, stats: { xpGain: 0.08 }, desc: '+8% XP Gain' },
  // Uncommon
  fang: { name: 'Vampire Fang', icon: '🦷', rarity: 1, stats: { lifesteal: 0.03 }, desc: '3% chance on hit to heal 2 HP' },
  spikes: { name: 'Spiked Shield', icon: '🔰', rarity: 1, stats: { thorns: 25, armor: 0.02 }, desc: 'Deal 25 damage to attackers, +2% Armor' },
  feather: { name: 'Feather', icon: '🪶', rarity: 1, stats: { jumps: 1 }, desc: '+1 Jump' },
  lens: { name: 'Magnifying Lens', icon: '🔍', rarity: 1, stats: { crit: 0.04, critDmg: 0.15 }, desc: '+4% Crit, +15% Crit Damage' },
  moneyclip: { name: 'Money Clip', icon: '💵', rarity: 1, stats: { goldGain: 0.2 }, desc: '+20% Gold Gain' },
  icecharm: { name: 'Frost Charm', icon: '🧊', rarity: 1, stats: { freezeChance: 0.06 }, desc: '6% chance on hit to freeze' },
  // Rare
  core: { name: 'Volatile Core', icon: '💥', rarity: 2, stats: { explodeChance: 0.08 }, desc: '8% chance on hit to explode for 60% damage' },
  vial: { name: 'Toxic Vial', icon: '☠️', rarity: 2, stats: { poison: 0.25 }, desc: 'Hits poison enemies (25% dmg over 3s)' },
  hourglass: { name: 'Hourglass', icon: '⏳', rarity: 2, stats: { duration: 0.15, attackSpeed: 0.06 }, desc: '+15% Duration, +6% Attack Speed' },
  clover: { name: 'Clover Crown', icon: '👑', rarity: 2, stats: { luck: 0.18 }, desc: '+18% Luck' },
  heart: { name: 'Heart Crystal', icon: '💖', rarity: 2, stats: { maxHp: 50, regen: 1 }, desc: '+50 Max HP, +1 Regen' },
  key: { name: 'Skeleton Key', icon: '🗝️', rarity: 2, stats: { keyChance: 0.2 }, desc: '20% chance a chest is free' },
  // Epic
  chain: { name: 'Storm Link', icon: '🔗', rarity: 3, stats: { chainChance: 0.1 }, desc: '10% chance on hit to chain lightning' },
  berserk: { name: 'Berserker Mask', icon: '👹', rarity: 3, stats: { berserk: 1 }, desc: 'Up to +60% damage at low HP' },
  belt: { name: "Giant's Belt", icon: '🥋', rarity: 3, stats: { area: 0.25, maxHp: 20 }, desc: '+25% Size, +20 Max HP' },
  magnetcore: { name: 'Magnet Core', icon: '🧲', rarity: 3, stats: { pickup: 0.6, xpGain: 0.1 }, desc: '+60% Pickup, +10% XP' },
  // Legendary
  phoenix: { name: 'Phoenix Feather', icon: '🐦‍🔥', rarity: 4, stats: { revives: 1 }, desc: 'Revive once at full HP' },
  echo: { name: 'Echo Gem', icon: '💎', rarity: 4, stats: { projectiles: 1, damage: 0.1 }, desc: '+1 Projectile, +10% Damage' },
  soul: { name: 'Soul Harvester', icon: '👻', rarity: 4, stats: { soulHarvest: 1 }, desc: '+1% damage per 100 kills this run' },
  // Patch 1.1
  geodecharm: { name: 'Geode Charm', icon: '🪨', rarity: 1, added: '1.1.0', stats: { luck: 0.08, goldGain: 0.1 }, desc: '+8% Luck, +10% Gold Gain' },
  shardmail: { name: 'Shard Mail', icon: '🥋', rarity: 1, added: '1.1.0', stats: { thorns: 40, armor: 0.03 }, desc: 'Deal 40 damage to attackers, +3% Armor' },
  prismlens: { name: 'Prism Lens', icon: '🔮', rarity: 2, added: '1.1.0', stats: { crit: 0.06, critDmg: 0.2 }, desc: '+6% Crit, +20% Crit Damage' },
  crystalheart: { name: 'Crystal Heart', icon: '💜', rarity: 3, added: '1.1.0', stats: { maxHp: 40, armor: 0.04, regen: 0.5 }, desc: '+40 Max HP, +4% Armor, +0.5 Regen' },
  resonator: { name: 'Resonance Core', icon: '🎐', rarity: 4, added: '1.1.0', stats: { attackSpeed: 0.15, duration: 0.15, area: 0.1 }, desc: '+15% Attack Speed, +15% Duration, +10% Size' },
  midas: { name: 'Midas Glove', icon: '🧤', rarity: 4, stats: { goldGain: 0.5, chestDiscount: 0.25 }, desc: '+50% Gold, chests 25% cheaper' },
};

// Charge shrine / level independent stat buffs.
export const SHRINE_BUFFS = [
  { stat: 'damage', label: 'Damage', per: 0.08, fmt: 'pct' },
  { stat: 'attackSpeed', label: 'Attack Speed', per: 0.07, fmt: 'pct' },
  { stat: 'maxHp', label: 'Max HP', per: 15, fmt: 'flat' },
  { stat: 'speed', label: 'Move Speed', per: 0.05, fmt: 'pct' },
  { stat: 'area', label: 'Size', per: 0.08, fmt: 'pct' },
  { stat: 'crit', label: 'Crit Chance', per: 0.04, fmt: 'pctAbs' },
  { stat: 'luck', label: 'Luck', per: 0.07, fmt: 'pct' },
  { stat: 'armor', label: 'Armor', per: 0.03, fmt: 'pct' },
  { stat: 'regen', label: 'HP Regen', per: 0.4, fmt: 'flat' },
  { stat: 'xpGain', label: 'XP Gain', per: 0.1, fmt: 'pct' },
  { stat: 'pickup', label: 'Pickup Range', per: 0.2, fmt: 'pct' },
  { stat: 'critDmg', label: 'Crit Damage', per: 0.12, fmt: 'pct' },
];

export function fmtStat(fmt, v) {
  switch (fmt) {
    case 'pct': case 'pctBase': case 'pctAbs': return `+${Math.round(v * 100)}%`;
    case 'pctDown': return `-${Math.round(v * 100)}%`;
    case 'int': return `+${Math.round(v)}`;
    default: return `+${(Math.round(v * 10) / 10)}`;
  }
}

export const BASE_STATS = {
  maxHp: 100, regen: 0.2, armor: 0, evasion: 0, speed: 1, damage: 1, attackSpeed: 1, area: 1,
  projectiles: 0, projSpeed: 1, duration: 1, crit: 0.03, critDmg: 2, luck: 0, xpGain: 1,
  goldGain: 1, pickup: 1, jumps: 1, lifesteal: 0, thorns: 0, curse: 0,
  freezeChance: 0, explodeChance: 0, poison: 0, chainChance: 0, berserk: 0, keyChance: 0,
  revives: 0, soulHarvest: 0, chestDiscount: 0,
};

export const CHARACTERS = [
  {
    id: 'knight', name: 'Sir Bonkalot', weapon: 'hammer', color: 0xc0c8d4, accent: 0x3a6ad0,
    perk: '+30 Max HP, +5% Armor', stats: { maxHp: 30, armor: 0.05 },
    hat: 'helmet',
  },
  {
    id: 'ranger', name: 'Fenna the Ranger', weapon: 'bow', color: 0x3f8a3a, accent: 0xc88a3a,
    perk: '+8% Crit, +8% Move Speed', stats: { crit: 0.08, speed: 0.08 },
    hat: 'hood',
  },
  {
    id: 'pyro', name: 'Pyra the Pyromancer', weapon: 'firestaff', color: 0xb8302a, accent: 0xffb03a,
    perk: '+15% Size', stats: { area: 0.15 },
    hat: 'wizard',
  },
  {
    id: 'monk', name: 'Zapp the Storm Monk', weapon: 'stormrod', color: 0xe0a030, accent: 0x5a3aa0,
    perk: '+1 Jump, +10% Move Speed', stats: { jumps: 1, speed: 0.1 },
    hat: 'bald',
  },
  {
    id: 'gunslinger', name: 'Rattles the Gunslinger', weapon: 'revolver', color: 0xefeadc, accent: 0x6a4a2a,
    perk: '+25% Crit Damage, +10% Luck', stats: { critDmg: 0.25, luck: 0.1 },
    hat: 'cowboy',
  },
  {
    id: 'dancer', name: 'Mira the Blade Dancer', weapon: 'blades', color: 0x7a3ab0, accent: 0x40e0d0,
    perk: '+12% Attack Speed, +5% Evasion', stats: { attackSpeed: 0.12, evasion: 0.05 },
    hat: 'bandana',
  },
  {
    id: 'alchemist', name: 'Grum the Alchemist', weapon: 'flask', color: 0x5a7a3a, accent: 0xa0ff50,
    perk: '+20% Duration, +1 Regen', stats: { duration: 0.2, regen: 1 },
    hat: 'goggles',
  },
  {
    id: 'quartz', name: 'Quartz the Crystal Golem', weapon: 'prism', color: 0x7a5ac8, accent: 0x6ad8ff, added: '1.1.0',
    perk: '+8% Armor, +25 Max HP, -5% Move Speed', stats: { armor: 0.08, maxHp: 25, speed: -0.05 },
    hat: 'crystal',
  },
];

// Weapon evolutions: a weapon at EVOLVE_LEVEL+ plus its partner tome can evolve into a super weapon.
// `mult` multiplies stats, `add` adds to them, `effect` is an on-hit bonus (freeze, burn, chain, explode, gold).
export const EVOLVE_LEVEL = 7;
export const EVOLUTIONS = {
  hammer: { tome: 'vitality', name: "Titan's Maul", icon: '🪓', effect: 'explode', mult: { damage: 2, size: 1.35 }, add: { count: 1 }, desc: 'Swings both ways and every hit can erupt.' },
  bow: { tome: 'quantity', name: 'Storm of Arrows', icon: '🌩️', effect: 'chain', mult: { damage: 1.4 }, add: { count: 3, pierce: 3 }, desc: 'A volley of piercing arrows that arc lightning.' },
  firestaff: { tome: 'area', name: 'Inferno Staff', icon: '🌋', effect: 'burn', mult: { damage: 1.8, size: 1.5 }, add: { count: 1 }, desc: 'Huge fireballs that set enemies ablaze.' },
  stormrod: { tome: 'haste', name: 'Thunderlord', icon: '🌪️', effect: 'chain', mult: { damage: 1.5, cooldown: 0.6 }, add: { count: 5 }, desc: 'Lightning that leaps through whole crowds.' },
  frostaura: { tome: 'armor', name: 'Absolute Zero', icon: '🧊', effect: 'freeze', mult: { damage: 2, size: 1.5 }, add: {}, desc: 'A vast freezing field that locks enemies in ice.' },
  blades: { tome: 'swift', name: 'Blade Tempest', icon: '⚔️', effect: 'burn', mult: { damage: 1.5, size: 1.3 }, add: { count: 4 }, desc: 'A storm of blades circling you.' },
  boomerang: { tome: 'velocity', name: 'Twin Glaives', icon: '💫', effect: 'explode', mult: { damage: 1.6, size: 1.2 }, add: { count: 2 }, desc: 'Heavy glaives that burst on impact.' },
  flask: { tome: 'duration', name: 'Plague Cauldron', icon: '☣️', effect: 'burn', mult: { damage: 1.8, size: 1.6 }, add: { count: 1 }, desc: 'Vast, lingering clouds of plague.' },
  revolver: { tome: 'precision', name: 'Hand Cannon', icon: '💥', effect: 'explode', mult: { damage: 2.2 }, add: { pierce: 3, crit: 0.25 }, desc: 'Explosive, piercing, criticals galore.' },
  beam: { tome: 'power', name: 'Solar Lance', icon: '🔆', effect: 'burn', mult: { damage: 1.8, size: 1.3 }, add: { count: 2 }, desc: 'Twin beams of searing sunlight.' },
  meteor: { tome: 'cursed', name: 'Armageddon', icon: '☄️', effect: 'burn', mult: { damage: 1.5, size: 1.3 }, add: { count: 4 }, desc: 'The sky falls. Repeatedly.' },
  mines: { tome: 'greed', name: 'Gold Bombs', icon: '💰', effect: 'gold', mult: { damage: 2, size: 1.2 }, add: { count: 1 }, desc: 'Explosions that shake loose extra gold.' },
  chakram: { tome: 'magnet', name: 'Gravity Rings', icon: '🪐', effect: 'chain', mult: { damage: 1.4 }, add: { count: 6, pierce: 3 }, desc: 'Endless rings that ripple through foes.' },
  prism: { tome: 'area', name: 'Kaleidoscope', icon: '🌈', effect: 'freeze', mult: { damage: 1.5 }, add: { count: 4, pierce: 1 }, desc: 'A rainbow blast that freezes what it touches.' },
  totem: { tome: 'wisdom', name: 'Ancestor Circle', icon: '🗿', effect: 'chain', mult: { damage: 2 }, add: { count: 2 }, desc: 'Ancient totems that call down lightning.' },
};
