#!/usr/bin/env node
'use strict';
/**
 * generate-assets.js — run prompt packages through a provider.
 *
 * DRY RUN is the default: no network call, a dry_run generation record is
 * written so the request can be reviewed. --live submits the real API
 * request; it requires the provider's env vars, prints a cost estimate,
 * and refuses to run without an explicit --yes (also enforced by
 * hooks/require-cost-confirmation.js).
 *
 * Records follow schemas/generation-record.schema.json and are written to
 * production/generations/<SHOT>/GEN_<shot>_<attempt##>.yaml. Records never
 * contain API keys.
 */

const path = require('path');
const fs = require('fs');
const { ROOT, exists, readText, readJson, walk, writeFileEnsuring, toPosix } = require('./lib/fsx');
const { loadProvider, listProviders } = require('./lib/providers');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');
const { findProductionRoot } = require('./compile-prompts');
const schemaLib = require('./lib/schema');
const yaml = require('./lib/yaml');

const HELP = `
generate-assets.js — generate assets from compiled prompt packages.

Usage:
  node scripts/generate-assets.js (--plan <pkg.yaml> | --shot <shot.yaml> | --scene-dir <dir>)
                                  [--provider <id>] [--kind image|video|audio]
                                  [--live --yes]

Options:
  --plan <file>      A single compiled prompt package YAML.
  --shot <shot.yaml> Generate for this shot's packages (<scene>/prompts/*/<SHOT>.yaml).
  --scene-dir <dir>  Generate for every package under <dir>/prompts/.
  --provider <id>    Only packages compiled for this provider.
  --asset <ASSET_ID> Asset scope for packages without a shot (masters,
                     reference sheets): records become GEN_<asset>_<attempt##>
                     under generations/<ASSET_ID>/. Usually unnecessary —
                     asset-scoped packages carry their own asset field.
  --kind <kind>      Provider kind; required only when the provider id is
                     ambiguous (fal serves image, video, and audio).
  --live             Actually call the provider API (default: DRY RUN).
  --yes              Confirm spending money. Required with --live.
  --help             Show this help.
`;

/** Approximate 2025 list prices (USD). Estimates only — verify with your provider. */
const COST_TABLE = {
  image: { fal: 0.025, replicate: 0.03, comfyui: 0, 'harness-native': 0 },
  videoPerSecond: { veo: 0.5, kling: 0.28, runway: 0.05, seedance: 0.12, fal: 0.1 },
  audioPer1kChars: { elevenlabs: 0.15, fal: 0.06, local: 0 },
};

function estimateCost(pkg, kind, providerId) {
  const params = pkg.parameters || {};
  if (kind === 'image') {
    const per = COST_TABLE.image[providerId];
    return per === undefined ? null : per;
  }
  if (kind === 'video') {
    const per = COST_TABLE.videoPerSecond[providerId];
    return per === undefined ? null : per * (params.duration_seconds || 5);
  }
  if (kind === 'audio') {
    const per = COST_TABLE.audioPer1kChars[providerId];
    const chars = (pkg.prompt || '').length;
    return per === undefined ? null : (per * Math.max(chars, 100)) / 1000;
  }
  return null;
}

/** Infer the provider kind when the id is unambiguous across manifests. */
function inferKind(providerId, flags) {
  if (flags.kind && flags.kind !== true) return String(flags.kind);
  const kinds = [...new Set(listProviders().filter((p) => p.id === providerId).map((p) => p.kind))];
  if (kinds.length === 1) return kinds[0];
  fatal(`provider "${providerId}" exists for kinds ${kinds.join(', ') || '(none)'} — pass --kind`);
  return null;
}

function collectPackages(flags) {
  const files = [];
  if (flags.plan && flags.plan !== true) {
    files.push(path.resolve(String(flags.plan)));
  } else if (flags.shot && flags.shot !== true) {
    const shotFile = path.resolve(String(flags.shot));
    if (!exists(shotFile)) fatal(`shot file not found: ${shotFile}`);
    const shot = yaml.parse(readText(shotFile)) || {};
    const shotId = shot.id || path.basename(shotFile, '.yaml');
    const sceneDir = path.dirname(path.dirname(shotFile));
    for (const f of walk(path.join(sceneDir, 'prompts'), { filter: (p) => /\.ya?ml$/i.test(p) })) {
      if (path.basename(f).replace(/\.ya?ml$/i, '') === shotId) files.push(f);
    }
    if (!files.length) fatal(`no prompt packages for ${shotId} under ${path.join(sceneDir, 'prompts')} — run compile-prompts first`);
  } else if (flags['scene-dir'] && flags['scene-dir'] !== true) {
    const dir = path.resolve(String(flags['scene-dir']));
    for (const f of walk(path.join(dir, 'prompts'), { filter: (p) => /\.ya?ml$/i.test(p) })) {
      files.push(f);
    }
    if (!files.length) fatal(`no prompt packages under ${path.join(dir, 'prompts')}`);
  } else {
    fatal('one of --plan, --shot, --scene-dir is required (see --help)');
  }
  const packages = [];
  for (const file of files) {
    try {
      const pkg = yaml.parse(readText(file));
      if (pkg && typeof pkg === 'object') packages.push({ file, pkg });
    } catch (err) {
      console.warn(`warning: skipping unparseable package ${file}: ${err.message}`);
    }
  }
  return packages;
}

