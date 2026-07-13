'use strict';
/**
 * Replicate image provider.
 * Default model 'black-forest-labs/flux-dev' is configuration, current as of
 * 2025 — override with options.model or the package's `model` field.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refImage, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'black-forest-labs/flux-dev';

const provider = {
  id: 'replicate',
  kind: 'image',
  label: 'Replicate (FLUX)',
  env: ['REPLICATE_API_TOKEN'],
  capabilities: {
    referenceImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
  },

  /** prompt-package -> Replicate prediction request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const input = {
      prompt: promptPackage.prompt,
      aspect_ratio: params.aspect_ratio || '16:9',
      num_outputs: options.numImages || 1,
      output_format: 'png',
    };
    if (params.seed !== undefined && params.seed !== null) input.seed = params.seed;
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    if (refs.length) {
      // flux-dev accepts a single conditioning image via `image` (img2img).
      input.image = refImage(refs[0]);
    }
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `https://api.replicate.com/v1/models/${model}/predictions`,
      method: 'POST',
      body: { input },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: refs.map(refId),
      },
    };
  },

  async generate(requestSpec, { dryRun = true } = {}) {
    if (dryRun) {
      return makeRecord(requestSpec, {
        notes: 'Dry run: no network call. Re-run with --live to submit to Replicate.',
      });
    }
    assertEnv(provider.env);
    const headers = {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const prediction = await fetchJson(requestSpec.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestSpec.body),
      });
      const pollUrl = (prediction.urls && prediction.urls.get) ||
        `https://api.replicate.com/v1/predictions/${prediction.id}`;
      const done = await pollUntil(async () => {
        const st = await fetchJson(pollUrl, { headers });
        if (st.status === 'succeeded') return st;
        if (st.status === 'failed' || st.status === 'canceled') {
          throw new Error(`replicate prediction ${st.status}: ${st.error || 'no detail'}`);
        }
        return null;
      }, { intervalMs: 3000 });
      const output = Array.isArray(done.output) ? done.output : (done.output ? [done.output] : []);
      markSucceeded(record, `replicate prediction succeeded with ${output.length} output(s)`,
        output, prediction.id);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
