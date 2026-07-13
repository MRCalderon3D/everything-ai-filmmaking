# Context: Preproduction

The design phase. Words become a visual system: bibles for every entity,
approved masters for every face and place, and a fully planned shot list.
This is where most identity and continuity problems are prevented — cheaply.

## Goals

- Approved bibles: character (with wardrobe states), location (with
  `map.yaml` and `LOC_*_C#` angles), prop, and style bibles.
- Approved master references (`_MASTER` assets) in `production/references/`
  for every principal character, location, and hero prop.
- Scenes broken into beats and blocking; a complete shot list with axis,
  screen direction, timing, and clip segmentation per shot.
- A reference plan per shot, approved before any prompt exists.

## In Scope

- Visual development and master generation (image providers, modest budgets).
- Scene breakdown, blocking, shot listing, storyboarding, reference planning.
- Establishing axes (`AXIS_<scene>_<letter>`) and continuity baselines.
- Out of scope: video clip generation, dialogue/music production.

## Typically Active

- Commands: `/character-bible`, `/location-bible`, `/prop-bible`,
  `/style-bible`, `/visual-development`, `/scene-breakdown`, `/shot-list`,
  `/smart-shot`, `/storyboard`, `/reference-plan`.
- Agents: visual-director, character-designer, production-designer,
  storyboard-artist, cinematographer, shot-planner, continuity-supervisor,
  prompt-director.
- Rules in force: `common/`, `visual/` throughout; `image/` for master
  generation; `writing/` when breakdowns push back on the script.

## Exit Criteria → Production

- Every entity appearing in a planned shot has approved masters listed in
  `references/manifest.yaml`; every shot has an approved reference plan.
- Shot files pass `scripts/validate.js` and the scene walks in
  `scripts/check-continuity.js` (axes, 30° rule, enters/exits) are clean.
- Storyboards reviewed; style bible approved; per-scene generation budget
  estimated and confirmed by a human.
