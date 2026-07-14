# Image Generation

## Purpose

Make still generation (masters, keyframes, storyboard frames) reproducible
and canon-anchored: references before prompts, schemas before providers,
records for everything.

## Scope

Image layer (visual layer rules also apply). Governs every image provider
call — fal, replicate, comfyui, harness-native — and the prompt packages,
reference plans, and generation records around them.

## Core Principles

- No prompt without a reference plan. No generation without a validated
  prompt package. No output without a generation record.
- Prompts are compiled from canon, never freehanded in a provider UI or ad
  hoc tool call.
- Determinism where possible: record everything needed to re-run the same
  generation.

## Reference Plans First

- Every shot or asset generation MUST have an approved reference plan
  (`reference-plan.schema.json`) before any prompt is written, listing the
  exact approved masters used: identity (`CHAR_*`), wardrobe, set geometry
  (`LOC_*_C#`), props (`PROP_*`), and look (`LOOK_*`).
- A plan that only implements the user's immediately-given instructions is
  approved BY those instructions (`common/ask-dont-assume.md`) — generate
  and present the result; do not ask the user to bless their own words.
- Reference plans cite only `approved` masters (see
  `common/approval-policy.md`); a plan citing a draft fails validation.
- When the provider accepts fewer reference images than the plan lists, the
  plan declares the priority order — identity first, then wardrobe, set,
  look — and records which references were dropped.

## Prompt Packages

- Prompts are compiled by `scripts/compile-prompts.js` into packages
  validated against `schemas/prompt-package.schema.json`, one package per
  provider, stored under `prompts/` or `scenes/<SC_ID>/prompts/<provider>/`.
- A package binds: shot or asset ID, prompt text, negative prompt where
  supported, reference image list from the plan, aspect ratio, resolution,
  and provider parameters. Its hash is what generation records cite.
- Image prompts carry the full lens language (`scripts/lib/lens-language.js`):
  FLUX-class models are lens-literal — a concrete "35mm lens, f/1.4, shallow
  depth of field" outperforms vague quality words — and keyframes are where
  the lens look MUST live for keyframe-conditioned video providers that
  ignore lens tokens in their own prompts.
- Aspect ratio and resolution MUST be within the provider's declared
  `capabilities`; `compile` MUST fail on unsupported values rather than
  silently clamp.
- Editing compiled packages by hand is forbidden — change the sources and
  recompile (see `common/source-of-truth.md`).

## Execution and Reproducibility

- Dry-run is the default; `--live` and env vars per
  `common/cost-control.md`.
- The harness-native path (Codex generating with gpt-image on the user's
  subscription, an MCP image tool, or a human) follows every rule above:
  package compiled first, the plan's references attached as input images,
  and the generation record completed after the tool call. Zero marginal
  cost does not waive provenance, reference discipline, or approval flow.
- Seeds MUST be recorded in the generation record whenever the provider
  exposes them; reroll attempts vary the seed deliberately and record each
  one. Model version strings are recorded exactly.
- Keyframes intended as clip start/end frames MUST be generated at the video
  provider's target aspect ratio and MUST pass character/location/spatial
  checks before the clip is attempted (see `video/video-generation.md`).
- Upscales and edits are derived assets with lineage per
  `common/asset-provenance.md`.

## Validation

- `scripts/validate.js` schema-checks reference plans and prompt packages,
  verifies plans cite only approved masters, and checks package parameters
  against provider capabilities in `manifests/image-providers.json`.
- `scripts/generate-assets.js` refuses to run a package with no approved
  reference plan.
- `hooks/require-cost-confirmation.js` gates live batches;
  `hooks/validate-after-write.js` re-validates packages on write.
- Output quality and canon fidelity are human review against the masters
  before approval.
