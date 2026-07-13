'use strict';
/**
 * Kling video provider (Kling v2 API).
 * Default model 'kling-v2-master' is configuration, current as of 2025 —
 * override with options.model or the package's `model` field. Auth uses a
 * short-lived JWT signed with KLING_ACCESS_KEY / KLING_SECRET_KEY (HS256,
 * built with node:crypto).
 */

const crypto = require('crypto');
const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'kling-v2-master';
const API_BASE = 'https://api-singapore.klingai.com';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Sign a Kling API JWT. Never log the token or the keys. */
function signJwt(accessKey, secretKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 }));
  const sig = b64url(crypto.createHmac('sha256', secretKey).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

const provider = {
  id: 'kling',
  kind: 'video',
  label: 'Kling',
  env: ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY'],
  capabilities: {
    maxDurationSeconds: 10,
    referenceImages: 4,
    startEndFrames: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    audio: false,
  },

  /** prompt-package -> Kling create-task request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const hasStart = Boolean(promptPackage.start_frame);
    const path = hasStart ? '/v1/videos/image2video' : '/v1/videos/text2video';
    // Kling accepts duration "5" or "10" (seconds).
    const duration = (params.duration_seconds || 5) > 5 ? '10' : '5';
    const body = {
      model_name: model,
      prompt: promptPackage.prompt,
      duration,
      mode: options.mode || 'pro',
    };
    if (promptPackage.negative_prompt) body.negative_prompt = promptPackage.negative_prompt;
    if (hasStart) {
      body.image = promptPackage.start_frame;
      if (promptPackage.end_frame) body.image_tail = promptPackage.end_frame;
    } else {
      body.aspect_ratio = params.aspect_ratio || '16:9';
    }
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `${API_BASE}${path}`,
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
        notes: 'Dry run: no network call. Re-run with --live to submit to Kling.',
      });
    }
    assertEnv(provider.env);
    const authHeader = () => ({
      Authorization: `Bearer ${signJwt(process.env.KLING_ACCESS_KEY, process.env.KLING_SECRET_KEY)}`,
    });
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const created = await fetchJson(requestSpec.endpoint, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
        body: JSON.stringify(requestSpec.body),
      });
      if (created.code !== 0 && created.code !== undefined && created.code !== null) {
        throw new Error(`Kling create failed: code ${created.code} ${created.message || ''}`.trim());
      }
      const taskId = created.data && created.data.task_id;
      if (!taskId) throw new Error('Kling create response had no task_id');
      const done = await pollUntil(async () => {
        const st = await fetchJson(`${requestSpec.endpoint}/${taskId}`, { headers: authHeader() });
        const status = st.data && st.data.task_status;
        if (status === 'succeed') return st.data;
        if (status === 'failed') throw new Error(`Kling task failed: ${(st.data && st.data.task_status_msg) || 'no detail'}`);
        return null;
      }, { intervalMs: 8000 });
      const videos = (done.task_result && done.task_result.videos) || [];
      markSucceeded(record, `Kling produced ${videos.length} clip(s)`,
        videos.map((v) => v.url), taskId);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
