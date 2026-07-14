#!/usr/bin/env node
'use strict';
/**
 * compile-prompts.js — build a provider-ready prompt package for a shot.
 *
 * Loads the shot, its reference plan, the references manifest (for image
 * paths), and the relevant bibles (character, location, project style) that
 * exist in the production/ workspace; composes the canonical prompt
 * package (schemas/prompt-package.schema.json); runs provider.compile() to
 * enforce capabilities and pin the model; validates against the schema; and
 * writes YAML under <scene>/prompts/<provider>/<SHOT_ID>.yaml.
 */

const path = require('path');
const { ROOT, exists, readText, readJson, writeFileEnsuring, toPosix } = require('./lib/fsx');
const { loadProvider } = require('./lib/providers');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');
const yaml = require('./lib/yaml');
const schemaLib = require('./lib/schema');
const cameraMoves = require('./lib/camera-moves');
const lensLanguage = require('./lib/lens-language');
const compositionLanguage = require('./lib/composition-language');
const { hashObject } = require('../providers/lib/common');

const HELP = `
compile-prompts.js — compile a shot into a prompt package for a provider.

Usage:
  node scripts/compile-prompts.js --shot <shot.yaml> [--provider <id>]
                                  [--kind image|video|audio] [--scene-dir <dir>]

Options:
  --shot <file>      Shot YAML. Required.
  --provider <id>    Provider id (default: the shot's generation.provider, else veo).
  --kind <kind>      Provider kind (default: video).
  --scene-dir <dir>  Scene directory (default: parent of the shot's shots/ dir).
  --plan <file>      Reference plan (default: <scene>/references/<SHOT_ID>.reference-plan.yaml).
  --allow-off-kit    Compile even when the shot's lens_mm is outside the
                     project lens_kit (requires an approved style deviation).
  --help             Show this help.

Output: <scene>/prompts/<provider>/<SHOT_ID>.yaml (prompt-package schema,
status "compiled").
`;

function safeYaml(file) {
  try {
    return exists(file) ? yaml.parse(readText(file)) : null;
  } catch (err) {
    console.warn(`warning: could not parse ${file}: ${err.message}`);
    return null;
  }
}

