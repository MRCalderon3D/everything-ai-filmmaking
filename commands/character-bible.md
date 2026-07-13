---
description: Define identity, wardrobe states, and reference-sheet plans for every character.
---

# /character-bible

## Purpose

Create the per-character canon that makes identity consistency possible:
physical description locked to specific, promptable attributes; wardrobe
broken into per-scene states; and a reference-sheet plan (the exact angles,
expressions, and outfits that must exist as approved master images before any
shot featuring the character is generated).

## Use When

- After `/script-analyze` has assigned `CHAR_*` IDs and `/story-bible` has
  settled backstory and arcs.
- A character's look is drifting across generations and needs a tighter,
  more prescriptive definition.
- A new character enters in a rewrite and needs a bible entry before shots.

## Inputs

- `character` (ID, optional): a single `CHAR_*` ID to build or rebuild;
  default is every character in the script analysis.
- `detail` (string, optional, default `principal`): `principal` (full sheet
  plan) | `supporting` (identity + one wardrobe state) | `background`
  (grouped, description only).

## Invokes Agents

- character-designer
- screenwriter

## Required Skills

- character-consistency
- character-sheet-generation

## Process

1. Pull every scene the character appears in; list wardrobe, injuries, dirt,
   and prop-carry changes scene by scene — continuity state starts here.
2. screenwriter writes the interior: want, wound, status, how they move and
   hold their eyes. This drives posture and expression in every prompt later.
3. character-designer locks the exterior in promptable terms: age, build,
   skin, hair (cut, color, texture), distinguishing marks, and the three or
   four invariant anchors that must survive every generation (e.g. the scar,
   the widow's peak, the heavy brow).
4. Define wardrobe states with IDs and the scenes each covers; note the exact
   moment of every change (torn sleeve in SC_007, coat lost in SC_012).
5. Write the reference-sheet plan: which master images are required
   (face front/three-quarter/profile, full body per wardrobe state, key
   expressions), named `CHAR_<NAME>_<VIEW>_MASTER_V##`.
6. Validate character and wardrobe files; mark `review`.

## Outputs

- `production/characters/<CHAR_ID>/character.yaml` — validates against
  `schemas/character.schema.json`.
- `production/characters/<CHAR_ID>/wardrobe.yaml` — validates against
  `schemas/wardrobe.schema.json`.
- `production/characters/<CHAR_ID>/refs/` — empty directory plus the sheet
  plan; images arrive via `/visual-development`.

## Notes

- No images are generated here — this command is free. Sheet images are
  produced by `/visual-development` and cost-gated there.
- Anchors are the contract: `/continuity-review` checks generated frames
  against the anchor list, so keep them few, visible, and unambiguous.
- Related: `/story-bible` (upstream), `/visual-development` (renders the
  sheets), `/reference-plan` (consumes the approved masters).
