# Authoring Conventions

This document is the single contract for everything in this scaffold. Every agent,
command, skill, rule, schema, manifest, script, and provider MUST follow it. The
validation gate (`npm run validate`) enforces the machine-checkable parts.

## What this repository is

A layered workflow scaffold for AI-assisted filmmaking: rules, agents, commands,
skills, and contexts that a coding assistant (Claude Code, Codex, Cursor, OpenCode)
loads to take a project from script to edit plan. It generates and maintains
structured files inside a `production/` workspace — it is not an app and has no UI.

Language: **English**, everywhere. Style: imperative, concise, no marketing prose.

## Layers

| Layer | Purpose | Format |
|---|---|---|
| `rules/` | Policy — what good looks like. `common/` first, then domain layers (`writing/`, `visual/`, `image/`, `video/`, `audio/`). | Markdown |
| `agents/` | Specialized roles — who owns the work. Flat list. | Markdown + frontmatter |
| `commands/` | Workflow entry points (`/command-name`). Flat list. | Markdown + frontmatter |
| `skills/` | Reusable procedures — how the work is done. One dir per skill with `SKILL.md`. | Markdown + frontmatter |
| `contexts/` | Production-phase framing loaded alongside commands. | Markdown |
| `schemas/` | JSON Schema (draft 2020-12) for every structured artifact in `production/`. | JSON |
| `manifests/` | Machine-readable index of the scaffold; source of truth for validation and installers. | JSON |
| `templates/` | Starter files that `create-project.js` copies into a new `production/` workspace. | YAML/Markdown |
| `scripts/` | Node.js >= 18, **zero runtime dependencies**, CommonJS. Validation, generation, sync. | JS |
| `providers/` | Thin adapters for image/video/audio generation backends. Common interface. | JS |
| `hooks/` | Harness hook handlers (validate on write, protect approved assets, etc.). | JS + `hooks.json` |
| `.claude/ .codex/ .cursor/ .opencode/ .agents/` | **Generated** harness wrappers. Never hand-edit; run `npm run sync:harnesses`. | generated |

## Rosters (exhaustive — do not add or rename without updating manifests)

**Agents (17):** showrunner, screenwriter, script-editor, visual-director,
character-designer, production-designer, storyboard-artist, cinematographer,
shot-planner, continuity-supervisor, prompt-director, image-generation-specialist,
video-generation-specialist, editor, sound-designer, colorist, production-qa.

**Commands (18):** project-init, script-analyze, story-bible, character-bible,
location-bible, prop-bible, style-bible, visual-development, scene-breakdown,
shot-list, smart-shot, storyboard, reference-plan, generate-keyframes,
generate-clips, continuity-review, edit-plan, full-production.

**Skills (18):** script-analysis, narrative-structure, character-consistency,
character-sheet-generation, location-design, location-mapping,
visual-style-development, scene-blocking, cinematography, shot-sequencing,
storyboard-generation, reference-selection, prompt-compilation, image-generation,
video-generation, continuity-checking, edit-planning, production-orchestration.

**Rules (20):**
`common/`: source-of-truth, project-structure, naming-conventions, asset-provenance, cost-control, approval-policy.
`writing/`: screenplay-format, narrative-continuity.
`visual/`: character-consistency, location-consistency, spatial-continuity, visual-language.
`image/`: image-generation.
`video/`: video-generation, motion-language, clip-boundaries.
`audio/`: dialogue, music, sound-effects.

**Contexts (5):** development, preproduction, production, postproduction, review.

**Schemas (14):** project, story-bible, character, wardrobe, location,
location-map, prop, scene, beat, shot, reference-plan, prompt-package,
continuity-state, generation-record. Files are `schemas/<name>.schema.json`,
`$id` is `https://everything-ai-filmmaking.dev/schemas/<name>.schema.json`.

**Manifests (8):** profiles.json, agents.json, commands.json, skills.json,
image-providers.json, video-providers.json, audio-providers.json, harnesses.json.

**Providers (12):** image: fal, replicate, comfyui, harness-native ·
video: veo, kling, runway, seedance, fal · audio: elevenlabs, fal, local.

**Scripts (9):** install.js, doctor.js, validate.js, sync-harnesses.js,
create-project.js, compile-prompts.js, build-reference-plan.js,
generate-assets.js, check-continuity.js. Shared helpers live in `scripts/lib/`.

