#!/usr/bin/env node
'use strict';
/**
 * Hook: detect-continuity-drift (event: after a shot file write).
 * When a shot YAML under production/scenes/<SC_ID>/shots/ changes, compare
 * its axis and screen direction against the scene's
 * continuity/scene-state.yaml. This is a quick advisory check — it WARNS on
 * stderr and always exits 0; the full audit is scripts/check-continuity.js.
 */

const path = require('path');
const fs = require('fs');
const {
  readStdinJson, eventFilePath, findProductionRoot, productionRelPath,
  requireScriptsLib,
} = require('./lib');

async function main() {
  const event = await readStdinJson();
  const file = eventFilePath(event);
  if (!file) return 0;
  const rel = productionRelPath(file);
  if (!rel) return 0;
  const m = rel.match(/^scenes\/([^/]+)\/shots\/([^/]+\.ya?ml)$/i);
  if (!m) return 0;
  const sceneId = m[1];

  let yaml;
  try {
    yaml = requireScriptsLib('yaml');
  } catch (err) {
    return 0;
  }

  let shot;
  try {
    shot = yaml.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return 0; // validate-after-write handles parse errors
  }
  if (!shot || typeof shot !== 'object') return 0;

  const prodRoot = findProductionRoot(file);
  const stateFile = path.join(prodRoot, 'scenes', sceneId, 'continuity', 'scene-state.yaml');
  if (!fs.existsSync(stateFile)) return 0;
  let state;
  try {
    state = yaml.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    return 0;
  }
  if (!state || typeof state !== 'object') return 0;

  const warnings = [];
  const cont = shot.continuity || {};
  // axis must resolve in the scene's established axes (continuity-state schema)
  const knownAxes = (Array.isArray(state.axes) ? state.axes : [])
    .map((a) => (a && a.id) || a)
    .filter(Boolean);
  if (cont.axis_id && knownAxes.length && !knownAxes.includes(cont.axis_id)) {
    warnings.push(`axis ${cont.axis_id} is not in the scene's established axes (${knownAxes.join(', ')})`);
  }
  if (!cont.axis_id) warnings.push('shot declares no continuity.axis_id');
  if (!cont.screen_direction) warnings.push('shot declares no continuity.screen_direction');
  // characters seen in blocking should exist in the scene's character_states
  const charStates = state.character_states || {};
  const blocking = shot.blocking || {};
  const handles = new Set([
    ...Object.keys(blocking.character_positions || {}),
    ...Object.keys(blocking.eyelines || {}),
  ]);
  for (const handle of handles) {
    const charId = `CHAR_${handle.toUpperCase()}`;
    if (Object.keys(charStates).length && !charStates[charId]) {
      warnings.push(`${charId} appears in blocking but has no entry in scene-state character_states ` +
        '(wardrobe/position unknown)');
    }
  }

  if (warnings.length) {
    process.stderr.write(
      `detect-continuity-drift: possible continuity drift in production/${rel}:\n` +
      warnings.map((w) => `  ! ${w}`).join('\n') +
      '\n  Run "npm run check:continuity -- --scene-dir <scene>" for a full audit.\n'
    );
  }
  return 0; // advisory only — never block
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`detect-continuity-drift: internal error: ${err.message}\n`);
  process.exit(0);
});
