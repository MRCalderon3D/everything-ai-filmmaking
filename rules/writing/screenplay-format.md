# Screenplay Format

## Purpose

Keep every screenplay machine-parseable and industry-readable by pinning
Fountain conventions and a scene-numbering scheme that maps 1:1 to `SC_` IDs.

## Scope

Writing layer. Governs `production/story/script.fountain`, excerpts quoted in
scene files, and any screenplay text an agent drafts or revises.

## Core Principles

- The screenplay is plain-text **Fountain**. NEVER use proprietary formats,
  rich text, or Markdown headings inside the script file.
- Format is grammar: sluglines, action, dialogue, and transitions each carry
  distinct meaning downstream (scene breakdown, blocking, shot planning).
  Sloppy formatting corrupts the pipeline, not just the page.
- Write what the camera sees and the speakers say. Interior monologue and
  unfilmable prose are defects.

## Fountain Conventions

- **Sluglines:** `INT.`/`EXT.`/`INT./EXT.` + LOCATION + ` - ` + TIME
  (`INT. DINER - NIGHT`). Location names MUST match a `LOC_*` bible entry's
  display name once the location bible exists. Time-of-day vocabulary:
  DAY, NIGHT, DAWN, DUSK, CONTINUOUS, LATER.
- **Action:** present tense, max ~4 lines per paragraph. Character first
  appearance in CAPS with a one-line description. Key props in CAPS on first
  appearance so `/script-analyze` can extract them.
- **Dialogue:** character cue in CAPS, exactly matching the character bible
  name; extensions `(V.O.)`, `(O.S.)`, `(CONT'D)` only.
- **Parentheticals:** one short actable beat (`(beat)`, `(dry)`); NEVER
  direction that belongs in action lines, and SHOULD be rare.
- **Transitions:** right-aligned Fountain transitions (`CUT TO:`,
  `SMASH CUT TO:`) only when the cut itself is a storytelling event; the
  default cut is implied and unwritten.
- **Dual dialogue, lyrics, centered text** use standard Fountain syntax
  (`^`, `~`, `> <`). Notes use `[[...]]` and are stripped from breakdowns.

## Scene Numbering

- Every slugline carries an explicit Fountain scene number: `#4#` after the
  slugline. Numbers are integers, assigned in script order at first lock.
- Scene `#N#` maps to `SC_` ID by zero-padding to three digits: `#4#` →
  `SC_004`. The mapping is permanent; `scenes/SC_004/scene.yaml` MUST quote
  its slugline verbatim.
- After numbering is locked, inserted scenes take letter suffixes in Fountain
  (`#4A#` → `SC_004A`); deleted scenes keep their number, marked OMITTED.
  NEVER renumber existing scenes.

## Validation

- `scripts/validate.js` parses the Fountain file, checks slugline grammar,
  scene-number continuity, and that every `SC_` directory maps to a numbered
  scene (and vice versa).
- Character cues are cross-checked against `characters/` bible names;
  mismatches fail validation.
- `hooks/validate-after-write.js` re-parses the script on write.
- Readability, tone, and unfilmable-prose judgments are human review by the
  script-editor pass.
