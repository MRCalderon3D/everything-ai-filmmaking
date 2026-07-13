# Context: Review

The audit phase. The assembled work is judged as a whole: continuity,
consistency, provenance, cost, and creative intent are verified before the
project is called done or sent back with precise, scoped fix lists.

## Goals

- A full-pipeline audit: every shot against its declarations, every asset
  against its record, every approval against its gate.
- A defect list with severity and owner — each defect routed to the phase
  that owns the fix (script issue → development, drift → production, cut
  issue → postproduction), never patched in place.
- A final acceptance decision recorded in `project.yaml`.

## In Scope

- Watching the cut in order against continuity state and the story bible.
- Provenance audit: no orphan media, records complete, licenses resolved.
- Spend report from generation records vs estimates.
- Out of scope: making fixes. Review identifies and routes; changing
  artifacts here would bypass the owning phase's gates.

## Typically Active

- Commands: `/continuity-review` (full pass), `/edit-plan` (read-only
  verification runs).
- Agents: production-qa (lead), continuity-supervisor, showrunner
  (acceptance), script-editor for narrative spot checks.
- Rules in force: all layers, read as checklists. Tooling:
  `scripts/validate.js` (full gate), `scripts/check-continuity.js` (global
  and cut-order), `scripts/doctor.js`.

## Exit Criteria → Done (or back to an earlier phase)

- Validation gate and continuity checks fully clean; every waiver written,
  attributed, and countersigned by the showrunner.
- Zero unresolved defects at blocking severity; non-blocking defects
  documented in the acceptance note.
- Provenance and license audits pass; spend report acknowledged.
- Showrunner records acceptance in `project.yaml` — or the defect list
  re-opens the owning phase's context and the pipeline resumes there.
