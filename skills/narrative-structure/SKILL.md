---
name: narrative-structure
description: Map act structure, turning points, setups/payoffs, and pacing across the story.
origin: everything-ai-filmmaking
category: story
---

# Narrative Structure

## Purpose
Hold the shape of the story: acts, sequences, turning points, character arcs,
and setup/payoff chains, so every scene and shot decision can be justified by
its structural function.

## Use When
- Building or updating the story bible after script analysis.
- A scene breakdown needs each scene's structural role stated.
- Rewrites shift a turning point and dependent scenes must be re-evaluated.

## Inputs
- Scene and beat data from `script-analysis` (`production/scenes/*/scene.yaml`).
- `production/story/treatment.md` and any logline/theme statements.
- Existing `production/story/story-bible.yaml` when updating.

## Process
1. Identify the spine: protagonist, want vs. need, central dramatic question.
2. Mark act breaks and the major turning points (inciting incident, midpoint,
   low point, climax) against specific scene IDs — never against page guesses.
3. Group scenes into sequences with a stated mini-goal each.
4. Assign every scene a structural function (setup, escalation, reversal,
   revelation, release); a scene with no function is flagged, not rationalized.
5. Trace each character arc as a sequence of belief states pinned to beats.
6. Build the setup/payoff table: every planted object, line, or image and the
   scene where it pays off; orphaned setups and unearned payoffs are defects.
7. Chart tension per scene (1–10) and check the pacing curve for flat runs
   longer than three consecutive scenes.
8. Record theme statements and the scenes that argue each side.

## Outputs
- `production/story/story-bible.yaml` (`story-bible.schema.json`).
- Structural annotations on scenes (function, sequence, tension) consumed by
  `/scene-breakdown` and `/shot-list`.

## Quality Bar
- Every scene has exactly one primary structural function.
- Every setup has a payoff scene or an explicit `unresolved` flag.
- Turning points reference real scene IDs present in `production/scenes/`.
- Arc states change only at beats that dramatize the change.

## Common Failure Modes
- Forcing a three-act template onto material with a different shape.
- Labeling scenes by content ("diner scene") instead of function.
- Payoffs asserted without a traceable setup scene.
- Rewriting story facts while annotating — structure describes, the script decides.

## Related Agents
- screenwriter
- script-editor
- showrunner

## Related Commands
- /script-analyze
- /story-bible
- /scene-breakdown

## Notes
Structure feeds cinematography: tension values and functions drive shot size,
lens, and cutting rate choices downstream. Keep them honest.
