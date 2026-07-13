'use strict';
/**
 * fal.ai audio provider (queue API) — GENERIC adapter.
 * fal hosts TTS, music, and SFX models with different schemas; this adapter
 * is a conservative common denominator, marked modelDependent in the
 * manifest. Default model 'fal-ai/elevenlabs/tts/multilingual-v2' is
 * configuration, current as of 2025 — override with options.model / the
 * package's `model` field (e.g. a music or sound-effects model) and pass
 * model-specific inputs via options.extraInputs.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil,
} = require('../lib/common');

const DEFAULT_MODEL = 'fal-ai/elevenlabs/tts/multilingual-v2';

const provider = {
  id: 'fal',
  kind: 'audio',
  label: 'fal.ai audio (model-dependent)',
  env: ['FAL_KEY'],
  capabilities: {
    maxDurationSeconds: 300,
    voiceCloning: false,
    formats: ['mp3', 'wav'],
    modelDependent: true,
  },

  /** prompt-package -> fal queue request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const text = promptPackage.prompt;
    if (!text) {
      throw new Error(`prompt package ${promptPackage.id || ''} has no prompt text for audio`);
    }
    const body = Object.assign({ text }, options.extraInputs || {});
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
        references_used: [],
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
      }, { intervalMs: 3000 });
      const result = await fetchJson(responseUrl, { headers });
      const audio = result && (result.audio || result.audio_url ||
        (result.response && (result.response.audio || result.response.audio_url)));
      const url = audio && (audio.url || audio);
      markSucceeded(record,
        url ? 'fal produced 1 audio file'
          : 'fal response contained no audio output (check the model\'s output schema)',
        url ? [url] : [], queued.request_id);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
