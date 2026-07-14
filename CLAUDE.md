# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is **not a film project**. It is a layered workflow *scaffold* for
AI-assisted filmmaking: a coordinated system of rules, agents, commands, skills,
and contexts that a coding assistant loads to do script analysis, world bibles,
shot planning, storyboarding, reference-driven prompt compilation, asset
generation, continuity review, and edit planning inside a user's `production/`
workspace.

The repository's own "code" is a Node.js (>= 18, zero runtime deps, CommonJS)
tooling layer under `scripts/` that **validates and generates** the scaffold's
content so it can never drift out of sync.

## Commands

```bash
npm test                  # node tests/run-all.js — scaffold self-tests
npm run validate          # full validation gate (what CI runs)
npm run doctor            # diagnose an install: env, providers, harness wiring
npm run sync:harnesses    # regenerate .claude/ .codex/ .cursor/ .opencode/ .agents/
```

Run a single test file directly: `node tests/<file>.test.js`.

## Source of truth vs. generated artifacts

| Edit this (source of truth) | Generates this (do NOT hand-edit) | Sync |
|---|---|---|
| `commands/*.md`, `agents/*.md`, `skills/*/SKILL.md`, `rules/`, `contexts/`, `manifests/harnesses.json` | `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.agents/` | `npm run sync:harnesses` |

Workflow: edit the source → run the sync → commit both. `npm run validate`
fails on wrapper drift, roster mismatches, schema violations, and broken
cross-references.

## Architecture

- `rules/` — policy. `common/` applies always; `writing/`, `visual/`, `image/`,
  `video/`, `audio/` are domain layers; `cinema/` and `commercial/` are
  mutually exclusive production-type layers selected by `production_type` in
  `production/project.yaml`.
- `agents/` — 17 specialized roles (who owns the work).
- `commands/` — 22 workflow entry points; `/smart-shot` is the orchestrator
  that turns a scene into shots + storyboard + reference plan + prompts +
  continuity state.
- `skills/` — 22 reusable procedures commands and agents invoke.
- `schemas/` — JSON Schema (draft 2020-12) for every `production/` artifact.
- `manifests/` — machine-readable index; validation and installers read these,
  so rosters live here, not in prose.
- `providers/` — image/video/audio adapters sharing one interface
  (`compile()` pure, `generate()` dry-run by default, env-gated live mode).
- `hooks/` — harness hooks: validate-after-write, protect-approved-assets,
  detect-continuity-drift, require-cost-confirmation.

The full authoring contract (rosters, frontmatter formats, ID scheme,
command→agent→skill map, provider interface, manifest shapes) is
`docs/conventions.md`. Read it before adding or renaming anything.

## Hard rules

- English everywhere. Zero runtime dependencies in `scripts/` and `providers/`.
- Never hand-edit generated harness directories.
- Never log or commit API keys; providers must refuse live runs without their
  env vars and default to dry-run.
- Roster changes (agents/commands/skills/providers) touch three places:
  the markdown/JS file, the matching manifest, and `docs/conventions.md`.
- Every feature ships with its documentation: update the README, the layer
  READMEs (`commands/`, `skills/`, `rules/`, `schemas/`, `templates/`), and
  `docs/getting-started.md` in the same change that adds the capability.
  Prefer wording that doesn't hardcode counts outside the roster files.
