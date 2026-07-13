---
description: Break each scene into beats, entities present, and blocking requirements.
---

# /scene-breakdown

## Purpose

Take scene stubs from `/script-analyze` to production-ready depth: refined
beats with emotional values in and out, a complete manifest of who and what
is in the scene (characters with wardrobe state, location variant, props with
condition), and the blocking requirements — entrances, playing areas,
distances, and eyeline relationships — that `/shot-list` and `/smart-shot`
will stage against.

## Use When

- After the story and visual bibles exist; the breakdown binds scenes to
  bible IDs and wardrobe/prop states.
- A rewrite changed a scene and its beats, entities, or blocking needs must
  be re-derived.
- Beats feel mushy in shot planning — a scene that cuts badly is usually
  broken at the beat level, not the shot level.

## Inputs

- `scene` (ID or path, optional): a single `SC_###` to break down; default is
  every scene with a stub not yet marked `broken-down`.
- `depth` (string, optional, default `full`): `beats` (structure only) |
  `full` (entities and blocking requirements included).

## Invokes Agents

- showrunner
- shot-planner

## Required Skills

- scene-blocking
- narrative-structure

## Process

1. Re-read the scene against the story bible; state its dramatic function in
   one sentence — if it has none, flag it to the showrunner rather than
   breaking it down.
2. Refine beats: each beat gets an intention, an obstacle, a turn, and
   emotional values in/out. Merge beats that share a turn; split beats that
   hide two.
3. Bind entities: every character present (with the wardrobe state ID valid
   for this scene), the location and its time-of-day variant, every prop
   with its condition from the prop timeline. Unbound entities are errors.
4. shot-planner writes blocking requirements per beat: who enters from
   where, playing areas by the location map's names, key distances (a scene
   played at two meters is a different scene at ten), and the eyeline pairs
   that must stay consistent.
5. Note coverage-critical demands early: an insert the story requires, a
   reveal that dictates camera placement, off-screen space that must stay
   established.
6. Validate each scene file; mark the scene `broken-down`.

## Outputs

- `production/scenes/SC_###/scene.yaml` — completed breakdown; validates
  against `schemas/scene.schema.json`, beats against
  `schemas/beat.schema.json`.

## Notes

- This is the last free thinking before money: errors here surface as
  regenerated clips. Slow down on entity binding — a wrong wardrobe state
  ID silently poisons every prompt in the scene.
- Blocking *requirements* live here; the resolved staging (positions,
  movement paths, axis) is written by `/smart-shot` into `blocking.yaml`.
- Related: `/script-analyze` (upstream stubs), `/shot-list` and
  `/smart-shot` (consume the breakdown), `/continuity-review` (audits
  against the entity bindings).
