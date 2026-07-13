'use strict';
/**
 * fal.ai video provider (queue API) — GENERIC adapter.
 * fal hosts many video models with different input schemas; capabilities and
 * the request body here are a conservative common denominator, marked
 * modelDependent in the manifest. Default model
 * 'fal-ai/kling-video/v2.1/standard/image-to-video' is configuration,
 * current as of 2025 — override with options.model / the package's `model`
 * field and adjust body fields via options.extraInputs for the specific
 * model's schema.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refImage, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'fal-ai/kling-video/v2.1/standard/image-to-video';

const provider = {
  id: 'fal',
  kind: 'video',
  label: 'fal.ai video (model-dependent)',
  env: ['FAL_KEY'],
  capabilities: {
    maxDurationSeconds: 10,
    referenceImages: 1,
    startEndFrames: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    audio: false,
    modelDependent: true,
  },

  /** prompt-package -> fal queue request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    const body = {
      prompt: promptPackage.prompt,
      aspect_ratio: params.aspect_ratio || '16:9',
      duration: String(Math.ceil(Math.min(params.duration_seconds || 5, provider.capabilities.maxDurationSeconds))),
    };
    if (promptPackage.negative_prompt) body.negative_prompt = promptPackage.negative_prompt;
    const startImage = promptPackage.start_frame || (refs[0] && refImage(refs[0]));
    if (startImage) body.image_url = startImage;
    if (promptPackage.end_frame) body.tail_image_url = promptPackage.end_frame;
    if (params.seed !== undefined && params.seed !== null) body.seed = params.seed;
    Object.assign(body, options.extraInputs || {});
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
      }, { intervalMs: 8000 });
      const result = await fetchJson(responseUrl, { headers });
      const video = result && (result.video || (result.response && result.response.video));
      const videos = video ? [video] : (result && result.videos) || [];
      markSucceeded(record,
        videos.length ? `fal produced ${videos.length} clip(s)`
          : 'fal response contained no video output (check the model\'s output schema)',
        videos.map((v) => v.url || v), queued.request_id);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
