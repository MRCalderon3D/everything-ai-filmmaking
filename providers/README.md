# providers/

Thin adapters for generation backends. One file per backend, one common
interface, zero runtime dependencies (Node 18 global `fetch` for the live
HTTP call). The rosters live in `manifests/{image,video,audio}-providers.json`
and must deep-match what each module exports.

```
providers/
├── image/   fal.js  replicate.js  comfyui.js  harness-native.js
├── video/   veo.js  kling.js  runway.js  seedance.js  fal.js
├── audio/   elevenlabs.js  fal.js  local.js
└── lib/     common.js   (shared helpers: env checks, records, polling)
```

## The interface (from docs/conventions.md)

Every `providers/<kind>/<id>.js` exports exactly:

```js
module.exports = {
  id: 'veo',                    // matches the manifest entry
  kind: 'video',                // 'image' | 'video' | 'audio'
  label: 'Google Veo',
  env: ['GOOGLE_API_KEY'],      // required env vars; [] for local/harness-native
  capabilities: { ... },        // hard limits; deep-equal to the manifest
  compile(promptPackage, options = {}) { ... },   // PURE: no I/O, no env reads
  async generate(requestSpec, { dryRun = true, outDir } = {}) { ... },
};
```

### `compile(promptPackage, options)`

- Input: a prompt package (see `schemas/prompt-package.schema.json`).
- Output: a provider-dialect **request spec**:
  `{ provider, kind, model, endpoint, method, body, meta }`.
- Must be pure: no filesystem, no network, no `process.env`. Credentials are
  attached only inside `generate()` at call time, so request specs are safe
  to write to disk.
- Must throw with a clear message when the package violates `capabilities`
  (duration, reference count, aspect ratio, frame conditioning) — use
  `checkCapabilities()` from `lib/common.js`.
- Default model ids are **configuration** (realistic as of 2025), overridable
  via `options.model` or the package's own `model` field (the `'pending'`
  placeholder written by draft packages is ignored). Never hardcode them
  anywhere else.
- Typed generation parameters live in `promptPackage.parameters`
  (`aspect_ratio`, `duration_seconds`, `seed`, `resolution`); references are
  `{asset_id, role, image_path, weight?}` entries from the reference plan.

### `generate(requestSpec, { dryRun = true, outDir })`

- **Dry-run is the default.** It makes no network call and returns a
  generation record (see `schemas/generation-record.schema.json`) with
  `status: 'dry_run'`.
- Live mode must call `assertEnv(provider.env)` first and refuse to run when
  a var is missing. Never log keys or auth headers.
- Providers return the record **object**; writing records/media to disk is
  `scripts/generate-assets.js`'s job. The only I/O a provider does is the
  HTTP call itself (plus polling for async APIs). APIs that return raw bytes
  (e.g. ElevenLabs) attach them as base64 on the record's non-persisted
  `_media` field — generate-assets.js writes the files, fills `media_files`,
  and strips `_media` before the record hits disk.
- `harness-native` (image) and `local` (audio) have no API: `generate()`
  always returns a `dry_run` record whose notes instruct the harness/user to
  produce the asset.

## Env vars

`FAL_KEY`, `REPLICATE_API_TOKEN`, `COMFYUI_HOST`, `GOOGLE_API_KEY`,
`KLING_ACCESS_KEY` + `KLING_SECRET_KEY`, `RUNWAY_API_KEY`, `ARK_API_KEY`,
`ELEVENLABS_API_KEY`. `npm run doctor` reports which are set (names only,
never values).

## Adding a provider

1. Create `providers/<kind>/<id>.js` exporting the interface above. Start
   from an existing adapter of the same kind.
2. Add the matching entry (id, file, label, env, capabilities) to
   `manifests/<kind>-providers.json` — `capabilities` must deep-equal the
   module's export.
3. Add the id to the Providers roster in `docs/conventions.md`.
4. Document any new env var in `docs/conventions.md` and the root README.
5. Run `npm test` (`tests/provider-interface.test.js` picks it up from the
   manifest) and `npm run validate`.

Keep `capabilities` honest — `compile()`, `scripts/validate.js`, and
`scripts/build-reference-plan.js` all treat them as hard limits.
