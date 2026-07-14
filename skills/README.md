# Skills

Reusable procedures — how the work is done. One directory per skill containing
`SKILL.md`. Agents load these when a command requires them; the authoritative
command → agents → skills map lives in [docs/conventions.md](../docs/conventions.md).

## Story

| Skill | Description |
|---|---|
| [script-analysis](script-analysis/SKILL.md) | Decompose a screenplay into scenes, beats, and a complete entity registry. |
| [narrative-structure](narrative-structure/SKILL.md) | Map act structure, turning points, setups/payoffs, and pacing across the story. |
| [text-humanization](text-humanization/SKILL.md) | Write and rewrite prose so it reads like a person wrote it — no AI-writing tells. Applies to all generated prose by default. |
| [music-direction](music-direction/SKILL.md) | Choose music early and on purpose — song-as-concept, counterpoint, lyric sync, era targeting — with licensing tracked from day one. |

## Visual

| Skill | Description |
|---|---|
| [character-consistency](character-consistency/SKILL.md) | Lock canonical character identity so every generated appearance matches every other. |
| [character-sheet-generation](character-sheet-generation/SKILL.md) | Produce reference sheets — turnarounds, expressions, wardrobe — that become approved identity masters. |
| [location-design](location-design/SKILL.md) | Define each location's architecture, dressing, lighting logic, and time-of-day states. |
| [location-mapping](location-mapping/SKILL.md) | Build camera-angle maps and spatial geometry for each location. |
| [visual-style-development](visual-style-development/SKILL.md) | Define the film's visual language — palette, lighting, lensing, texture — as an enforceable style bible. |
| [reference-ingestion](reference-ingestion/SKILL.md) | Analyze user-supplied images and turn what they show into bibles, LOOK assets, and registered references with provenance. |

## Production

| Skill | Description |
|---|---|
| [scene-blocking](scene-blocking/SKILL.md) | Stage each scene — positions, movement paths, eyelines, business, and axes — on the location map. |
| [cinematography](cinematography/SKILL.md) | Choose shot size, angle, height, lens, and movement so the camera argues the drama. |
| [shot-sequencing](shot-sequencing/SKILL.md) | Order coverage into a cuttable sequence — axis discipline, cut points, screen direction, and shot-to-shot flow. |
| [storyboard-generation](storyboard-generation/SKILL.md) | Render the shot list as boards — one framed panel per shot with composition and motion notes. |
| [reference-selection](reference-selection/SKILL.md) | Choose exactly which approved reference images each shot needs, and why, within provider limits. |
| [production-orchestration](production-orchestration/SKILL.md) | Run the pipeline — phase gates, approval workflow, dependency order, and batch cost confirmation. |
| [self-evaluation](self-evaluation/SKILL.md) | Evaluate every generated artifact cold — schema, rules, quality bar, improvement pass — before calling it done. Applies by default. |

## Generation

| Skill | Description |
|---|---|
| [prompt-compilation](prompt-compilation/SKILL.md) | Compile provider-ready prompt packages from bibles, shot files, and reference plans — never freehand. |
| [image-generation](image-generation/SKILL.md) | Generate stills and keyframes through image providers with dry-run, seed, provenance, and cost discipline. |
| [video-generation](video-generation/SKILL.md) | Generate shot clips through video providers using start/end frames, within duration and cost limits. |

## Post

| Skill | Description |
|---|---|
| [continuity-checking](continuity-checking/SKILL.md) | Audit axes, screen direction, wardrobe, props, lighting, and eyelines across shots and scenes. |
| [edit-planning](edit-planning/SKILL.md) | Plan the assembly — clip order, pacing, transitions, sound, and color notes — into an executable edit plan. |

## Format

Every `SKILL.md` follows the skill template in
[docs/conventions.md](../docs/conventions.md): frontmatter (`name`,
`description`, `origin: everything-ai-filmmaking`, `category`) and the sections
Purpose, Use When, Inputs, Process, Outputs, Quality Bar, Common Failure Modes,
Related Agents, Related Commands, Notes. Related agent and command names come
only from the rosters; `manifests/skills.json` and `npm run validate`
cross-check this index.
