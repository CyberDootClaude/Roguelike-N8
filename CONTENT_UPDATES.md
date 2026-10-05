# Keeping Bonk Realms fresh

The game has three ways to change after release. From cheapest to biggest:

| Lever | What changes | Needs a code release? | Effort |
| --- | --- | --- | --- |
| **Live events** (`events.json`) | Mutators, name, dates and Soul Shard bonus for a limited-time event | No, just edit the JSON file | Minutes |
| **Weekly Events and Daily Challenges** | Rotate automatically by date | No, they're fully automatic | None |
| **Content patches** | New realms, monsters, bosses, weapons, items, heroes, mutators | Yes, a normal push | Hours to days |

Every push to the default branch redeploys GitHub Pages. There's no service worker caching the old version, so players get the update the next time they load the page.

## 1. Run a live event (no code)

Edit `events.json`:

```json
{
  "id": "winter-2026",
  "name": "Frostfall Festival",
  "desc": "Moon gravity and a blizzard of gold.",
  "start": "2026-12-20",
  "end": "2027-01-03",
  "mutators": ["moongravity", "goldrush", "thickfog"],
  "shardBonus": 2.5
}
```

- The dates are inclusive and in UTC (`YYYY-MM-DD`).
- While an event is running, it replaces the Weekly Event in the menu and the button shows **Live Event**.
- Mutator ids are listed in `src/data/mutators.js`.
- An unknown id is ignored, and a broken file falls back to the weekly rotation.

## 2. The automatic rotations

- **Daily Challenge** (`src/modes.js → currentDaily`):
  - The date is the seed. Everyone gets the same hero, realms, map layouts and two mutators that day.
  - Each player's best score is saved locally.
- **Weekly Event** (`currentWeekly`):
  - Three mutators are picked from a seed based on the week number, and they change every Monday (UTC).
  - The event names cycle through `WEEKLY_NAMES`.

Adding a new mutator automatically adds it to both rotations.

## 3. Ship a content patch

Content is data-driven, and most additions are one entry in a data file:

| Add a… | Where | Notes |
| --- | --- | --- |
| Monster | `src/data/enemies.js` | Quickest: `like(baseId, colorMap, overrides)` re-themes an existing body plan, which is how the 1.2 realms were built. Or | Pick an AI archetype (`chaser`, `runner`, `tank`, `ranged`, `flier`, `exploder`, `charger`, `splitter`, `teleporter`), then build the model from primitive parts. |
| Realm | `src/data/stages.js` | Add a stage object and list it in a `STAGE_SLOTS` entry. Each run picks one realm per slot, so variants make runs differ without making them longer. |
| Boss | `src/bossesExtra.js` | Easiest route: a model function plus `moves` built from the reusable patterns `mvCircles`, `mvRadial`, `mvFan`, `mvShockwaves`, `mvLines`, `mvSummon`, `mvHoming`, `mvDive` and `mvCharge`. See Sporemother or Gearlord. Fully custom attacks go in `makeAttack` in `src/bosses.js`. |
| Weapon | `src/data/loot.js → WEAPONS` | Reuse an existing `kind`, or add a new case in `src/weapons.js → fire()`. |
| Item / tome / hero | `src/data/loot.js` | Items are just stat bundles, and the effects already wired in include the on-hit procs, thorns and revives. |
| Mutator | `src/data/mutators.js` | Use the `mods` multipliers or player `stats`. |
| Realm music | `src/audio.js → THEMES` | A scale, tempo and chord progression. |

Then:

1. Tag the new content with `added: '<version>'`. The menu, level-up cards and realm list show **NEW** badges for anything from the current version.
2. Bump `GAME_VERSION` in `src/data/patches.js` and add a `PATCHES` entry at the top with the notes.
3. Run the checks:
   ```bash
   node tools/content-test.mjs     # modes, new realm/boss/weapons, What's New
   node tools/smoke.mjs debug 3    # plays through realms headless
   node tools/sim.mjs <hero> 5     # bot balance run across all realms
   node tools/dps.mjs <weapon>     # damage vs. the first boss
   node tools/realms-test.mjs      # every realm variant + its boss
   ```
   CI (`.github/workflows/ci.yml`) runs `npm test` on every push and only deploys if it passes.
4. Push. Returning players see the **What's New** screen once.

### Balance targets used so far

- **Crowd clearing:** each starting weapon should kill roughly 250–400 enemies when standing still for 2 minutes. The standing-still check was a throwaway script, not one of the tools above.
- **Boss damage:** a new weapon at level 1 should do about 10–30 DPS against the first boss.
- **Boss fight length:** with a decent build, about 45–135 seconds, getting longer through the realms.

## Ideas for future patches

- **A third variant per slot.** A Halloween "Pumpkin Patch" for slot 1 would pair nicely with the Oct 25 event.
- **Seasonal cosmetic hats** unlocked by achievements or events.
- **More evolutions and evolution-only items.**
- **Server-side score checks** for the leaderboards (a Supabase Edge Function).
