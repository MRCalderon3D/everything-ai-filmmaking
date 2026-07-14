# Research: platform prompt dialects (Higgsfield, Gemini image)

Date: 2026-07-14 · Sources reviewed: two MIT-licensed community knowledge
bases, adapted with attribution —
[OSideMedia/higgsfield-ai-prompt-skill](https://github.com/OSideMedia/higgsfield-ai-prompt-skill)
(v3.20, a deep Higgsfield platform skill) and
[AgriciDaniel/banana-claude](https://github.com/AgriciDaniel/banana-claude)
(v1.4, Claude-as-creative-director for Gemini Nano Banana). This document
records what was adopted and why; the scaffold's own rules and libs are the
normative home.

## Adopted from higgsfield-ai-prompt-skill

- **MCSLA prompt order** (Model · Camera · Subject · Look · Action) — the
  platform's canonical five-layer structure. Reflected in the `manual`
  provider's handoff instructions.
- **I2V discipline**: in image-to-video, describe ONLY what moves or changes
  — never what the conditioning image already shows. This matched and
  strengthened our keyframe-only policy: `compile-prompts.js` now emits
  motion-first prompts (no shot size/angle, no bible identity/set/style
  lines) for keyframe-conditioned video providers (runway, manual).
- **Artifact-prevention table** → `rules/video/motion-language.md`: limb
  merging at close contact (keep arm's length or cut around), ~3 tracked
  characters maximum (exited frame = gone), named technique moves render
  wrong (describe outcome, not technique), slow-mo-then-speed-up for fast
  action.
- **Reroll protocol**: change exactly ONE variable per regeneration; triage
  failures subject → action → camera → style → audio → output
  (→ `rules/video/video-generation.md`).
- **No-negative-prompt engines** (Seedance-class): prevention phrased
  positively in the main prompt; the seedance provider drops
  `negative_prompt` and flags it in the record meta.
- **Snapshot staleness pattern**: their specs carry a snapshot date with a
  verify-live rule past 30 days. Provider manifests now carry
  `snapshot_date`; `doctor.js` warns when stale.
- Their generic-emotion decomposition ("never 'sad' — muscles, breath,
  eyes") independently converges with `skills/performance-direction`.

## Adopted from banana-claude

- **Gemini image provider** (`providers/image/gemini.js`, Nano Banana,
  `GOOGLE_API_KEY` shared with Veo): reference images as inline parts,
  bounded 429/5xx backoff, and safety-block handling that routes to a
  rephrase-and-reroll instead of blind retries.
- **Narrative-prose dialect**: Google's own guidance — Gemini image prompts
  are written as scene sentences, never keyword lists
  (→ `skills/prompt-compilation` notes).
- Their "creative director: never pass raw user text to the API" principle
  converges with our compile-from-canon rule.

## Deliberately not adopted

- Higgsfield's 100+ sub-skill routing system and learning ledgers — our
  scaffold compiles prompts from canon rather than coaching free-form
  prompting; the knowledge worth keeping is distilled into rules and libs.
- banana-claude's preset system and cost dashboards — the style bible /
  LOOK_* registry and generation-record provenance already cover both with
  stricter discipline.
