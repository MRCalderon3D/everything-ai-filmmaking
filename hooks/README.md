# hooks/

Harness hook handlers that enforce the scaffold's cross-cutting policies at
write/run time. `hooks.json` is the harness-agnostic wiring (event → script);
`scripts/sync-harnesses.js` translates it into each harness's native format.

## Contract

Every handler:

- reads **one JSON event from stdin** (shape is harness-dependent; handlers
  accept `{file}`, `{command}`, and Claude-style `{tool_input: {...}}`),
- writes human-readable messages to **stderr**,
- exits **0** to allow, **2** to block (advisory hooks always exit 0),
- never blocks on its own internal errors, and never prints secrets.

## The four hooks

| Hook | Event | Effect |
|---|---|---|
| `protect-approved-assets.js` | before file write under `production/references/` | **Blocks** writes to assets marked `status: approved` in `references/manifest.yaml`. Approved masters are immutable — supersede with `_V##`. |
| `validate-after-write.js` | after file write under `production/` | **Blocks** (exit 2) when a schema-known artifact (project, character, shot, scene, prompt package, ...) fails its schema in `schemas/`. |
| `detect-continuity-drift.js` | after writing `production/scenes/*/shots/*.yaml` | **Warns** (exit 0) when a shot's axis, screen direction, or wardrobe drifts from the scene's `continuity/scene-state.yaml`. |
| `require-cost-confirmation.js` | before a shell command | **Blocks** `generate-assets ... --live` without `--yes`. Dry-run first, confirm the cost estimate, then re-run with both flags. |

## Wiring per harness

### Claude Code

`npm run sync:harnesses` writes `.claude/settings.json` with `PreToolUse`
(Write|Edit → protect-approved-assets; Bash → require-cost-confirmation) and
`PostToolUse` (Write|Edit → validate-after-write + detect-continuity-drift)
entries that run `node hooks/<name>.js`. Claude Code pipes the tool payload to
stdin and treats exit 2 as a block whose stderr goes back to the model.

### Codex CLI / Cursor / OpenCode

These harnesses have no uniform hook API. Wire the same scripts through
whatever the harness offers (e.g. shell wrappers, task runners, or CI), or
rely on the validation gate: `npm run validate` and
`npm run check:continuity` run the same checks in batch. The generated
`.codex/AGENTS.md` and `.cursor/rules/` instruct the agent to run
`node hooks/<name>.js` semantics manually: never edit approved references,
validate artifacts after writing, and never run live generation without
`--yes`.

### Git (optional, any harness)

A pre-commit that runs `npm run validate` catches everything the write-time
hooks do, later.

## Testing a hook by hand

```bash
echo '{"file":"production/scenes/SC_004/shots/SH_004_002.yaml"}' | node hooks/validate-after-write.js
echo '{"command":"node scripts/generate-assets.js --shot x.yaml --live"}' | node hooks/require-cost-confirmation.js
echo $?   # 2 = blocked
```
