# templates/

Starter files that `scripts/create-project.js` copies into a new `production/`
workspace. Every YAML template validates against its schema in
[schemas/](../schemas/) and is filled with a minimal worked example — a noir
short, *The Red Suitcase* (character `CHAR_MARA`, location `LOC_STATION`, prop
`PROP_RED_SUITCASE`, scene `SC_004`, shot `SH_004_002`) — so a fresh workspace
demonstrates the conventions instead of shipping empty scaffolding.

Inline `#` comments explain each field; replace the example values with your
production's, keep the structure.

## Contents

| Template | Copied to | Schema |
|---|---|---|
| `project/project.yaml` | `production/project.yaml` | `project.schema.json` |
| `story-bible/story-bible.yaml` | `production/story/story-bible.yaml` | `story-bible.schema.json` |
| `character/character.yaml` | `production/characters/<CHAR_ID>/character.yaml` | `character.schema.json` |
| `character/wardrobe.yaml` | `production/characters/<CHAR_ID>/wardrobe.yaml` | `wardrobe.schema.json` |
| `location/location.yaml` | `production/locations/<LOC_ID>/location.yaml` | `location.schema.json` |
| `location/map.yaml` | `production/locations/<LOC_ID>/map.yaml` | `location-map.schema.json` |
| `shot/shot.yaml` | `production/scenes/<SC_ID>/shots/<SH_ID>.yaml` | `shot.schema.json` |
| `music-brief/music-brief.yaml` | `production/story/music-brief.yaml` | `music-brief.schema.json` |
| `storyboard/storyboard.md` | `production/scenes/<SC_ID>/storyboard/storyboard.md` | — (human document) |
| `storyboard/board-manifest.yaml` | `production/scenes/<SC_ID>/storyboard/board-manifest.yaml` | — (ID-checked by validate.js) |
| `continuity/scene-state.yaml` | `production/scenes/<SC_ID>/continuity/scene-state.yaml` | `continuity-state.schema.json` |

## Notes

- Rename the destination directories to your IDs (`CHAR_MARA` →
  `CHAR_YOURCHAR`, etc.); IDs inside the files must match the directory name.
- Reference image paths (`refs/`, `panels/`) point at files the generation
  commands create; templates ship the registry entries, not the images.
- The example values are internally consistent: the shot's references exist in
  the character/location/prop registries, its `axis_id` is declared in
  `continuity/scene-state.yaml`, and its camera `station` exists in
  `location/map.yaml`. Keep that property when you edit — `npm run validate`
  checks it.
- Scene, beat, prop, reference-plan, prompt-package, and generation-record
  files are produced by their commands (`/scene-breakdown`, `/prop-bible`,
  `/reference-plan`, `/generate-keyframes`, …) rather than copied from
  templates.
- `looks/` holds starter `LOOK_*` presets (analog VHS, documentary,
  surrealist, classic cinematic) with model-ready prompt vocabulary. They are
  schema-less seeds for the style bible: copy one, adapt it, and promote it
  through draft → review → approved like any reference asset.
