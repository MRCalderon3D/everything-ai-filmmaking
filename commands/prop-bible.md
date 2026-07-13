---
description: Catalog plot-critical props with appearance, state timeline, and custody tracking.
---

# /prop-bible

## Purpose

Define every prop the story depends on: what it looks like in promptable
detail, who holds it in which scene, and how its state changes (loaded/empty,
intact/broken, clean/bloodied). Props are the most common continuity casualty
in generated footage — a hero object that changes shape between shots breaks
the film — so each one gets a state timeline the continuity supervisor can
audit against.

## Use When

- After `/script-analyze` has assigned `PROP_*` IDs.
- A prop is plot-critical (weapon, letter, key, MacGuffin) or appears in more
  than one scene — set dressing that never matters stays in the location
  bible.
- Generated shots show a prop mutating and its definition needs anchors.

## Inputs

- `prop` (ID, optional): a single `PROP_*` ID; default is every prop in the
  script analysis marked plot-critical or recurring.

## Invokes Agents

- production-designer
- continuity-supervisor

## Required Skills

- visual-style-development
- continuity-checking

## Process

1. For each prop, list every scene it appears in and every line of action
   that touches it; note first appearance, handoffs, and final disposition.
2. production-designer specifies the object: era, material, size relative to
   a hand, wear level, color, and the two or three visual anchors that must
   survive generation (the brass corner, the cracked screen).
3. continuity-supervisor builds the state timeline: custody (who carries it),
   condition, and visibility per scene — including scenes where its *absence*
   must read (the empty holster).
4. Flag hero moments where the prop needs an insert or close-up master image,
   and add those to the reference plan.
5. Validate each prop file and cross-check custody against character wardrobe
   (a prop carried in SC_009 must be on that character's person in SC_008's
   exit or its arrival must be staged).

## Outputs

- `production/props/<PROP_ID>/prop.yaml` — appearance, anchors, and state
  timeline; validates against `schemas/prop.schema.json`.
- `production/props/<PROP_ID>/refs/` — directory plus master-image plan;
  images arrive via `/visual-development`.

## Notes

- Be ruthless about scope: bible only what the story tracks. Over-cataloging
  dressing multiplies reference-generation cost with zero screen value.
- State timelines feed `/continuity-review` and the per-scene
  `continuity/scene-state.yaml` written by `/smart-shot`.
- Related: `/location-bible` (static dressing lives there),
  `/character-bible` (wardrobe-adjacent carries), `/reference-plan` (pulls
  hero-prop masters into shots).
