# Emberfall — Last Light of the Hearth

[![Play on make.fun](https://img.shields.io/badge/Play%20on-make.fun-orange)](https://make.fun/bounty/best-game-01)
[![Bounty: best-game-01](https://img.shields.io/badge/bounty-best--game--01-blue)](https://make.fun/bounty/best-game-01)
[![Prize: $1,000](https://img.shields.io/badge/prize-%241%2C000-gold)](https://make.fun/bounty/best-game-01)

An original top-down 2D arena survival shooter, written in plain HTML5, CSS and
JavaScript with no libraries, no build step and no network requests. All art is
drawn in code on a canvas; all sound effects and the music are synthesised live
with WebAudio.

## The game

The dark has swallowed the valley, and one lantern still burns. You are the
Keeper of the last hearth. Waves of ash mites, cinder spitters, gloom wraiths
and slag brutes crawl out of the dark to snuff it out. Hold the light through
10 waves, choose a blessing of the hearth between waves, and face the Hollow
King on wave 10.

- **Complete loop:** animated title screen with best score, play, pause,
  a pick-1-of-3 upgrade choice between waves, victory after wave 10, and a
  game-over screen with run stats — restart from either end screen.
- **Four enemy kinds, each with its own behaviour:** chasers that swarm,
  shooters that keep their distance, wraiths that telegraph and dash, and
  slow tank brutes — plus gilded elites and a boss with two phases, radial
  bullet bursts and summoned minions.
- **Depth:** combo score multiplier, escalating waves, 10 stackable upgrades,
  and pickups (health, triple flame, rapid wick, ward shield) dropped by the
  fallen.
- **Feel:** particles, screen shake, hit-stop, damage flashes, floating score
  text, synthesised sound effects and a generative music loop.

## How to play

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim |
| Hold left click | Shoot |
| Space | Dash (briefly untouchable, then a short cooldown) |
| P / Esc | Pause |
| 1 / 2 / 3 or click | Choose an upgrade between waves |
| R or click | Restart from the victory or game-over screen |
| M | Mute |

Your best score is kept in the browser's local storage and shown on the
title screen.

## How to run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome and play. The game is
static files under `game/` — any static file server works.

To build the submission output (the program the competition grades):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `game/` and `screenshots/` into `out/` and writes
`out/dossier.json`. Run it twice into two directories and the outputs are
byte-identical.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, taken in headless Chromium from the deterministic scenes the game
draws for `?shot=<scene>&seed=<n>`:

| File | Scene |
| --- | --- |
| `1-play.jpg` | Mid-action play on wave 4 |
| `2-title.jpg` | Title screen |
| `3-upgrade.jpg` | The between-wave upgrade choice |
| `4-victory.jpg` | Victory after wave 10 |

## Structure

```
game/
  index.html        the page; loads src/main.js as an ES module
  src/
    config.js       tuning, palette, enemy kinds, waves, upgrades
    rng.js          seeded generator and spawn helpers
    input.js        keyboard and mouse state, scripted input for shots
    audio.js        WebAudio sound effects and generative music
    entities.js     the world: player, enemies, bullets, pickups, waves
    render.js       all canvas drawing: arena, entities, HUD
    ui.js           title, pause, upgrade, victory and game-over screens
    shots.js        deterministic screenshot scenes (?shot=&seed=)
    main.js         game loop and state machine
main.ts             the entry program: copies game/ + screenshots/, writes dossier.json
serve.ts            static file server for game/ on port 8080
vendor/
  makefun-game.ts   the kit's dossier library, copied unchanged
```

## License

MIT — see `LICENSE`.
