# Agents

Seventeen specialized roles, one per file. Each agent owns a slice of the
pipeline, reads the bibles as source of truth, and produces or reviews
artifacts inside `production/`. Agents never freehand prompts and never edit
approved masters — they supersede with new versions.

## Roster by phase

**Story**
- [showrunner](showrunner.md) — creative and operational owner of the whole production
- [screenwriter](screenwriter.md) — script, treatment, character voice
- [script-editor](script-editor.md) — structural coverage and revision passes

**Visual development**
- [visual-director](visual-director.md) — the look: palette, lighting, lensing language
- [character-designer](character-designer.md) — identity, wardrobe, reference sheets
- [production-designer](production-designer.md) — locations, set geometry, props

**Shot planning**
- [storyboard-artist](storyboard-artist.md) — boards from shots, framing and staging
- [cinematographer](cinematographer.md) — coverage, camera, lens, movement
- [shot-planner](shot-planner.md) — beats to blocking to numbered shots
- [continuity-supervisor](continuity-supervisor.md) — axis, screen direction, wardrobe and prop state

**Generation**
- [prompt-director](prompt-director.md) — reference plans and compiled prompt packages
- [image-generation-specialist](image-generation-specialist.md) — keyframes via image providers
- [video-generation-specialist](video-generation-specialist.md) — clips via video providers

**Post**
- [editor](editor.md) — assembly order, pacing, the edit plan
- [sound-designer](sound-designer.md) — dialogue, temp score, effects cues
- [colorist](colorist.md) — grade direction, LUTs, palette continuity

**QA**
- [production-qa](production-qa.md) — validation gates, schema and policy checks

## How commands invoke agents

Every `/command` in `commands/` lists the agents it invokes and the skills it
requires; the authoritative map lives in
[docs/conventions.md](../docs/conventions.md). A command activates its agents
in order, each agent applies its skills, and outputs land in `production/`
under the workspace layout. `/full-production` hands the showrunner the whole
map and lets production-qa gate every phase transition.

Frontmatter (`name`, `description`, `tools`, `model`) is mirrored in
`manifests/agents.json` and cross-checked by `npm run validate`.
