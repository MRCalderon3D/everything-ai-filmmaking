# Context: Production

The generation phase. Plans become pixels: keyframes first, then clips,
scene by scene, with continuity state updated after every scene. This is
where the money is spent, so cost gates and reference discipline are at
their strictest.

## Goals

- Approved keyframes per shot, including shared boundary frames for every
  clip join (`video/clip-boundaries.md`).
- Accepted clips per shot within reroll budgets, each with a complete
  generation record (`GEN_<shot>_<attempt##>`).
- Continuity state (`production/continuity/`) updated and reviewed after
  each scene before the next scene is batched.

## In Scope

- Prompt compilation, keyframe generation, clip generation, per-scene
  continuity updates, reroll triage (revise plan after two failed attempts).
- Dialogue TTS generation MAY start here for lip-sync-critical shots.
- Out of scope: editing decisions beyond boundary needs, music, color;
  changing canon — bible changes route back through preproduction.

## Typically Active

- Commands: `/reference-plan` (amendments), `/generate-keyframes`,
  `/generate-clips`, `/continuity-review`, `/full-production` (orchestrated
  runs).
- Agents: prompt-director, image-generation-specialist,
  video-generation-specialist, continuity-supervisor, production-qa,
  showrunner (orchestration).
- Rules in force: `common/` (cost-control at maximum strictness), `visual/`,
  `image/`, `video/`; `audio/dialogue.md` where TTS starts.

## Exit Criteria → Postproduction

- Every planned shot has an accepted clip (or a documented, human-approved
  omission); no orphan media — `scripts/validate.js` clean on records.
- `scripts/check-continuity.js` clean per scene and globally; drift flags
  from `hooks/detect-continuity-drift.js` resolved or waived in writing.
- Spend reconciled against estimates from generation records; overruns
  acknowledged by a human.
- Continuity-supervisor sign-off on the global continuity state.
