# 🌴 GRAND THEFT TOKENS VI

An open-world crime game about tokens, vibes, and consequences — built entirely
out of boxes, math, and AI jokes. Runs in any modern browser. No build step,
no dependencies, no server. Welcome to **Vibe City**.

> **Parody disclaimer:** this is an original, loving parody. It is not
> affiliated with, endorsed by, or remotely as good as any actual games studio's
> products. Every asset — geometry, music, sound, city, dialog — is generated
> procedurally or written from scratch. No tokens were harmed. (They were spent.)

## ▶️ Play it

**Locally:** just open `index.html` in a browser. That's it. (If your browser
is picky about `file://`, run `python3 -m http.server` in this folder and open
`http://localhost:8000`.)

**Deploy on GitHub Pages:**
1. Push this folder to a GitHub repo (`main` branch, files at the root).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
3. Your city is live at `https://<you>.github.io/<repo>/` in about a minute.

**Single-file version:** `gtt6-standalone.html` is the entire game (engine
included) in one ~1 MB file. Email it, AirDrop it, open it from a USB stick.

## 🎮 Controls

| Input | Action |
|---|---|
| **WASD / arrows** | move / drive |
| **Shift** | sprint |
| **Space** | handbrake |
| **E** or **F** | enter · exit car (walk up to one) |
| **Left click** | punch (on foot) · horn (in car) |
| **Right-drag** | orbit camera · **wheel** zoom |
| **R** | cycle radio (in car) |
| **B** | horn |
| **H** | help · **M** mute · **P / Esc** pause |

**Touch is fully supported** — left half of the screen is a virtual stick,
buttons on the right (E / punch / sprint-handbrake / radio / pause).

## 🗺️ What's in the box

- A 9×9-block neon city with a beach, a pier, a yacht, and six neon landmarks
  (THE CoLAB, VIBE CITY P.D., MERCY GENERAL, DATACENTER Σ, the garage, the park)
- **6 story missions** from Z at The CoLab — checkpoint runs, timed deliveries,
  a data-truck heist, a 5-star survival finale, and scrolling credits
- Free-roam systems: traffic with lane logic, pedestrians, a 5-star wanted
  system with police cars and on-foot arrests, hospital fees and bail
- **25 hidden Attention Orbs** (find them all for a fat token bonus)
- Drivable cars with drift handbrake, damage, fire, and explosions; carjacking;
  token drops; a rotating GPS minimap; WASTED/BUSTED flows
- A procedural **synth radio** (two stations) plus engine, siren, and impact
  audio — all WebAudio, zero audio files
- Day-glow Miami-sunset rendering: shader sky, fog, water, instanced buildings

## 🧪 Test

```bash
node test/smoke.js
```

Boots the entire game headless in Node with DOM stubs, simulates ~6,000 frames
(driving, crime, arrest, drowning, all six missions, a free-roam soak) and
asserts nothing is NaN, leaking, or on fire that shouldn't be.

## 🏗️ Architecture

Plain global scripts under one `GT` namespace — no modules, so it runs from
`file://` and GitHub Pages identically. Three.js r128 is vendored in `lib/`.

| File | Owns |
|---|---|
| `js/config.js` | constants, game state, utils, event bus, POIs |
| `js/audio.js` | WebAudio synth: radio, engine, siren, SFX |
| `js/city.js` | world gen, colliders + spatial hash, minimap bake |
| `js/entities.js` | car/ped/player/pickup factories + rigs |
| `js/ai.js` | traffic, pedestrians, police, wanted-level director |
| `js/sim.js` | physics, collisions, damage, death/respawn, particles |
| `js/missions.js` | the 6-mission story, markers, dialog scripts |
| `js/hud.js` | HUD, minimap renderer, toasts, letterbox dialog, credits |
| `js/main.js` | boot, input (kb/mouse/touch), camera, game loop |

Persistence is session-only by design — close the tab and Vibe City forgets
you, like any good city should.

## 📻 Credits

Directed by: A Language Model. Stunts: also the language model.
Made with Three.js, the Web Audio API, and an irresponsible prompt.