/** production/ root: walk up from the scene dir to the dir holding scenes/. */
function findProductionRoot(sceneDir) {
  let dir = path.resolve(sceneDir);
  for (let i = 0; i < 6; i++) {
    if (path.basename(path.dirname(dir)) === 'scenes') return path.dirname(path.dirname(dir));
    if (path.basename(dir) === 'production') return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function humanize(token) {
  return String(token || '').replace(/_/g, ' ');
}

/** Characters in the shot from blocking handles (mara -> CHAR_MARA). */
function shotCharacterIds(shot) {
  const handles = new Set();
  const blocking = shot.blocking || {};
  for (const k of Object.keys(blocking.character_positions || {})) handles.add(k);
  for (const k of Object.keys(blocking.eyelines || {})) handles.add(k);
  return [...handles].sort().map((h) => `CHAR_${h.toUpperCase()}`);
}

function characterLine(prodRoot, charId) {
  if (!prodRoot) return null;
  const doc = safeYaml(path.join(prodRoot, 'characters', charId, 'character.yaml'));
  if (!doc) return null;
  const desc = doc.prompt_summary || doc.appearance_summary || doc.appearance || doc.description;
  const name = doc.name || charId;
  if (!desc) return null;
  return `${name}: ${typeof desc === 'string' ? desc.trim() : JSON.stringify(desc)}`;
}

function locationLine(prodRoot, locId) {
  if (!prodRoot || !locId) return null;
  const doc = safeYaml(path.join(prodRoot, 'locations', locId, 'location.yaml'));
  if (!doc) return null;
  const desc = doc.prompt_summary || doc.description;
  return desc ? `Location: ${String(desc).trim()}` : null;
}

function styleLine(project) {
  if (!project || !project.style) return null;
  const bits = [];
  if (Array.isArray(project.style.influences) && project.style.influences.length) {
    bits.push(`influences: ${project.style.influences.join('; ')}`);
  }
  if (project.style.notes) bits.push(project.style.notes);
  return bits.length ? `Style — ${bits.join(' — ')}` : null;
}

/** Compose the prompt text from the shot + bibles. */
function composePrompt(shot, bibles, providerId, kind) {
  const parts = [];
  const cam = shot.camera || {};
  const camBits = [humanize(cam.shot_size)];
  if (cam.angle) camBits.push(`${humanize(cam.angle)} angle`);
  // Lens language is provider-gated: Runway Gen-4 video prompts are
  // motion-only (the look lives in the keyframe); everyone else takes lens
  // tokens in text (see scripts/lib/lens-language.js and
  // docs/research/lens-language.md).
  if (lensLanguage.lensPolicy(providerId, kind) === 'text') {
    const lensKit = bibles.project && bibles.project.lens_kit;
    const lensPhrase = lensLanguage.describeLens(cam, lensKit);
    if (lensPhrase) camBits.push(lensPhrase);
    // Composition is a framing attribute like lens character: same gate.
    const compPhrase = compositionLanguage.describeComposition(cam.composition);
    if (compPhrase) camBits.push(compPhrase);
  }
  const move = cam.movement || {};
  const movePhrase = cameraMoves.describe(move);
  if (movePhrase) {
    camBits.push(movePhrase);
  } else if (move.type) {
    camBits.push(`${move.speed ? move.speed + ' ' : ''}${humanize(move.type)}`);
  }
  parts.push(`${camBits.filter(Boolean).join(', ')}.`);
  if (shot.narrative && shot.narrative.purpose) parts.push(shot.narrative.purpose);
  const blocking = shot.blocking || {};
  for (const action of blocking.actions || []) parts.push(action);
  // Performance compiles as visible behavior, never emotion labels
  // (skills/performance-direction): the playable action + body + face.
  for (const [handle, perf] of Object.entries(shot.performance || {})) {
    const bits = [perf.playing, perf.body, perf.face].filter(Boolean);
    if (!bits.length) continue;
    const held = perf.intensity && perf.intensity !== 'open'
      ? `${perf.intensity} expression, ` : '';
    parts.push(`${handle}: ${held}${bits.join('; ')}.`);
  }
  for (const [handle, target] of Object.entries(blocking.eyelines || {})) {
    parts.push(`${handle} looks at ${humanize(target)}.`);
  }
  for (const line of bibles.characterLines || []) parts.push(line);
  if (bibles.locationLine) parts.push(bibles.locationLine);
  if (bibles.styleLine) parts.push(bibles.styleLine);
  if (shot.dialogue) parts.push(`Dialogue: "${shot.dialogue}"`);
  const dir = shot.continuity && shot.continuity.screen_direction;
  if (dir && dir !== 'neutral') parts.push(`Subject movement reads ${humanize(dir)}.`);
  if (shot.narrative && shot.narrative.emotion) parts.push(`Mood: ${shot.narrative.emotion}.`);
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Resolve reference entries (plan or shot) to package references. */
function resolveReferences(shot, plan, refsManifest, capacity) {
  const assets = new Map();
  for (const a of (refsManifest && refsManifest.assets) || []) {
    if (a && a.id) assets.set(a.id, a);
  }
  const imagePathFor = (assetId) => {
    const a = assets.get(assetId);
    if (a && a.path) return String(a.path).replace(/\\/g, '/');
    return `references/${assetId}.png`;
  };
  const out = [];
  const push = (assetId, purpose) => {
    if (out.length >= capacity) return false;
    if (out.some((r) => r.asset_id === assetId)) return true;
    out.push({ asset_id: assetId, role: purpose, image_path: imagePathFor(assetId) });
    return true;
  };
  if (plan && Array.isArray(plan.required)) {
    for (const e of plan.required) {
      if (!push(e.asset_id, e.purpose)) {
        throw new Error(`required reference ${e.asset_id} does not fit the provider budget (${capacity}) — escalate`);
      }
    }
    for (const e of plan.optional || []) push(e.asset_id, e.purpose);
  } else {
    // no plan: fall back to the shot's own reference lists
    const prefixRole = { CHAR: 'facial_identity', LOC: 'spatial_geometry', PROP: 'prop_consistency', LOOK: 'style' };
    const roleFor = (id) => prefixRole[String(id).split('_')[0]] || 'composition';
    for (const id of (shot.references && shot.references.required) || []) push(id, roleFor(id));
    for (const id of (shot.references && shot.references.optional) || []) push(id, roleFor(id));
  }
  return out;
}

/** Build the canonical prompt package (without model — pinned by compile()). */
function buildPromptPackage(shot, plan, refsManifest, providerId, kind, capabilities, bibles = {}) {
  const timing = shot.timing || {};
  const clipSeconds = (timing.duration_seconds || 5) +
    (timing.handles_before || 0) + (timing.handles_after || 0);
  const capacity = typeof capabilities.referenceImages === 'number'
    ? capabilities.referenceImages : Infinity;
  const tag = providerId.toUpperCase().replace(/[^A-Z0-9_-]+/g, '-');
  const pkg = {
    id: `PP_${shot.id}_${tag}`,
    shot: shot.id,
    provider: providerId,
    model: 'pending',
    prompt: composePrompt(shot, bibles, providerId, kind),
    parameters: {
      aspect_ratio: (bibles.project && bibles.project.aspect_ratio) || '16:9',
    },
    references: resolveReferences(shot, plan, refsManifest, capacity),
    start_frame: null,
    end_frame: null,
    status: 'compiled',
    source_hashes: {
      shot: hashObject(shot),
      reference_plan: hashObject(plan || {}),
    },
  };
  if (kind === 'video') {
    pkg.parameters.duration_seconds = Math.round(clipSeconds * 10) / 10;
  }
  if (bibles.project && bibles.project.resolution) {
    pkg.parameters.resolution = bibles.project.resolution;
  }
  return pkg;
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  if (!flags.shot || flags.shot === true) fatal('--shot <shot.yaml> is required (see --help)');
  const shotFile = path.resolve(String(flags.shot));
  if (!exists(shotFile)) fatal(`shot file not found: ${shotFile}`);

  const shot = yaml.parse(readText(shotFile));
  if (!shot || typeof shot !== 'object') fatal('shot file is not a YAML map');
  const kind = String(flags.kind || 'video');
  const providerId = String(flags.provider ||
    (shot.generation && shot.generation.provider) || 'veo');

  let provider;
  try {
    provider = loadProvider(kind, providerId).module;
  } catch (err) {
    fatal(err.message);
  }

  const sceneDir = flags['scene-dir'] && flags['scene-dir'] !== true
    ? path.resolve(String(flags['scene-dir']))
    : path.dirname(path.dirname(shotFile));
  const planFile = flags.plan && flags.plan !== true
    ? path.resolve(String(flags.plan))
    : path.join(sceneDir, 'references', `${shot.id || path.basename(shotFile, '.yaml')}.reference-plan.yaml`);
  const plan = safeYaml(planFile);
  if (!plan) console.warn(`warning: no reference plan at ${planFile} — using the shot's own reference lists`);

  const prodRoot = findProductionRoot(sceneDir);
  const refsManifest = prodRoot ? safeYaml(path.join(prodRoot, 'references', 'manifest.yaml')) : null;
  const project = prodRoot ? safeYaml(path.join(prodRoot, 'project.yaml')) : null;

  const kitCheck = lensLanguage.checkKit(shot.camera, project && project.lens_kit);
  if (!kitCheck.ok) {
    if (flags['allow-off-kit']) console.warn(`warning: ${kitCheck.message}`);
    else fatal(kitCheck.message);
  }

  const bibles = { project, characterLines: [], locationLine: null, styleLine: styleLine(project) };
  for (const charId of shotCharacterIds(shot)) {
    const line = characterLine(prodRoot, charId);
    if (line) bibles.characterLines.push(line);
  }
  const locId = shot.camera && shot.camera.station
    ? String(shot.camera.station).replace(/_C\d+$/, '') : null;
  bibles.locationLine = locationLine(prodRoot, locId);

  let pkg;
  try {
    pkg = buildPromptPackage(shot, plan, refsManifest, providerId, kind, provider.capabilities, bibles);
  } catch (err) {
    fatal(err.message);
  }

  let compiled;
  try {
    compiled = provider.compile(pkg);
    pkg.model = compiled.model; // pin the exact model the provider resolved
  } catch (err) {
    fatal(`provider.compile() rejected the package: ${err.message}`);
  }

  const schemaFile = path.join(ROOT, 'schemas', 'prompt-package.schema.json');
  if (exists(schemaFile)) {
    try {
      const schema = readJson(schemaFile);
      const result = schemaLib.validate(schema, pkg);
      if (!result.valid) {
        console.error('prompt package violates prompt-package.schema.json:');
        for (const e of result.errors.slice(0, 10)) console.error(`  ${e.path}: ${e.message}`);
        process.exit(1);
      }
    } catch (err) {
      console.warn(`warning: could not validate against prompt-package schema: ${err.message}`);
    }
  } else {
    console.warn('warning: schemas/prompt-package.schema.json not found — skipping validation');
  }

  const outFile = path.join(sceneDir, 'prompts', providerId, `${pkg.shot}.yaml`);
  writeFileEnsuring(outFile, yaml.stringify(pkg));
  console.log(`prompt package: ${pkg.id} (${kind}/${providerId}, model ${pkg.model}) -> ${toPosix(outFile)}`);
  console.log(`  prompt: ${pkg.prompt.slice(0, 120)}${pkg.prompt.length > 120 ? '…' : ''}`);
  console.log(`  references: ${pkg.references.length}, duration: ${pkg.parameters.duration_seconds || 'n/a'}s, aspect: ${pkg.parameters.aspect_ratio}`);
  console.log(`  request endpoint: ${compiled.endpoint || '(none — manual/harness)'}`);
}

module.exports = { buildPromptPackage, composePrompt, resolveReferences, findProductionRoot };

if (require.main === module) main();
