# Bonk Realms

A 3D survivor-roguelike in the browser, inspired by **Megabonk**. Weapons fire on their own. You move, jump, slide, pick upgrades, buy chests with gold, find each realm's boss portal and beat the boss before the Final Swarm shows up.

## Run it

It has no build step. Serve the folder over HTTP, because ES modules don't load from `file://`:

```bash
npm start            # http-server on http://localhost:8080
# or
python3 -m http.server 8080
```

Three.js is vendored in `vendor/`, so the game runs offline.

### GitHub Pages

`.github/workflows/pages.yml` publishes the game on every push to the default branch (you can also run it by hand from the Actions tab). The first time, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. After that the game is at `https://<owner>.github.io/<repo>/`.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move |
| Mouse (click to capture) / ← → | Camera |
| Space | Jump (air jumps with Feather items or the Storm Monk) |
| Shift / C | Slide. Downhill slides pick up speed, and jumping out of a slide keeps your momentum |
| E | Interact: chests, shrines, portal |
| 1 / 2 / 3, R | Pick an upgrade, reroll |
| Esc / P | Pause |
| M | Mute |

## What's in it

- **7 characters**, each with a different starting weapon and perk.
- **13 weapons**: Bonk Hammer, Hunter Bow, Ember Staff, Storm Rod, Frost Aura, Orbit Blades, Boomerang, Toxic Flask, Revolver, Sunbeam, Sky Hammer, Bone Mines, Chakram Nova.
  - You hold up to 4 at once.
  - Each level-up rolls random stat upgrades, and upgrade rarity (Common → Legendary, affected by luck) sets how big they are.
- **17 tomes**, up to 4 held. They are passive stat scalers, and one of them is the Cursed Tome, which trades difficulty for rewards.
- **27 items** across 5 rarities. Examples: Volatile Core explosions, Storm Link chain lightning, Frost Charm freezes, and Phoenix Feather, which revives you once.
- **Map features**:
  - Gold chests, and their price goes up with each one you open.
  - Charge shrines (stand inside the ring), plus golden ones.
  - Shrines of Greed, Challenge (an elite pack guarding a free chest) and Magnet.
  - Breakable pots.
- **Elites** show up periodically and drop chests. **Hordes** surround you every minute or so.
- **Final Swarm**: when the stage timer (6 or 10 minutes) runs out, spawns ramp up with no limit.

### Realms, monsters and bosses

| # | Realm | Hazard | Monsters | Boss |
| --- | --- | --- | --- | --- |
| 1 | Verdant Woods | — | Sproutling, Goblin Scout, Buzzbee, Thorn Spitter, Boom Shroom, Mossback Golem | **Gnarlroot, the Elder Treant**: root eruptions, seed barrages, ground-slam shockwaves, sapling summons, thorn rings |
| 2 | Scorched Dunes | Quicksand (slows) | Mummy, Scarab, Vulture, Cactus Gunner, Dune Scorpion, Sand Colossus | **Sekh-Amun, the Sun King**: sun spirals, curse beams, sand teleport bursts, servant summons, sunfall |
| 3 | Hollow Graveyard | Dense fog | Zombie, Skeleton, Wailing Ghost, Bone Archer, Grave Bloat (splits), Armored Revenant | **Morthos, the Lich King**: homing skulls, grave hands, soul novas, raise dead, death-ray star |
| 4 | Frostbite Tundra | Slippery ice lakes | Snow Imp, Yeti Brute, Frost Wolf, Ice Wisp, Rolling Snowball (splits), Glacial Golem | **Glacior, the Frost Colossus**: glacial charge, ice shard fans, hailstorm (leaves slowing frost), triple stomp, wolf pack |
| 5 | Molten Caldera | Lava pools (damage) | Ember Bat, Magma Slime (splits), Fire Imp, Lava Hound, Cinder Bomber, Obsidian Brute | **Ignar, the Infernal Wyrm**: fire breath, meteor rain with burning ground, dive bomb, inferno rings, brood summons |

Enemy behaviour types:

- Chasers
- Fast runners
- Tanks
- Ranged shooters that kite you
- Fliers
- Exploders, which light a fuse
- Chargers, which telegraph a dash
- Splitters
- Teleporters

Every boss attack is telegraphed. Red zones detonate. Shockwave rings and low bullets can be jumped. Below 50% HP each boss enrages and gets an extra attack.

After Realm 5 you win, and you can keep going into an endless loop where the realms come back harder.

## Dev tools

```bash
npm i                                # installs playwright (dev only)
node tools/smoke.mjs debug 5         # plays all 5 realms headless, screenshots in test-output/
node tools/sim.mjs ranger 5          # fast bot simulation of a full run (balance check)
node tools/dps.mjs                   # per-weapon DPS vs. the first boss
```

URL flags: `?god` (you can't die), `?debug` (extra weapons and gold).

## Code map

- `src/main.js`: game state machine, stage flow, interaction, camera
- `src/world.js`: terrain, props, hazards, interactables
- `src/player.js`: movement (jump, slide, momentum) and stats
- `src/enemies.js`: spawn director, AI archetypes, instanced rendering, drops
- `src/bosses.js`: boss models and attack patterns
- `src/weapons.js`, `src/combat.js`: weapon behaviours, damage pipeline, procs, projectiles
- `src/hazards.js`: enemy bullets, telegraphs, shockwaves, zones
- `src/data/*.js`: all content (enemies, stages, weapons, tomes, items, characters)
