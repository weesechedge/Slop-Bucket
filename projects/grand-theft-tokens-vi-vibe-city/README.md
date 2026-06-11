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
| **E** or **F** | enter · exit vehicle (walk up to one) |
| **Left click** | punch (on foot) · horn (in car) |
| **Right-drag** | orbit camera · **wheel** zoom |
| **R** | cycle radio (in car) |
| **B** | horn (scatters pedestrians) |
| **H** | help · **M** mute · **P / Esc** pause **& settings** |

**Helicopter** (find it on the beach helipad): **W/S** tilt, **A/D** yaw,
**SPACE** climb, **SHIFT** descend. Land before you get out — gravity is
undefeated.

**Touch is fully supported** — left half of the screen is a virtual stick,
buttons on the right (E / punch / sprint-handbrake / radio / pause). In the
chopper the sprint button climbs and the punch button descends.

**Face upload** — on the title screen you can hand the game a photo. It gets
auto-cropped onto your character's (generously proportioned) head. The city
deserves to know who's doing this to it.

**Settings** — pause (P) has sliders for traffic and pedestrian density,
0–200%.

## 🗺️ What's in the box

- A 9×9-block neon city with a beach, a pier, a yacht, a **beach helipad**, and
  six neon landmarks (THE CoLAB, VIBE CITY P.D., MERCY GENERAL, DATACENTER Σ,
  the FINE-TUNERS garage, the park)
- **11 story missions** from Z at The CoLab — checkpoint runs, timed deliveries,
  a data-truck heist, a 5-star survival run, a minimum-speed bomb car, a street
  race, a helicopter ring course, a pedestrian-scaring rampage, and an
  RLHF rideshare finale with scrolling credits
- A flyable **helicopter** (GRADIENT ASCENDER) with arcade hover physics —
  buildings only block you below their rooflines
- **13 vehicle types**: sedans, taxis, vans, trucks, beaters, sports cars, a
  drifty muscle car, a glued-to-the-road supercar, a battering-ram bus, a ute,
  police cruisers, heavy ALIGNMENT INTERCEPTORs, and the chopper
- A 5-star wanted system that **ramps hard**: more cops spawning closer at
  every star, interceptors at 4★, and at 5★ a police chopper (EVAL EYE) that
  **shoots tokens at you** — missed shots litter the street as pickups
- Cop AI that trails off your rear quarter and periodically lunges to ram you
  off the road (no more bumper-glue)
- Free-roam systems: traffic + pedestrians with **density sliders (0–200%)**,
  on-foot arrests, hospital fees and bail
- **25 hidden Attention Orbs** (find them all for a fat token bonus)
- Drivable cars with per-model grip, drift handbrake, damage, fire, and
  explosions; carjacking; token drops; a rotating GPS minimap; WASTED/BUSTED
- A procedural **synth radio** (two stations) plus engine, siren, a proper
  two-tone klaxon horn, and rotor-chop audio — all WebAudio, zero audio files
- Day-glow Miami-sunset rendering: shader sky, fog, water, instanced buildings
- Traffic drives on the **left**. This is Vibe City, but it was built in
  Canberra.

## 🧪 Test

```bash
node test/smoke.js
```

Boots the entire game headless in Node with DOM stubs, simulates ~6,000 frames
(driving, crime, arrest, drowning, helicopter flight, the 5-star chopper
response, mission-geometry reachability audits, full playthroughs of the
race / chopper / rampage / rideshare missions, a free-roam soak) and
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
| `js/missions.js` | the 11-mission story, markers, dialog scripts |
| `js/hud.js` | HUD, minimap renderer, toasts, letterbox dialog, credits |
| `js/main.js` | boot, input (kb/mouse/touch), camera, game loop |

Persistence is session-only by design — close the tab and Vibe City forgets
you, like any good city should.

## 📻 Credits

Directed by: A Language Model. Stunts: also the language model.
Made with Three.js, the Web Audio API, and an irresponsible prompt.