**Hooks (4):** validate-after-write.js, protect-approved-assets.js,
detect-continuity-drift.js, require-cost-confirmation.js, wired by `hooks/hooks.json`.

## File formats

### Agent (`agents/<name>.md`)

```markdown
---
name: cinematographer
description: One-line role summary ending with a period.
tools: ["Read", "Grep", "Glob"]
model: sonnet
---

# cinematographer

## Role
## Responsibilities        (bulleted, 5–8 items)
## Uses These Skills       (bulleted skill names from the roster)
## Collaborates With       (bulleted agent names from the roster)
## Deliverables            (bulleted concrete artifacts)
## Activation Guidance     (when to use, when to escalate)
```

Agents that write files (e.g. prompt-director, generation specialists) may use
`tools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"]`.

### Command (`commands/<name>.md`)

```markdown
---
description: One-line summary of what the command produces.
---

# /command-name

## Purpose
## Use When
## Inputs                  (required / optional, with types and defaults)
## Invokes Agents          (bulleted, from the roster)
## Required Skills         (bulleted, from the roster)
## Process                 (numbered steps)
## Outputs                 (file paths under production/, schema names)
## Notes                   (escalation, related commands, cost warnings)
```

### Skill (`skills/<name>/SKILL.md`)

```markdown
---
name: reference-selection
description: One-line capability summary.
origin: everything-ai-filmmaking
category: story | visual | production | generation | post
---

# Reference Selection

## Purpose
## Use When
## Inputs
## Process                 (numbered, decisive steps)
## Outputs
## Quality Bar
## Common Failure Modes
## Related Agents
## Related Commands
## Notes
```

Skill categories: story (script-analysis, narrative-structure), visual
(character-consistency, character-sheet-generation, location-design,
location-mapping, visual-style-development), production (scene-blocking,
cinematography, shot-sequencing, storyboard-generation, reference-selection,
production-orchestration), generation (prompt-compilation, image-generation,
video-generation), post (continuity-checking, edit-planning).

### Rule (`rules/<layer>/<name>.md`)

```markdown
# Title

## Purpose
## Scope
## Core Principles         (then domain-specific rule sections)
## Validation              (how compliance is checked)
```

## Command → agents → skills map (authoritative)

| Command | Agents | Skills |
|---|---|---|
| project-init | showrunner, production-qa | production-orchestration |
| script-analyze | screenwriter, script-editor | script-analysis, narrative-structure |
| story-bible | showrunner, screenwriter | narrative-structure, script-analysis |
| character-bible | character-designer, screenwriter | character-consistency, character-sheet-generation |
| location-bible | production-designer | location-design, location-mapping |
| prop-bible | production-designer, continuity-supervisor | visual-style-development, continuity-checking |
| style-bible | visual-director, colorist | visual-style-development |
| visual-development | visual-director, character-designer, production-designer | visual-style-development, character-sheet-generation, location-design |
| scene-breakdown | showrunner, shot-planner | scene-blocking, narrative-structure |
| shot-list | cinematographer, shot-planner | cinematography, shot-sequencing |
| smart-shot | visual-director, cinematographer, shot-planner, storyboard-artist, continuity-supervisor, prompt-director | scene-blocking, cinematography, shot-sequencing, reference-selection, storyboard-generation, prompt-compilation |
| storyboard | storyboard-artist, visual-director | storyboard-generation, cinematography |
| reference-plan | prompt-director, continuity-supervisor | reference-selection |
| generate-keyframes | image-generation-specialist, prompt-director | image-generation, prompt-compilation, reference-selection |
| generate-clips | video-generation-specialist, prompt-director | video-generation, prompt-compilation |
| continuity-review | continuity-supervisor, production-qa | continuity-checking |
| edit-plan | editor, sound-designer, colorist | edit-planning |
| full-production | showrunner, production-qa (orchestrates all others) | production-orchestration |

Commands may reference additional agents/skills in prose, but `Invokes Agents`
and `Required Skills` lists MUST contain only roster names and MUST include the
rows above. `validate.js` cross-checks every listed name against the manifests.

## Naming and IDs (project workspace)

- Scenes: `SC_###` (e.g. `SC_004`). Beats: `BT_<scene>_##`.
- Shots: `SH_<scene-number>_###` (e.g. `SH_004_002`), ordered by `order`.
- Assets: `CHAR_*`, `LOC_*`, `PROP_*`, `LOOK_*`, versioned `_V##`
  (e.g. `CHAR_MARA_FACE_MASTER_V03`). Approved masters carry `_MASTER`.