function recordDir(pkgFile, shotId) {
  const prodRoot = findProductionRoot(path.dirname(path.dirname(pkgFile)));
  const base = prodRoot || path.dirname(path.dirname(pkgFile));
  return path.join(base, 'generations', shotId || 'unassigned');
}

function nextAttempt(dir, shotId) {
  if (!exists(dir)) return 1;
  const re = new RegExp(`^GEN_${shotId}_(\\d+)\\.ya?ml$`, 'i');
  let max = 0;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function validateRecord(record) {
  const schemaFile = path.join(ROOT, 'schemas', 'generation-record.schema.json');
  if (!exists(schemaFile)) return;
  try {
    const result = schemaLib.validate(readJson(schemaFile), record);
    if (!result.valid) {
      console.warn(`    warning: record ${record.id} violates generation-record schema: ` +
        result.errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join('; '));
    }
  } catch (err) {
    // schema unreadable: skip
  }
}

async function runOne({ file, pkg }, flags, live) {
  if (flags.provider && flags.provider !== true && pkg.provider &&
      String(flags.provider) !== pkg.provider) {
    console.log(`  skip ${toPosix(file)} (compiled for ${pkg.provider}, not ${flags.provider})`);
    return null;
  }
  const providerId = String((flags.provider && flags.provider !== true && flags.provider) || pkg.provider);
  const kind = inferKind(providerId, flags);
  const { module: provider } = loadProvider(kind, providerId);

  const spec = provider.compile(pkg);
  const shotId = pkg.shot || (spec.meta && spec.meta.shot_id) || null;
  const assetId = (flags.asset && flags.asset !== true && String(flags.asset)) ||
    pkg.asset || null;
  // Scope: shot when the package has one, else asset (masters/reference
  // sheets). Never invent a pseudo-shot like SH_000_000.
  const scope = shotId || assetId;
  if (!scope) {
    console.warn(`  skip ${toPosix(file)}: package has neither shot nor asset scope — set pkg.shot or pkg.asset, or pass --asset <ASSET_ID>`);
    return null;
  }
  const dir = recordDir(file, scope);
  const attempt = nextAttempt(dir, scope);
  const cost = estimateCost(pkg, kind, providerId);
  spec.meta = Object.assign({}, spec.meta, {
    record_id: `GEN_${scope}_${String(attempt).padStart(2, '0')}`,
    shot_id: shotId,
    asset_id: shotId ? (spec.meta && spec.meta.asset_id) || null : assetId,
    cost_estimate: cost === null ? 0 : cost,
  });

  const record = await provider.generate(spec, { dryRun: !live, outDir: dir });

  // Persist inline binary outputs (e.g. ElevenLabs base64 audio) as files.
  if (Array.isArray(record._media)) {
    for (const media of record._media) {
      const name = media.suggested_name || `${record.id}.${media.format || 'bin'}`;
      writeFileEnsuring(path.join(dir, name), Buffer.from(media.data_base64, 'base64'));
      record.media_files.push(name);
    }
    delete record._media;
  }

  const recordFile = path.join(dir, `${record.id}.yaml`);
  writeFileEnsuring(recordFile, yaml.stringify(record));
  validateRecord(record);
  const costText = cost === null ? 'unknown' : `$${cost.toFixed(3)} (approx)`;
  console.log(`  ${record.status.toUpperCase()} ${record.id} [${kind}/${providerId} ${record.model}] cost est ${costText}`);
  console.log(`    record: ${toPosix(recordFile)}`);
  if (record.response && record.response.error) console.log(`    error: ${record.response.error}`);
  for (const out of record.media_files || []) console.log(`    media: ${out}`);
  return { record, cost };
}

async function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  const live = flags.live === true;
  const packages = collectPackages(flags);

  let totalCost = 0;
  for (const p of packages) {
    const providerId = String((flags.provider && flags.provider !== true && flags.provider) || p.pkg.provider);
    const kind = inferKind(providerId, flags);
    const c = estimateCost(p.pkg, kind, providerId);
    if (c !== null) totalCost += c;
  }

  console.log(`generate-assets: ${packages.length} package(s), mode: ${live ? 'LIVE' : 'DRY RUN'}`);
  console.log(`estimated total cost: $${totalCost.toFixed(3)} (approximate list prices; verify with your provider)`);
  if (live && flags.yes !== true) {
    fatal('--live spends provider credits: re-run with --yes to confirm the estimate above');
  }
  if (!live) {
    console.log('(dry run: request specs + dry_run records only; add --live --yes to submit)');
  }

  let failures = 0;
  for (const item of packages) {
    try {
      const result = await runOne(item, flags, live);
      if (result && result.record.status === 'failed') failures++;
    } catch (err) {
      failures++;
      console.error(`  FAILED ${toPosix(item.file)}: ${err.message}`);
    }
  }
  if (failures) {
    console.error(`generate-assets: ${failures} failure(s)`);
    process.exit(1);
  }
}

module.exports = { estimateCost, COST_TABLE, inferKind };

if (require.main === module) {
  main().catch((err) => {
    console.error(`generate-assets: ${err.message}`);
    process.exit(1);
  });
}
