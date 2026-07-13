# Naming Conventions

## Purpose

Pin the single ID scheme every artifact uses, so references between scenes,
shots, assets, and generation records resolve unambiguously and scripts can
parse identity from names alone.

## Scope

All layers. Governs every ID and filename created under `production/` and
every cross-reference inside structured files.

## Core Principles

- IDs are UPPERCASE with underscores; filenames are lowercase-kebab or the ID
  itself. Nothing else.
- An ID, once assigned, is permanent. NEVER renumber or reuse an ID, even for
  deleted entities; gaps are fine.
- Every cross-reference uses the full ID, never a display name or nickname.

## ID Scheme

- **Scenes:** `SC_###`, zero-padded to three digits (`SC_004`). Numbering maps
  1:1 to screenplay scene numbers (see `writing/screenplay-format.md`).
- **Beats:** `BT_<scene>_##` (`BT_SC004_02`), ordered within the scene.
- **Shots:** `SH_<scene-number>_###` (`SH_004_002`), ordered by the shot's
  `order` field, not by ID.
- **Assets:** prefix by kind — `CHAR_*` characters, `LOC_*` locations,
  `PROP_*` props, `LOOK_*` style/look assets. Versioned with `_V##`
  (`CHAR_MARA_FACE_V03`). Approved masters carry `_MASTER` before the version:
  `CHAR_MARA_FACE_MASTER_V03`.
- **Axes (180° line):** `AXIS_<scene>_<letter>` (`AXIS_SC004_A`); letters
  advance only when a new axis is legally established.
- **Generation records:** `GEN_<shot>_<attempt##>` (`GEN_SH_004_002_ATTEMPT03`);
  attempt numbers are sequential per shot and never reused.

## File Naming

- Structured data is YAML, human documents are Markdown, screenplays are
  `.fountain`.
- Entity directories are named by ID (`characters/CHAR_MARA/`); fixed
  per-entity files keep conventional lowercase names (`character.yaml`,
  `wardrobe.yaml`, `location.yaml`, `map.yaml`, `prop.yaml`, `scene.yaml`,
  `blocking.yaml`).
- Files named after an artifact use the ID verbatim: `SH_004_002.yaml`,
  `GEN_SH_004_002_ATTEMPT03.yaml`. Media takes the record's basename plus
  extension.
- Everything else is lowercase-kebab (`reference-plan.yaml`,
  `scene-state.yaml`, `edit-plan.yaml`). NEVER use spaces, camelCase, or
  non-ASCII in any filename.
- Location camera angles are keyed `<LOC_ID>_C#` (`LOC_DINER_C3`) in the
  location's `map.yaml` (see `visual/location-consistency.md`).

## Validation

- `scripts/validate.js` regex-checks every `id` field against these patterns,
  verifies path/ID agreement, and rejects dangling cross-references.
- `hooks/validate-after-write.js` blocks writes whose filenames violate the
  scheme.
- `scripts/check-continuity.js` resolves axis and shot IDs and fails on any
  reference that does not parse.
- Renames of existing IDs require human review; validation treats them as
  breaking changes.
