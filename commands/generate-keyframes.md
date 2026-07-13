---
description: Generate start/end keyframes for shots via image providers, with cost confirmation and provenance.
---

# /generate-keyframes

## Purpose

Produce the still frames that anchor each shot before video generation:
start frames, end frames for shots whose provider supports first/last-frame
conditioning, and hero stills for inserts. Keyframes are the cheap rehearsal
for expensive clips — identity, composition, and light get approved here in
stills before any video budget is spent.

## Use When

- A scene has a complete `/smart-shot` package (or shots + reference plan +
  prompts assembled manually) and its masters are approved.
- A clip attempt failed on composition or identity — regenerate the keyframe
  first; never re-roll video against a bad still.
- The video provider supports `startEndFrames` and shots need end-frame
  targets for controlled motion.

## Inputs

- `scene` (ID or path, required): scene whose shots get keyframes; or
- `shot` (ID, optional): a single `SH_###_###` to (re)generate.
- `provider` (string, optional, default from `project.yaml`): image provider
  from `manifests/image-providers.json`.
- `variants` (int, optional, default 2): candidates per keyframe slot.
- `live` (flag, optional, default off): call the provider; dry-run otherwise.

## Invokes Agents

- image-generation-specialist
- prompt-director

## Required Skills

- image-generation
- prompt-compilation
- reference-selection

## Process

1. Collect target shots and verify prerequisites hard: prompt package
   present, reference plan resolved, every referenced master approved.
   Missing prerequisites stop the batch — no freehand generation.
2. prompt-director adapts each prompt package for still generation:
   compose for the shot's *start* state (and end state where end frames are
   needed), strip motion language, keep camera and light language intact.
3. **Cost gate:** estimate the batch (slots × variants × provider rate),
   present shots, counts, and total, and require explicit confirmation.
   Dry-run writes request specs and pending generation records only.
4. Generate; write a generation record per attempt (provider, model, prompt
   package hash, references used, cost, timestamp).
5. image-generation-specialist reviews candidates against the reference
   plan: identity anchors hold, geometry matches the location map, palette
   and light obey the LOOK. Select one per slot or targeted re-roll
   (maximum two rounds, then escalate to the reference plan or bible).
6. Attach selected keyframes to their shots, mark them `review`, and report
   the batch: spent vs. estimate, selections, open re-rolls.

## Outputs

- `production/generations/<SH_ID>/GEN_<shot>_<attempt##>/` — images plus
  `generation-record.yaml`, each record validating against
  `schemas/generation-record.schema.json`.
- `production/scenes/SC_###/shots/SH_*.yaml` — updated keyframe bindings;
  validates against `schemas/shot.schema.json`.

## Notes

- **Cost warning:** paid command; dry-run is the default and the estimate
  is always shown before a live run. Keyframes are cheap relative to clips —
  spending an extra variant here routinely saves a clip re-render.
- Never hand-edit generated frames; supersede via re-roll so provenance
  stays truthful.
- Approved keyframes become conditioning inputs for `/generate-clips` on
  providers with `startEndFrames`.
- Related: `/smart-shot` (builds the package), `/reference-plan`
  (what each frame conditions on), `/generate-clips` (next step),
  `/continuity-review` (audits selected frames).
