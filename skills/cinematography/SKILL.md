---
name: cinematography
description: Choose shot size, angle, height, lens, and movement so the camera argues the drama.
origin: everything-ai-filmmaking
category: production
---

# Cinematography

## Purpose
Translate dramatic intent into camera language: for every moment, the shot
size, angle, camera height, lens, and movement that make the audience feel
what the beat means — chosen deliberately, never by default.

## Use When
- Designing coverage for a scene during shot listing or `/smart-shot`.
- Storyboards need camera specifications per panel.
- A shot reads emotionally flat or contradicts its beat's function.

## Inputs
- `production/scenes/<SC_ID>/scene.yaml` (beats, tension, function) and `blocking.yaml`.
- Style bible lens bias and lighting philosophy.
- `production/locations/<LOC_ID>/map.yaml` for feasible positions.

## Process
1. Read the beat's function and tension; camera choices must serve them.
2. Choose size per beat: EWS/WS for context and isolation-in-space, MS for
   relationship and body language, MCU for intention, CU for decision, ECU for
   detail that carries plot. Escalate size with tension, don't open on the peak.
3. Choose angle and height: eye level for neutrality, low to empower or loom,
   high to diminish or map, dutch only when the world itself tilts. Default
   height is subject eye level; shooting a child or a seated character means
   lowering the camera, not tilting down.
4. Choose the lens by its argument, from inside the project lens kit:
   ultra-wides (<24mm) are for vistas and scale — they distort faces at close
   range; 28–35mm is the workhorse wide that embeds the subject in context
   and survives tight spaces; 50mm renders human-neutral perspective; 85mm is
   the compressing beauty lens for close-ups; 100mm+ stacks planes for
   isolation and surveillance. Declare depth of field when it argues
   (shallow isolates, deep focus keeps both planes in play). Never mix focal
   grammar within a matched pair of reverses, and never reach outside the
   kit without an approved style deviation — whole features have been shot
   on one lens; coherence comes from the limit.
5. Motivate movement or lock it off: push-in for realization, pull-back for
   revelation of context or abandonment, pan/track to follow intent, handheld
   for instability, dolly-past for time and detachment. Unmotivated movement
   is noise; static is a choice, not an absence.
6. Compose the frame to the beat: thirds with looking room as the default;
   deny the looking room (short-siding) when comfort must break; center and
   mirror only for power, ritual, or wrongness - rationed; negative space as
   threat or absence; frame-within-frame for entrapment; headroom tightening
   as tension rises. Declare it in camera.composition when it argues.
7. Pick the coverage pattern from blocking: master + matched singles for
   dialogue; shot-reverse-shot on the axis side with equal size/lens/height;
   dirty OTS to keep power relations in frame; clean singles to isolate a
   character who is emotionally alone.
8. Specify each camera fully — size, angle, height, lens, movement, and the
   nearest mapped location angle — so shots are generable and auditable.
9. Check the set as a whole: sizes should progress with the scene's tension
   curve, and adjacent shots must differ by more than 30 degrees or one full size.

## Outputs
- Camera blocks inside `production/scenes/<SC_ID>/shots/SH_*.yaml`
  (`shot.schema.json`): size, angle, height, lens, movement, motivation.

## Quality Bar
- Every camera choice is justified by beat function, not habit.
- Matched reverses share size, lens, and height exactly.
- Movement always has a stated motivation.
- Lens and coverage choices respect the style bible's lens bias.

## Common Failure Modes
- Defaulting everything to a medium shot at eye level on a 35mm.
- Escalating to close-ups early, leaving nowhere to go at the climax.
- Mixed lenses across a reverse pair, making the cut feel like two scenes.
- Camera movement added for production value with no dramatic trigger.

## Related Agents
- cinematographer
- shot-planner
- storyboard-artist

## Related Commands
- /shot-list
- /smart-shot
- /storyboard

## Notes
Cinematography decides what each shot is; `shot-sequencing` decides how shots
follow each other. Size/lens grammar established here is what continuity audits
treat as intent.

Coverage restraint is a craft position, not a budget concession: a simple,
well-chosen setup beats a complicated mediocre one, and the audience never
needs the whole bag of tricks in one scene. Default to the fewest shots that
serve the beats — `/smart-shot --coverage minimal|standard|dense` makes
density an argued choice. Under `rules/commercial/message-discipline.md`
restraint is mandatory for short runtimes; in cinema it is the default that
dense coverage must argue against.
