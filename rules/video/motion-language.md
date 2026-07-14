# Motion Language

## Purpose

Give every clip a deliberate, nameable motion design. Video models will
happily move the camera for no reason; this rule makes motion a story choice
and keeps prompts inside what models can actually execute.

## Scope

Video layer. Applies to shot planning, storyboards' motion notes, prompt
package motion descriptions, and clip review.

## Core Principles

- Every camera move is motivated by story or subject; "add some movement" is
  never a motivation. A static frame is the default, not a failure.
- Separate subject motion from camera motion in every description — models
  conflate them unless told explicitly.
- Plan within model competence: design motion the model can do well rather
  than prompting for what it will fake badly.

## Camera-Move Vocabulary

Shot files and prompt packages use only the `movement.type` vocabulary pinned
in `schemas/shot.schema.json`, one primary move per clip, grouped here by
family. Moves that need a direction declare it in `movement.direction`
(left/right, up/down, in/out, clockwise/counterclockwise); the canonical
model-ready phrasing per move lives in `scripts/lib/camera-moves.js` and is
what `compile-prompts.js` emits — prompt text MUST NOT freehand a different
motion phrase.

- **Pan/Tilt:** `static`, `pan`, `whip_pan`, `tilt`.
- **Lens:** `zoom`, `crash_zoom` — always a marked stylistic choice,
  distinguished from dolly (lens moves, camera position fixed).
- **Dolly/Track:** `dolly_in`, `dolly_out`, `tracking` (with subject),
  `push_past`.
- **Physical:** `truck`, `pedestal`, `arc` (partial), `orbit` (full circle).
- **Crane/Aerial:** `crane`.
- **Human camera:** `handheld` (energy level noted), `steadicam`, `fpv`,
  `snorricam`.
- **AI-native devices:** `infinite_zoom`, `earth_zoom_out`, `pass_through` —
  moves a physical camera cannot do. They are the fastest way to make a piece
  scream "generated", so each use MUST carry a declared dramatic motivation
  and SHOULD appear at most once per piece; in commercial work they must also
  survive `rules/commercial/message-discipline.md` (motivated, not decorative).

- Each move carries a stated motivation in the shot file: reveal, follow,
  emphasize, disorient, detach. No motivation, no move.
- Compound moves (push-in + tilt) are allowed only when one is clearly
  primary; three simultaneous move types NEVER.
- Move speed is declared (`slow`, `medium`, `fast`) and SHOULD stay slow to
  medium; speed ramps within a clip MUST be explicitly described (start
  speed, ramp point, end speed) and treated as high-risk.
- Reliability tiers (mirrored in `scripts/lib/camera-moves.js`): `whip_pan`,
  `crash_zoom`, `orbit`, `fpv`, and `snorricam` are high-risk on current
  models — they REQUIRE start/end frame conditioning or a cut-based
  alternative planned before generation.

## Subject vs Camera Motion

- Prompt motion text describes them in separate sentences: first what the
  subject does, then what the camera does. Ambiguous phrasing ("the scene
  moves closer") is forbidden.
- Subject motion states the start pose, the action, and the end pose, so the
  clip's boundary frames are predictable (see `video/clip-boundaries.md`).
- Screen direction of subject motion MUST match the shot's declared
  `enters-from`/`exits-to` and axis side (`visual/spatial-continuity.md`).

## Model Weaknesses — Plan Around, Not Through

Current video models do these badly; do not prompt for them:

- **Fast whip pans, crash zooms, and fast camera rotation** — smear and
  geometry collapse. Use a cut or a neutral shot instead; when the story
  truly needs one, condition on start/end frames and budget rerolls.
- **Full orbits** — identity and geometry drift past ~180°; prefer a partial
  `arc`, or split the orbit into clips joined at matched frames.
- **Complex hand interactions** (typing, tying, pouring, instrument playing)
  — keep hands out of close framing, cut around the action, or show result
  not process.
- **Legible on-screen text**, mirrors, and reflections holding identity.
- **Fast or many-limbed action** (fights, sports) — decompose into short
  clips at action seams with simple motion each.
- **Long choreography** — anything requiring more than one beat of precise
  timing per clip gets split.

When a shot's intent collides with this list, the shot-planner MUST redesign
coverage (more cuts, closer inserts, static frames) rather than gamble
attempts on it.

## Validation

- The shot schema pins the move vocabulary and carries
  `movement.motivation`; `hooks/validate-after-write.js` schema-checks every
  shot on write. A non-static move without a motivation fails the
  self-evaluation craft gate (`common/self-review.md`) and human review.
- `scripts/lib/camera-moves.js` is the single source of motion phrasing; a
  test asserts it covers every `movement.type` the shot schema allows.
- `scripts/compile-prompts.js` refuses packages whose motion text omits the
  subject/camera separation.
- `scripts/check-continuity.js` cross-checks motion screen direction against
  declared spatial continuity.
- Whether a generated clip executes the declared motion is human review at
  clip acceptance.
