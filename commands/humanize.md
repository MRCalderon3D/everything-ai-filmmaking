---
description: Rewrite any generated or existing prose so it reads human — no AI-writing tells — or audit it with --check.
---

# /humanize

## Purpose

Apply the `text-humanization` skill to a specific text: strip the AI-writing
tells catalogued in Wikipedia's "Signs of AI writing" (stock vocabulary,
negative parallelism, rule-of-three rhythm, analytical participle tails,
summary closers, formatting tics) while preserving meaning, facts, and the
author's voice. New prose already inherits these rules by default through
`rules/writing/prose-style.md`; this command retrofits text that predates the
rule, came from outside the project, or slipped through.

## Use When

- Imported material (a treatment, a synopsis, bible notes) sounds
  machine-written and needs a pass before it enters the bibles.
- A generated document under `production/` reads flat or template-shaped.
- You want an audit first: `--check` lists the tells without rewriting.
- The user asks for any text to be humanized, or to "not sound like AI".

## Inputs

- `target` (required): a file path (typically under `production/story/`,
  `production/characters/`, `production/edit/`, or a storyboard) or pasted
  text.
- `--register` (optional): screenplay | treatment | bible | notes | marketing.
  Default: inferred from the file's location and existing voice.
- `--check` (optional flag): report findings only; change nothing.

## Invokes Agents

- script-editor
- screenwriter

## Required Skills

- text-humanization

## Process

1. Read the target and identify its register and, when rewriting, the voice
   worth keeping (idioms, cadence, recurring phrasing).
2. Sweep against the banned-pattern lists in `text-humanization`: vocabulary
   tells, structural tells, formatting tells, tone tells.
3. With `--check`: emit a findings report (pattern, location, suggested fix)
   and stop.
4. Rewrite in place: same meaning, same facts, no invented content, no
   summarizing away detail. Vary sentence and paragraph rhythm.
5. Re-run the sweep on the result; a rewrite that still trips the list goes
   another round before delivery.
6. If the file is schema-backed YAML, touch only free-text fields (synopsis,
   purpose, notes, action lines) — never IDs, enums, paths, or numbers.

## Outputs

- The rewritten file in place (or the cleaned text inline when text was
  pasted). Schema-backed files must still validate against their
  `schemas/<name>.schema.json`.
- With `--check`: a findings report to the conversation; no file changes.

## Notes

- Prompt packages under `production/prompts/` are out of scope: model-facing
  prompt text answers to `prompt-compilation` and needs dense literal
  description, not conversational prose.
- Screenplay files keep Fountain discipline (`rules/writing/screenplay-format.md`);
  humanization loosens the prose inside the format, never the format.
- Dialogue rewrites that change meaning or character knowledge belong to
  `/script-analyze` + screenwriter review, not to this command.
- Approved assets are immutable: humanizing an approved bible entry produces
  a new version per `rules/common/approval-policy.md`.
