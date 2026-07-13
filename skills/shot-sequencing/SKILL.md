---
name: shot-sequencing
description: Order coverage into a cuttable sequence — axis discipline, cut points, screen direction, and shot-to-shot flow.
origin: everything-ai-filmmaking
category: production
---

# Shot Sequencing

## Purpose
Turn a set of designed shots into a sequence that cuts: correct order, legal
axis behavior, motivated cut points, consistent screen direction, and clean
handoffs of entrances and exits between shots.

## Use When
- Assembling a shot list from cinematography decisions.
- `/smart-shot` needs shots ordered, timed, and joined.
- A sequence feels disorienting — reverses flip, movement jumps, geography breaks.

## Inputs
- Shot files `production/scenes/<SC_ID>/shots/SH_*.yaml` with camera blocks.
- `blocking.yaml` axes, eyelines, and entrance/exit directions.
- Scene tension curve from the story bible for pacing intent.

## Process
1. Order shots by dramatic logic, not shooting logic: establish geography
   before close coverage unless withholding it is the point; re-establish
   after any spatial change (entrance, big move, axis reset).
2. Enforce the 180° rule per axis: all coverage of an interaction stays on the
   recorded side of `AXIS_<scene>_<letter>`; crossing requires a neutral shot
   on the axis, a shot that tracks across it, or a new establishing view.
3. Enforce the 30° rule: consecutive shots of the same subject differ by at
   least 30 degrees or a full shot size, or the cut will read as a jump.
4. Set screen direction: a character exiting frame right enters the next shot
   frame left; travel direction persists across the sequence until a turn is
   shown on screen. Record per-shot direction for the continuity audit.
5. Choose cut points on motion, look, or sound: cut where the eye is already
   moving (a head turn, a reach, a door) and on reaction rather than after it;
   an eyeline out of frame licenses the cut to what is seen.
6. Wire neighbors: every shot declares `enters_from` and `exits_to`, and where
   a subject leaves one shot mid-action the next shot's start state must match
   (same hand, same door position, same stride phase).
7. Assign timing with handles: intended on-screen duration plus head/tail
   handles for the edit; verify total against the scene's target duration.
8. Read the sequence as rhythm: shot lengths should track the tension curve —
   shorten toward peaks, hold long when the audience must sit in a moment.

## Outputs
- Ordered, timed shot files with `order`, screen direction, axis reference,
  and neighbor links (`shot.schema.json`); flat index `production/shots/shots.yaml`.

## Quality Bar
- No axis crossing without a legal transition shot.
- No pair of adjacent same-subject shots inside 30°/same-size.
- Screen direction is stated per shot and consistent across cuts.
- Every shot has neighbors, timing, and a cut-point rationale.

## Common Failure Modes
- Coverage ordered as shot-listed (master, then all singles) instead of as cut.
- Reverses generated from opposite axis sides, flipping eyelines.
- Exits and entrances in the same screen direction, reading as a chase of oneself.
- Uniform 4-second shots regardless of tension, flattening the scene.

## Related Agents
- shot-planner
- cinematographer
- editor

## Related Commands
- /shot-list
- /smart-shot

## Notes
Sequencing decisions are exactly what `continuity-checking` audits and what
`edit-planning` refines. Clip boundaries for video generation follow cut
points, never the other way around.
