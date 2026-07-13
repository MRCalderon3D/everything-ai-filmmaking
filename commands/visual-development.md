---
description: Generate and iterate the master reference images — character sheets, location plates, look frames.
---

# /visual-development

## Purpose

Turn the visual bibles into approved pixels: character sheets, location
master plates, hero-prop images, and LOOK frames. This is the first command
that spends generation budget, and it is where identity is won or lost —
every later shot conditions on the masters approved here.

## Use When

- Character, location, prop, and style bibles exist and at least one has a
  pending reference-sheet plan.
- A master needs a new version (design note, story change) — supersede, never
  overwrite.
- Before any `/smart-shot` or `/generate-keyframes` run; those commands
  refuse shots whose reference plans point at missing masters.

## Inputs

- `target` (ID, optional): a single `CHAR_*`, `LOC_*`, `PROP_*`, or `LOOK_*`
  ID; default is every asset with unrendered planned masters.
- `provider` (string, optional, default from `project.yaml`): image provider
  from `manifests/image-providers.json`.
- `variants` (int, optional, default 4): candidates per master slot.
- `live` (flag, optional, default off): actually call the provider; dry-run
  otherwise.

## Invokes Agents

- visual-director
- character-designer
- production-designer

## Required Skills

- visual-style-development
- character-sheet-generation
- location-design

## Process

1. Collect every planned-but-missing master from the bibles' reference plans
   and group them into batches by asset.
2. Compile prompts from the bibles — identity anchors, wardrobe state,
   geometry, LOOK language — never freehand. Each prompt package is written
   before any generation.
3. **Cost gate:** estimate the batch (slots × variants × provider rate),
   present it, and wait for explicit confirmation before any live call.
   Dry-run writes request specs only.
4. Generate candidates; write a generation record per attempt with provider,
   model, prompt hash, and cost.
5. The owning designer reviews candidates against the bible's anchors —
   likeness, geometry, palette — selects one per slot or orders a targeted
   re-roll with a corrected prompt (maximum two re-roll rounds before
   escalating the bible language itself).
6. Selected images are named `<ID>_MASTER_V##`, copied into the asset's
   `refs/` and `production/references/`, registered in the manifest, and
   marked `review` for the user's approval.

## Outputs

- `production/characters/<CHAR_ID>/refs/`, `production/locations/<LOC_ID>/refs/`,
  `production/props/<PROP_ID>/refs/` — candidate and master images.
- `production/references/manifest.yaml` — updated master registry (no schema).
- `production/generations/<batch>/generation-record.yaml` — one per attempt,
  validates against `schemas/generation-record.schema.json`.

## Notes

- **Cost warning:** this is a paid command. Default is dry-run; live runs
  always show the estimate first. Trim `variants` before trimming slots.
- Approved masters are immutable; a change means a new `_V##` and manifest
  update, so continuity records stay truthful.
- If candidates keep missing, fix the bible wording — do not brute-force
  with re-rolls.
- Related: `/character-bible`, `/location-bible`, `/prop-bible`,
  `/style-bible` (upstream), `/reference-plan` (assigns masters to shots).