- Axes (180° line): `AXIS_<scene>_<letter>` (e.g. `AXIS_SC004_A`).
- Generation records: `GEN_<shot>_<attempt##>`.
- Files are lowercase-kebab or the ID itself; YAML for structured data, Markdown
  for human documents.

## `production/` workspace layout

```
production/
├── project.yaml               # project.schema.json
├── story/                     # story-bible.yaml, script.fountain, treatment.md
├── characters/                # <CHAR_ID>/character.yaml, wardrobe.yaml, refs/
├── locations/                 # <LOC_ID>/location.yaml, map.yaml, refs/
├── props/                     # <PROP_ID>/prop.yaml, refs/
├── scenes/                    # <SC_ID>/scene.yaml, blocking.yaml, shots/, storyboard/, references/, prompts/, continuity/
├── shots/                     # flat index shots.yaml (generated)
├── references/                # approved master assets + manifest.yaml
├── prompts/                   # compiled prompt packages per provider
├── generations/               # generation-record.yaml + media, by shot
├── continuity/                # continuity-state.yaml per scene + global
└── edit/                      # edit-plan.yaml, timeline.md
```

## Provider interface (JS, CommonJS)

Every file in `providers/<kind>/<id>.js` exports:

```js
module.exports = {
  id: 'veo',                    // matches manifests/<kind>-providers.json
  kind: 'video',                // 'image' | 'video' | 'audio'
  label: 'Google Veo',
  env: ['GOOGLE_API_KEY'],      // required env vars; empty for local/harness-native
  capabilities: {               // hard limits validate.js checks prompts against
    maxDurationSeconds: 8,      // video only
    referenceImages: 3,         // max reference inputs, 0 if unsupported
    startEndFrames: true,       // supports first/last frame conditioning
    aspectRatios: ['16:9', '9:16', '1:1'],
    audio: false,
  },
  // prompt-package (schemas/prompt-package.schema.json) -> provider request spec
  compile(promptPackage, options = {}) { /* pure, no I/O */ },
  // request spec -> generation record (schemas/generation-record.schema.json)
  async generate(requestSpec, { dryRun = true, outDir } = {}) { /* fetch-based */ },
};
```

`generate` MUST default to dry-run (writes the request spec and a pending
generation record, calls no network) and MUST refuse to run live when a required
env var is missing. Never log API keys.

## Manifest shapes

- `agents.json` / `commands.json` / `skills.json`:
  `{ "$schema": "...", "version": 1, "<plural>": [{ "name", "file", "description", ... }] }`
  — commands entries also carry `"agents": []` and `"skills": []` mirroring the
  map above; skills entries carry `"category"`.
- `image-providers.json` / `video-providers.json` / `audio-providers.json`:
  `{ "version": 1, "providers": [{ "id", "file", "label", "env", "capabilities" }] }`.
- `profiles.json`: named install profiles (`full`, `writing-room`, `previs`,
  `generation`) listing included commands/agents/skills.
- `harnesses.json`: per-harness wrapper strategy (target dir, command format,
  frontmatter mapping) consumed by `sync-harnesses.js`.

## Environment variables

`FAL_KEY`, `REPLICATE_API_TOKEN`, `COMFYUI_HOST`, `GOOGLE_API_KEY` (Veo),
`KLING_ACCESS_KEY` + `KLING_SECRET_KEY`, `RUNWAY_API_KEY`, `ARK_API_KEY`
(Seedance via BytePlus Ark), `ELEVENLABS_API_KEY`. Document in README; never
commit values.

## Cross-cutting policies (mirrored in rules/)

- **Source of truth:** bibles and approved masters in `production/` outrank any
  prompt or generation. Regenerate outputs; never hand-edit generated wrappers.
- **Asset provenance:** every generated file gets a generation record (provider,
  model, prompt package hash, references used, cost, timestamp).
- **Approval gates:** assets move `draft → review → approved`. Approved assets
  are immutable; supersede with a new version.
- **Cost control:** batch generation requires an explicit cost estimate and
  confirmation; dry-run is always the default.
- **Continuity:** every shot declares its axis, screen direction, and
  enters-from/exits-to neighbors; continuity-state is updated after each scene.
