# schemas/

JSON Schema (draft 2020-12) for every structured artifact in a `production/`
workspace. `validate.js` and the `validate-after-write` hook check every YAML
file against its schema; a file that does not validate does not ship.

## Conventions

- One schema per artifact: `schemas/<name>.schema.json`.
- `$id` is `https://everything-ai-filmmaking.dev/schemas/<name>.schema.json`.
- `"$schema"` is `https://json-schema.org/draft/2020-12/schema`.
- Every schema is self-contained (internal `$defs` only, no cross-file `$ref`),
  sets `"additionalProperties": false` at the top level, uses enums for closed
  vocabularies, and constrains every ID field with a `pattern` from the ID
  scheme in [docs/conventions.md](../docs/conventions.md).

## Roster (15 — exhaustive, mirrors docs/conventions.md)

| Schema | Validates | Lives at |
|---|---|---|
| `project` | Workspace config: title, format, aspect ratio, fps, style refs, default providers | `production/project.yaml` |
| `story-bible` | Logline, themes, acts/sequences, canon facts | `production/story/story-bible.yaml` |
| `character` | Identity, canonical description, reference asset registry | `production/characters/<CHAR_ID>/character.yaml` |
| `wardrobe` | Per-scene-range outfits, condition states, outfit references | `production/characters/<CHAR_ID>/wardrobe.yaml` |
| `location` | Identity, canonical description, reference asset registry | `production/locations/<LOC_ID>/location.yaml` |
| `location-map` | Landmarks and camera-angle stations (`LOC_*_C#`) | `production/locations/<LOC_ID>/map.yaml` |
| `prop` | Identity, canonical description, reference asset registry | `production/props/<PROP_ID>/prop.yaml` |
| `scene` | Slugline, synopsis, entities, ordered beat list | `production/scenes/<SC_ID>/scene.yaml` |
| `beat` | Intent / conflict / turn per narrative beat | scene breakdown output |
| `shot` | Narrative, timing + handles, camera, blocking, continuity, references, generation flags | `production/scenes/<SC_ID>/shots/<SH_ID>.yaml` |
| `reference-plan` | Per-shot, per-provider reference selection with priorities and omission risk | `production/scenes/<SC_ID>/references/` |
| `prompt-package` | Provider-ready prompt, parameters, resolved references, source hashes | `production/prompts/`, `production/scenes/<SC_ID>/prompts/<provider>/` |
| `generation-record` | Provenance per generation attempt: provider, model, cost, status | `production/generations/` |
| `continuity-state` | Axes, character/prop state, lighting, open issues per scene | `production/scenes/<SC_ID>/continuity/scene-state.yaml`, `production/continuity/` |
| `music-brief` | Music strategy per cue: scope, tempo/energy map, lyric sync points, licensing | `production/story/music-brief.yaml` |

## ID patterns (single source: docs/conventions.md)

| Entity | Pattern | Example |
|---|---|---|
| Scene | `^SC_\d{3}$` | `SC_004` |
| Beat | `^BT_SC\d{3}_\d{2}$` | `BT_SC004_02` |
| Shot | `^SH_\d{3}_\d{3}$` | `SH_004_002` |
| Asset | `^(CHAR|LOC|PROP|LOOK)_[A-Z][A-Z0-9_]*(_V\d{2})?$` | `CHAR_MARA_FACE_MASTER_V03` |
| Camera station | `^LOC_[A-Z][A-Z0-9_]*_C\d+$` | `LOC_STATION_C1` |
| Axis | `^AXIS_SC\d{3}_[A-Z]$` | `AXIS_SC004_A` |
| Prompt package | `^PP_SH_\d{3}_\d{3}_[A-Z0-9][A-Z0-9_-]*$` | `PP_SH_004_002_VEO` |
| Generation record | `^GEN_SH_\d{3}_\d{3}_\d{2}$` | `GEN_SH_004_002_01` |

## Design decisions

- **Nullable neighbors.** `shot.continuity.enters_from` / `exits_to` accept
  `null` for the first/last shot of a scene, but the keys are required — every
  shot declares its neighbors explicitly.
- **Asset lifecycle is an enum.** `status: draft | review | approved`
  everywhere a reference registry appears; approved assets are immutable and
  superseded by a new `_V##` version.
- **Reference plans carry the argument, not just the list.** Each entry states
  `purpose`, `priority`, `reason`, and `omission_risk` so budget cuts against a
  provider's reference limit are an informed decision, not a truncation.
- **Prompt packages are compiled artifacts.** `source_hashes` (shot +
  reference plan) makes staleness machine-detectable; a hash mismatch means
  recompile, never hand-edit.
- **Cost is required on every generation record**, with `estimated: true` for
  dry runs — the cost-control gate depends on the field always being present.
- **Maps of entities use `patternProperties`.** `continuity-state`
  character/prop maps are keyed by `CHAR_*` / `PROP_*` IDs; `shot.blocking`
  uses lowercase character handles (`mara`) because blocking is prose-facing.
- **`parameters` in prompt-package is the one open object** (providers need
  extra knobs); everything else is closed with `additionalProperties: false`.

## Relationships

```
project ─┬─ story-bible ── scene ── beat
         │                   │
         │   character ──────┤          location ── location-map
         │   wardrobe        │          prop
         │                   ▼
         │                 shot ── reference-plan ── prompt-package ── generation-record
         │                   │
         └───────────────── continuity-state
```

Cross-file referential integrity (does `SC_004` exist? is that asset
approved?) is checked by `scripts/validate.js` and `check-continuity.js`, not
by JSON Schema — schemas validate shape and vocabulary only.

## Templates

Starter YAML that validates against these schemas lives in
[templates/](../templates/) and is copied into new workspaces by
`scripts/create-project.js`.
