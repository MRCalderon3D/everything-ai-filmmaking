---
description: Run the self-evaluation pass on existing artifacts — schema, rules, and quality-bar gates plus an improvement pass — reporting or fixing.
---

# /self-review

## Purpose

Apply the `self-evaluation` skill on demand to artifacts that already exist:
score them against their schema, the rules that govern them, and the quality
bar of the skill that produced them, then run the "what would I change?"
pass. New output already self-evaluates at write time by default
(`rules/common/self-review.md`); this command retrofits artifacts produced
before that rule, audits a scene before a phase gate, or re-checks after
upstream canon changed.

## Use When

- Before submitting artifacts for human review or a `full-production` phase
  gate — catch what the gate would catch, earlier.
- After a bible or plan changed upstream and derived artifacts may have
  drifted.
- Imported or hand-edited files entered `production/` and skipped write-time
  evaluation.
- Generated media needs an acceptance verdict against its reference plan.

## Inputs

- `target` (required): an artifact file, a scene directory, or a scene ID
  (e.g. `SC_004` — evaluates the scene's whole artifact set).
- `--fix` (optional flag): apply unambiguous fixes in place. Default is
  report-only.
- `--depth` (optional): `mechanical` (schema/IDs/cross-refs only) |
  `full` (default: all four gates plus the improvement pass).

## Invokes Agents

- production-qa
- showrunner

## Required Skills

- self-evaluation

## Process

1. Resolve the target to its artifact list; load each artifact's schema, its
   governing rule layers (common + domain + production-type), and the
   producing skill's Quality Bar.
2. Run the mechanical gate across the set (`scripts/validate.js` semantics,
   `scripts/check-continuity.js` for scene sets).
3. With `--depth full`: run the rules gate and craft gate per artifact,
   citing the specific rule or quality-bar point for every finding.
4. Run the improvement pass: concrete candidate changes, each judged against
   intent and canon — clear wins listed as fixes, churn discarded.
5. Without `--fix`: emit the report — per artifact, verdict
   pass/fix-available/flagged with citations — and change nothing.
6. With `--fix`: the artifact's owning agent applies the unambiguous fixes
   (production-qa never edits); re-run the gates once; findings needing a
   human decision go to the artifact's `notes` or the scene's
   `open_issues`.
7. Summarize: verdicts per artifact, fixes applied, flags recorded, and the
   upstream defects (bible/plan level) that downstream fixes must not paper
   over.

## Outputs

- A self-review report per artifact: verdict, cited findings, applied fixes,
  recorded flags.
- With `--fix`: repaired artifacts in place, still schema-valid; flags in
  `notes` / `continuity/scene-state.yaml` `open_issues`
  (`schemas/continuity-state.schema.json`).

## Notes

- Approved assets are immutable: a finding against an approved master
  becomes a supersession proposal (`rules/common/approval-policy.md`), never
  an edit.
- A self-review pass is not approval — `draft → review → approved` still
  requires the human act; this command just makes the review worth having.
- Two repair cycles maximum per artifact; persistent failures are upstream
  defects and route to `/story-bible`, `/reference-plan`, or the owning
  bible command instead.
- Prose findings (AI-writing tells) belong to `/humanize`; this command
  checks structure, canon, and craft, and will point at `/humanize` when the
  prose itself is the finding.
