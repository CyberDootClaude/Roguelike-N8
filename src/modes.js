// Game modes: Standard, Daily Challenge (same seed for everyone each day) and Weekly Event
// (rotating mutators). A live `events.json` served next to the game can override the weekly
// event at any time — edit that file and push, no code change needed.
import { MUTATORS, shardBonus } from './data/mutators.js';
import { CHARACTERS } from './data/loot.js';
import { STAGE_SLOTS } from './data/stages.js';
import { mulberry32 } from './util.js';

const DAY = 86400000;

export const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ISO-ish week index since epoch (weeks start Monday, UTC).
export function weekIndex(d = new Date()) {
  return Math.floor((d.getTime() / DAY + 3) / 7);
}

function pickMutators(rng, n) {
  const ids = Object.keys(MUTATORS);
  const out = [];
  while (out.length < n) {
    const id = ids[Math.floor(rng() * ids.length)];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

const WEEKLY_NAMES = ['Festival of Bonks', 'Storm Season', 'The Long Night', 'Harvest of Gems', 'Carnival of Chaos', 'Trial of Heroes', 'Moonlit Madness', 'Week of Wonders'];

let liveEvents = [];

// Fetch the live-ops file. Missing or broken files are ignored (the built-in rotation is used).
export async function loadLiveEvents() {
  try {
    const res = await fetch(`events.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    liveEvents = Array.isArray(data.events) ? data.events : [];
  } catch { /* offline or no file: fall back to the rotation */ }
}

export function currentWeekly(now = new Date()) {
  const today = dateKey(now);
  const live = liveEvents.find((e) => e.start <= today && today <= e.end && Array.isArray(e.mutators));
  if (live) {
    const mutators = live.mutators.filter((m) => MUTATORS[m]);
    return {
      id: live.id || `live-${live.start}`, name: live.name || 'Special Event', desc: live.desc || '',
      mutators, shardMult: live.shardBonus ?? 1 + shardBonus(mutators) + 0.5, ends: live.end, live: true,
    };
  }
  const wk = weekIndex(now);
  const rng = mulberry32(hashStr(`week-${wk}`));
  const mutators = pickMutators(rng, 3);
  const endDate = new Date((wk * 7 - 3 + 7) * DAY - 1);
  return {
    id: `week-${wk}`, name: WEEKLY_NAMES[wk % WEEKLY_NAMES.length], desc: 'This week\'s rules — changes every Monday.',
    mutators, shardMult: 1.5 + shardBonus(mutators), ends: dateKey(endDate), live: false,
  };
}

export function currentDaily(now = new Date()) {
  const key = dateKey(now);
  const seed = hashStr(`daily-${key}`);
  const rng = mulberry32(seed);
  const char = CHARACTERS[Math.floor(rng() * CHARACTERS.length)];
  const mutators = pickMutators(rng, 2);
  return { id: `daily-${key}`, key, name: `Daily Challenge · ${key}`, seed, char: char.id, mutators, shardMult: 1.25 + shardBonus(mutators) };
}

// Choose one realm per slot. Seeded modes get the same realms for everyone.
export function chooseRealms(rng = Math.random) {
  return STAGE_SLOTS.map((slot) => slot[Math.floor(rng() * slot.length)]);
}

// Build the configuration a run starts from.
export function makeRunConfig(mode, selectedChar) {
  if (mode === 'daily') {
    const d = currentDaily();
    const rng = mulberry32(d.seed);
    return { mode, label: d.name, charId: d.char, mutators: d.mutators, shardMult: d.shardMult, realms: chooseRealms(rng), seed: d.seed, eventId: d.id, board: d.id };
  }
  if (mode === 'weekly') {
    const w = currentWeekly();
    return { mode, label: w.name, charId: selectedChar, mutators: w.mutators, shardMult: w.shardMult, realms: chooseRealms(), seed: null, eventId: w.id, board: w.live ? `live-${w.id}` : w.id };
  }
  return { mode: 'standard', label: 'Standard', charId: selectedChar, mutators: [], shardMult: 1, realms: chooseRealms(), seed: null };
}

// Daily score: realms cleared dominate, then kills and speed.
export const dailyScore = (sum) => Math.round(sum.bosses * 10000 + sum.kills * 2 + sum.level * 25 + (sum.stage - 1) * 2500);
