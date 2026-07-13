'use strict';
/** check-continuity analysis: a fixture scene with violations is flagged. */

const assert = require('assert');
const path = require('path');
const { analyzeScene, loadShots } = require('../scripts/check-continuity');
const schemaLib = require('../scripts/lib/schema');

const stateSchema = require('../schemas/continuity-state.schema.json');

function tagsOf(issues) {
  return issues.map((i) => (i.description.match(/^\[([a-z-]+)\]/) || [])[1]);
}

// --- bad scene: chain breaks, axis break, screen-direction flip --------------
const badShots = loadShots(path.join(__dirname, 'fixtures', 'scene-bad'));
assert.strictEqual(badShots.length, 2);
assert.strictEqual(badShots[0].id, 'SH_010_001', 'shots must be ordered by order');

const bad = analyzeScene(badShots);
const tags = tagsOf(bad.issues);
assert.ok(tags.includes('axis-break'), `expected axis-break in ${tags}`);
assert.ok(tags.includes('screen-direction-flip'), `expected screen-direction-flip in ${tags}`);
assert.strictEqual(tags.filter((t) => t === 'chain-break').length, 2,
  `expected 2 chain-breaks (exits_to and enters_from both wrong) in ${tags}`);
for (const issue of bad.issues) {
  assert.strictEqual(issue.shot, 'SH_010_002', 'all fixture violations surface on shot 2');
  assert.ok(['critical', 'major', 'minor', 'note'].includes(issue.severity));
}
assert.ok(bad.issues.every((i) => i.severity === 'major'), 'these are all major violations');

// derived state matches continuity-state schema
assert.strictEqual(bad.state.scene, 'SC_010');
assert.deepStrictEqual(bad.state.axes.map((a) => a.id), ['AXIS_SC010_A', 'AXIS_SC010_B']);
assert.strictEqual(bad.state.axes[0].established_in, 'SH_010_001');
assert.deepStrictEqual(bad.state.axes[1].subjects, ['CHAR_MARA']);
assert.deepStrictEqual(bad.state.open_issues, bad.issues);
const badValidated = schemaLib.validate(stateSchema, bad.state);
assert.ok(badValidated.valid,
  `derived scene-state must satisfy continuity-state.schema.json: ${JSON.stringify(badValidated.errors.slice(0, 3))}`);

// --- good scene: neutral shot makes the axis/direction change legal ----------
const goodShots = loadShots(path.join(__dirname, 'fixtures', 'scene-good'));
assert.strictEqual(goodShots.length, 3);
const good = analyzeScene(goodShots);
assert.deepStrictEqual(good.issues, [], `clean scene must have no issues: ${JSON.stringify(good.issues)}`);

// previous state is preserved and refreshed (position + last_seen_in)
const prior = {
  scene: 'SC_020',
  axes: [{ id: 'AXIS_SC020_A', established_in: 'SH_020_001', subjects: ['CHAR_MARA'] }],
  character_states: {
    CHAR_MARA: { wardrobe: 'LOOK_MARA_TRAVEL_V01', position: 'off_screen', last_seen_in: null },
  },
  lighting: 'sodium-vapor night',
  last_validated: '2026-07-01T00:00:00Z',
};
const withState = analyzeScene(goodShots, prior);
assert.deepStrictEqual(withState.issues, []);
const mara = withState.state.character_states.CHAR_MARA;
assert.strictEqual(mara.wardrobe, 'LOOK_MARA_TRAVEL_V01', 'wardrobe must be preserved');
assert.strictEqual(mara.last_seen_in, 'SH_020_003');
assert.strictEqual(mara.position, 'bench_seated');
assert.strictEqual(withState.state.lighting, 'sodium-vapor night', 'prior fields survive the refresh');
const goodValidated = schemaLib.validate(stateSchema, withState.state);
assert.ok(goodValidated.valid,
  `refreshed scene-state must satisfy the schema: ${JSON.stringify(goodValidated.errors.slice(0, 3))}`);

console.log('continuity: OK');
