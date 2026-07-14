# Rules

Policy layers for the AI-filmmaking scaffold. Rules define **what good looks
like**; agents and skills define who does the work and how. Every rule is
normative: MUST, SHOULD, and NEVER carry their RFC-2119 meanings.

## Layers

| Layer | Applies to | Files |
|---|---|---|
| `common/` | Every task, always loaded | source-of-truth, project-structure, naming-conventions, asset-provenance, cost-control, approval-policy, self-review, ask-dont-assume |
| `writing/` | Script, story, and dialogue work | screenplay-format, narrative-continuity, prose-style |
| `visual/` | Design, storyboards, shot planning, any framed image | character-consistency, location-consistency, spatial-continuity, visual-language |
| `image/` | Keyframe and still generation | image-generation |
| `video/` | Clip generation and motion design | video-generation, motion-language, clip-boundaries |
| `audio/` | Dialogue, music, and sound work | dialogue, music, sound-effects |
| `cinema/` | Only when `production_type: cinema` | long-form-grammar |
| `commercial/` | Only when `production_type: commercial` | platform-deliverables, message-discipline |

## Resolution order

1. **`common/` always applies.** No task, agent, or command is exempt.
2. **Domain layers load by task.** A task touching a screenplay loads
   `writing/`; a task producing or judging framed imagery loads `visual/`;
   generation tasks additionally load `image/`, `video/`, or `audio/` for the
   media kind being produced. Multi-domain tasks (e.g. `/smart-shot`) load
   every layer they touch.
3. **`visual/` underlies `image/` and `video/`.** Generating any framed
   picture implies the visual layer; never load `image/` or `video/` without it.
4. **More specific wins on overlap.** If a domain rule tightens a common rule
   (never loosens it), the domain rule governs within its scope. A domain rule
   MUST NOT contradict `common/`; if one appears to, `common/` wins and the
   conflict is a bug to report.
5. **Exactly one production-type layer.** `cinema/` and `commercial/` are
   mutually exclusive, selected by `production_type` in
   `production/project.yaml` (default: cinema). They hold only what is
   specific to each mode; craft shared by both belongs in the common and
   domain layers, never duplicated into a production-type layer.
6. **Contexts frame, rules govern.** `contexts/` files describe the current
   production phase; they select emphasis, never override policy.

## Rule format

Every rule follows the contract in `docs/conventions.md`: `# Title`, then
`## Purpose`, `## Scope`, `## Core Principles`, domain-specific sections, and
a closing `## Validation` describing how compliance is checked — by
`scripts/validate.js`, `scripts/check-continuity.js`, hooks in `hooks/`, or
human review.

## Roster

The rule roster is exhaustive (26 rules). Do not add, remove, or rename rules
without updating `docs/conventions.md` and the manifests; `npm run validate`
cross-checks the roster.
