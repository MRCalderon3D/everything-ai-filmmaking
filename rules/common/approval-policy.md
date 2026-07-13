# Approval Policy

## Purpose

Define the lifecycle every asset moves through so "done" is unambiguous,
approved material cannot drift, and changes to canon are deliberate and
versioned.

## Scope

All layers. Applies to bibles, reference assets, scene and shot files,
storyboards, prompt packages, generated media, and edit plans.

## Core Principles

- Three states, one direction: `draft → review → approved`. There is no
  "approved-ish".
- Approved is immutable. Change means supersede, never edit in place.
- Approval is a human act. Agents prepare and recommend; they NEVER set an
  asset to `approved` on their own authority.

## Lifecycle

- **draft** — work in progress. Freely editable by the owning agent. Drafts
  MUST NOT be used as references for generation.
- **review** — candidate submitted for human review with a short rationale
  (what it is, what it replaces, known deviations from the bible). Editing a
  file in `review` sends it back to `draft`.
- **approved** — canon. Recorded with reviewer and timestamp. Approved assets
  are copied or referenced into their canonical location (masters into
  `production/references/` + `manifest.yaml`).

## Immutability and Supersession

- Approved files and approved master media are read-only.
  `hooks/protect-approved-assets.js` blocks writes; working around the hook
  (renaming, deleting, re-creating) is NEVER acceptable.
- To change an approved asset, create a new version: increment `_V##`
  (`CHAR_MARA_FACE_MASTER_V03` → `..._V04`), take it through
  `draft → review → approved`, then update `manifest.yaml` to point at the new
  version. The old version remains on disk as history.
- Downstream artifacts referencing a superseded version MUST be flagged stale
  and regenerated against the new version before their next approval.
- Revoking an approval (defect found) is a human act, logged in the asset's
  file; the asset returns to `draft` and dependents are flagged.

## Approval Gates

- Masters MUST be approved before they appear in any reference plan.
- Reference plans MUST be approved before prompt compilation; prompt packages
  before live generation of their shot (see `image/`, `video/` rules).
- A scene's continuity state MUST be reviewed before its shots are batched.
- Phase transitions in `contexts/` list the approvals that gate each exit.

## Validation

- `scripts/validate.js` checks every `status` field is one of the three
  states, that approved entries carry reviewer + timestamp, and that
  reference plans cite only approved masters.
- `hooks/protect-approved-assets.js` enforces immutability on write.
- `scripts/check-continuity.js` flags shots built on superseded versions.
- The approval act itself is always human review; the tooling only verifies
  the bookkeeping.
