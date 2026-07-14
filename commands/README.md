# Commands

Workflow entry points (`/command-name`) for the AI-filmmaking pipeline. Each
file follows the Command format in [docs/conventions.md](../docs/conventions.md);
`Invokes Agents` and `Required Skills` mirror the authoritative map there and
are cross-checked by `npm run validate`.

## Setup

| Command | Description |
|---|---|
| [project-init](project-init.md) | Scaffold a `production/` workspace with project metadata, directory skeleton, and starter templates. |

## Development (script and story)

| Command | Description |
|---|---|
| [script-analyze](script-analyze.md) | Break a screenplay into scene structure, beats, and a complete entity inventory. |
| [story-bible](story-bible.md) | Compile the canonical narrative reference — world rules, timeline, arcs, and tone. |
| [music-brief](music-brief.md) | Set the music strategy in development — cues, tempo map, lyric sync points, licensing — before shot planning. |
| [humanize](humanize.md) | Rewrite any generated or existing prose so it reads human — no AI-writing tells — or audit it with `--check`. |

## Pre-production (bibles and look)

| Command | Description |
|---|---|
| [character-bible](character-bible.md) | Define identity, wardrobe states, and reference-sheet plans for every character. |
| [location-bible](location-bible.md) | Define locations with spatial geometry, camera-angle maps, and lighting logic. |
| [prop-bible](prop-bible.md) | Catalog plot-critical props with appearance, state timeline, and custody tracking. |
| [style-bible](style-bible.md) | Lock the film's visual language — palette, lighting, lensing, grain, and grade intent. |
| [visual-development](visual-development.md) | Generate and iterate the master reference images — character sheets, location plates, look frames. |

## Shot planning (previs)

| Command | Description |
|---|---|
| [scene-breakdown](scene-breakdown.md) | Break each scene into beats, entities present, and blocking requirements. |
| [shot-list](shot-list.md) | Design the coverage plan — a complete, cuttable shot list per scene. |
| [smart-shot](smart-shot.md) | **Centerpiece.** Turn one scene into a complete multi-shot cinematic proposal — blocking, coverage, boards, references, prompts, continuity. |
| [storyboard](storyboard.md) | Produce storyboards from a scene's shot list — frame descriptions, board images, and a manifest. |
| [reference-plan](reference-plan.md) | Decide exactly which approved reference images each shot conditions on. |

## Generation

| Command | Description |
|---|---|
| [generate-keyframes](generate-keyframes.md) | Generate start/end keyframes for shots via image providers, with cost confirmation and provenance. |
| [generate-clips](generate-clips.md) | Generate video clips per shot via video providers, gated by cost confirmation and keyframe approval. |

## Post-production

| Command | Description |
|---|---|
| [continuity-review](continuity-review.md) | Audit axis, screen direction, wardrobe, props, and light across shots and scene boundaries. |
| [edit-plan](edit-plan.md) | Assemble the edit — cut order, pacing, transitions, sound design, music, and grade notes. |

## Orchestration

| Command | Description |
|---|---|
| [full-production](full-production.md) | Orchestrate the entire pipeline from script to edit plan, with approval gates and cost confirmation. |
| [self-review](self-review.md) | Run the self-evaluation pass on existing artifacts — gates plus improvement pass — reporting or fixing. |

## Typical end-to-end order

```
/project-init
/script-analyze
/story-bible
/music-brief                 # music strategy before shot planning
/character-bible → /location-bible → /prop-bible → /style-bible
/visual-development          # first paid step: master references
/scene-breakdown
/smart-shot                  # per scene (or /shot-list + /storyboard + /reference-plan)
/generate-keyframes          # paid, cost-gated
/generate-clips              # paid, cost-gated
/continuity-review
/edit-plan
```

Or run the whole thing with gates: `/full-production`.

Commands that spend generation budget (`/visual-development`,
`/generate-keyframes`, `/generate-clips`, and rendered `/storyboard`) are
dry-run by default and always show a cost estimate before a live batch.

All prose these commands produce follows the `text-humanization` skill by
default (`rules/writing/prose-style.md`); `/humanize` retrofits existing or
imported text at any point in the pipeline.

Every artifact these commands generate passes the `self-evaluation` gates
before delivery (`rules/common/self-review.md`); `/self-review` retrofits
existing artifacts and audits scenes before human review.
