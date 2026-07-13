---
name: character-sheet-generation
description: Produce reference sheets — turnarounds, expressions, wardrobe — that become approved identity masters.
origin: everything-ai-filmmaking
category: visual
---

# Character Sheet Generation

## Purpose
Convert a locked character identity into a set of reference images — face
master, turnaround, expression sheet, wardrobe sheets — that downstream shots
cite instead of re-describing the character in text.

## Use When
- A character bible entry is approved and needs visual masters.
- A new wardrobe state or identity version needs its own sheet.
- Existing masters are too weak (wrong angle coverage, baked-in lighting) to hold identity.

## Inputs
- `production/characters/<CHAR_ID>/character.yaml` and `wardrobe.yaml`.
- Style bible (`LOOK_*`) for rendering treatment, applied only to flexible traits.
- Image provider capabilities from `manifests/image-providers.json`.

## Process
1. Plan the sheet set: face master (front, slight 3/4), full turnaround
   (front / 3/4 / profile / back), expression sheet (6–8 core emotions),
   one full-body sheet per wardrobe state.
2. Compile prompts from the identity block via `prompt-compilation` — canonical
   phrasing only, no freehand embellishment.
3. Render masters under neutral, even lighting on a plain background; dramatic
   lighting bakes shadows into identity and poisons every downstream shot.
4. Generate candidates (dry-run first), then select for cross-angle identity
   agreement — same face at 3/4 and profile beats a prettier inconsistent set.
5. Reroll only the failing panel, holding seed and prompt for the rest.
6. Name results `CHAR_<NAME>_FACE_MASTER_V##`, `CHAR_<NAME>_TURN_V##`,
   `CHAR_<NAME>_WARDROBE_##_FULL`; write a generation record for each.
7. Submit for review; on approval, register in `production/references/manifest.yaml`
   and mark immutable.

## Outputs
- Reference images in `production/characters/<CHAR_ID>/refs/` and approved
  masters in `production/references/` with `manifest.yaml` entries.
- One generation record per image (`generation-record.schema.json`).

## Quality Bar
- Face is recognizably the same person across every angle and expression.
- Neutral lighting, plain background, no crops that hide identity anchors.
- Every wardrobe state in wardrobe.yaml has a corresponding sheet.
- Every image has provenance; nothing unrecorded enters `references/`.

## Common Failure Modes
- Cinematic lighting on masters, forcing that mood into all future shots.
- Accepting a beautiful front view whose profile is a different person.
- Rerolling the whole sheet when one panel fails, losing hard-won identity.
- Skipping approval and citing draft sheets from reference plans.

## Related Agents
- character-designer
- visual-director
- image-generation-specialist

## Related Commands
- /character-bible
- /visual-development

## Notes
Masters are the identity ground truth `reference-selection` distributes to
shots. Superseding a master (`_V04`) requires re-checking every reference plan
that cited the old version.
