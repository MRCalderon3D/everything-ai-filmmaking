# Plan: scripts/build-board.js — one-page visual production board

Status: IN PROGRESS (started 2026-07-15). If picking this up fresh: read this
file, then implement exactly the steps below. Additive feature — must not
change or remove any existing behavior.

## Goal

A zero-dependency CLI that composes a **self-contained HTML production
board** per scene from REAL approved assets (never generative): character
masters, location plates, keyframes as storyboard panels with captions, and
a blocking floor plan drawn as inline SVG from `blocking.yaml` +
`map.yaml` coordinates (units: meters — positions are numeric). The graphic
deliverable `/smart-shot` and `/storyboard` always implied.

## CLI

```
node scripts/build-board.js --scene-dir production/scenes/SC_001 [--out <file>]
```

Default output: `<scene-dir>/storyboard/board.html` (relative `<img>` paths,
inline CSS + SVG; no external requests). Every missing asset degrades to a
labeled placeholder box — the script NEVER fails on missing media.

## Board sections (in order)

1. **Header** — project title, scene id/slug, production_type, format,
   aspect ratio, fps, lens kit summary (from `production/project.yaml` +
   `scene.yaml`).
2. **Character reference strip** — for each character appearing in the
   scene's shots (`performance`/`blocking` handles → `CHAR_*`), show its
   approved masters found in `production/references/` (face/turnaround/
   body/wardrobe/pose, whatever exists). Caption: character id + one-line
   description from its bible.
3. **Environment strip** — location plates from `production/references/`
   matching the scene's location (`LOC_*`), master first then stations
   C1..Cn. Caption: station id + what it covers (from `map.yaml`).
4. **Blocking floor plan (inline SVG, data-faithful)** — drawn from
   `map.yaml` landmarks (name + position, meters) and camera stations
   (position + orientation), plus the shot path: number each shot 1..N at
   its station (shot `camera.station`), connect consecutive shots with
   arrows. Auto-fit viewBox to the coordinate bounds with padding; y-axis
   flipped so +y is up; label origin note. Characters' start positions from
   `blocking.yaml` if positions are landmark names → place at that
   landmark's coords with the handle label.
5. **Storyboard sequence grid** — one panel per shot in order: the shot's
   newest APPROVED start keyframe (search `production/generations/<SHOT>/`
   records `status: approved|succeeded` → `media_files`; prefer files named
   `*start*`; fallback: any approved media; else placeholder). Caption
   block: shot id, timing (`duration_seconds` + handles), camera line
   (size/angle/lens/movement+motivation), narrative purpose (one line).
6. **Notes column** — look name(s) from scene/style refs, lighting/time of
   day from `scene.yaml` or location light state, junction plan summary if
   `production/edit/junction-plan-*.md` exists (boundary type per shot pair,
   parsed loosely: lines with `→`).

## Implementation steps

1. `scripts/build-board.js` (CommonJS, zero deps; reuse `scripts/lib/fsx.js`,
   `scripts/lib/yaml.js`, `scripts/lib/cli.js`). Pure composition — reads
   YAML + files on disk, writes one HTML string. Escape all text via a small
   `esc()`; compute all image paths RELATIVE to the output file's directory.
2. SVG floor plan: helper `renderPlanSvg(map, blocking, shots)` — pure
   function returning an SVG string; guard every missing field (no map →
   section shows "no map.yaml"). Deterministic ordering.
3. `package.json`: add script `"board": "node scripts/build-board.js"`.
4. Roster/doc wiring (docs ship with the feature):
   - `docs/conventions.md`: Scripts roster 9 → 10 (add build-board.js).
   - `commands/storyboard.md` + `commands/smart-shot.md`: mention
     `storyboard/board.html` as the composed visual board (generated from
     approved assets via `npm run board`).
   - `README.md` scripts line + `docs/getting-started.md` one-liner.
5. Test `tests/build-board.test.js`: build a tiny synthetic scene in a temp
   dir from `templates/` (project.yaml, shot.yaml as SH_004_002, minimal
   map.yaml/blocking.yaml copied from templates/location + a fake approved
   generation record + 1x1 PNG), run the builder, assert: exit 0, board.html
   exists, contains the shot id, the SVG tag, and the placeholder text for a
   missing master. Register in run-all (auto-discovered by *.test.js).
6. Gate: `npm run validate` + `node tests/run-all.js`; sync harnesses (only
   command docs changed); commit ("Add build-board: composed visual
   production board per scene"); push.

## Constraints

- Zero runtime deps; Windows-safe paths; never embed absolute local paths
  in the HTML (portability); never fail on missing assets.
- No roster changes beyond the scripts list (no new commands/skills).
- Everything text in the board comes from canon files — no invented copy.
