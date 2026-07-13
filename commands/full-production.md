---
description: Orchestrate the entire pipeline from script to edit plan, with approval gates and cost confirmation.
---

# /full-production

## Purpose

Run the whole pipeline as one supervised production: script analysis, bibles,
scene breakdown, per-scene smart-shot packages, keyframes, clips, continuity
review, and the edit plan — pausing at every phase boundary for approval and
before every generation batch for cost confirmation. The showrunner drives;
production-qa refuses to let a phase start on unapproved upstream work.

## Use When

- A project has `project.yaml` and a script, and you want the scaffold to
  carry it end to end with you approving at the gates.
- Resuming a stalled production — phase state is detected from the workspace
  and the run continues from the first incomplete gate. A total generation
  estimate is projected from shot counts before any provider is called.

## Inputs

- `script` (path, optional, default `production/story/script.fountain`).
- `scenes` (list, optional): restrict production to a subset of `SC_###`.
- `budget_cap` (currency, optional): hard ceiling; the run pauses when the
  projected spend of the next batch would cross it.
- `stop_after` (string, optional): phase to halt at (e.g. `bibles`).

## Invokes Agents

- showrunner
- production-qa

## Required Skills

- production-orchestration

## Process

1. **Preflight.** production-qa validates the workspace, provider configs,
   and env vars for the chosen providers; report gaps before starting.
2. **Phase 1 — Script.** Run `/script-analyze`. **Gate:** structure, beats,
   and entity inventory approved by the user.
3. **Phase 2 — Bibles.** Run `/story-bible`, then `/character-bible`,
   `/location-bible`, `/prop-bible`, `/style-bible`; then
   `/visual-development` for master references — **cost confirmation**
   before its image batches. **Gate:** all bibles and masters approved;
   nothing downstream may bind to a draft.
4. **Phase 3 — Scenes.** Run `/scene-breakdown` across the scene set.
   **Gate:** breakdowns approved.
5. **Phase 4 — Shots.** Run `/smart-shot` per scene, in script order so each
   scene's continuity boundary state feeds the next. **Gate:** review
   storyboards and shot purposes per scene; this is the last free stop
   before generation.
6. **Phase 5 — Keyframes.** Run `/generate-keyframes` per scene with **cost
   confirmation per batch**; selections reviewed as they land.
7. **Phase 6 — Clips.** Run `/generate-clips` per scene with **cost
   confirmation per batch** and the `budget_cap` enforced against running
   spend from generation records.
8. **Phase 7 — Continuity.** Run `/continuity-review` across all scenes;
   route fixes to the cheapest owning layer and re-run the affected slice.
   **Gate:** no open blockers.
9. **Phase 8 — Edit.** Run `/edit-plan`. **Gate:** the plan is the final
   deliverable; showrunner presents it with total spend vs. estimate.
10. After every phase, write progress to `project.yaml` so an interrupted
    run resumes at the correct gate, never re-spending completed work.

## Outputs

Everything the constituent commands produce, across the whole workspace —
notably `production/project.yaml` (phase state, `schemas/project.schema.json`),
`production/story/story-bible.yaml`, all bible directories, per-scene packages
under `production/scenes/SC_###/`, `production/generations/` records
(`schemas/generation-record.schema.json`), `production/continuity/continuity-state.yaml`
(`schemas/continuity-state.schema.json`), and `production/edit/edit-plan.yaml`
with `timeline.md`. See each constituent command's Outputs for full schemas.

## Notes

- **Cost warning:** phases 2 (visual development), 5, and 6 spend real
  money. Every batch shows its estimate and waits; dry-run remains the
  default at every layer, and `budget_cap` is a hard stop, not a suggestion.
- Gates are not ceremony: approving a phase freezes its artifacts as the
  source of truth for the next; skipping review upstream is how money gets
  burned downstream. For a first project, run the individual commands by
  hand to learn the artifacts, then use this for subsequent productions.
- Related: every other command in `commands/` — this one only orchestrates;
  it authors nothing itself.
