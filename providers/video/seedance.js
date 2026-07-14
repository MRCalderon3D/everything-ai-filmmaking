'use strict';
/**
 * Seedance video provider (BytePlus Ark content-generation tasks API).
 * Default model 'seedance-1-0-pro' is configuration, current as of 2025 —
 * override with options.model or the package's `model` field (Ark
 * deployments may require a versioned id, e.g. 'seedance-1-0-pro-250528').
 * Seedance takes generation parameters as "--flag value" suffixes on the
 * text prompt and supports first/last frame conditioning via image_url
 * content items.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'seedance-1-0-pro';
const API_BASE = 'https://ark.ap-southeast.bytepluses.com/api/v3';

const provider = {
  id: 'seedance',
  kind: 'video',
  label: 'Seedance (BytePlus Ark)',
  env: ['ARK_API_KEY'],
  capabilities: {
    maxDurationSeconds: 10,
    referenceImages: 2,
    startEndFrames: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    audio: false,
  },

  /** prompt-package -> Ark create-task request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const duration = Math.ceil(Math.min(params.duration_seconds || 5, provider.capabilities.maxDurationSeconds));
    const textParts = [promptPackage.prompt];
    textParts.push(`--ratio ${params.aspect_ratio || '16:9'}`);
    textParts.push(`--duration ${duration}`);
    textParts.push(`--resolution ${params.resolution || options.resolution || '1080p'}`);
    if (params.seed !== undefined && params.seed !== null) {
      textParts.push(`--seed ${params.seed}`);
    }
    // Seedance has no negative-prompt syntax: prevention must be phrased
    // positively inside the main prompt (rules/video/video-generation.md).
    // A package's negative_prompt is deliberately dropped, and flagged in
    // meta so the generation record shows it.
    const content = [{ type: 'text', text: textParts.join(' ') }];
    if (promptPackage.start_frame) {
      content.push({ type: 'image_url', image_url: { url: promptPackage.start_frame }, role: 'first_frame' });
    }
    if (promptPackage.end_frame) {
      content.push({ type: 'image_url', image_url: { url: promptPackage.end_frame }, role: 'last_frame' });
    }
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `${API_BASE}/contents/generations/tasks`,
      method: 'POST',
      body: { model, content },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: refs.map(refId),
        negative_prompt_dropped: Boolean(promptPackage.negative_prompt),
      },
    };
  },

  async generate(requestSpec, { dryRun = true } = {}) {
    if (dryRun) {
      return makeRecord(requestSpec, {
        notes: 'Dry run: no network call. Re-run with --live to submit to BytePlus Ark.',
      });
    }
    assertEnv(provider.env);
    const headers = {
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const task = await fetchJson(requestSpec.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestSpec.body),
      });
      const done = await pollUntil(async () => {
        const st = await fetchJson(`${requestSpec.endpoint}/${task.id}`, { headers });
        if (st.status === 'succeeded') return st;
        if (st.status === 'failed' || st.status === 'cancelled') {
          throw new Error(`Seedance task ${st.status}: ${(st.error && st.error.message) || 'no detail'}`);
        }
        return null;
      }, { intervalMs: 8000 });
      const url = done.content && done.content.video_url;
      markSucceeded(record,
        url ? 'Seedance produced 1 clip' : 'Seedance succeeded but returned no video_url',
        url ? [url] : [], task.id);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
