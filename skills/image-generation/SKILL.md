---
name: image-generation
description: Generate stills and keyframes through image providers with dry-run, seed, provenance, and cost discipline.
origin: everything-ai-filmmaking
category: generation
---

# Image Generation

## Purpose
Execute compiled prompt packages against image providers to produce reference
sheets, plates, and shot keyframes — reproducibly, with full provenance, and
without spending money that wasn't approved.

## Use When
- Generating start/end keyframes for shots before clip generation.
- Rendering character sheets, location plates, or style plates.
- Rerolling a specific failed image with controlled variation.

## Inputs
- Validated prompt packages (`prompt-package.schema.json`) with reference plans.
- Provider adapter and capabilities: fal, replicate, comfyui, or harness-native
  (`manifests/image-providers.json`; env vars per provider).
- Approval status and batch scope from the orchestrator.

## Process
1. Pick the provider per task: reference-image support and identity fidelity
   for keyframes; resolution and cost for plates; harness-native for
   zero-API-cost work when the harness generates images itself (Codex:
   gpt-image on the user's subscription — attach the plan's references as
   input images). Check capabilities, not vibes.
2. Dry-run first — always the default: write the request spec and a pending
   generation record, call no network, and review what would be sent.
3. Estimate cost for the batch (count × per-image rate) and obtain explicit
   confirmation before any live call; missing env vars abort, never prompt for keys.
4. For shot keyframes, generate the start frame first; lock it, then generate
   the end frame conditioned on the same references so the pair is consistent
   enough for start/end-frame video conditioning.
5. Record the seed of every result. Reroll discipline: same seed + edited
   prompt isolates the prompt variable; new seed + same prompt samples the
   space. Change one variable at a time and log which.
6. Write a generation record per output (`GEN_<shot>_<attempt##>`): provider,
   model, prompt package hash, references used, seed, cost, timestamp.
7. Evaluate against the reference plan's omission risks before accepting;
   route candidate masters into review — nothing self-approves.
8. Stop conditions: three failed rerolls on the same variable means the
   package or plan is defective — escalate upstream, don't keep paying.

## Outputs
- Images under `production/generations/<shot>/` (or bible `refs/` for sheets)
  with one generation record each (`generation-record.schema.json`).

## Quality Bar
- No live call without dry-run review and cost confirmation.
- Every image has a complete generation record; orphan media is a defect.
- Keyframe pairs share references and read as the same shot's two moments.
- Seeds logged so any result can be reproduced or minimally varied.

## Common Failure Modes
- Rerolling with new seed and new prompt at once — learning nothing.
- Accepting an image that ignores its reference plan because it looks good.
- Generating end frames unconditioned, making clips impossible to bridge.
- Silent live runs inside loops, burning budget without a gate.

## Related Agents
- image-generation-specialist
- prompt-director

## Related Commands
- /generate-keyframes

## Notes
`scripts/generate-assets.js` wraps the provider adapters and enforces dry-run
and env-var rules. Approved outputs become immutable; supersede with `_V##`.
