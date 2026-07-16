# Getting Started

A walkthrough from empty folder to edit plan, using the scaffold's worked
example — a noir short called *The Red Suitcase*. Every step shows the slash
command you run inside your assistant (Claude Code, Codex, Cursor, or
OpenCode) and, where one exists, the equivalent CLI script.

If you only read one other document, read
[commands/README.md](../commands/README.md) — it lists every command in
pipeline order.

## 1. Get set up

**Clone and go (the friendly path — no install step):**

```bash
git clone https://github.com/MRCalderon3D/everything-ai-filmmaking my-film
cd my-film
# open your assistant here (claude / codex / cursor / opencode)
```

The clone already contains every harness's wiring (`.claude/`, `.codex/`,
`.cursor/`, `.opencode/`). Just tell the assistant what you want to make —
`/project-init` creates your `production/` workspace right here, and git
ignores it so your film stays out of the scaffold's history.

Running several productions in one clone? Rename per project
(`production-my-film/`): any directory containing `project.yaml` is a valid
workspace root, and each production stays fully self-contained. Add each
folder to `.gitignore` like the default `production/` line.

**Installing into an existing project** (your own repo, or a lean profile):

```bash
node scripts/install.js --target ../my-film --harness codex --profile full
```

- `--harness`: `claude` | `codex` | `cursor` | `opencode` | `all`.
- `--profile`: `full` (everything), `writing-room` (story development only),
  `previs` (through storyboards and shot planning), `generation`
  (reference plans through clips).

Check your setup any time:

```bash
node scripts/doctor.js
```

Doctor reports which provider keys are set (`FAL_KEY`, `GOOGLE_API_KEY`,
`RUNWAY_API_KEY`, …). No keys are required to start — everything runs
dry-run until you opt into live generation, and the manual/harness-native
providers never need one.

## 2. Start the workspace

```
/project-init
```

This scaffolds `production/` and writes `production/project.yaml`, the file
every command reads first. Anything you don't specify gets asked in one
short batched interview, each question offering a recommended default you
can accept in a word — the scaffold never silently assumes a
project-shaping value (`rules/common/ask-dont-assume.md`). Once answered,
it's canon: downstream commands read `project.yaml` instead of re-asking. Three decisions live here and shape everything
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

CLI equivalent: `node scripts/create-project.js --title "My Film"` — with no
`--target`, the workspace folder takes your project's name (`my-film/`).
`production/` inside it is fixed plumbing every schema and script relies on;
your name lives on the folder that contains it.

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
documentary, surrealist, classic cinematic, found-footage phone) — copy one
into your style bible and adapt it.

**Have your own material?** Drop it into `production/references/inbox/` —
style frames, character lookalikes, location photos, mood boards, and also
non-visual references: music tracks, motion clips, lore documents — and run:

```
/ingest-references
```

The assistant analyzes each image — palette, lighting, lens cues for looks;
identity vs. costume for characters; geography and materials for locations —
and writes what it sees into the bibles and `LOOK_*` assets, registering
every file with provenance and license state. Files are routed to their
homes: entity `refs/` for visual material, `characters/<ID>/voice/` for
voice samples, `references/audio|video|docs/` for music refs, motion clips,
and documents (audio/video are cataloged with your one-line description —
the assistant can't hear or watch them). Your material becomes the canon
that `/visual-development` then generates masters from, instead of the
pipeline inventing a look from prose.

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

At any point, compose the scene's one-page visual production board —
character strips, location plates, a data-faithful blocking floor plan, and
the storyboard grid with whatever keyframes exist so far:

```bash
npm run board -- --scene-dir production/scenes/SC_004
# writes production/scenes/SC_004/storyboard/board.html
```

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

**Zero-API-cost images:** if your harness can generate images itself — Codex
does, with gpt-image through your subscription — set
`default_providers.image: harness-native` (or pass
`--provider harness-native`). The pipeline compiles the same prompt package
and reference plan; the assistant then generates in-chat, attaching the
reference images as inputs, saves the file under `generations/`, and
completes the generation record. No key, no per-image spend, same
provenance discipline.

**Generating video by hand in a web UI** (Higgsfield or similar): set
`default_providers.video: manual`. Per shot you get a complete handoff —
the final motion-first prompt, the start/end frames and reference images to
upload with their exact file paths in priority order, duration, and aspect
ratio. Paste, generate, download the clip into the shot's `generations/`
directory, and the record is completed like any API run.

The same manual pattern covers every media kind, tool-agnostic: `manual`
for video (any web UI), `harness-native` for images (in-chat generation, an
MCP tool, or hand generation in any image UI), and `local` for audio (DAW,
recorded VO, licensed music). In all three, the scaffold compiles the full
spec, hands it over, and the downloaded result completes its provenance
record.

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
3. **Everything validates — and reviews itself.** Artifacts are
   schema-checked on write (hooks), every output runs its own
   self-evaluation before it's delivered (`rules/common/self-review.md`),
   and `production-qa` gates every phase transition. Run
   `/self-review SC_004` before a human review session so people judge
   craft, not typos.
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
