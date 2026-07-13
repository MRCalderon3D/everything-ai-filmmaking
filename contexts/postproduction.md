# Context: Postproduction

The assembly phase. Accepted clips become a film: edit order and pacing,
dialogue conform, music cues, effects layers, and color notes — all as
structured plans that a human editor executes or verifies in an NLE.

## Goals

- An approved edit plan (`production/edit/edit-plan.yaml` + `timeline.md`):
  assembly order, in/out points inside clip handles, pacing rationale.
- Complete sound plan: dialogue conformed, cue sheet finished with license
  status per cue, effects layers with sync points per scene.
- Color notes per scene tied to the style bible's palette discipline.

## In Scope

- Edit planning, cut-point selection within handles, transition choices.
- Music generation/licensing, SFX generation and layering, mix notes.
- Targeted regeneration requests when a cut exposes a defect — routed back
  as production tasks with the standard cost gates, not run ad hoc here.
- Out of scope: new shots or canon changes without a preproduction pass.

## Typically Active

- Commands: `/edit-plan`, `/continuity-review` (cut-order pass),
  `/generate-clips` (only for approved fix-ups).
- Agents: editor, sound-designer, colorist, continuity-supervisor.
- Rules in force: `common/`, `video/clip-boundaries.md` (joins under the
  cut), `audio/` (dialogue, music, sound-effects),
  `visual/visual-language.md` for color notes.

## Exit Criteria → Review

- Edit plan `approved`; every timeline entry resolves to an accepted clip
  and cuts land inside available handles (`scripts/validate.js` clean).
- Cue sheet complete — no `unknown` licenses, no cue still marked `temp`
  without a replacement plan; SFX sync points conformed to final clip
  timing.
- Cross-cut continuity pass (`scripts/check-continuity.js` in cut order)
  clean or waived in writing by the continuity-supervisor.
