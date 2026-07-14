# Getting Started

A walkthrough from empty folder to edit plan, using the scaffold's worked
example — a noir short called *The Red Suitcase*. Every step shows the slash
command you run inside your assistant (Claude Code, Codex, Cursor, or
OpenCode) and, where one exists, the equivalent CLI script.

If you only read one other document, read
[commands/README.md](../commands/README.md) — it lists all 20 commands in
pipeline order.

## 1. Install

```bash
git clone https://github.com/MRCalderon3D/everything-ai-filmmaking
cd everything-ai-filmmaking
npm test && npm run validate      # confirm the scaffold is healthy

# install into your film project (creates the harness wiring there)
node scripts/install.js --target ../my-film --harness claude --profile full
```

- `--harness`: `claude` | `codex` | `cursor` | `opencode` | `all`.
- `--profile`: `full` (everything), `writing-room` (story development only),
  `previs` (through storyboards and shot planning), `generation`
  (reference plans through clips). Start with `full` unless you know you
  want less.

Open `../my-film` in your assistant. The slash commands are now available.

Check your setup any time:

```bash
node scripts/doctor.js --target ../my-film
```

Doctor reports which provider keys are set (`FAL_KEY`, `GOOGLE_API_KEY`,
`RUNWAY_API_KEY`, …). No keys are required to start — everything runs
dry-run until you opt into live generation.

## 2. Start the workspace

```
/project-init
```

This scaffolds `production/` and writes `production/project.yaml`, the file
every command reads first. Three decisions live here and shape everything
downstream:

- **`production_type`** — `cinema` (short/feature/series) or `commercial`
  (spot/social/branded-content/music-video). This selects which rules layer
  applies: cinema locks one master deliverable and forbids hook-first
  editing; commercial requires a `deliverables[]` list (platform, aspect
  ratio, max duration) and designs every 9:16 variant at blocking time.
- **`lens_kit`** — the finite set of focal lengths your shots may use, plus
  the glass's character. Three focals is a generous kit; whole features have
  been shot on one. Shots outside the kit refuse to compile.
- **`default_providers`** — which image/video/audio backends to compile
  prompts for by default.

CLI equivalent: `node scripts/create-project.js --target . --title "My Film"`.

## 3. Develop the story

Put your screenplay at `production/story/script.fountain` (Fountain format —
see `rules/writing/screenplay-format.md`), or start from a premise and let
the screenwriter draft it. Then:

```
/script-analyze        # scenes, beats, entity inventory (SC_/BT_ IDs)
/story-bible           # canon: premise, themes, arcs, world rules, timeline
/music-brief           # music strategy NOW, not in post
```

`/music-brief` is deliberately early: it fixes the strategy per cue
(song-as-concept, counterpoint, support, lyric-narrative, minimal/solo), and
its tempo/energy map later shapes shot timing and cut rhythm. Every temp
track is flagged for licensing from day one.

All prose these commands produce follows the humanizer rules by default
(`rules/writing/prose-style.md`); run `/humanize <file> --check` on any text
that reads machine-made.

## 4. Build the bibles

```
/character-bible       # identity, wardrobe states, reference-sheet plans
/location-bible        # spatial geometry + camera-angle maps (LOC_*_C#)
/prop-bible            # plot-critical props with state timelines
/style-bible           # palette, lighting, lensing, grain — the visual law
```

Bibles are the source of truth: prompts are compiled *from* them, never
freehanded. Starter look presets live in `templates/looks/` (analog VHS,
documentary, surrealist, classic cinematic) — copy one into your style bible
and adapt it.

```
/visual-development    # FIRST PAID STEP — generate the master references
```

This generates character sheets, location plates, and look frames, then
walks them through `draft → review → approved`. Only **approved** masters
can be cited by reference plans. Approved assets are immutable — supersede
with a new `_V##`, never edit.

## 5. Plan the shots

```
/scene-breakdown                 # scenes -> beats, entities, blocking needs
/smart-shot SC_004 --duration 18s --shots 5 --provider veo
```

