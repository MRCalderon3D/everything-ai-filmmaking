# Design: everything-ai-filmmaking scaffold

Date: 2026-07-13 · Status: approved (spec provided in full by project owner)

## Goal

An open-source, English-language workflow scaffold for AI-assisted audiovisual
production, modeled on `everything-game-dev-code` and `ecc`. A user opens their
film project in Claude Code, Codex, Cursor, or OpenCode and runs commands like
`/project-init`, `/script-analyze`, `/smart-shot`, `/generate-clips`,
`/full-production`. The scaffold generates and maintains structured files in a
`production/` workspace (bibles, scenes, shots, storyboards, reference plans,
prompt packages, generation records, continuity state, edit plans). No UI.

## Architecture

Layered scaffold with an authoritative markdown/JSON core and a generated
harness layer:

- Content layers: `rules/` (policy), `agents/` (17 roles), `commands/` (18
  entry points), `skills/` (18 procedures), `contexts/` (5 phases).
- Data layer: `schemas/` (14 JSON Schemas), `manifests/` (8 machine-readable
  indexes), `templates/` (workspace starters).
- Tooling layer: `scripts/` (Node >= 18, zero deps: install, doctor, validate,
  sync-harnesses, create-project, compile-prompts, build-reference-plan,
  generate-assets, check-continuity), `providers/` (12 image/video/audio
  adapters with a common interface, dry-run by default), `hooks/` (4 handlers).
- Generated layer: `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.agents/`
  wrappers produced by `sync-harnesses.js` — never hand-edited.
- `tests/` self-tests run by `node tests/run-all.js`.

The centerpiece is `/smart-shot`: an orchestrator command that turns a scene
into a multi-shot cinematic proposal (blocking → coverage → shots → timing →
cameras → references → prompts → storyboard → continuity validation), invoking
six agents and six skills.

The full contract — rosters, formats, ID scheme, command→agent→skill map,
provider interface, manifest shapes — lives in `docs/conventions.md` and is
enforced by `npm run validate`.

## Decisions

- The structure tree in the owner's spec is authoritative. `/visual-development`
  (listed in the command examples) is added as an 18th command.
- CommonJS, zero runtime dependencies, Node >= 18 — matching the reference repo.
- Providers never run live without explicit opt-in and required env vars;
  generation is dry-run by default (cost-control policy).
- Harness wrappers are generated, with `validate` failing on drift — same
  source-of-truth discipline as the reference repo.

## Testing

`npm test` runs scaffold self-tests (manifest/schema parsing, roster
cross-references, provider interface conformance, template ↔ schema validity).
`npm run validate` is the full gate CI would run.
