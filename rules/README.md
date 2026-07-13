# Rules

Policy layers for the AI-filmmaking scaffold. Rules define **what good looks
like**; agents and skills define who does the work and how. Every rule is
normative: MUST, SHOULD, and NEVER carry their RFC-2119 meanings.

## Layers

| Layer | Applies to | Files |
|---|---|---|
| `common/` | Every task, always loaded | source-of-truth, project-structure, naming-conventions, asset-provenance, cost-control, approval-policy |
| `writing/` | Script, story, and dialogue work | screenplay-format, narrative-continuity |
| `visual/` | Design, storyboards, shot planning, any framed image | character-consistency, location-consistency, spatial-continuity, visual-language |
| `image/` | Keyframe and still generation | image-generation |
| `video/` | Clip generation and motion design | video-generation, motion-language, clip-boundaries |
| `audio/` | Dialogue, music, and sound work | dialogue, music, sound-effects |

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
5. **Contexts frame, rules govern.** `contexts/` files describe the current
   production phase; they select emphasis, never override policy.

## Rule format

Every rule follows the contract in `docs/conventions.md`: `# Title`, then
`## Purpose`, `## Scope`, `## Core Principles`, domain-specific sections, and
a closing `## Validation` describing how compliance is checked — by
`scripts/validate.js`, `scripts/check-continuity.js`, hooks in `hooks/`, or
human review.

## Roster

The rule roster is exhaustive (20 rules). Do not add, remove, or rename rules
without updating `docs/conventions.md` and the manifests; `npm run validate`
cross-checks the roster.
