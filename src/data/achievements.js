// Achievements. `test(s)` receives a snapshot: s.run (current run), s.life (lifetime stats incl. this run).
// `unlock` grants a hero or weapon that starts locked for new players.

export const LOCKED_CHARS = ['monk', 'gunslinger', 'dancer', 'alchemist', 'quartz'];
export const LOCKED_WEAPONS = ['chakram', 'meteor', 'mines', 'totem', 'beam'];

export const ACHIEVEMENTS = [
  { id: 'boss1', name: 'Bonk!', icon: '👑', desc: 'Defeat your first boss', test: (s) => s.life.bosses >= 1, unlock: { char: 'monk' } },
  { id: 'kills1000', name: 'Thousand Cuts', icon: '⚔️', desc: 'Slay 1,000 enemies in one run', test: (s) => s.run.kills >= 1000, unlock: { weapon: 'chakram' } },
  { id: 'kills5000', name: 'Exterminator', icon: '💀', desc: 'Slay 5,000 enemies in one run', test: (s) => s.run.kills >= 5000 },
  { id: 'life2000', name: 'Seasoned', icon: '🎖️', desc: 'Slay 2,000 enemies in total', test: (s) => s.life.kills >= 2000, unlock: { char: 'gunslinger' } },
  { id: 'life20000', name: 'Legend of the Realms', icon: '🏛️', desc: 'Slay 20,000 enemies in total', test: (s) => s.life.kills >= 20000 },
  { id: 'realm3', name: 'Deep Delver', icon: '🕳️', desc: 'Reach Realm 3', test: (s) => s.run.realm >= 3, unlock: { weapon: 'meteor' } },
  { id: 'win', name: 'Realm Breaker', icon: '🏆', desc: 'Defeat all five realm bosses in one run', test: (s) => s.run.won },
  { id: 'level20', name: 'Rising Star', icon: '⭐', desc: 'Reach level 20', test: (s) => s.run.level >= 20, unlock: { char: 'dancer' } },
  { id: 'level50', name: 'Ascended', icon: '🌟', desc: 'Reach level 50', test: (s) => s.run.level >= 50 },
  { id: 'chests15', name: 'Treasure Hunter', icon: '🧰', desc: 'Open 15 chests in total', test: (s) => s.life.chests >= 15, unlock: { char: 'alchemist' } },
  { id: 'legendary', name: 'Shiny!', icon: '✨', desc: 'Find a Legendary item', test: (s) => s.run.legendary },
  { id: 'items15', name: 'Hoarder', icon: '🎒', desc: 'Carry 15 items at once', test: (s) => s.run.items >= 15 },
  { id: 'shrines5', name: 'Devout', icon: '🔷', desc: 'Charge 5 shrines in one run', test: (s) => s.run.shrines >= 5, unlock: { weapon: 'mines' } },
  { id: 'gold2000', name: "Dragon's Hoard", icon: '💰', desc: 'Hold 2,000 gold at once', test: (s) => s.run.gold >= 2000 },
  { id: 'challenge', name: 'Challenger', icon: '🗿', desc: 'Complete a Shrine of Challenge', test: (s) => s.run.challenges >= 1, unlock: { weapon: 'totem' } },
  { id: 'evolve', name: 'Evolution', icon: '🧬', desc: 'Evolve a weapon', test: (s) => s.run.evolutions >= 1 },
  { id: 'arsenal', name: 'Full Arsenal', icon: '🗡️', desc: 'Hold 4 weapons and 4 tomes', test: (s) => s.run.weapons >= 4 && s.run.tomes >= 4 },
  { id: 'hitless', name: 'Untouchable', icon: '🛡️', desc: 'Defeat a boss without taking damage during the fight', test: (s) => s.run.bossKills.some((b) => b.hitless) },
  { id: 'speedboss', name: 'Speed Bonker', icon: '⏱️', desc: 'Defeat a boss with 4+ minutes left on the clock', test: (s) => s.run.bossKills.some((b) => b.timeLeft >= 240), unlock: { weapon: 'beam' } },
  { id: 'swarm', name: 'Into the Swarm', icon: '🐜', desc: 'Survive 2 minutes of the Final Swarm', test: (s) => s.run.overtime >= 120 },
  { id: 'daily', name: 'Daily Grinder', icon: '📅', desc: 'Defeat a boss in a Daily Challenge', test: (s) => s.run.mode === 'daily' && s.run.bosses >= 1 },
  { id: 'crystal', name: 'Crystal Clear', icon: '💎', desc: 'Defeat Prismatrix, the Crystal Queen', test: (s) => s.run.bossKills.some((b) => b.id === 'prismatrix'), unlock: { char: 'quartz' } },
  { id: 'heat3', name: 'Feeling the Heat', icon: '🔥', desc: 'Win a run on Heat 3 or higher', test: (s) => s.run.won && s.run.heat >= 3 },
  { id: 'heat10', name: 'Inferno Walker', icon: '🌋', desc: 'Win a run on Heat 10', test: (s) => s.run.won && s.run.heat >= 10 },
  { id: 'mutated', name: 'Chaos Theory', icon: '🌀', desc: 'Win a run with 3 or more mutators', test: (s) => s.run.won && s.run.mutators >= 3 },
  { id: 'heroes4', name: 'Jack of All Trades', icon: '🎭', desc: 'Win with 4 different heroes', test: (s) => s.life.heroWins >= 4 },
  { id: 'explorer', name: 'Explorer', icon: '🧭', desc: 'Visit 6 different realms', test: (s) => s.life.realms >= 6 },
  { id: 'glass', name: 'Glass Act', icon: '🗡️', desc: 'Defeat a boss under Glass Cannon', test: (s) => s.run.glass && s.run.bosses >= 1 },
  { id: 'loop', name: 'One More Lap', icon: '♾️', desc: 'Reach the Endless loop', test: (s) => s.run.realm >= 6 },
  { id: 'shards500', name: 'Soul Collector', icon: '💠', desc: 'Earn 500 Soul Shards in total', test: (s) => s.life.shards >= 500 },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// Which achievement unlocks a given hero / weapon.
export function unlockSource(kind, id) {
  return ACHIEVEMENTS.find((a) => a.unlock?.[kind] === id);
}
