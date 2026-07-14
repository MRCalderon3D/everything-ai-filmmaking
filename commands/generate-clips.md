---
description: Generate video clips per shot via video providers, gated by cost confirmation and keyframe approval.
---

# /generate-clips

## Purpose

Execute the most expensive step in the pipeline: turn each shot's prompt
package — and its approved keyframes, where the provider supports frame
conditioning — into video clips, with a hard cost gate, full provenance per
attempt, and disciplined review against the shot's stated purpose, camera
spec, and continuity fields.

## Use When

- Shots have approved keyframes (or a deliberate, recorded decision to run
  text/reference-only) and validated prompt packages.
- Re-rendering specific failed shots after review — target by shot ID, never
  re-run a whole scene for one bad clip.
- A provider switch requires re-compiling and re-running affected shots.

## Inputs

- `scene` (ID or path, required): scene whose shots get clips; or
- `shot` (ID, optional): a single `SH_###_###` to (re)generate.
- `provider` (string, optional, default from `project.yaml`): video provider
  from `manifests/video-providers.json`.
- `attempts` (int, optional, default 1): candidates per shot — video is
  priced per attempt; keep this at 1 unless a shot is known-hard.
- `live` (flag, optional, default off): call the provider; dry-run otherwise.

## Invokes Agents

- video-generation-specialist
- prompt-director

## Required Skills

- video-generation
- prompt-compilation

## Process

1. Verify prerequisites per shot: prompt package valid against the schema,
   duration within the provider's `maxDurationSeconds`, aspect ratio
   supported, keyframes approved where conditioning is planned. Failures
   block that shot, not the batch.
2. prompt-director finalizes each request: motion language per the
   motion-language rule (subject motion, camera motion, and speed stated
   separately), start/end frames attached where supported, negative-style
   terms from the style bible.
3. **Cost gate:** estimate the batch (shots × attempts × duration × provider
   rate), present the per-shot table and total, and require explicit
   confirmation. Dry-run writes request specs and pending records only.
4. Generate sequentially or in provider-safe parallel; write a generation
   record per attempt with provider, model, prompt hash, references,
   duration, cost, timestamp.
5. video-generation-specialist reviews each clip against the shot file:
   purpose lands, camera spec obeyed (size, movement, speed), identity holds
   against masters, screen direction and axis correct, no boundary artifacts
   in the handles.
6. Verdict per clip: `select`, `re-roll` (with a corrected prompt and stated
   reason — max two re-rolls before escalating upstream to keyframe,
   reference plan, or shot design), or `defer` for the user. Selected clips
   are marked `review` for user approval.

## Outputs

- `production/generations/<SH_ID>/GEN_<shot>_<attempt##>/` — clip media plus
  `generation-record.yaml`, each record validating against
  `schemas/generation-record.schema.json`.
- `production/scenes/SC_###/shots/SH_*.yaml` — updated selected-take
  bindings; validates against `schemas/shot.schema.json`.

## Notes

- **Cost warning:** this is the budget's center of gravity. Dry-run is
  always the default; live runs never start without the printed estimate
  being confirmed. Fix problems at the cheapest layer that owns them —
  prompt < keyframe < reference < shot design.
- Never blame the model twice: a second identical failure means the input
  package is wrong.
- **Manual generation (`--provider manual`)**: for web UIs the scaffold has
  no API for (Higgsfield and similar). Per shot, the command delivers a
  handoff: the final prompt (motion-first — the lens look rides in the
  keyframes), the start/end frames and reference image files to upload with
  their exact paths and priority order, duration, and aspect ratio. The
  user pastes, generates, downloads the clip into the shot's `generations/`
  directory, and the record is completed like any API run — provenance is
  not optional because the API was a browser.
- Run `/continuity-review` after each scene's clips before approving; an
  approved clip is immutable and only superseded by a new version.
- Related: `/generate-keyframes` (upstream), `/continuity-review` (audit),
  `/edit-plan` (assembly of selected takes).
