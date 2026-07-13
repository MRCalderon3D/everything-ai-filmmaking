---
name: video-generation
description: Generate shot clips through video providers using start/end frames, within duration and cost limits.
origin: everything-ai-filmmaking
category: generation
---

# Video Generation

## Purpose
Turn compiled prompt packages and approved keyframes into video clips, one per
shot, using each provider's real capabilities — start/end-frame conditioning,
duration caps, reference limits — with provenance and cost control throughout.

## Use When
- Shots have approved keyframes and validated prompt packages.
- A clip needs a controlled reroll (motion wrong, identity held).
- Choosing or switching video providers for a batch of shots.

## Inputs
- Prompt packages under `production/scenes/<SC_ID>/prompts/<provider>/`.
- Approved start/end keyframes from `production/generations/`.
- Provider capabilities (`manifests/video-providers.json`): veo, kling, runway,
  seedance, fal — maxDurationSeconds, referenceImages, startEndFrames, audio.

## Process
1. Match shots to providers by capability: shots needing start+end conditioning
   go only to providers with `startEndFrames: true`; shot duration plus handles
   must fit `maxDurationSeconds` — a longer shot must be split at a cut point
   by `shot-sequencing` first, never stretched or sped.
2. Prefer the start/end-frame workflow for every cut-matched clip: start frame
   pins identity, composition, and continuity at frame one; end frame pins the
   outgoing state so the next clip's start frame can match it. Text-to-video
   without frames is for drafts and unanchored inserts only.
3. Keep motion prompts about motion: the frames carry appearance; the text
   directs subject action, camera move, and pace. Re-describing appearance
   invites the model to repaint it.
4. Dry-run by default: write request spec + pending generation record; review
   duration, aspect, frames, references against the provider's caps.
5. Estimate batch cost (clips × duration × rate), get explicit confirmation,
   verify env vars, then run live; never log keys.
6. Reroll discipline: hold frames constant and vary motion text, or hold text
   and vary seed — one variable per attempt, logged. Three failures on one
   variable escalates to the keyframes or the package.
7. Write a generation record per clip (`GEN_<shot>_<attempt##>`): provider,
   model, prompt hash, frames and references used, seed, duration, cost.
8. Review each clip against the shot file (action, camera, screen direction)
   and its neighbors' boundary frames before marking it for continuity review.

## Outputs
- Clips and records under `production/generations/<shot>/`
  (`generation-record.schema.json`), flagged for `/continuity-review`.

## Quality Bar
- Every clip conditioned on approved frames where the cut requires matching.
- Duration, aspect, and reference counts within provider capabilities.
- Full provenance per clip; cost confirmed before every live batch.
- Boundary frames of adjacent clips are match-cut compatible.

## Common Failure Modes
- Text-to-video for cut-matched shots, then hoping the edit hides the seams.
- Exceeding provider duration by slowing footage instead of splitting the shot.
- Motion prompts that restate identity, causing mid-clip face drift.
- Rerolling entire batches when one clip failed.

## Related Agents
- video-generation-specialist
- prompt-director

## Related Commands
- /generate-clips

## Notes
Clip boundaries follow edit cut points (see `rules/video/clip-boundaries`).
Generate in sequence order so each end frame can seed its successor's start.
