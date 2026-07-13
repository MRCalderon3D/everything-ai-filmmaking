'use strict';
/**
 * fal.ai image provider (queue API).
 * Default model 'fal-ai/flux/dev' is configuration, current as of 2025 —
 * override with options.model or the prompt package's `model` field (e.g. a
 * reference-capable model such as 'fal-ai/flux-pulid' when identity
 * references must be wired in).
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refImage, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'fal-ai/flux/dev';

const ASPECT_TO_IMAGE_SIZE = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
  '21:9': { width: 1536, height: 640 },
};

const provider = {
  id: 'fal',
  kind: 'image',
  label: 'fal.ai (FLUX)',
  env: ['FAL_KEY'],
  capabilities: {
    referenceImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
  },

  /** prompt-package (schemas/prompt-package.schema.json) -> fal request spec. Pure. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const body = {
      prompt: promptPackage.prompt,
      image_size: ASPECT_TO_IMAGE_SIZE[params.aspect_ratio || '16:9'] || 'landscape_16_9',
      num_images: options.numImages || 1,
    };
    if (params.seed !== undefined && params.seed !== null) body.seed = params.seed;
    if (promptPackage.negative_prompt) body.negative_prompt = promptPackage.negative_prompt;
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    if (refs.length) {
      // flux/dev ignores these; reference-capable fal models accept image_url
      // inputs. Kept in the body so a model override picks them up.
      body.reference_images = refs.map(refImage);
    }
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `https://queue.fal.run/${model}`,
      method: 'POST',
      body,
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: refs.map(refId),
      },
    };
  },

  /** Dry-run by default; live mode uses the fal queue API and polls. */
  async generate(requestSpec, { dryRun = true } = {}) {
    if (dryRun) {
      return makeRecord(requestSpec, {
        notes: 'Dry run: no network call. Re-run with --live to submit to fal.ai.',
      });
    }
    assertEnv(provider.env);
    const headers = {
      Authorization: `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    };
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const queued = await fetchJson(requestSpec.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestSpec.body),
      });
      const statusUrl = queued.status_url || `${requestSpec.endpoint}/requests/${queued.request_id}/status`;
      const responseUrl = queued.response_url || `${requestSpec.endpoint}/requests/${queued.request_id}`;
      await pollUntil(async () => {
        const st = await fetchJson(statusUrl, { headers });
        if (st.status === 'COMPLETED') return st;
        if (st.status === 'FAILED' || st.status === 'ERROR') {
          throw new Error(`fal request failed with status ${st.status}`);
        }
        return null;
      }, { intervalMs: 3000 });
      const result = await fetchJson(responseUrl, { headers });
      const images = (result && (result.images || (result.response && result.response.images))) || [];
      markSucceeded(record,
        `fal completed with ${images.length} image(s)` + (result && result.seed !== undefined ? ` (seed ${result.seed})` : ''),
        images.map((img) => img.url || img),
        queued.request_id);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
