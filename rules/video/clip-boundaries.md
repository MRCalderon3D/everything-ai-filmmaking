# Clip Boundaries

## Purpose

Decide where shots split into generatable clips and how clips join back into
seamless shots. Boundary placement is the difference between an invisible
join and an obvious AI artifact.

## Scope

Video layer. Applies to shot timing, clip segmentation in shot files,
keyframe planning, and edit-plan assembly of multi-clip shots.

## Core Principles

- Cut where the seam hides: at action seams and static holds, never in the
  middle of continuous motion the model must reproduce twice.
- Every clip carries handles — usable frames beyond its intended in/out — so
  the editor cuts on choice, not on necessity.
- Joins are engineered on shared frames, not matched by eye after the fact.

## Where to Cut

- **Action seams:** split at the natural completion of a movement — a head
  turn finishing, a door closing, a body coming to rest. The seam frame
  SHOULD contain minimal motion blur and an unambiguous pose.
- **Static holds:** a beat where subject and camera are both still is the
  ideal boundary; plan holds into blocking where long shots need splitting.
- NEVER split mid-gesture, mid-stride ambiguity, mid-speech on camera, or
  during camera movement — a moving camera MUST settle before a boundary.
- Dialogue shots split at pauses between lines; lip-sync-critical spans stay
  within one clip.

## Handles

- Every clip is generated with handles: at least 0.5s of settled action
  before the intended in-point and after the intended out-point, within
  provider duration caps. The shot file records intended in/out separately
  from generated duration.
- Handles are for editing; content inside handles still obeys continuity
  rules (a character can't relax out of pose inside the handle).

## Matching Frames Across Joins

- Adjacent clips in one shot share a boundary keyframe: the approved end
  frame of clip N is the literal start-frame conditioning of clip N+1 (same
  file — see `video/video-generation.md`). Providers without
  `startEndFrames` MUST NOT own an interior join.
- The boundary keyframe MUST pass identity, wardrobe, location-angle, and
  axis checks before either neighboring clip is generated; fixing a bad
  boundary later means regenerating both sides.
- Across a hard cut between different shots, boundaries need continuity
  matching (pose, screen direction, light), not frame identity.

## Provider Duration Caps

- Clip length MUST respect the assigned provider's `maxDurationSeconds`
  (from `manifests/video-providers.json`); plan segmentation from the cap
  minus handles, and NEVER request oversize hoping for truncation.
- Shots longer than one cap are segmented at planned seams during shot
  listing — segmentation is a planning artifact in the shot file, not an
  improvisation at generation time.

## Validation

- `scripts/validate.js` checks each clip's duration against provider caps,
  that multi-clip shots declare seam frames and handles, and that interior
  joins are assigned only to start/end-frame-capable providers.
- `scripts/check-continuity.js` verifies join clips reference the same
  boundary keyframe file and flags joins whose keyframe is unapproved.
- Seam invisibility in the rendered result is human review at clip
  acceptance and again at edit review.
