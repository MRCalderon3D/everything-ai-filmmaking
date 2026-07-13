---
description: Audit axis, screen direction, wardrobe, props, and light across shots and scene boundaries.
---

# /continuity-review

## Purpose

Run the script-supervisor pass a generated film never gets on set: audit
selected takes and shot files against the bibles and continuity state —
180° line and screen direction across every cut, wardrobe and prop state
against their timelines, location geometry and light against the maps,
identity against approved masters — and update per-scene and global
continuity state so the next scene inherits the truth.

## Use When

- After `/generate-clips` selects takes for a scene, before those clips are
  approved (approval makes them immutable).
- Before `/edit-plan`, as the gate on the whole selected set.
- Any time drift is suspected — a hook flags it, a viewer notices it, or a
  bible/master was versioned after shots were generated.

## Inputs

- `scene` (ID or path, optional): a single `SC_###` to audit; default is
  every scene with selected takes not yet reviewed.
- `scope` (string, optional, default `full`): `spatial` (axis, direction,
  geometry) | `state` (wardrobe, props, injuries, weather) | `identity`
  (faces, builds, anchors) | `full`.

## Invokes Agents

- continuity-supervisor
- production-qa

## Required Skills

- continuity-checking

## Process

1. Load the scene's shots in cut order with their declared axis, screen
   direction, and neighbors; load `continuity/scene-state.yaml` and the
   previous scene's boundary state.
2. Spatial pass: verify every cut — axis side consistent or change
   motivated by a declared crossing shot; screen direction chains unbroken
   (a character exiting frame-left enters frame-right); eyelines opposed
   across the axis; geography matching the location map.
3. State pass: wardrobe state ID per character vs. `wardrobe.yaml` for this
   scene; prop presence, custody, and condition vs. the prop timelines;
   persistent marks (injuries, dirt, rain) carried forward, not reset.
4. Identity pass: selected frames/clips spot-checked against master anchors;
   drift graded (acceptable at shot size / visible / breaking).
5. production-qa compiles findings with severity — `blocker` (breaks the
   cut or canon), `fix` (regenerate or re-select), `note` (acceptable,
   recorded) — each finding naming the shot, the rule violated, and the
   cheapest fix layer (re-select take, re-roll clip, re-keyframe, re-plan).
6. Update `continuity/scene-state.yaml` per scene and the global
   `production/continuity/continuity-state.yaml`, including the scene's
   outgoing boundary state; validate both.

## Outputs

- `production/scenes/SC_###/continuity/scene-state.yaml` — validates against
  `schemas/continuity-state.schema.json`.
- `production/continuity/continuity-state.yaml` — updated global state;
  validates against `schemas/continuity-state.schema.json`.
- `production/continuity/review-SC_###.md` — findings report with severity
  and fix routing (human document, no schema).

## Notes

- Blockers gate approval: a scene with open blockers cannot pass to
  `/edit-plan`, and its clips stay in `review`.
- This command is free; run it liberally. Every blocker caught here is a
  clip that does not get discovered broken in the edit.
- Fix at the cheapest layer the finding names — do not reflexively
  re-generate video for a problem a different take selection solves.
- Related: `/generate-clips` (upstream), `/edit-plan` (gated by this),
  `/smart-shot` (writes the initial scene state this audits against).
