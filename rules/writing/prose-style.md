# Prose Style

## Purpose

Make human-sounding prose the default, not a post-processing step. Every piece
of human-facing text this scaffold generates MUST follow the
`text-humanization` skill's rules, whether or not the user asked for it.

## Scope

All free-text prose written to `production/` or to project documents:
loglines, synopses, treatments, story-bible entries, character bios, location
and prop descriptions, storyboard action lines, dialogue, continuity notes,
edit notes, and any README or summary a command emits. Out of scope:
structured YAML fields that are not prose (IDs, enums, paths, numbers),
Fountain formatting elements, and model-facing prompt text in
`production/prompts/` — prompt packages are governed by the
`prompt-compilation` skill and need dense literal description.

## Core Principles

- Generated text is a deliverable, not filler. It MUST read like a person
  with moderate hurry and good judgment wrote it.
- The banned-pattern lists in `skills/text-humanization/SKILL.md` are
  normative. A text that trips them is not done.
- Facts before adjectives. The reader draws the conclusions.
- Voice is an asset: when rewriting, the original author's idioms and cadence
  MUST survive the pass.

## Writing Rules

- Agents MUST apply `text-humanization` while drafting — during, not after.
  A separate cleanup pass is only for text the scaffold did not write.
- Sentence and paragraph length MUST vary; mechanical rhythm is a defect.
- Stock AI vocabulary (delve, tapestry, testament to, crucial, seamless,
  pivotal, leverage, "in today's fast-paced world"...), negative parallelism
  ("it's not X, it's Y"), autopilot rule-of-three, analytical participle
  tails, vague attribution, and summary closers are PROHIBITED per the skill.
- Formatting MUST serve the document: no decorative bold, no bullet lists for
  content that reads as prose, no emoji in headings, no em-dash tics.
- Register MUST match the artifact: screenplay prose obeys
  `rules/writing/screenplay-format.md`; bible entries are working reference
  text, not marketing; board notes are terse and imperative.
- Repo-facing content is English; `production/` prose follows the project's
  working language as set in `project.yaml`.

## Retrofit and Audit

- `/humanize <target>` rewrites existing text under these rules in place;
  `/humanize <target> --check` reports findings without changing the file.
- Imported material SHOULD get a `/humanize` pass before it is promoted into
  a bible or approved as canon.
- Humanizing an approved asset produces a new version; approved versions are
  immutable per `rules/common/approval-policy.md`.

## Validation

- `/humanize --check` is the audit path; reviewers run it on any document
  that reads template-shaped before approving it.
- Schema-backed files touched by a humanization pass MUST still validate via
  `scripts/validate.js` (hooks: `validate-after-write.js`).
- Human review at approval gates includes a read-aloud check: if a section
  scans like a press release or a model summary, it goes back.
