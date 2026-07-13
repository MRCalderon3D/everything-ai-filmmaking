# templates/looks/

Starter look presets — draft `LOOK_*` asset definitions that seed a
production's visual language. Each preset names a look, states when to use
it, and carries the literal prompt vocabulary that produces it, so
`/style-bible` starts from working language instead of a blank page. They
have no JSON schema (`validate.js` skips them) but MUST stay simple parseable
YAML: nested maps, lists, plain strings and numbers.

## Using a preset

1. Copy the file into your workspace and adapt it: rename the `id` to your
   production's look (`LOOK_ANALOG_VHS_V01` → `LOOK_YOURFILM_TAPE_V01`),
   edit vocabulary and grade notes to taste. It stays `status: draft`.
2. Fold it into the style bible via `/style-bible`; generate candidate look
   frames with `/visual-development`.
3. Promote per `rules/common/approval-policy.md`: submit the look and its
   selected frames for review (`draft → review → approved`). On approval the
   look master lands in `production/references/` and is registered in
   `manifest.yaml`; from then on it is immutable — change means a new `_V##`.

## How prompt-director consumes it

When compiling prompt packages, prompt-director draws `prompt_vocabulary`
phrases verbatim into the style block of each package for shots governed by
the look, and merges `negative_vocabulary` into the package's negative
prompt. It never freehands style language — the approved look is the single
source of that vocabulary. `grade_notes` travel to the colorist via the edit
plan, not into prompts.

## Presets

| Preset | ID | One line |
|---|---|---|
| `analog-vhs.yaml` | `LOOK_ANALOG_VHS_V01` | Consumer-tape artifacts — tracking errors, chroma bleed, 4:3 nostalgia. |
| `documentary-observational.yaml` | `LOOK_DOC_OBSERVATIONAL_V01` | Available light, handheld imperfection, un-posed realism. |
| `conceptual-surrealist.yaml` | `LOOK_CONCEPTUAL_SURREALIST_V01` | Deliberate impossibility rendered matter-of-factly, in service of one idea. |
| `classic-cinematic.yaml` | `LOOK_CLASSIC_CINEMATIC_V01` | Anamorphic character, motivated light, controlled palette, filmic texture. |
