# Cost Control

## Purpose

Prevent surprise spend. Generation calls cost real money per second and per
image; every live call is a deliberate, estimated, confirmed decision.

## Scope

All layers. Applies to every provider call (image, video, audio), every
script that can trigger generation, and every agent that plans batches.

## Core Principles

- Dry-run is the universal default. Live generation is always an explicit
  opt-in, never an implied consequence of another command.
- Estimate before execute. No batch runs without a cost estimate shown and
  confirmed.
- Cheap first: validate composition and continuity with the cheapest useful
  medium (text, boards, single stills) before spending on video.

## Dry-Run Default

- Every provider's `generate` MUST default to `dryRun: true`, writing the
  request spec and a pending generation record with an estimated cost and
  making no network call.
- Live generation requires the `--live` flag AND the provider's required env
  vars. Missing env vars MUST abort, never silently fall back to another
  provider. API keys are NEVER logged or written into records.

## Batch Estimates and Confirmation

- Before any live batch, the agent MUST present: item count, provider and
  model per item, per-item and total estimated cost, and the reference plan
  status of each item — then wait for explicit confirmation.
- Confirmation scales with cost. At zero external cost (harness-native,
  manual, local providers) there is no spend to confirm: the agent INFORMS
  ("generating 1 variant, no external cost") and proceeds — asking a user to
  "confirm USD 0.00" is ceremony, not protection. Everything else about the
  run (plan first, provenance, review) is unchanged.
- `hooks/require-cost-confirmation.js` enforces this gate; bypassing it is
  NEVER acceptable, including for "just one more" additions to a confirmed
  batch. New items mean a new estimate.
- Estimates use per-provider pricing awareness: video is priced per second of
  output, images per generation, audio per character or second. When pricing
  is unknown, the agent MUST say so and treat the item as high-cost.
- Batches SHOULD be ordered cheapest-signal-first: generate one probe item,
  review, then release the remainder.

## Reroll Budgets

- Each shot has a reroll budget (default 3 attempts per stage, image or
  video). Exceeding it requires human sign-off recorded in the shot file.
- Repeated failure is a planning defect: after two failed attempts the agent
  MUST revise the prompt package or reference plan rather than reroll
  unchanged inputs.
- Rerolls of approved shots (already `approved` status) always require human
  confirmation regardless of budget remaining.

## Validation

- `hooks/require-cost-confirmation.js` blocks unconfirmed live batches.
- `scripts/generate-assets.js` refuses `--live` without required env vars and
  writes the estimate into each generation record.
- `scripts/validate.js` flags shots whose attempt count exceeds the reroll
  budget without a recorded sign-off.
- Spend reports from generation records are reviewed by a human at each phase
  gate (see `contexts/`).
