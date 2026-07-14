# Visual Language

## Purpose

Make every framing decision mean something. A film's look is a small set of
deliberate choices applied relentlessly; this rule keeps palette, lenses, and
shot grammar tied to story rather than to model defaults.

## Scope

Visual layer. Applies to the style bible, visual development, storyboards,
shot planning, and the look constraints compiled into every prompt package.

## Core Principles

- The style bible defines a finite visual system; shots draw from it, they do
  not invent. "It looked cool" is not a rationale.
- Restraint is the style: fewer pillars, palettes, and lenses, used
  consistently, read as authorship. Model-default prettiness is drift.
- Every deviation from the system is a marked story event, approved in the
  style bible before it is generated.
- Surreal or reality-breaking imagery MUST serve a stated emotion or story
  point. Generative models make the impossible cheap and feeds are saturated
  with unmotivated surrealism; an impossible image without a dramatic
  argument is noise and MUST NOT pass style review.

## Style Pillars

- The style bible declares 3–5 named pillars (e.g. "practical light only",
  "static frames, moving subjects", "clutter tells backstory"). Every shot
  SHOULD be defensible against the pillars; a shot that violates one MUST
  cite which pillar it breaks and why.
- Pillars compile into `LOOK_*` assets and prompt-package constraints; prompt
  text MUST NOT contradict a pillar to chase a nicer output.
- Reference films/images in the style bible are direction, not targets:
  NEVER prompt "in the style of" a living artist or franchise.

## Palette Discipline

- The project defines a master palette (dominant hues, accent, forbidden
  colors) plus per-location and per-act variations, all in the style bible.
- Accent colors are narrative currency: reserve them for their assigned
  meaning (a character, a threat, a motif). An accent appearing without its
  meaning is a defect.
- Palette shifts across acts MUST be gradual and scheduled in the style
  bible, never per-shot improvisation.

## Lens and Shot-Size Grammar

- The project MUST declare a `lens_kit` in `project.yaml`: the finite set of
  focal lengths shots may use, the kit's optical family (spherical or
  anamorphic with its squeeze ratio), and its rendering character. Limiting
  the kit is how productions build visual coherence — whole features have
  been shot on a single lens; three to five focal lengths is a generous kit.
- Shots MUST declare a `lens_mm` from the kit. An off-kit lens is a marked
  style event: approved in the style bible first, compiled only with
  `--allow-off-kit`. `scripts/compile-prompts.js` refuses off-kit shots
  otherwise.
- The style bible assigns what each end of the kit means
  (e.g. wide = isolation in space, long = compression and surveillance).
  Shots declare a lens consistent with that grammar.
- Anamorphic is a family, not a look: record the squeeze ratio. Its traits
  (oval bokeh, streak flares, cylindrical wides) and costs (breathing, edge
  softness) are kit-level decisions, never per-shot whims.
- Depth of field is narrative language: shallow isolates, deep focus keeps
  fore- and background in dramatic play. Shots declare `depth_of_field`
  intent when it matters; the default is unmarked.
- Shot sizes follow a declared dramatic logic: what earns a close-up, what
  wides are for, default conversational coverage size. Escalation to closer
  sizes SHOULD track rising stakes within a scene.
- Camera height is meaningful: eye-level as neutral default; low/high angles
  only with a stated power or vulnerability intent in the shot file.
- Headroom, lead room, and symmetry conventions come from the style bible
  and stay constant unless a pillar-level exception is approved.

## Validation

- `scripts/validate.js` checks each shot declares size, lens, and height
  within the style bible's allowed ranges, and that prompt packages include
  the current approved `LOOK_*` constraints.
- `scripts/check-continuity.js` flags accent-color assets appearing in
  scenes outside their assigned meaning where structurally detectable.
- Pillar adherence, palette reads, and grammar judgment are human review by
  the visual-director at storyboard and keyframe review.
