---
description: Lock the film's visual language — palette, lighting, lensing, grain, and grade intent.
---

# /style-bible

## Purpose

Define the visual language once so every prompt speaks it: color palette with
hex anchors and forbidden colors, lighting philosophy, lens set and depth
behavior, camera-height and movement defaults, texture and grain, aspect
ratio discipline, and grade intent per story chapter. A film generated shot
by shot only coheres if the style is written down more precisely than any
single prompt could carry.

## Use When

- After `/story-bible` sets tone; before `/visual-development` spends money
  exploring looks.
- Generated material looks like five different films — the style needs
  tighter, more exclusionary language.
- The story has distinct visual chapters (before/after the fire) that need
  codified variants.

## Inputs

- `references` (list, optional): films, photographers, or paintings to build
  the language from.
- `looks` (int, optional, default 1): number of named LOOK variants (e.g.
  `LOOK_MAIN`, `LOOK_FLASHBACK`).

## Invokes Agents

- visual-director
- colorist

## Required Skills

- visual-style-development

## Process

1. visual-director translates tone into commitments, not adjectives: palette
   of five to seven named colors with hex values plus an explicit forbidden
   list; key-to-fill ratio ranges; hard or soft light and when each is
   allowed; haze/atmosphere policy.
2. Define lensing: the three-length "lens set" (e.g. 24/40/75mm equivalent),
   which lengths carry intimacy vs. geography, default camera height, and
   the movement vocabulary (what moves, what never moves, maximum speed).
3. colorist writes grade intent: contrast curve character, shadow color,
   skin-tone protection, grain/texture, halation or bloom policy, and how
   the grade shifts across story chapters.
4. Name each LOOK variant (`LOOK_*_V##`) and state exactly which scenes use
   which — no scene may be unassigned.
5. Compile the style bible with a "negative style" section: the clichés and
   model-default aesthetics to prompt against (over-saturation, fake bokeh,
   teal-orange drift).
6. Register planned LOOK master frames in the reference manifest for
   `/visual-development` to render.

## Outputs

- `production/story/style-bible.md` — the visual-language document (human
  document, no schema).
- `production/references/manifest.yaml` — updated with planned `LOOK_*`
  master entries (manifest, no schema).

## Notes

- Style words must be promptable: "melancholy" generates nothing repeatable;
  "single-source sodium key at 3200K, shadows crushed to blue-black" does.
- `/smart-shot` and `/generate-keyframes` compile prompts *from* this
  document — vague style here means style drift at generation cost.
- Related: `/visual-development` (proofs the look in pixels),
  `/edit-plan` (grade notes echo the chapter intents defined here).
