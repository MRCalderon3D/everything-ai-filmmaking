'use strict';
/**
 * Shared helpers for provider adapters. Zero dependencies.
 * Providers stay I/O-free except for the live HTTP call (Node 18 global
 * fetch); all record/file writing belongs to scripts/generate-assets.js.
 */

const crypto = require('crypto');

/** Stable JSON stringify (sorted keys) for hashing. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function hashObject(obj) {
  return crypto.createHash('sha256').update(stableStringify(obj)).digest('hex').slice(0, 16);
}

/** Throw when required env vars are missing. Never echoes values. */
function assertEnv(envNames) {
  const missing = (envNames || []).filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`missing required environment variable(s): ${missing.join(', ')} — refusing to run live`);
  }
}

/**
 * Read the typed generation parameters from a prompt package
 * (schemas/prompt-package.schema.json: parameters.{aspect_ratio,
 * duration_seconds, seed, resolution}).
 */
function packageParams(pkg) {
  return (pkg && typeof pkg.parameters === 'object' && pkg.parameters) || {};
}

/** Reference image path/id accessors tolerant of both draft and final shapes. */
function refImage(ref) {
  return ref.image_path || ref.path || ref.url || ref.asset_id || ref.id;
}
function refId(ref) {
  return ref.asset_id || ref.id || ref.image_path;
}

/** Capability checks shared by compile() implementations. */
function checkCapabilities(pkg, capabilities, providerId) {
  const problems = [];
  const params = packageParams(pkg);
  const refs = Array.isArray(pkg.references) ? pkg.references : [];
  if (typeof capabilities.referenceImages === 'number' && refs.length > capabilities.referenceImages) {
    problems.push(`${refs.length} reference images exceed provider limit ${capabilities.referenceImages}`);
  }
  if (capabilities.maxDurationSeconds && params.duration_seconds &&
      params.duration_seconds > capabilities.maxDurationSeconds) {
    problems.push(`duration ${params.duration_seconds}s exceeds provider limit ${capabilities.maxDurationSeconds}s`);
  }
  if (Array.isArray(capabilities.aspectRatios) && params.aspect_ratio &&
      !capabilities.aspectRatios.includes(params.aspect_ratio)) {
    problems.push(`aspect ratio ${params.aspect_ratio} not supported (supported: ${capabilities.aspectRatios.join(', ')})`);
  }
  if (capabilities.startEndFrames === false && (pkg.end_frame)) {
    problems.push('end_frame conditioning is not supported by this provider');
  }
  if (problems.length) {
    throw new Error(`prompt package ${pkg.id || '(no id)'} violates ${providerId} capabilities: ${problems.join('; ')}`);
  }
}

/**
 * Build a generation record (schemas/generation-record.schema.json shape).
 * The record contains no secrets: only endpoint, model, and a payload hash.
 */
function makeRecord(requestSpec, extra = {}) {
  const meta = requestSpec.meta || {};
  // Scope: shot generations carry shot_id; asset-scoped generations
  // (masters, reference sheets) carry asset_id with shot null.
  const shot = meta.shot_id || null;
  const asset = meta.asset_id || null;
  const scope = shot || asset || 'SH_000_000';
  const record = {
    id: meta.record_id || `GEN_${scope}_00`,
    shot,
    provider: requestSpec.provider,
    model: requestSpec.model,
    kind: requestSpec.kind,
    prompt_package: meta.prompt_package_id || `PP_${scope}_${String(requestSpec.provider || 'X').toUpperCase().replace(/[^A-Z0-9_-]+/g, '-')}`,
    request: {
      summary: `${requestSpec.method || 'LOCAL'} ${requestSpec.endpoint || '(no endpoint — manual/harness step)'} model=${requestSpec.model}`,
      payload_hash: hashObject(requestSpec.body || {}),
    },
    media_files: [],
    cost: {
      currency: 'USD',
      amount: typeof meta.cost_estimate === 'number' ? Math.max(0, meta.cost_estimate) : 0,
      estimated: true,
    },
    status: 'dry_run',
    created_at: new Date().toISOString(),
  };
  if (asset) record.asset = asset;
  if (requestSpec.endpoint) record.request.endpoint = requestSpec.endpoint;
  return Object.assign(record, extra);
}

/** Flip a record to succeeded with a response summary + media URLs/paths. */
function markSucceeded(record, summary, mediaFiles = [], jobId = undefined) {
  record.status = 'succeeded';
  record.response = { summary };
  if (jobId) record.response.provider_job_id = String(jobId);
  record.response.error = null;
  record.media_files = mediaFiles.filter(Boolean).map(String);
  if (!record.media_files.length) {
    record.status = 'failed';
    record.response.error = 'provider reported success but returned no media';
  }
  return record;
}

/** Flip a record to failed with the error message. */
function markFailed(record, err) {
  record.status = 'failed';
  record.response = {
    summary: 'request failed',
    error: err && err.message ? err.message : String(err),
  };
  return record;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** JSON fetch wrapper. Never logs headers (they may carry credentials). */
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    // non-JSON body; keep raw text
  }
  if (!res.ok) {
    const detail = json && (json.error && (json.error.message || json.error)) ||
      (text ? text.slice(0, 300) : res.statusText);
    throw new Error(`HTTP ${res.status} from ${url.split('?')[0]}: ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)}`);
  }
  return json;
}

/**
 * Poll an async job until done() returns a truthy result or timeout.
 * @param {() => Promise<any>} check resolves to a truthy value when finished
 */
async function pollUntil(check, { intervalMs = 5000, timeoutMs = 600000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > deadline) throw new Error('polling timed out');
    await sleep(intervalMs);
  }
}

module.exports = {
  stableStringify,
  hashObject,
  assertEnv,
  packageParams,
  refImage,
  refId,
  checkCapabilities,
  makeRecord,
  markSucceeded,
  markFailed,
  sleep,
  fetchJson,
  pollUntil,
};
