'use strict';
/**
 * All 12 providers export the contracted interface; compile() produces a
 * request spec from a schema-shaped prompt package; generate() defaults to
 * dry-run and returns a generation-record object without touching the
 * network.
 */

const assert = require('assert');
const path = require('path');
const { listProviders } = require('../scripts/lib/providers');

const ROOT = path.resolve(__dirname, '..');

function providerTag(id) {
  return id.toUpperCase().replace(/[^A-Z0-9_-]+/g, '-');
}

/** A prompt package per schemas/prompt-package.schema.json, fitted to caps. */
function samplePackage(kind, provider) {
  const caps = provider.capabilities || {};
  const refCount = Math.min(2, typeof caps.referenceImages === 'number' ? caps.referenceImages : 2);
  const pkg = {
    id: `PP_SH_004_002_${providerTag(provider.id)}`,
    shot: 'SH_004_002',
    provider: provider.id,
    model: 'pending',
    prompt: 'Medium close-up, slow dolly-in. Mara slides into the corner booth of a rain-streaked diner at night, neon reflections on the window. Dialogue: "You came back."',
    negative_prompt: 'blurry, extra fingers',
    parameters: {
      aspect_ratio: (caps.aspectRatios && caps.aspectRatios[0]) || '16:9',
      seed: 41,
    },
    references: Array.from({ length: refCount }, (_, i) => ({
      asset_id: `CHAR_MARA_FACE_MASTER_V0${i + 1}`,
      role: i === 0 ? 'facial_identity' : 'spatial_geometry',
      image_path: `references/CHAR_MARA_FACE_MASTER_V0${i + 1}.png`,
    })),
    start_frame: null,
    end_frame: null,
    status: 'compiled',
  };
  if (kind === 'video') {
    pkg.parameters.duration_seconds = Math.min(5, caps.maxDurationSeconds || 5);
    pkg.start_frame = 'generations/SH_004_001/last.png';
  }
  return pkg;
}

async function checkProvider(entry) {
  const file = path.join(ROOT, ...entry.file.split('/'));
  const mod = require(file);

  // exact interface
  assert.deepStrictEqual(Object.keys(mod).sort(),
    ['capabilities', 'compile', 'env', 'generate', 'id', 'kind', 'label'].sort(),
    `${entry.file}: must export exactly id/kind/label/env/capabilities/compile/generate`);
  assert.strictEqual(mod.id, entry.id, `${entry.file}: id mismatch`);
  assert.strictEqual(mod.kind, entry.kind, `${entry.file}: kind mismatch`);
  assert.strictEqual(typeof mod.label, 'string');
  assert.deepStrictEqual(mod.env, entry.env, `${entry.file}: env differs from manifest`);
  assert.deepStrictEqual(mod.capabilities, entry.capabilities,
    `${entry.file}: capabilities differ from manifest`);
  assert.strictEqual(typeof mod.compile, 'function');
  assert.strictEqual(typeof mod.generate, 'function');

  // compile() a sample package
  const pkg = samplePackage(entry.kind, mod);
  const spec = mod.compile(pkg);
  assert.strictEqual(spec.provider, mod.id);
  assert.strictEqual(spec.kind, mod.kind);
  assert.ok(typeof spec.model === 'string' && spec.model.length, `${entry.file}: spec.model missing`);
  assert.ok('endpoint' in spec && 'body' in spec, `${entry.file}: spec needs endpoint + body`);
  assert.ok(spec.meta && spec.meta.shot_id === 'SH_004_002', `${entry.file}: spec.meta.shot_id`);
  assert.strictEqual(spec.meta.prompt_package_id, pkg.id, `${entry.file}: spec.meta.prompt_package_id`);
  assert.ok(spec.meta.prompt_package_hash, `${entry.file}: spec.meta.prompt_package_hash`);
  const specJson = JSON.stringify(spec);
  for (const envName of mod.env) {
    const val = process.env[envName];
    if (val && val.length > 3) {
      assert.ok(!specJson.includes(val), `${entry.file}: request spec leaked ${envName}`);
    }
  }

  // model override is honored ('pending' placeholder must not win)
  const overridden = mod.compile(pkg, { model: 'custom/model-id' });
  assert.strictEqual(overridden.model, 'custom/model-id', `${entry.file}: options.model ignored`);
  const pinned = mod.compile(Object.assign({}, pkg, { model: 'package/pinned-model' }));
  assert.strictEqual(pinned.model, 'package/pinned-model', `${entry.file}: package model ignored`);

  // capability enforcement (video duration)
  if (entry.kind === 'video' && mod.capabilities.maxDurationSeconds) {
    const over = Object.assign({}, pkg, {
      parameters: Object.assign({}, pkg.parameters, {
        duration_seconds: mod.capabilities.maxDurationSeconds + 5,
      }),
    });
    assert.throws(() => mod.compile(over), /exceeds|violates/,
      `${entry.file}: over-duration package must be rejected`);
  }

  // generate() dry-run by default: no network, returns a generation record
  const record = await mod.generate(spec);
  assert.ok(record && typeof record === 'object', `${entry.file}: generate must return a record`);
  assert.ok(['dry_run', 'pending'].includes(record.status),
    `${entry.file}: default generate() status was ${record.status}`);
  assert.strictEqual(record.provider, mod.id);
  assert.strictEqual(record.kind, mod.kind);
  assert.strictEqual(record.shot, 'SH_004_002');
  assert.strictEqual(record.prompt_package, pkg.id);
  assert.ok(record.id && record.created_at, `${entry.file}: record needs id + created_at`);
  assert.ok(Array.isArray(record.media_files), `${entry.file}: record.media_files must be an array`);
  assert.ok(record.cost && record.cost.currency === 'USD' && record.cost.estimated === true,
    `${entry.file}: record.cost must be an estimated USD amount`);
  assert.ok(record.request && record.request.summary, `${entry.file}: record.request.summary required`);
  const recJson = JSON.stringify(record);
  for (const envName of mod.env) {
    const val = process.env[envName];
    if (val && val.length > 3) {
      assert.ok(!recJson.includes(val), `${entry.file}: record leaked ${envName}`);
    }
  }
  return mod;
}

