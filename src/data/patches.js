// Release history. To ship a content patch:
//   1. add content to the data files and tag it with `added: '<version>'` (drives the NEW badges)
//   2. bump GAME_VERSION and add an entry at the top of PATCHES
//   3. push — GitHub Pages redeploys and players see "What's New" on their next visit
export const GAME_VERSION = '1.2.0';

export const PATCHES = [
  {
    version: '1.2.0',
    date: '2026-10-05',
    title: 'The Ascension Update',
    notes: [
      '🗺️ <b>Four new realm variants</b>: Mushroom Grove, Sunken Oasis, Sky Isles and Clockwork Foundry — every realm slot now has two possible realms (32 combinations).',
      '👑 Four new bosses: <b>Sporemother</b>, <b>Leviathrax</b>, <b>Zephyra</b> and <b>Gearlord Omega</b>, plus 24 new monsters.',
      '🌬️ New hazards: spore clouds, shallow water, wind gusts and steam vents.',
      '🧬 <b>Weapon evolutions</b>: level a weapon to 7, own its partner tome, and evolve it into a super weapon (15 to discover).',
      '🔥 <b>Heat 1–10</b>: win a run to unlock stacking difficulty tiers worth extra Soul Shards.',
      '🏆 <b>30 achievements</b> — some heroes and weapons now unlock through them (existing players keep everything).',
      '🌍 <b>Online leaderboards</b> for Daily, Weekly and Live events.',
      '✨ Real-time shadows (High graphics), gradient skies, livelier enemies, hit-stop and slow-motion boss deaths.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-28',
    title: 'The Crystal Update',
    notes: [
      '💎 New realm variant: <b>Crystal Caverns</b> — can replace the Hollow Graveyard as Realm 3.',
      '👑 New boss: <b>Prismatrix, the Crystal Queen</b> — prism beams, shard novas and crystal cages.',
      '🦂 6 new monsters: Crystal Crawler, Gem Beetle, Prism Wisp, Shardling, Mirror Mage and Geode Golem.',
      '🔷 New weapons: <b>Prism Scatter</b> (shotgun bursts) and <b>Guardian Totem</b> (deployable turrets).',
      '🧿 5 new items and a new character: <b>Quartz the Crystal Golem</b>.',
      '📅 <b>Daily Challenge</b>: one seed, one hero and two mutators per day — beat your best score.',
      '🎪 <b>Weekly Events</b>: a new set of mutators every week, with bonus Soul Shards.',
      '🌗 14 run mutators such as Blood Moon, Glass Cannon, Moon Gravity and Gold Rush.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-27',
    title: 'Launch',
    notes: [
      'Five realms, five bosses, seven heroes, thirteen weapons.',
      'Soul Shop, settings, touch controls and a procedural soundtrack.',
    ],
  },
];

export const isNew = (added) => added === GAME_VERSION;
