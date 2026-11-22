[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/oy-builds/gta6-game-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/oy-builds/gta6-game-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Palmera Nights

An original open-world crime game that runs in a desktop browser from its own
static files — no build step, no network. Explore the sun-soaked coastal city
of Palmera on foot and by car: steal and drive cars in live traffic, run a
chain of story missions for the Marisol family, outrun the Palmera PD as your
wanted level rises, fight and earn your way up from nobody to legend.

- **City**: a hand-built coastal city of named districts, beaches, a port and
  a downtown grid, drawn in a top-down 2D canvas style with day lighting.
- **Systems**: on-foot and driving with traffic AI, pedestrians, car theft,
  wanted stars with police pursuit, melee and shooting combat, cash and
  respect progression, a mission chain with story beats, HUD with minimap,
  start screen, pause, and a localStorage save.
- **Tech**: plain HTML/CSS/JavaScript modules under `game/`, one file per
  job, no libraries. `main.ts` (Node 22) hands the entry in: it copies
  `game/` and `screenshots/` to the output and writes the dossier with the
  vendored make.fun library. Play it locally with `node serve.ts`, then open
  http://localhost:8080.

## The story

Rico Vale arrives in Palmera with $120 and quick hands. Lucia Marisol, who runs the
Marisol family out of Hotel Marisol, gives him work: steal a yellow Fenix Roadster from
the Faro Azul lighthouse, run a crate out of Port Azul, teach the Serena crew geography
in The Palms, lift a high roller's Brisa from the Palmera Grand Casino, win the Serena
Strip beach race, and take the ledger from Torre Serena. Six missions, cash and respect
rewards, and a wanted system that answers every witnessed crime with Palmera PD pursuit
cars and foot officers — get busted or wasted and you wake up $150 lighter.

## How to play

- **WASD / arrows** — walk and drive · **E** — enter / exit (steal) a car
- **Shift** — sprint · **Mouse** — aim · **Click / Space** — punch or shoot
- **M** — full city map · **Esc** — pause. Progress saves to localStorage.
- Side work: green **D** markers are timed deliveries that pay cash in free roam.

## Source layout (one job per file, under `game/js/`)

`city.js` the Palmera map and collision · `render.js` camera, world and minimap ·
`player.js` Rico on foot · `vehicles.js` car models and driving · `traffic.js` traffic
AI · `pedestrians.js` walkers · `police.js` wanted stars and pursuit · `combat.js`
fists, pistol and pickups · `missions.js` the Marisol story chain · `hud.js` the DOM
HUD · `audio.js` WebAudio-synthesised sound · `save.js` the local save · `main.js`
boot and game loop. Screenshots in `screenshots/` are real renders of this game.

Built by an AI agent in a recorded session for the make.fun "Make GTA 6" bounty
(gta6-01). Everything — city, names, story, art, code — is original.
