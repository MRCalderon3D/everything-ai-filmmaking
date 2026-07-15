<div align="center">

# Everything AI Filmmaking

### A universal scaffold for AI-assisted filmmaking.

### From script to edit plan. Multi-harness. One coordinated production office.

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
![agents](https://img.shields.io/badge/agents-17-blueviolet)
![commands](https://img.shields.io/badge/commands-22-orange)
![skills](https://img.shields.io/badge/skills-23-brightgreen)
![rules](https://img.shields.io/badge/rules-26-yellow)
![schemas](https://img.shields.io/badge/schemas-15-red)
![contexts](https://img.shields.io/badge/contexts-5-00b4c8)
![harnesses](https://img.shields.io/badge/harnesses-5-8b5e3c)
![providers](https://img.shields.io/badge/providers-image%20%7C%20video%20%7C%20audio-9b30ff)

**Claude Code · Codex · Cursor · OpenCode** — bibles as canon, references before
prompts, continuity as state, strict provenance, shared standards.

</div>

---

Not just a prompt collection — a structured operating system for film
productions that combines:

- **Rules** for policy and craft standards (with mutually exclusive
  cinema/commercial production layers)
- **Agents** for role specialization — a full production office
- **Commands** for repeatable entry points, `/smart-shot` as the centerpiece
- **Skills** for reusable execution patterns
- **Schemas** validating every artifact in `production/`
- **Providers** for image, video, and audio generation — API, in-harness
  (gpt-image, Nano Banana), or fully manual (Higgsfield and any web UI)
- **Contexts** for phase-specific behavior
- **Hooks** for workflow automation and asset protection
- **Harness adapters** generated from one source of truth

Same architecture as
[everything-game-dev-code](https://github.com/MRCalderon3D/everything-game-dev-code),
applied to audiovisual production. Open your film project in your assistant
and run production commands — no app, no interface, just structured files.

```
/project-init          # scaffold a production/ workspace
/script-analyze        # break a screenplay into structure, beats, entities
/story-bible           # canonical narrative reference
/music-brief           # music strategy set in development, not in post
/character-bible       # identity, wardrobe, and reference sheets per character
/location-bible        # locations, camera-angle maps, spatial geometry
/style-bible           # visual language, palette, lighting, lensing
/ingest-references     # bring your own images; they become the canon
/scene-breakdown       # scenes -> beats, entities, blocking needs
/shot-list             # coverage plan per scene
/smart-shot            # scene -> full multi-shot cinematic proposal
/storyboard            # boards from shots
/reference-plan        # exactly which reference images each shot needs
/generate-keyframes    # start/end frames via image providers
/generate-clips        # video clips via video providers
/continuity-review     # axis, wardrobe, props, screen-direction audit
/self-review           # every output self-evaluates; this retrofits and audits
/edit-plan             # assembly order, pacing, sound and color notes
/humanize              # strip AI-writing tells from any prose, keep the voice
/full-production       # orchestrate the whole pipeline
```

## Why

Video generation models are strong at single shots and weak at everything that
makes shots into a film: identity consistency, spatial continuity, coverage
logic, screen direction, wardrobe state, prop tracking, pacing. Those are
*pre-production and continuity problems*, and they are exactly what structured
files + disciplined agents are good at. This scaffold makes the assistant do
the work of a production office: bibles as source of truth, reference plans
before prompts, continuity state after every scene, provenance for every
generated asset, and cost confirmation before every batch.

## Quickstart

Clone and talk — no install step:

```bash
git clone https://github.com/MRCalderon3D/everything-ai-filmmaking my-film
cd my-film
# open your assistant here (claude / codex / cursor) and say what you want:
#   "I want a 40-second realistic zombie short. Set up the project."
# /project-init creates production/ right here; every command is already wired.
```

For an **existing** project of your own (or a lean profile), install the
scaffold into it instead:

```bash
node scripts/install.js --target ../my-film --harness codex --profile full
```

**New here? Follow the full walkthrough:** [docs/getting-started.md](docs/getting-started.md)
— install to edit plan on the worked noir example, with every command and
its CLI equivalent.

## The centerpiece: `/smart-shot`

Turns one scene into a complete multi-shot cinematic proposal:

```
/smart-shot production/scenes/SC_004/scene.yaml --duration 18s --shots 5 --provider veo --style cinematic
```

```
scene → interpret beats → resolve blocking → decide coverage → create shots
      → assign timing → set cameras → select references → compile prompts
      → generate storyboard → validate continuity
```

Output (all schema-validated YAML/Markdown):

```
production/scenes/SC_004/
├── scene.yaml            ├── storyboard/storyboard.md
├── blocking.yaml         ├── references/reference-plan.yaml
├── shots/SH_004_001.yaml ├── prompts/veo/ kling/ generic/
│   ...                   └── continuity/scene-state.yaml
```

Every shot carries narrative purpose, timing with handles, camera (size, angle,
height, lens, movement), blocking with eyelines, continuity (axis, screen
direction, neighbors), required reference assets, and generation flags — see
[schemas/shot.schema.json](schemas/shot.schema.json).

## Structure

```
agents/       17 roles: showrunner, screenwriter, visual-director, cinematographer,
              shot-planner, continuity-supervisor, prompt-director, …
commands/     22 workflow entry points (the slash commands above)
skills/       23 procedures: scene-blocking, cinematography, reference-selection,
              prompt-compilation, continuity-checking, …
rules/        policy layers: common/ writing/ visual/ image/ video/ audio/
              + one production-type layer: cinema/ OR commercial/
contexts/     phase framing: development, preproduction, production, post, review
schemas/      15 JSON Schemas for every artifact in production/
manifests/    machine-readable index (validation + install profiles)
templates/    starter files for new workspaces
scripts/      Node >= 18, zero-dep tooling: install, doctor, validate,
              sync-harnesses, create-project, compile-prompts,
              build-reference-plan, generate-assets, check-continuity
providers/    image: fal, replicate, comfyui, harness-native
              video: veo, kling, runway, seedance, fal
              audio: elevenlabs, fal, local
hooks/        validate-after-write, protect-approved-assets,
              detect-continuity-drift, require-cost-confirmation
.claude/ .codex/ .cursor/ .opencode/ .agents/   generated wrappers — do not edit
```

Authoring contract: [docs/conventions.md](docs/conventions.md).

## Providers and keys

Generation is **dry-run by default** — prompts and request specs are written to
`production/prompts/` and `production/generations/` without network calls. Live
generation requires the provider's env var and an explicit `--live` flag:

| Provider | Kind | Env |
|---|---|---|
| fal | image, video, audio | `FAL_KEY` |
| replicate | image | `REPLICATE_API_TOKEN` |
| comfyui | image | `COMFYUI_HOST` |
| harness-native | image | — (your assistant's own tool — on Codex, gpt-image via your subscription — or hand generation in any image UI) |
| gemini | image | `GOOGLE_API_KEY` (Nano Banana — same key as Veo) |
| veo | video | `GOOGLE_API_KEY` |
| kling | video | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |
| runway | video | `RUNWAY_API_KEY` |
| seedance | video | `ARK_API_KEY` |
| manual | video | — (hand generation in any web UI, e.g. Higgsfield: the scaffold hands you prompt + reference files + frames) |
| elevenlabs | audio | `ELEVENLABS_API_KEY` |
| local | audio | — |

## Principles

1. **Bibles outrank prompts.** Approved masters in `production/references/` are
   the source of truth; prompts are compiled from them, never freehanded.
2. **References before generation.** Every shot gets a reference plan (identity,
   wardrobe, set geometry, props, look) before any prompt is written.
3. **Continuity is state.** Axis, screen direction, wardrobe, and prop state are
   tracked per scene and validated across cuts.
4. **Provenance always.** Every generated asset has a generation record:
   provider, model, prompt hash, references, cost, timestamp.
5. **Cost is a gate.** Batch generation estimates cost and asks first.

## License

MIT — see [LICENSE](LICENSE).
