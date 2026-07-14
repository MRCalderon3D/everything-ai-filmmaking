---
description: Analyze user-supplied reference images and fold them into the bibles, style system, and reference registry with provenance.
---

# /ingest-references

## Purpose

Turn the user's own images — style frames, character lookalikes, location
photos, prop shots, mood boards — into structured canon. Each image is
analyzed for what it actually shows; the findings become bible entries,
`LOOK_*` style assets, and registered reference assets the rest of the
pipeline can condition generation on. This is how a project starts from "I
want it to look like this" instead of from prose.

## Use When

- Starting visual development with existing material: concept art, location
  scouts, casting references, a director's mood board.
- The user shares images mid-production ("the coat should look like this").
- Migrating a project that already has reference imagery into the scaffold.

## Inputs

- `source` (optional): a directory or file list; default
  `production/references/inbox/`. Images pasted directly into chat count as
  sources.
- `--entity` (optional): bind the whole batch to one entity
  (`CHAR_MARA`, `LOC_STATION`, `LOOK_NOIR_NIGHT`); default is per-image
  classification confirmed with the user.
- `--binding` (optional): `canon` (this IS the thing) | `inspiration`
  (directional mood); default asked per batch, never guessed.

## Invokes Agents

- visual-director
- character-designer
- production-designer

## Required Skills

- reference-ingestion
- visual-style-development

## Process

1. Inventory the source images; classify each by entity and confirm binding
   level with the user in one pass.
2. Analyze every image multimodally per the `reference-ingestion`
   checklists: palette, lighting logic, texture, lens cues for looks;
   identity vs. costume for characters; geography, materials, and light
   states for locations; form and wear for props.
3. Write extractions into canon as drafts: style-bible pillars and `LOOK_*`
   assets with prompt-ready vocabulary; canonical description fields in
   character/location/prop bibles.
4. Register every image: naming-convention ID, file moved from `inbox/` to
   its entity's `refs/`, registry entry with `status: draft`, provenance
   (provider `external`, origin) and license state captured — unknown
   licenses flagged, likenesses flagged for clearance on commercial
   projects.
5. Report conflicts with approved canon as user decisions (supersede vs.
   demote to inspiration); never merge silently.
6. Deliver the promotion plan: which assets to take straight through
   `draft → review → approved` as masters, and which should condition
   `/visual-development` image-to-image generation instead.

## Outputs

- Updated bible entries and `LOOK_*` assets (draft) — `character.yaml`,
  `location.yaml`, `prop.yaml`, style bible per their schemas.
- Registered reference assets under `production/**/refs/` +
  `production/references/manifest.yaml` entries with provenance and license
  fields.
- Conflict report and promotion plan in the conversation.

## Notes

- Run before `/visual-development` whenever the user has material — generate
  masters *conditioned on* their images, not in parallel to them.
- Approval stays human: ingestion produces drafts and recommendations only
  (`rules/common/approval-policy.md`).
- License capture is not optional (`rules/common/asset-provenance.md`); an
  uncleared image can seed analysis but its pixels cannot enter an approved
  cut.
- Prose written into bibles follows `rules/writing/prose-style.md`; the
  extraction vocabulary follows the `templates/looks/` conventions.
