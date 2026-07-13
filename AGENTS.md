# AGENTS.md

Guidance for AI coding assistants (Codex, Cursor, OpenCode, and others) working
in this repository. Claude Code additionally reads `CLAUDE.md` (same content,
harness-specific framing).

## What this is

A layered workflow scaffold for AI-assisted filmmaking. The deliverables are
markdown (rules, agents, commands, skills, contexts), JSON (schemas, manifests),
YAML templates, and a zero-dependency Node.js tooling layer. There is no app,
no build, no UI.

## Working here

- Read `docs/conventions.md` first — it is the authoring contract (rosters,
  formats, IDs, the command→agent→skill map, provider interface). Validation
  enforces it.
- `npm test` and `npm run validate` must pass before any change is done.
- Generated harness wrappers (`.claude/`, `.codex/`, `.cursor/`, `.opencode/`,
  `.agents/`) are never hand-edited; run `npm run sync:harnesses` after editing
  their sources (`commands/`, `agents/`, `skills/`, `rules/`, `contexts/`).
- A roster change (add/rename/remove an agent, command, skill, or provider)
  touches the file, its manifest entry, and `docs/conventions.md` together.
- Scripts and providers: Node >= 18, CommonJS, zero runtime dependencies,
  dry-run by default, no secrets in logs or commits.
- Style: English, imperative, concise. Match the structure of neighboring files
  exactly — the layers are deliberately uniform.

## Using the scaffold (inside a film project)

When this scaffold is installed into a user's project, slash commands map to
`commands/*.md`. Follow the command file literally: load its Required Skills,
act as its Invoked Agents, respect `rules/`, write outputs only under
`production/`, validate against `schemas/`, and update continuity state and
generation records as the rules require. Bibles and approved masters outrank
prompts and prior generations.
