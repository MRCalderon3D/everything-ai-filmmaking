# Context: Development

The story phase. The project exists as words: a premise becomes a treatment,
a screenplay, and a story bible that the rest of the pipeline can trust. No
visual assets are generated here beyond throwaway mood exploration.

## Goals

- A locked, formatted screenplay (`production/story/script.fountain`) with
  stable scene numbers mapped to `SC_` IDs.
- A story bible recording facts, timeline, character knowledge, and arcs.
- First-pass entity extraction: which characters, locations, and props the
  script actually requires.

## In Scope

- Writing, rewriting, and structural editing of the screenplay and treatment.
- Story-bible authoring and fact/timeline reconciliation.
- Scene numbering and the `SC_###` mapping (permanent once locked).
- Out of scope: reference generation, shot planning, any provider spend.

## Typically Active

- Commands: `/project-init`, `/script-analyze`, `/story-bible`.
- Agents: showrunner, screenwriter, script-editor.
- Rules in force: `common/` plus `writing/` (screenplay-format,
  narrative-continuity). `contexts` frame, rules govern.

## Exit Criteria → Preproduction

- Screenplay status `approved` with locked scene numbers; later changes go
  through supersession, not silent edits.
- Story bible `approved`: timeline complete, every scene slotted, no
  unresolved fact conflicts from `scripts/check-continuity.js`.
- Entity roster agreed: named characters, locations, and props each have a
  reserved `CHAR_/LOC_/PROP_` ID.
- Human sign-off by the showrunner recorded in `project.yaml`.
