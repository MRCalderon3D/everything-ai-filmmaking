# Project Structure

## Purpose

Keep every `production/` workspace identical in shape so agents, scripts, and
schemas can find any artifact by convention instead of by search.

## Scope

All layers, all tasks. Governs where files are created inside `production/`
and which schema each structured file must satisfy.

## Core Principles

- One canonical layout, defined in `docs/conventions.md`. Agents MUST create
  files only in their designated locations and NEVER invent sibling
  directories or alternate spellings.
- Every structured file is YAML validated against a schema in `schemas/`;
  human-readable documents are Markdown; scripts are the only JS.
- Directory placement encodes meaning: an asset's path states what it is.

## Layout

```
production/
├── project.yaml               # project.schema.json
├── story/                     # story-bible.yaml, script.fountain, treatment.md
├── characters/                # <CHAR_ID>/character.yaml, wardrobe.yaml, refs/
├── locations/                 # <LOC_ID>/location.yaml, map.yaml, refs/
├── props/                     # <PROP_ID>/prop.yaml, refs/
├── scenes/                    # <SC_ID>/scene.yaml, blocking.yaml, shots/,
│                              #   storyboard/, references/, prompts/, continuity/
├── shots/                     # shots.yaml — generated flat index
├── references/                # approved masters + manifest.yaml (registry of ALL reference
│   │                          #   material, any kind); inbox/ = universal drop zone pending
│   │                          #   /ingest-references; audio/ video/ docs/ = non-visual refs
├── prompts/                   # compiled prompt packages per provider
├── generations/               # generation records + media, by shot
├── continuity/                # continuity-state.yaml per scene + global
└── edit/                      # edit-plan.yaml, timeline.md
```

## Placement Rules

- Entity dirs are named by ID: `characters/CHAR_MARA/`, `locations/LOC_DINER/`,
  `scenes/SC_004/`. The ID in the path MUST match the `id` field inside.
- Raw reference candidates live in the entity's `refs/`; only approved masters
  move to `production/references/` and are listed in `manifest.yaml`.
- Per-shot outputs live under `generations/<SH_ID>/`; each media file sits next
  to its generation record.
- Scene-scoped material (blocking, storyboards, reference plans, prompts,
  continuity state) stays inside `scenes/<SC_ID>/`; only the generated flat
  index lives in `shots/`.
- Agents MUST NOT write outside `production/` except when editing the scaffold
  itself, and NEVER write into generated harness wrapper directories.
- Deleting or moving an approved asset's directory is forbidden; supersede it
  (see `approval-policy.md`).

## Validation

- `scripts/validate.js` checks the workspace tree against this layout, matches
  path IDs to embedded `id` fields, and validates every YAML file against its
  schema (`schemas/<name>.schema.json`).
- `hooks/validate-after-write.js` rejects writes that land outside the layout
  or fail schema validation.
- `scripts/doctor.js` reports missing required files for the current phase.
- Structural exceptions require human review and a conventions update first.
