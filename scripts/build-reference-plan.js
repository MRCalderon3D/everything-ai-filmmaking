#!/usr/bin/env node
'use strict';
/**
 * build-reference-plan.js — select the reference images a shot's generation
 * must use (skills/reference-selection as code). Output validates against
 * schemas/reference-plan.schema.json.
 *
 * Algorithm:
 *   1. Identity primary per character in the shot's blocking (approved
 *      asset, highest _V##) — required, priority critical.
 *   2. Wardrobe reference per character when the identity asset does not
 *      already cover wardrobe — required, priority high.
 *   3. Nearest location angle to the shot's camera angle/station — required,
 *      priority high.
 *   4. Narrative props (listed in the shot's references or flagged narrative
 *      in the manifest) — required, priority high; other shot-listed props
 *      are optional, priority medium.
 *   5. Any other asset the shot explicitly requires — required.
 *   6. Style (LOOK_*) references — optional, priority low, only while the
 *      provider's reference budget still has room.
 *   Exclusions always win (per-asset lists + the manifest's global
 *   exclusions) and are recorded in `exclude`. If required alone exceeds the
 *   provider budget the plan says so in `notes` (escalate — never silently
 *   drop a required reference).
 */

const path = require('path');
const { exists, readText, writeFileEnsuring, toPosix } = require('./lib/fsx');
const { loadProvider } = require('./lib/providers');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');
const yaml = require('./lib/yaml');

const HELP = `
build-reference-plan.js — write a reference plan for a shot.

Usage:
  node scripts/build-reference-plan.js --shot <shot.yaml> --refs <references/manifest.yaml>
                                       [--provider <id>] [--kind image|video] [--out <file>]

Options:
  --shot <file>      Shot YAML (schemas/shot.schema.json). Required.
  --refs <file>      References manifest (production/references/manifest.yaml). Required.
  --provider <id>    Provider whose reference budget applies (default: veo).
  --kind <kind>      Provider kind for lookup (default: video).
  --out <file>       Output path (default: <scene>/references/<SHOT_ID>.reference-plan.yaml).
  --help             Show this help.
`;

const STATUS_RANK = { approved: 3, review: 2, draft: 1 };
const TYPE_TO_PURPOSE = {
  'character-identity': 'facial_identity',
  wardrobe: 'wardrobe',
  'location-angle': 'spatial_geometry',
  location: 'spatial_geometry',
  prop: 'prop_consistency',
  style: 'style',
  lighting: 'lighting',
  composition: 'composition',
};
const PREFIX_TO_PURPOSE = {
  CHAR: 'facial_identity',
  LOC: 'spatial_geometry',
  PROP: 'prop_consistency',
  LOOK: 'style',
};
const ANGLE_ENUM_DEGREES = {
  front: 0,
  three_quarter: 45,
  profile: 90,
  three_quarter_back: 135,
  back: 180,
};

function versionOf(id) {
  const m = String(id || '').match(/_V(\d+)\b/);
  return m ? parseInt(m[1], 10) : 0;
}

function baseId(id) {
  return String(id || '').replace(/_V\d+$/, '');
}

function statusRank(asset) {
  return STATUS_RANK[asset.status] || 0;
}

function angularDistance(a, b) {
  const d = Math.abs(((a % 360) + 360) % 360 - ((b % 360) + 360) % 360);
  return Math.min(d, 360 - d);
}

/** Characters in the shot, derived from blocking handles (mara -> CHAR_MARA). */
function shotCharacters(shot) {
  const handles = new Set();
  const blocking = shot.blocking || {};
  for (const key of Object.keys(blocking.character_positions || {})) handles.add(key);
  for (const key of Object.keys(blocking.eyelines || {})) handles.add(key);
  return [...handles].sort().map((h) => `CHAR_${h.toUpperCase()}`);
}

/** Location the shot shoots in, from the camera station (LOC_DINER_C1 -> LOC_DINER). */
function shotLocation(shot) {
  const station = shot.camera && shot.camera.station;
  if (station) return String(station).replace(/_C\d+$/, '');
  return null;
}

function purposeOf(asset) {
  return TYPE_TO_PURPOSE[asset.type] ||
    PREFIX_TO_PURPOSE[String(asset.id || '').split('_')[0]] || 'composition';
}

function entityOf(asset) {
  return asset.entity || asset.character || asset.location || asset.prop || baseId(asset.id);
}

/** Pick the best candidate: approved first, then highest version. */
function best(candidates) {
  return candidates.slice().sort((a, b) =>
    (statusRank(b) - statusRank(a)) || (versionOf(b.id) - versionOf(a.id)) ||
    String(a.id).localeCompare(String(b.id)))[0] || null;
}

