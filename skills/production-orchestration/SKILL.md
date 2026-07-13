---
name: production-orchestration
description: Run the pipeline — phase gates, approval workflow, dependency order, and batch cost confirmation.
origin: everything-ai-filmmaking
category: production
---

# Production Orchestration

## Purpose
Coordinate the whole pipeline from script to edit plan: enforce phase gates,
run the draft → review → approved workflow, resolve what blocks what, and hold
the cost gate on every generation batch.

## Use When
- Initializing a project (`/project-init`) or running `/full-production`.
- Deciding whether a phase may start or an artifact may be consumed downstream.
- A change upstream (bible, blocking) must be propagated and stale work invalidated.

## Inputs
- `production/project.yaml` and the current state of every `production/` artifact.
- The command → agents → skills map and phase contexts (development,
  preproduction, production, postproduction, review).
- Provider pricing/capabilities for batch cost estimates.

## Process
1. Determine phase from artifact state, not assertion: development (script,
   story bible) → preproduction (bibles, maps, style, breakdowns, shot lists,
   boards, reference plans) → production (keyframes, clips) → postproduction
   (continuity review, edit plan) → review.
2. Enforce the dependency graph: script analysis blocks bibles; character/
   location/style bibles block visual development and reference plans;
   blocking blocks shots; shots block boards and reference plans; reference
   plans block prompt compilation; prompts + keyframes block clips; clips
   block continuity review; continuity approval blocks the edit plan.
3. Run approvals: every artifact is `draft` on creation, moves to `review`
   when its producing agent submits it, and `approved` only by explicit user
   or showrunner sign-off. Only approved artifacts may be consumed by a
   downstream phase; approved artifacts are immutable — supersede with `_V##`.
4. On any upstream change, walk the graph downstream and mark dependents
   stale; stale work re-enters review, it is never silently kept.
5. Gate every generation batch: assemble the batch, estimate cost per provider
   pricing, present count + estimate, and proceed only on explicit
   confirmation. Dry-run output requires no gate.
6. Dispatch work to the owning agents per the command map; never let one agent
   both produce and approve the same artifact.
7. Keep a run log per phase: what was produced, what was approved, what is
   blocked and by which missing artifact.
8. Escalate rather than override: a failing gate is information for the user,
   not an obstacle to route around.

## Outputs
- Updated `production/project.yaml` phase/status fields, approval states on
  artifacts, and a blocked/ready report per phase.

## Quality Bar
- No downstream artifact built from an unapproved or stale source.
- Every live generation batch shows a cost estimate and confirmation first.
- Every blocked item names the exact artifact blocking it.
- Approval history is reconstructible from the files alone.

## Common Failure Modes
- Skipping gates to "keep momentum," producing work that must be regenerated.
- Approvals implied by silence instead of recorded sign-off.
- Stale downstream artifacts surviving an upstream bible change.
- Cost confirmed once, then reused for a different or larger batch.

## Related Agents
- showrunner
- production-qa

## Related Commands
- /project-init
- /full-production

## Notes
Hooks enforce parts of this mechanically (protect-approved-assets,
require-cost-confirmation); orchestration is still responsible for the graph
and for making blockage visible instead of mysterious.
