'use strict';
/**
 * Runway video provider (dev API).
 * Default model 'gen4_turbo' is configuration, current as of 2025 — override
 * with options.model or the package's `model` field. gen4_turbo is
 * image-to-video: it requires a prompt image (the shot's start frame or
 * first reference) and does not support an explicit end frame.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refImage, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'gen4_turbo';
const API_BASE = 'https://api.dev.runwayml.com';
const API_VERSION = '2024-11-06';

const ASPECT_TO_RATIO = {
  '16:9': '1280:720',
  '9:16': '720:1280',
  '1:1': '960:960',
  '4:3': '1104:832',
  '3:4': '832:1104',
  '21:9': '1584:672',
};

const provider = {
  id: 'runway',
  kind: 'video',
  label: 'Runway',
  env: ['RUNWAY_API_KEY'],
  capabilities: {
    maxDurationSeconds: 10,
    referenceImages: 3,
    startEndFrames: false,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    audio: false,
  },

  /** prompt-package -> Runway image_to_video request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    const promptImage = promptPackage.start_frame || (refs[0] && refImage(refs[0])) || null;
    if (!promptImage) {
      throw new Error(`prompt package ${promptPackage.id || ''} has no start_frame or reference image; ` +
        'runway gen4_turbo is image-to-video and requires one');
    }
    const body = {
      model,
      promptImage,
      promptText: promptPackage.prompt,
      ratio: ASPECT_TO_RATIO[params.aspect_ratio || '16:9'] || '1280:720',
      duration: (params.duration_seconds || 5) > 5 ? 10 : 5,
    };
    if (params.seed !== undefined && params.seed !== null) body.seed = params.seed;
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `${API_BASE}/v1/image_to_video`,
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
        notes: 'Dry run: no network call. Re-run with --live to submit to Runway.',
      });
    }
    assertEnv(provider.env);
    const headers = {
      Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
      'X-Runway-Version': API_VERSION,
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
        const st = await fetchJson(`${API_BASE}/v1/tasks/${task.id}`, { headers });
        if (st.status === 'SUCCEEDED') return st;
        if (st.status === 'FAILED') throw new Error(`Runway task failed: ${st.failure || st.failureCode || 'no detail'}`);
        return null;
      }, { intervalMs: 5000 });
      const output = Array.isArray(done.output) ? done.output : [];
      markSucceeded(record, `Runway produced ${output.length} clip(s)`, output, task.id);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
