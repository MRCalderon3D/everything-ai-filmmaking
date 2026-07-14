# Research: lens language for the AI filmmaking pipeline

Date: 2026-07-14 · Method: multi-angle web research with 3-vote adversarial
verification per claim (deep-research harness, 106 agents). This document
grounds `scripts/lib/lens-language.js`, the `lens_kit` field in
`schemas/project.schema.json`, and the per-shot lens fields in
`schemas/shot.schema.json`.

## Verified findings

### Provider behavior (drives the compiler's per-provider policy)

- **Veo 3/3.1 (Google) is lens-token-friendly and prescriptive.** The
  official guides document `shallow depth of field`, `wide-angle lens`,
  `soft focus`, `macro lens`, `deep focus` as controllable vocabulary and
  prescribe the formula `[Cinematography] + [Subject] + [Action] + [Context]
  + [Style & Ambiance]` — cinematography FIRST, "the most powerful tool for
  conveying tone". Numeric focal lengths are also endorsed elsewhere in
  Google's Veo docs. Confidence: high (3-0 × 4).
  Sources: cloud.google.com Veo 3.1 prompting guide, deepmind.google/models/veo/prompt-guide, ai.google.dev/gemini-api/docs/veo.
- **Runway Gen-4 is the outlier: video prompts are motion-only.** Its guide
  reserves the text prompt for motion, assigns composition/subject/style to
  the input image, contains zero lens/aperture/DOF tokens, and warns that
  restating image-borne visual attributes "can lead to reduced motion".
  Lens character for Runway lives in the conditioning keyframe. Confidence:
  high. Source: help.runwayml.com Gen-4 Video Prompting Guide.
- **FLUX (Black Forest Labs) is the most lens-literal image model
  documented.** Its guide instructs naming camera bodies, lenses, and film
  stocks ("Shot on Fujifilm X-T5, 35mm f/1.4" claimed to outperform
  "professional photo") and supports structured JSON prompts with fields
  like `"lens-mm": 85`. Confidence: high. Source: bfl.ai FLUX prompting
  guide.

### Optics and craft

- **Anamorphic is a family of geometries, not one look**: squeeze ratios
  ship at 1.33x, 1.5x, 1.65x, 1.8x (Cooke Anamorphic/i FF), and the
  traditional 2x — record the ratio, not just the word. Signature traits
  (horizontal streak flares, oval bokeh, cylindrical perspective on wides)
  come with costs: disproportionate focus breathing, edge softness, slower
  T-stops, longer close focus. Confidence: high (3-0). Sources:
  cookeoptics.com, panavision.com "Five Pillars of Anamorphic",
  nofilmschool.com.
- **Focal-length grammar (full-frame)**: 28mm is the "bread and butter"
  documentary/tight-space wide; 14mm-class ultra-wides exaggerate facial
  features at close distance and are reserved for vistas; 85mm is the
  compressing "beauty lens" for close-ups. Confidence: medium.
- **Vintage character has a documented lineage**: Cooke Speed Panchro was
  the Hollywood lens from the 1920s–60s (Casablanca, The Sound of Music) and
  original glass is still rehoused for modern productions — lens character
  is a real, nameable property worth a free-text `character` field, not an
  enum. Confidence: medium.
- **The limited kit is validated practice**: Call Me By Your Name — one
  Cooke S4/i 35mm for the whole film; Ozu's family dramas — essentially one
  50mm; Netflix's Adolescence — one Cooke SP3 32mm; Wes Anderson/Robert
  Yeoman — ~90% of Rushmore and The Royal Tenenbaums on one 40mm anamorphic.
  Limiting the kit is how coherence is built, which is why `lens_kit` is a
  project-level constraint that `compile-prompts.js` enforces. Confidence:
  high.

## Design consequences implemented

1. Per-shot fields: `lens_mm` (existing) + `lens_type`,
   `anamorphic_squeeze`, `t_stop`, `depth_of_field`.
2. Project-level `lens_kit` (focal set, family, squeeze, character); shots
   outside the kit fail compilation without `--allow-off-kit`.
3. `scripts/lib/lens-language.js`: focal-band phrase map + per-provider
   policy — text tokens for Veo-class and all image providers, keyframe-only
   for Runway Gen-4 video.
4. Keyframes always carry the full lens language, so keyframe-conditioned
   providers inherit the look even when their video prompt must stay
   motion-only.
