# manifests/

Machine-readable index of the scaffold. These files are the **source of truth**
for validation (`npm run validate`), installers (`scripts/install.js`), and
harness generation (`scripts/sync-harnesses.js`). Rosters live here, not in
prose — `docs/conventions.md` describes the contract, these files enforce it.

## Files

| File | Contents |
|---|---|
| `agents.json` | The 17 agents: `name`, `file`, `description`. |
| `commands.json` | The 18 commands: `name`, `file`, `description`, plus `agents[]` and `skills[]` mirroring the command → agent → skill map in `docs/conventions.md`. |
| `skills.json` | The 18 skills: `name`, `file`, `description`, `category` (story · visual · production · generation · post). |
| `image-providers.json` | Image backends (fal, replicate, comfyui, harness-native): `id`, `file`, `label`, `env`, `capabilities`. |
| `video-providers.json` | Video backends (veo, kling, runway, seedance, fal): same shape, capabilities include `maxDurationSeconds`, `startEndFrames`, `audio`. |
| `audio-providers.json` | Audio backends (elevenlabs, fal, local): same shape. |
| `profiles.json` | Install profiles (`full`, `writing-room`, `previs`, `generation`) listing included commands/agents/skills. Consumed by `scripts/install.js`. |
| `harnesses.json` | Per-harness wrapper strategy (target dir, how commands/agents/skills/rules map, frontmatter handling). Consumed by `scripts/sync-harnesses.js`. |

## Invariants (enforced by `npm run validate`)

- Every `name`/`id` matches the rosters in `docs/conventions.md` exactly.
- Every `file` path exists on disk.
- `commands.json` `agents[]`/`skills[]` match each command's
  `## Invokes Agents` / `## Required Skills` sections.
- Provider `id`, `env`, and `capabilities` deep-equal what the provider module
  exports.
- Profile members reference roster names only.

## Editing

Roster changes touch three places: the markdown/JS file, the matching manifest
here, and `docs/conventions.md`. Provider `capabilities` are hard limits that
`compile()` and validation check prompt packages against — keep them honest.