function isExcluded(asset, shot, manifest, excluded) {
  const shotId = shot.id;
  const sceneId = shot.scene || null;
  if (Array.isArray(asset.exclusions) &&
      (asset.exclusions.includes(shotId) || (sceneId && asset.exclusions.includes(sceneId)))) {
    excluded.set(asset.id, 'asset exclusion list names this shot/scene');
    return true;
  }
  for (const ex of Array.isArray(manifest.exclusions) ? manifest.exclusions : []) {
    if (!ex || ex.asset !== asset.id) continue;
    if ((!ex.shot && !ex.scene) || ex.shot === shotId || (sceneId && ex.scene === sceneId)) {
      excluded.set(asset.id, ex.reason || 'excluded for this shot');
      return true;
    }
  }
  return false;
}

/**
 * Core reference-selection algorithm. Pure.
 * @returns {{required: [], optional: [], exclude: [], notes: string[]}}
 */
function selectReferences(shot, manifest, capabilities) {
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const excluded = new Map();
  const usable = assets.filter((a) => a && a.id && a.status !== 'rejected' &&
    !isExcluded(a, shot, manifest, excluded));
  const notes = [];
  const required = [];
  const optional = [];
  const chosen = new Set();

  const entry = (asset, purpose, priority, reason, omissionRisk) => {
    const e = {
      asset_id: asset.id,
      entity: entityOf(asset),
      purpose,
      priority,
      reason,
    };
    if (omissionRisk) e.omission_risk = omissionRisk;
    return e;
  };
  const addRequired = (asset, purpose, priority, reason, risk) => {
    if (!asset || chosen.has(asset.id)) return;
    chosen.add(asset.id);
    required.push(entry(asset, purpose, priority, reason, risk));
  };
  const addOptional = (asset, purpose, priority, reason) => {
    if (!asset || chosen.has(asset.id)) return;
    chosen.add(asset.id);
    optional.push(entry(asset, purpose, priority, reason));
  };

  const shotRefIds = new Set([
    ...(shot.references && Array.isArray(shot.references.required) ? shot.references.required : []),
  ]);
  const shotOptIds = new Set([
    ...(shot.references && Array.isArray(shot.references.optional) ? shot.references.optional : []),
  ]);
  const listedInShot = (asset) =>
    shotRefIds.has(asset.id) || shotRefIds.has(baseId(asset.id));
  const listedOptional = (asset) =>
    shotOptIds.has(asset.id) || shotOptIds.has(baseId(asset.id));

  // 1 + 2: identity primary and wardrobe per character
  for (const charId of shotCharacters(shot)) {
    const identity = best(usable.filter((a) =>
      a.type === 'character-identity' && a.character === charId));
    if (identity) {
      addRequired(identity, 'facial_identity', 'critical',
        `identity primary for ${charId}`,
        `${charId} face drifts off-model`);
    }
    const covered = identity && Boolean(identity.covers_wardrobe);
    if (!covered) {
      const wardrobe = best(usable.filter((a) => a.type === 'wardrobe' && a.character === charId));
      if (wardrobe) {
        addRequired(wardrobe, 'wardrobe', 'high',
          `wardrobe for ${charId} not covered by the identity reference`,
          `${charId} outfit changes between shots`);
      }
    }
  }

  // 3: nearest location angle
  const locationId = shotLocation(shot);
  if (locationId) {
    const locAssets = usable.filter((a) =>
      (a.type === 'location-angle' || a.type === 'location') && a.location === locationId);
    if (locAssets.length) {
      const camAngle = shot.camera && (
        typeof shot.camera.angle_degrees === 'number' ? shot.camera.angle_degrees
          : ANGLE_ENUM_DEGREES[shot.camera.angle]);
      let pick;
      let reason;
      if (typeof camAngle === 'number' && locAssets.some((a) => typeof a.angle_degrees === 'number')) {
        pick = locAssets.slice().sort((a, b) => {
          const da = typeof a.angle_degrees === 'number' ? angularDistance(a.angle_degrees, camAngle) : 999;
          const db = typeof b.angle_degrees === 'number' ? angularDistance(b.angle_degrees, camAngle) : 999;
          return da - db || statusRank(b) - statusRank(a);
        })[0];
        reason = `nearest angle to camera ${camAngle}° (asset at ${pick.angle_degrees}°)`;
      } else {
        pick = best(locAssets.filter((a) => a.primary === true)) || best(locAssets);
        reason = 'location reference (no camera angle declared)';
      }
      addRequired(pick, 'spatial_geometry', 'high', reason,
        `${locationId} geometry drifts between shots`);
    }
  }

  // 4: props — narrative (shot-required or flagged) are required; other
  // shot-listed props optional
  for (const asset of usable.filter((a) => a.type === 'prop')) {
    if (listedInShot(asset) || asset.narrative === true) {
      addRequired(best([asset]), 'prop_consistency', 'high',
        'narrative prop must stay on-model', 'hero prop changes appearance');
    } else if (listedOptional(asset)) {
      addOptional(asset, 'prop_consistency', 'medium', 'prop listed as optional by the shot');
    }
  }

  // 5: anything else the shot explicitly requires
  for (const refId of shotRefIds) {
    if ([...chosen].some((id) => id === refId || baseId(id) === refId)) continue;
    const asset = best(usable.filter((a) => a.id === refId || baseId(a.id) === refId));
    if (asset) {
      addRequired(asset, purposeOf(asset), 'high', 'explicitly required by the shot');
    } else if (!excluded.has(refId)) {
      notes.push(`shot requires ${refId} but the references manifest has no usable asset for it`);
    }
  }

  // 6: style, only while budget remains
  const capacity = typeof capabilities.referenceImages === 'number'
    ? capabilities.referenceImages : Infinity;
  const styleCandidates = usable.filter((a) => a.type === 'style' || purposeOf(a) === 'style');
  const stylePick = best(styleCandidates.filter(listedOptional)) || best(styleCandidates);
  if (stylePick && !chosen.has(stylePick.id)) {
    if (required.length + optional.length < capacity) {
      addOptional(stylePick, 'style', 'low', 'style reference (budget available)');
    } else {
      notes.push(`style reference ${stylePick.id} skipped: provider budget (${capacity}) is full`);
    }
  }

  // budget accounting
  if (required.length > capacity) {
    notes.push(`ESCALATE: ${required.length} required references exceed the provider budget of ${capacity}; ` +
      'reduce the shot\'s reference needs or switch provider — do not silently drop required references.');
  }
  while (required.length + optional.length > capacity && optional.length) {
    const dropped = optional.pop();
    notes.push(`optional ${dropped.asset_id} dropped: over provider budget (${capacity})`);
  }

  const exclude = [...excluded.keys()].sort();
  for (const [id, reason] of excluded) notes.push(`excluded ${id}: ${reason}`);
  return { required, optional, exclude, notes };
}