async function main() {
  const providers = listProviders();
  assert.strictEqual(providers.length, 12, `expected 12 providers, got ${providers.length}`);

  for (const entry of providers) {
    await checkProvider(entry);
  }

  // dry-run records satisfy the real generation-record schema when present
  const schemaFile = path.join(ROOT, 'schemas', 'generation-record.schema.json');
  const fs = require('fs');
  if (fs.existsSync(schemaFile)) {
    const schemaLib = require('../scripts/lib/schema');
    const recordSchema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
    const veoMod = require(path.join(ROOT, 'providers', 'video', 'veo.js'));
    const spec = veoMod.compile(samplePackage('video', veoMod));
    spec.meta.record_id = 'GEN_SH_004_002_01';
    const rec = await veoMod.generate(spec);
    const check = schemaLib.validate(recordSchema, rec);
    assert.ok(check.valid,
      `veo dry-run record violates generation-record.schema.json: ${JSON.stringify(check.errors.slice(0, 5))}`);
  }

  // no-API providers always dry_run, even when asked to run live
  const harnessNative = require(path.join(ROOT, 'providers', 'image', 'harness-native.js'));
  const hnPkg = samplePackage('image', harnessNative);
  hnPkg.references = [];
  const hnRecord = await harnessNative.generate(harnessNative.compile(hnPkg), { dryRun: false });
  assert.strictEqual(hnRecord.status, 'dry_run', 'harness-native must always return dry_run');
  assert.ok(hnRecord.notes && /harness/i.test(hnRecord.notes));

  const local = require(path.join(ROOT, 'providers', 'audio', 'local.js'));
  const localRecord = await local.generate(local.compile(samplePackage('audio', local)), { dryRun: false });
  assert.strictEqual(localRecord.status, 'dry_run', 'local audio must always return dry_run');

  // live mode refuses without env vars
  const veo = require(path.join(ROOT, 'providers', 'video', 'veo.js'));
  if (!process.env.GOOGLE_API_KEY) {
    const spec = veo.compile(samplePackage('video', veo));
    await assert.rejects(() => veo.generate(spec, { dryRun: false }),
      /GOOGLE_API_KEY/, 'live mode without env must refuse');
  }

  console.log('provider-interface: OK (12 providers)');
}

main().catch((err) => {
  console.error(err && err.stack || err);
  process.exit(1);
});
