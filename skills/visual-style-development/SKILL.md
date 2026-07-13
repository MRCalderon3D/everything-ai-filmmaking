---
name: visual-style-development
description: Define the film's visual language — palette, lighting, lensing, texture — as an enforceable style bible.
origin: everything-ai-filmmaking
category: visual
---

# Visual Style Development

## Purpose
Establish one coherent visual language for the whole film — palette, contrast,
lighting philosophy, lens bias, texture, and era treatment — written precisely
enough that prompts compile from it and drift can be detected against it.

## Use When
- Starting the style bible for a new project.
- Prop or costume design needs style rules to render against.
- Generated output looks inconsistent in color, grain, or lighting between scenes.

## Inputs
- `production/story/story-bible.yaml` (tone, theme, era, genre).
- Director intent, comparable films, or mood references supplied by the user.
- Existing `LOOK_*` assets and `production/` style entries when revising.

## Process
1. Name the overall look (`LOOK_<NAME>`) and state its dramatic argument in one
   sentence — why this look serves this story.
2. Define the palette: 3–5 dominant colors with hex anchors, accent color and
   its narrative meaning, and forbidden colors.
3. Set lighting philosophy: key softness, contrast ratio range, motivated vs.
   expressive, and how it shifts across acts (e.g. warmer to colder).
4. Declare lens bias and rendering: focal range the film lives in, depth of
   field habits, halation/grain/texture, aspect ratio.
5. Specify per-act or per-storyline variations as deltas from the base look,
   never as separate free-standing looks.
6. Write the machine-usable phrasing block: exact style keywords for prompts
   and exact negative terms (what this film never looks like).
7. Generate 3–5 style plates testing the rules on real subjects (a character,
   a location); iterate until plates agree, then approve as `LOOK_*_V##`.
8. Record which traits the style may override (color grade, atmosphere) and
   which it must never touch (identity anchors, set geometry).

## Outputs
- Style bible under `production/` (per project layout) plus approved `LOOK_*`
  plates registered in `production/references/manifest.yaml`.

## Quality Bar
- Palette, lighting, and lens rules are specific enough to falsify — a frame
  can be judged in or out of style.
- Style keywords and negatives are canonical strings reused verbatim.
- Variations are expressed as deltas from one base look.
- Approved style plates exist and agree with the written rules.

## Common Failure Modes
- Adjective soup ("cinematic, moody, stunning") with no enforceable values.
- Style rules that quietly rewrite character identity or location geometry.
- A new look invented per scene instead of a delta from the base.
- Reference plates approved that contradict the written palette.

## Related Agents
- visual-director
- colorist
- production-designer

## Related Commands
- /style-bible
- /visual-development
- /prop-bible

## Notes
The style bible is the only source `prompt-compilation` may draw style language
from. If a shot needs a look the bible lacks, extend the bible first.
