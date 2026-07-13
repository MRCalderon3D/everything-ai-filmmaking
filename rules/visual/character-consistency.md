# Character Consistency

## Purpose

Prevent identity drift: the same character MUST read as the same person in
every frame of every shot, across providers, seeds, and weeks of work.

## Scope

Visual layer. Applies to character design, storyboards, reference plans, and
every image/video generation that depicts a `CHAR_*` entity.

## Core Principles

- Identity lives in approved masters, not in prompt adjectives. Text
  descriptions supplement references; they NEVER replace them.
- Drift compounds: never generate a character from a previous generation
  alone — always anchor to the master.
- Wardrobe and physical state are scene-time functions, not constants.

## Master References

- Every principal and recurring character MUST have an approved master set
  before generation: face master (`CHAR_<NAME>_FACE_MASTER_V##`), full-body
  master, and expression/turnaround sheets as the character bible requires.
- Every generation depicting a character MUST include that character's
  current face master in its reference plan; full-body master when framing is
  medium shot or wider. Omitting the master is a hard failure, not a
  quality tradeoff.
- When a provider's reference-image limit forces choices, identity masters
  outrank wardrobe, wardrobe outranks environment (see
  `image/image-generation.md`).
- Redesigns supersede masters via `_V##` (see `common/approval-policy.md`);
  mixed-version references within one scene are forbidden.

## Wardrobe State

- `characters/<CHAR_ID>/wardrobe.yaml` defines outfits; the story timeline
  assigns one wardrobe state per character per scene. Every shot inherits its
  scene's wardrobe state and MUST cite the matching wardrobe reference.
- Progressive states (rain-soaked, bloodied, torn sleeve) are tracked as
  ordered wardrobe states with the beat where each begins; a later shot NEVER
  shows an earlier state within the same story time.
- Continuity-relevant carried props (bag, weapon, bandage) travel with the
  wardrobe state in `continuity/`.

## Identity Checks

- After each generation, compare against the face master: facial structure,
  eye and hair color, hairstyle, distinguishing marks, apparent age, build.
  Any mismatch on these is a reroll, regardless of how good the image is.
- Hairstyle and makeup changes mid-scene are drift unless scripted.
- Group shots are checked per character; one drifted face fails the shot.

## Validation

- `scripts/validate.js` verifies every reference plan for a character shot
  lists the current approved face master and a wardrobe reference matching
  the scene's declared state.
- `scripts/check-continuity.js` flags wardrobe-state regressions across the
  scene timeline and mixed master versions within a scene.
- `hooks/detect-continuity-drift.js` flags shots generated after a master was
  superseded.
- Likeness itself is judged by human review against the master sheet before
  a shot can be approved.