/** Full reference-plan document (schemas/reference-plan.schema.json). */
function buildPlanDocument(shot, manifest, providerId, capabilities) {
  const { required, optional, exclude, notes } = selectReferences(shot, manifest, capabilities);
  const doc = {
    shot: shot.id,
    provider: providerId,
    required,
    optional,
    exclude,
    created_at: new Date().toISOString(),
  };
  if (notes.length) doc.notes = notes.join(' | ');
  return doc;
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  if (!flags.shot || flags.shot === true) fatal('--shot <shot.yaml> is required (see --help)');
  if (!flags.refs || flags.refs === true) fatal('--refs <references/manifest.yaml> is required (see --help)');
  const shotFile = path.resolve(String(flags.shot));
  const refsFile = path.resolve(String(flags.refs));
  if (!exists(shotFile)) fatal(`shot file not found: ${shotFile}`);
  if (!exists(refsFile)) fatal(`references manifest not found: ${refsFile}`);

  const kind = String(flags.kind || 'video');
  const providerId = String(flags.provider || 'veo');
  let capabilities;
  try {
    capabilities = loadProvider(kind, providerId).module.capabilities;
  } catch (err) {
    fatal(err.message);
  }

  const shot = yaml.parse(readText(shotFile));
  const manifest = yaml.parse(readText(refsFile)) || {};
  if (!shot || typeof shot !== 'object') fatal('shot file is not a YAML map');

  const doc = buildPlanDocument(shot, manifest, providerId, capabilities);
  const outFile = flags.out && flags.out !== true
    ? path.resolve(String(flags.out))
    : path.join(path.dirname(path.dirname(shotFile)), 'references',
      `${doc.shot || path.basename(shotFile, '.yaml')}.reference-plan.yaml`);
  writeFileEnsuring(outFile, yaml.stringify(doc));
  console.log(`reference plan: ${doc.required.length} required + ${doc.optional.length} optional for ${doc.shot} via ${providerId}`);
  console.log(`  -> ${toPosix(outFile)}`);
  for (const e of doc.required) console.log(`  + ${e.asset_id} [${e.purpose}/${e.priority}] ${e.reason}`);
  for (const e of doc.optional) console.log(`  ~ ${e.asset_id} [${e.purpose}/${e.priority}] ${e.reason}`);
  for (const id of doc.exclude) console.log(`  x ${id}`);
  if (doc.notes) console.log(`  notes: ${doc.notes}`);
}

module.exports = { selectReferences, buildPlanDocument, angularDistance, versionOf, shotCharacters, shotLocation };

if (require.main === module) main();
