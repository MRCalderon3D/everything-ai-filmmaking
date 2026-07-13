---
name: script-analysis
description: Decompose a screenplay into scenes, beats, and a complete entity registry.
origin: everything-ai-filmmaking
category: story
---

# Script Analysis

## Purpose
Turn an unstructured screenplay into the structured foundation every downstream
layer depends on: a scene list, beat breakdown, and registry of every character,
location, and prop with narrative weight.

## Use When
- A new script (Fountain, plain text, or pasted pages) enters the project.
- The script is revised and scenes/entities may have changed.
- Bibles or shot lists reference entities that have no registry entry.

## Inputs
- `production/story/script.fountain` (or raw screenplay text).
- `production/project.yaml` for title, format, and target runtime.
- Existing `production/scenes/` entries when re-analyzing a revision.

## Process
1. Parse sluglines; assign `SC_###` in script order, one per slugline.
2. Extract per scene: INT/EXT, location name, time of day, page span.
3. Normalize locations — `INT. STATION - PLATFORM` and `INT. STATION - HALL`
   are distinct sets of one parent location, not two locations.
4. List characters present per scene, splitting speaking vs. non-speaking.
5. Identify props with narrative weight (handled, mentioned twice, or plot-relevant);
   ignore incidental set dressing.
6. Segment each scene into beats `BT_<scene>_##`: each beat has an intention,
   a turn, and the entities on screen during it.
7. Record dialogue/action balance and estimated screen duration per scene.
8. Build the entity registry: first appearance, last appearance, scenes present,
   and any described physical traits, verbatim from the script.
9. Flag ambiguities (unnamed characters, offscreen locations, implied time jumps)
   as open questions rather than inventing answers.

## Outputs
- `production/scenes/<SC_ID>/scene.yaml` per scene (`scene.schema.json`),
  with beats conforming to `beat.schema.json`.
- Entity registry feeding `/character-bible`, `/location-bible`, `/prop-bible`.

## Quality Bar
- Every slugline maps to exactly one scene ID; no orphan pages.
- Every character, location, and narrative prop appears in the registry.
- Beats cover the full scene with no gaps or overlaps.
- Physical descriptions are quoted from the script, never paraphrased into new facts.

## Common Failure Modes
- Merging distinct sub-locations of one parent set into a single location.
- Treating parentheticals or transitions as action content.
- Inventing entities, traits, or backstory not present on the page.
- Losing scene numbering stability across revisions — reuse IDs, never renumber.

## Related Agents
- screenwriter
- script-editor
- showrunner

## Related Commands
- /script-analyze
- /story-bible

## Notes
Analysis is descriptive, not editorial — improvement suggestions belong to the
script-editor under `/script-analyze`, never silently applied here.
