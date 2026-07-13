# Sound Effects

## Purpose

Build a believable diegetic world in layers and keep every effect
synchronized to picture: sound sells physical reality that generated video
only implies.

## Scope

Audio layer. Applies to effects planning in shot and scene files, generated
or library SFX assets, ambience beds, and effects notes in
`production/edit/edit-plan.yaml`.

## Core Principles

- If it happens on screen, it makes a sound; if it makes a sound, it has a
  sync point. Silent on-screen impacts are defects.
- Effects are layered by role, not dumped as one mix: ambience, spot effects,
  and design elements are separate, replaceable stems.
- Every SFX asset has provenance — generated, library, or recorded — per
  `common/asset-provenance.md`.

## Diegetic Layers

Each scene's soundscape is planned in three named layers:

- **Ambience beds:** one continuous bed per location + light state
  (`LOC_*` room tone, exterior air, weather). The bed persists across every
  cut within the scene — cutting ambience with picture inside a scene is
  forbidden — and changes only when location, time, or a door/window state
  changes.
- **Spot effects:** hard effects tied to visible events (footsteps, doors,
  impacts, handled props). Each spot effect names its source event and shot.
  Off-screen story sounds (approaching car, distant shout) are spot effects
  with a narrative purpose stated.
- **Design elements:** non-literal sounds (risers, drones, stingers) used
  for emphasis; they follow the restraint discipline of
  `visual/visual-language.md` and MUST NOT masquerade as diegetic sound.

## Sync Points

- Every spot effect declares its sync point as shot ID + timecode (or frame)
  against the clip's intended in-point, recorded in the edit plan. "Roughly
  there" is not a sync point.
- Clip regeneration invalidates sync points: when a clip's timing changes,
  its effects are re-conformed before the edit is reviewed.
- Perspective matches picture: effect distance, reverb, and level MUST agree
  with the shot size and location acoustics (a wide shot's footsteps are not
  close-mic'd).
- Continuity of caused sound: a sound whose cause persists across a cut
  (running engine, rain) persists across the cut too.

## Validation

- `scripts/validate.js` checks each scene's edit-plan entry declares its
  ambience bed and that every spot effect references an existing shot and
  timecode.
- `scripts/check-continuity.js` flags scenes whose ambience bed changes
  without a location/time/state change and spot effects pointing at
  superseded clip attempts.
- Generated SFX carry generation records checked per
  `common/asset-provenance.md`; live batches gate through
  `hooks/require-cost-confirmation.js`.
- Sync feel, perspective, and layer balance are human review by the
  sound-designer at edit review.
