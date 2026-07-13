# Asset Provenance

## Purpose

Guarantee that every generated asset can answer: who made it, from what, with
which references, and at what cost. Provenance is what makes regeneration,
auditing, and cost accounting possible.

## Scope

All layers. Applies to every image, video, and audio file produced by any
provider, including dry-run request specs and harness-native generations.

## Core Principles

- No orphan media. A media file without a generation record is a defect and
  MUST be either backfilled with a record or deleted.
- Records are written before or with the media, never reconstructed later
  from memory.
- Provenance is immutable history: records are append-only and NEVER edited
  to make a lineage look cleaner.

## Generation Records

Every generation — live or dry-run — produces a
`GEN_<shot>_<attempt##>` record conforming to
`schemas/generation-record.schema.json` and stored under
`production/generations/<SH_ID>/`. Each record MUST include:

- **provider** and **model** (exact model/version string the provider ran).
- **prompt package hash** — the hash of the compiled prompt package used, so
  drift between prompt and output is detectable.
- **references used** — the full IDs of every reference asset supplied
  (`CHAR_*`, `LOC_*`, `PROP_*`, `LOOK_*` with version).
- **cost** — actual if reported, estimated otherwise, with currency; zero is
  recorded explicitly, never omitted.
- **timestamp** (ISO 8601) and **status** (`pending`, `succeeded`, `failed`).
- **seed and parameters** when the provider exposes them (see
  `image/image-generation.md`, `video/video-generation.md`).

## Lineage Rules

- Derived assets (upscales, crops, edits, extracted frames) MUST record their
  parent asset or record ID; lineage chains MUST terminate at a generation
  record or an imported source noted in the record.
- Imported third-party media (temp music, reference photos) gets a record with
  provider `external`, its origin, and its license status (see
  `audio/music.md`).
- Licensed assets (stock footage, licensed music, commissioned work) MUST
  record source, license identifier, cleared/uncleared status, and usage
  scope (platforms, territories, term). An uncleared asset NEVER enters an
  approved cut; commercial projects additionally clear trademarks and
  likenesses per `rules/commercial/message-discipline.md`.
- Failed and rejected attempts keep their records; NEVER delete a record to
  hide a bad attempt. Media of failed attempts MAY be deleted, records not.
- Promoting an asset to a `_MASTER` copies it into `production/references/`
  with its record ID listed in `manifest.yaml`.

## Validation

- `scripts/validate.js` schema-checks all records, verifies every media file
  under `generations/` has a sibling record, and verifies every record's
  prompt package hash resolves to an existing package.
- `scripts/generate-assets.js` refuses to write media without first writing a
  record.
- `hooks/validate-after-write.js` flags orphan media on write; unexplained
  lineage gaps go to human review.
