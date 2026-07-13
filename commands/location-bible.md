---
description: Define locations with spatial geometry, camera-angle maps, and lighting logic.
---

# /location-bible

## Purpose

Give every location a physical reality the camera can respect: floor plan or
terrain sketch in words and coordinates, cardinal orientation, light sources
and how they change by time of day, and a camera-angle map — the named
positions from which the space will be photographed. Spatial continuity is
impossible without this; a generated set that has no geometry cannot hold a
180° line.

## Use When

- After `/script-analyze` has assigned `LOC_*` IDs.
- Before `/scene-breakdown` blocks any scene in the location.
- A location reads differently between shots (doors migrating, windows
  changing wall) — rebuild the map, then regenerate offenders.

## Inputs

- `location` (ID, optional): a single `LOC_*` ID; default is every location
  in the script analysis.
- `time_variants` (list, optional): times of day to define lighting for,
  default derived from the sluglines that use the location.

## Invokes Agents

- production-designer

## Required Skills

- location-design
- location-mapping

## Process

1. Collect every scene set in the location and what the action requires of
   the space: entrances used, sight lines, distances, playing areas.
2. production-designer designs the space: architecture or terrain, era and
   condition, materials, dressing, and the two or three signature details
   that make it recognizable from any angle.
3. Fix the geometry: a described floor plan with cardinal directions, wall
   letters (or landmark names for exteriors), fixed light sources, and
   window/door positions. Everything downstream refers to these names.
4. Build the camera-angle map: named positions (`LOC_DINER_ANGLE_A` …) with
   what each sees, its reverse, and which pairs safely cut together without
   crossing an axis.
5. Define lighting per time-of-day variant the script needs: key direction,
   quality, practicals on/off, and color temperature.
6. Write the reference plan for master images (establishing wides per
   variant, key angles, signature details), then validate both files.

## Outputs

- `production/locations/<LOC_ID>/location.yaml` — validates against
  `schemas/location.schema.json`.
- `production/locations/<LOC_ID>/map.yaml` — geometry and camera-angle map,
  validates against `schemas/location-map.schema.json`.
- `production/locations/<LOC_ID>/refs/` — directory plus master-image plan;
  images arrive via `/visual-development`.

## Notes

- The angle map is the backbone of `/smart-shot` blocking and
  `/continuity-review` axis checks — vague geometry here becomes crossed
  lines and re-generation cost later.
- No generation happens in this command; it is free to iterate.
- Related: `/scene-breakdown` and `/smart-shot` (consume the map),
  `/visual-development` (renders masters), `/prop-bible` (dressing that
  moves belongs to props, not the set).
