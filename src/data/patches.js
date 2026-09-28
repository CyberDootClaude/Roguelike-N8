// Release history. To ship a content patch:
//   1. add content to the data files and tag it with `added: '<version>'` (drives the NEW badges)
//   2. bump GAME_VERSION and add an entry at the top of PATCHES
//   3. push — GitHub Pages redeploys and players see "What's New" on their next visit
export const GAME_VERSION = '1.1.0';

export const PATCHES = [
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
