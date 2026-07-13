---
name: text-humanization
description: Write and rewrite prose so it reads like a person wrote it, removing the AI-writing tells catalogued in Wikipedia's "Signs of AI writing".
origin: everything-ai-filmmaking
category: story
---

# Text Humanization

## Purpose

Make every piece of human-facing prose this scaffold produces — loglines,
synopses, treatments, bible entries, character bios, storyboard action lines,
dialogue, edit and continuity notes — read like it was written by a person
with moderate hurry and good judgment, not assembled by a model. Based on
Wikipedia's "Signs of AI writing". This skill applies **by default** to all
generated text (see `rules/writing/prose-style.md`); it does not wait to be
asked for.

## Use When

- Any command or agent is about to write or rewrite prose in `production/`.
- The user asks to humanize, rewrite, draft, fix, or improve any text, or asks
  that something "not sound like AI", "sound natural", or "sound human".
- `/humanize` is invoked on a file or pasted text.

## Inputs

- The text to rewrite, or the brief for new text.
- Target register: screenplay, treatment, bible entry, board notes, marketing.
- The original author's voice, when rewriting — keep its idioms and personality.

## Process

1. If rewriting: preserve meaning, facts, and intent. Never summarize away
   content, never invent new information.
2. If drafting: write from scratch under these rules from the first line.
3. Sweep for banned vocabulary and structures (below) and rewrite every hit.
4. Vary sentence and paragraph length; break any mechanical rhythm.
5. Deliver clean text. Do not annotate or explain the edits unless asked.

## Banned Patterns

**Vocabulary tells** — never use these or close variants: delve, tapestry,
vibrant, metaphorical landscape, testament to, crucial, pivotal, comprehensive,
seamless, robust, holistic, cutting-edge, game-changer, revolutionize, foster,
leverage, embark on a journey, realm, elevate, "in today's fast-paced world",
"in the ever-evolving...", "it's important to note", "it's worth mentioning",
"stands as", "serves as", "plays a vital role", "rich cultural heritage",
underscores / highlights / showcasing / reflecting as analytical filler.

**Structural tells:**
- Negative parallelism: "it's not X, it's Y" / "not just X, but Y". Banned.
- Rule of three on autopilot ("fast, reliable, and secure"). At most one
  three-item run per text, and only when the content genuinely comes in threes.
- Present-participle analytical tails glued to plain facts ("..., highlighting
  its enduring influence"). State the fact and stop.
- Vague attribution: "experts agree", "many believe". Name the source or cut
  the claim.
- Summary closers ("In conclusion", "Overall", "Ultimately") and re-stating
  what a section just said. Trust the reader.
- Artificial balance: "while challenges remain, the future looks bright".
- Significance inflation: connecting a small fact to grand themes ("a step
  toward...", "contributes to the broader...").

**Formatting tells:** bold sprinkled everywhere; bullet lists for content that
belongs in prose; emoji in headings; Title Case In Every Heading; em-dashes as
a verbal tic (use commas, periods, or parentheses); rigid
Introduction/Challenges/Future/Conclusion scaffolding; paragraphs of uniform
length.

**Tone tells:** promotional enthusiasm the content hasn't earned ("stunning",
"remarkable", "exceptional"), brochure or press-release voice in documents
that are working notes.

## What To Do Instead

- Mix short and long sentences, the way people talk.
- Concrete, subject-specific vocabulary; data before adjectives; let facts
  speak and let the reader conclude.
- Varied natural connectors — or none when the thread is obvious.
- Small human moves are fine: a sentence starting with "And" or "But", an
  occasional rhetorical question, a colloquialism that fits the register.
- Match the register the user or document demands; if genuinely ambiguous,
  ask once.
- Write in the user's language unless the target document is repo content,
  which is English.

## Outputs

- The rewritten or newly drafted text, in place of the original when a file
  was given.
- With `--check`: a findings list (pattern, location, suggested fix) and no
  rewrite.

## Quality Bar

- Zero hits from the banned-pattern lists on a final pass.
- Meaning, facts, and authorial voice intact after a rewrite.
- Reads aloud without a detectable template rhythm.

## Common Failure Modes

- Swapping banned words for synonyms while keeping the inflated register.
- "Humanizing" structured data: YAML fields, IDs, enums, and provider prompt
  packages are out of scope — prompt text answers to `prompt-compilation`,
  which needs dense literal description, not conversational prose.
- Adding errors or slang to fake humanity. Natural is not sloppy.
- Losing screenplay format discipline while relaxing the prose inside it
  (`rules/writing/screenplay-format.md` still applies).

## Related Agents

- script-editor
- screenwriter

## Related Commands

- humanize

## Notes

Every prose-producing command inherits this skill through
`rules/writing/prose-style.md`; `/humanize` exists for retrofitting existing
text and for spot-checks with `--check`.
