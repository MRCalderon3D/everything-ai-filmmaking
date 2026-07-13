---
name: storyboard-generation
description: Render the shot list as boards — one framed panel per shot with composition and motion notes.
origin: everything-ai-filmmaking
category: production
---

# Storyboard Generation

## Purpose
Make the planned sequence visible before paying for generation: one panel per
shot showing framing, subject placement, eyeline, and movement, so composition
and cutting problems are caught on paper, not in rendered clips.

## Use When
- A scene's shot list is sequenced and needs visual verification.
- `/smart-shot` produces a proposal that must be reviewable at a glance.
- A shot's composition is disputed and a drawn/generated frame will settle it.

## Inputs
- Ordered shots `production/scenes/<SC_ID>/shots/SH_*.yaml` and `blocking.yaml`.
- Location plates and character sheets for likeness in panels.
- Style bible for aspect ratio and any board rendering treatment.

## Process
1. Create one panel per shot in cut order, in the project aspect ratio;
   movement within a shot may take start/end sub-panels.
2. Compose each panel from the shot's camera block: size, angle, and height
   must be readable from the drawing — a described-but-not-drawn low angle is
   a defect.
3. Place subjects per blocking, with eyelines drawn as sight arrows; reverse
   pairs must show mirrored looks that will cut together.
4. Annotate motion with arrows: subject paths solid, camera moves labeled
   (PUSH, PAN L, TRACK R) — never both unlabeled.
5. Caption each panel: shot ID, size/lens shorthand, one-line action, timing.
6. Boards may be generated as images (dry-run rules apply) or drafted as
   text-composition panels; either way panels are boards, not final frames —
   loose, fast, and disposable beats polished and slow.
7. Flip through the sequence checking cut logic: geography, screen direction,
   size progression; flag problems back to `shot-sequencing` rather than
   fixing them silently in the drawing.
8. Assemble `storyboard.md` with panels in order and a header linking scene,
   axis map, and version.

## Outputs
- `production/scenes/<SC_ID>/storyboard/storyboard.md` plus panel images in
  the same directory; generation records for any generated panels.

## Quality Bar
- Panel framing matches the shot file's size, angle, and height.
- Eyelines and screen direction are drawn, not implied.
- Every panel captions its shot ID and timing; boards and shot files never disagree.
- The flipped sequence reads as continuous space to a cold viewer.

## Common Failure Modes
- Beautiful panels that ignore the camera block they illustrate.
- Boards drawn from imagination instead of the blocking and location map.
- Panels missing arrows, so movement direction is invented at generation time.
- Treating boards as final frames and polishing instead of iterating the plan.

## Related Agents
- storyboard-artist
- visual-director
- cinematographer

## Related Commands
- /storyboard
- /smart-shot

## Notes
When boards and shot files conflict, the shot file is the contract — update it
deliberately or fix the board. Boards are the cheapest place in the whole
pipeline to change your mind.
