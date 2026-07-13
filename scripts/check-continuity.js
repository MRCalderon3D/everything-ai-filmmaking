#!/usr/bin/env node
'use strict';
/**
 * check-continuity.js — audit a scene's shots for continuity violations and
 * refresh continuity/scene-state.yaml (schemas/continuity-state.schema.json).
 *
 * Checks (shot fields per schemas/shot.schema.json → continuity block):
 *   - enters_from/exits_to chain integrity: shot N's exits_to must be shot
 *     N+1's id, and shot N+1's enters_from must be shot N's id; the first
 *     shot enters from null, the last exits to null
 *   - screen-direction flips (left_to_right <-> right_to_left) without a
 *     neutral/toward_camera/away_from_camera shot in between (180° rule)
 *   - axis changes without a neutral shot in between
 *   - axis_id resolves against the scene's established axes (new axes are
 *     registered with the shot that establishes them)
 *   - missing declarations (axis_id / screen_direction)
 *
 * Issues are written to open_issues as {severity, shot, description}; the
 * description is prefixed with a stable tag like [axis-break].
 */

const path = require('path');
const { exists, readText, walk, writeFileEnsuring, toPosix } = require('./lib/fsx');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');
const yaml = require('./lib/yaml');

const HELP = `
check-continuity.js — audit shots in a scene directory.

Usage:
  node scripts/check-continuity.js --scene-dir <production/scenes/SC_###>

Options:
  --scene-dir <dir>  Scene directory containing shots/*.yaml. Required.
  --no-write         Report only; do not refresh continuity/scene-state.yaml.
  --help             Show this help.

Exit code 1 when open issues are found, 0 when clean.
`;

const FLIPPABLE = ['left_to_right', 'right_to_left'];

function isNeutral(shot) {
  const dir = shot.continuity && shot.continuity.screen_direction;
  return dir === 'neutral' || dir === 'toward_camera' || dir === 'away_from_camera';
}

function blockingCharacters(shot) {
  const handles = new Set();
  const blocking = shot.blocking || {};
  for (const k of Object.keys(blocking.character_positions || {})) handles.add(k);
  for (const k of Object.keys(blocking.eyelines || {})) handles.add(k);
  return [...handles].sort().map((h) => `CHAR_${h.toUpperCase()}`);
}

/**
 * Analyze an ordered list of shot documents against an (optional) previous
 * scene state. Pure. Returns { issues, state } — issues are open_issues
 * entries ({severity, shot, description}) whose description starts with a
 * stable [tag].
 */
function analyzeScene(shots, previousState = {}) {
  const issues = [];
  const add = (shot, severity, tag, message) =>
    issues.push({ severity, shot: (shot && shot.id) || null, description: `[${tag}] ${message}` });

  const prevAxes = Array.isArray(previousState.axes) ? previousState.axes : [];
  const axes = prevAxes.map((a) => ({ ...a }));
  const knownAxis = (id) => axes.some((a) => a.id === id);

  const characterStates = {};
  for (const [id, st] of Object.entries(previousState.character_states || {})) {
    characterStates[id] = { ...st };
  }

  let lastAxis = null;
  let lastFlippable = null; // last left_to_right/right_to_left direction
  let prevShot = null;

  shots.forEach((shot, index) => {
    if (!shot || typeof shot !== 'object') return;
    const c = shot.continuity || {};

    // declarations
    if (!c.axis_id) add(shot, 'minor', 'missing-axis', 'shot declares no continuity.axis_id (AXIS_SC###_X)');
    if (!c.screen_direction) {
      add(shot, 'minor', 'missing-screen-direction',
        'shot declares no continuity.screen_direction');
    }

    // enters_from / exits_to chain integrity (values are neighbor shot IDs)
    if (index === 0) {
      if (c.enters_from) {
        add(shot, 'note', 'chain-start',
          `first shot of the scene declares enters_from ${c.enters_from} (expected null)`);
      }
    } else if (prevShot) {
      const prevC = prevShot.continuity || {};
      if (prevC.exits_to !== undefined && prevC.exits_to !== null && prevC.exits_to !== shot.id) {
        add(shot, 'major', 'chain-break',
          `${prevShot.id} exits_to ${prevC.exits_to} but the next shot in the cut is ${shot.id}`);
      }
      if (c.enters_from !== undefined && c.enters_from !== null && c.enters_from !== prevShot.id) {
        add(shot, 'major', 'chain-break',
          `${shot.id} enters_from ${c.enters_from} but the previous shot in the cut is ${prevShot.id}`);
      }
    }
    if (index === shots.length - 1 && c.exits_to) {
      add(shot, 'note', 'chain-end',
        `last shot of the scene declares exits_to ${c.exits_to} (expected null)`);
    }

    // axis discipline
    if (c.axis_id) {
      if (!knownAxis(c.axis_id)) {
        axes.push({
          id: c.axis_id,
          established_in: shot.id,
          subjects: blockingCharacters(shot).length ? blockingCharacters(shot) : ['CHAR_UNKNOWN'],
          notes: 'registered automatically by check-continuity.js — set the real subjects.',
        });
      }
      if (lastAxis && c.axis_id !== lastAxis && !isNeutral(shot) && !(prevShot && isNeutral(prevShot))) {
        add(shot, 'major', 'axis-break',
          `axis changes ${lastAxis} -> ${c.axis_id} without a neutral or re-establishing shot`);
      }
      lastAxis = c.axis_id;
    }

    // screen-direction flips
    if (FLIPPABLE.includes(c.screen_direction)) {
      if (lastFlippable && c.screen_direction !== lastFlippable &&
          !(prevShot && isNeutral(prevShot))) {
        add(shot, 'major', 'screen-direction-flip',
          `screen direction flips ${lastFlippable} -> ${c.screen_direction} without a neutral shot in between`);
      }
      lastFlippable = c.screen_direction;
    }

    // character sightings: keep positions/last_seen_in fresh for known chars
    const positions = (shot.blocking && shot.blocking.character_positions) || {};
    for (const charId of blockingCharacters(shot)) {
      const st = characterStates[charId];
      if (!st) continue; // unknown character: wardrobe unknown, cannot invent state
      st.last_seen_in = shot.id;
      const handle = charId.replace(/^CHAR_/, '').toLowerCase();
      if (positions[handle]) st.position = positions[handle];
    }

    prevShot = shot;
  });

  const state = {
    scene: (shots[0] && shots[0].scene) || previousState.scene || 'SC_000',
    axes,
    character_states: characterStates,
  };
  if (previousState.prop_states) state.prop_states = previousState.prop_states;
  if (previousState.lighting) state.lighting = previousState.lighting;
  if (previousState.time_of_day) state.time_of_day = previousState.time_of_day;
  state.open_issues = issues;
  state.last_validated = new Date().toISOString();
  if (previousState.notes) state.notes = previousState.notes;
  return { issues, state };
}

