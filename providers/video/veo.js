'use strict';
/**
 * Google Veo video provider (Gemini API long-running endpoint).
 * Default model 'veo-3.0-generate-001' is configuration, current as of 2025 —
 * override with options.model or the package's `model` field. Veo generates
 * clips up to 8 seconds, 16:9 or 9:16, supports start/end frame
 * conditioning, up to 3 reference images, and native audio.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refImage, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'veo-3.0-generate-001';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const provider = {
  id: 'veo',
  kind: 'video',
  label: 'Google Veo',
  env: ['GOOGLE_API_KEY'],
  capabilities: {
    maxDurationSeconds: 8,
    referenceImages: 3,
    startEndFrames: true,
    aspectRatios: ['16:9', '9:16'],
    audio: true,
  },

  /** prompt-package -> Gemini API predictLongRunning request spec. Pure. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    const instance = { prompt: promptPackage.prompt };
    if (promptPackage.start_frame) {
      instance.image = { uri: promptPackage.start_frame };
    }
    if (promptPackage.end_frame) {
      instance.lastFrame = { uri: promptPackage.end_frame };
    }
    if (refs.length) {
      instance.referenceImages = refs.map((r) => ({
        image: { uri: refImage(r) },
        referenceType: r.role === 'style' ? 'style' : 'asset',
      }));
    }
    const parameters = {
      aspectRatio: params.aspect_ratio || '16:9',
      durationSeconds: Math.ceil(params.duration_seconds || 8),
    };
    if (promptPackage.negative_prompt) parameters.negativePrompt = promptPackage.negative_prompt;
    if (params.seed !== undefined && params.seed !== null) parameters.seed = params.seed;
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `${API_BASE}/models/${model}:predictLongRunning`,
      method: 'POST',
      body: { instances: [instance], parameters },
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
        notes: 'Dry run: no network call. Re-run with --live to submit to the Gemini API.',
      });
    }
    assertEnv(provider.env);
    const headers = {
      'x-goog-api-key': process.env.GOOGLE_API_KEY,
      'Content-Type': 'application/json',
    };
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const op = await fetchJson(requestSpec.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestSpec.body),
      });
      const done = await pollUntil(async () => {
        const st = await fetchJson(`${API_BASE}/${op.name}`, { headers });
        if (st.error) throw new Error(`Veo operation error: ${st.error.message || JSON.stringify(st.error).slice(0, 200)}`);
        return st.done ? st : null;
      }, { intervalMs: 10000 });
      const response = done.response || {};
      const samples = (response.generateVideoResponse && response.generateVideoResponse.generatedSamples) ||
        response.generatedVideos || [];
      const urls = samples
        .map((s) => (s.video && (s.video.uri || s.video.url)) || s.uri || null)
        .filter(Boolean);
      markSucceeded(record,
        urls.length ? `Veo produced ${urls.length} clip(s)` : 'Veo finished without outputs (possibly filtered)',
        urls, op.name);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