`/smart-shot` is the centerpiece: one scene in, a complete cinematic
proposal out — blocking on the location map, coverage, numbered shot files
(`SH_004_001…`), storyboard, reference plan, compiled prompt packages, and
validated continuity state. Prefer manual control? Use the separate
stations: `/shot-list`, `/storyboard`, `/reference-plan`.

Useful flags: `--coverage minimal|standard|dense` (minimal is the commercial
default), `--style <LOOK_ID>`.

Each shot file carries the full craft record: narrative purpose, timing with
handles, camera (size, angle, height, `lens_mm` from your kit, movement with
direction), blocking with eyelines, continuity (axis, screen direction,
neighbors), required references, and generation flags. See
[templates/shot/shot.yaml](../templates/shot/shot.yaml) for a commented
example.

## 6. Generate

```
/generate-keyframes SC_004       # start/end frames via image providers
/generate-clips SC_004           # video clips via video providers
```

Everything is **dry-run by default**: prompt packages and request specs are
written to disk with no network calls, so you can inspect exactly what would
be sent. Going live requires the provider's env var, an explicit `--live`,
and a cost confirmation (`--yes`). Every attempt writes a generation record
(provider, model, prompt hash, references, cost, seed) — no orphan media,
ever.

CLI equivalents:

```bash
node scripts/build-reference-plan.js --shot <shot.yaml> --refs production/references/manifest.yaml
node scripts/compile-prompts.js     --shot <shot.yaml> --provider veo
node scripts/generate-assets.js     --shot <shot.yaml> --kind video          # dry run
node scripts/generate-assets.js     --shot <shot.yaml> --kind video --live --yes
```

Provider notes the compiler already handles for you: Veo takes cinematography
language first; FLUX-class image models are lens-literal; Runway Gen-4 video
prompts are motion-only — its lens look rides in the keyframe.

## 7. Review and assemble

```
/continuity-review SC_004        # axis, screen direction, wardrobe, props, light
/edit-plan                       # clip order, pacing, transitions, sound, grade
```

Continuity is state, not vibes: `check-continuity.js` audits axis
consistency, screen-direction flips without a neutral shot, and
enters-from/exits-to chain integrity, and refreshes
`continuity/scene-state.yaml`. The edit plan honors the music brief or
escalates — it never quietly rescores the film.

## 8. Or run the whole thing

```
/full-production
```

Orchestrates every phase with approval gates at each boundary and cost
confirmation before every generation batch. You approve; it proceeds.

## The rhythm to internalize

1. **Bibles outrank prompts.** Fix problems upstream — in the bible, plan,
   or shot file — not by hand-editing a prompt.
2. **References before generation.** Every shot gets a reference plan naming
   exactly which approved masters it conditions on, and why.
3. **Everything validates.** Artifacts are schema-checked on write (hooks),
   and `production-qa` gates every phase transition.
4. **Cost is a gate.** If a command is about to spend money, it says how
   much and asks first.

## Customizing the scaffold

- Add a look: copy a `templates/looks/` preset, adapt, promote to approved.
- Change rules for your project: edit the installed `rules/` copies in your
  project — they are yours after install.
- Extend the scaffold itself (new agents/commands/skills): read
  [docs/conventions.md](conventions.md) first — a roster change touches the
  file, its manifest, and the conventions doc together, and
  `npm run validate` enforces it. Regenerate harness wrappers with
  `npm run sync:harnesses`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Slash commands missing in the assistant | Re-run `install.js` with the right `--harness`; restart the assistant |
| "outside the project lens kit" | Use a kit focal, or get the deviation approved and pass `--allow-off-kit` |
| Provider refuses `--live` | Its env var is missing — `node scripts/doctor.js` shows which |
| Wrapper drift errors in `npm run validate` | You edited a generated dir; edit the source and `npm run sync:harnesses` |
| A generated file fails schema validation | The write hook blocks it; fix the fields it names, don't bypass |