function loadShots(sceneDir) {
  const shotsDir = path.join(sceneDir, 'shots');
  const files = walk(shotsDir, { filter: (f) => /\.ya?ml$/i.test(f) });
  const shots = [];
  for (const file of files) {
    try {
      const doc = yaml.parse(readText(file));
      if (doc && typeof doc === 'object') shots.push(doc);
    } catch (err) {
      shots.push({ id: path.basename(file, '.yaml'), _parse_error: err.message });
      console.warn(`warning: ${toPosix(file)}: ${err.message}`);
    }
  }
  shots.sort((a, b) => {
    const oa = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const ob = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    return oa - ob || String(a.id || '').localeCompare(String(b.id || ''));
  });
  return shots;
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  if (!flags['scene-dir'] || flags['scene-dir'] === true) {
    fatal('--scene-dir <dir> is required (see --help)');
  }
  const sceneDir = path.resolve(String(flags['scene-dir']));
  if (!exists(sceneDir)) fatal(`scene directory not found: ${sceneDir}`);
  const shots = loadShots(sceneDir);
  if (!shots.length) fatal(`no shot YAML files under ${path.join(sceneDir, 'shots')}`);

  const stateFile = path.join(sceneDir, 'continuity', 'scene-state.yaml');
  let previousState = {};
  if (exists(stateFile)) {
    try {
      previousState = yaml.parse(readText(stateFile)) || {};
    } catch (err) {
      console.warn(`warning: existing scene-state unreadable (${err.message}); starting fresh`);
    }
  }

  const { issues, state } = analyzeScene(shots, previousState);
  if (flags.write !== false) {
    writeFileEnsuring(stateFile, yaml.stringify(state));
  }

  console.log(`check-continuity: ${shots.length} shot(s) in ${toPosix(sceneDir)}`);
  const blocking = issues.filter((i) => i.severity === 'critical' || i.severity === 'major');
  if (issues.length === 0) {
    console.log('  ✓ no continuity issues found');
    console.log(`  scene-state refreshed: ${toPosix(stateFile)}`);
    process.exit(0);
  }
  for (const issue of issues) {
    console.log(`  ${issue.severity === 'note' ? '-' : '✗'} ${issue.shot || '(scene)'} [${issue.severity}] ${issue.description}`);
  }
  console.log(`${issues.length} open issue(s) (${blocking.length} blocking) written to ${toPosix(stateFile)}`);
  process.exit(issues.length ? 1 : 0);
}

module.exports = { analyzeScene, loadShots };

if (require.main === module) main();
