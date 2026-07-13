'use strict';
/** The reference-selection algorithm on a fixture shot + references manifest. */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const yaml = require('../scripts/lib/yaml');
const schemaLib = require('../scripts/lib/schema');
const { selectReferences, buildPlanDocument, angularDistance, versionOf } =
  require('../scripts/build-reference-plan');

const shot = yaml.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'shot.yaml'), 'utf8'));
const manifest = yaml.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'references-manifest.yaml'), 'utf8'));

// the fixture shot itself must satisfy the real shot schema
const shotSchema = require('../schemas/shot.schema.json');
const shotCheck = schemaLib.validate(shotSchema, shot);
assert.ok(shotCheck.valid, `fixture shot violates shot.schema.json: ${JSON.stringify(shotCheck.errors.slice(0, 5))}`);

// helpers
assert.strictEqual(versionOf('CHAR_MARA_FACE_MASTER_V03'), 3);
assert.strictEqual(angularDistance(350, 10), 20);

// --- selection with a generous budget ----------------------------------------
const wide = selectReferences(shot, manifest, { referenceImages: 8 });
const wideRequired = wide.required.map((e) => e.asset_id);

assert.deepStrictEqual(wideRequired, [
  'CHAR_DET_FULL_MASTER_V02',     // identity primary (approved beats draft V04)
  'CHAR_MARA_FACE_MASTER_V03',    // identity primary (highest approved version)
  'CHAR_MARA_WARD_01_V02',        // wardrobe: MARA identity does not cover it
  'LOC_DINER_ANGLE_045_V01',      // nearest angle to camera three_quarter (45°)
  'PROP_LOCKET_MASTER_V01',       // narrative prop required by the shot
]);
assert.ok(!wideRequired.includes('CHAR_MARA_FACE_MASTER_V01'), 'older identity version must lose');
assert.ok(!wideRequired.includes('CHAR_DET_FACE_DRAFT_V04'), 'draft must lose to approved');
assert.ok(!wideRequired.includes('CHAR_DET_WARD_COAT_V01'), 'covers_wardrobe identity needs no wardrobe slot');
assert.ok(!wideRequired.includes('LOC_DINER_ANGLE_000_V01'), 'only the nearest location angle is used');
assert.ok(!wideRequired.includes('PROP_COFFEE_CUP_V01'), 'non-narrative unlisted prop skipped');

// purposes, priorities, entities
const byId = (list, id) => list.find((e) => e.asset_id === id);
assert.strictEqual(byId(wide.required, 'CHAR_MARA_FACE_MASTER_V03').purpose, 'facial_identity');
assert.strictEqual(byId(wide.required, 'CHAR_MARA_FACE_MASTER_V03').priority, 'critical');
assert.strictEqual(byId(wide.required, 'CHAR_MARA_FACE_MASTER_V03').entity, 'CHAR_MARA');
assert.strictEqual(byId(wide.required, 'CHAR_MARA_WARD_01_V02').purpose, 'wardrobe');
assert.strictEqual(byId(wide.required, 'LOC_DINER_ANGLE_045_V01').purpose, 'spatial_geometry');
assert.strictEqual(byId(wide.required, 'LOC_DINER_ANGLE_045_V01').entity, 'LOC_DINER');
assert.strictEqual(byId(wide.required, 'PROP_LOCKET_MASTER_V01').purpose, 'prop_consistency');

// style rides along as optional when the budget allows
assert.deepStrictEqual(wide.optional.map((e) => e.asset_id), ['LOOK_NEON_NOIR_MASTER_V02']);
assert.strictEqual(wide.optional[0].priority, 'low');

// exclusions are honored and reported
assert.deepStrictEqual(wide.exclude, ['CHAR_MARA_OLD_HAIRCUT_V01', 'LOC_DINER_ANGLE_180_V01']);

// --- veo budget (3): required cannot be silently dropped ---------------------
const veoCaps = require('../providers/video/veo').capabilities;
const tight = selectReferences(shot, manifest, veoCaps);
assert.strictEqual(tight.required.length, 5, 'required references are never dropped');
assert.deepStrictEqual(tight.optional, [], 'no budget left for optional references');
assert.ok(tight.notes.some((n) => n.startsWith('ESCALATE')),
  `over-budget required must escalate via notes: ${JSON.stringify(tight.notes)}`);

// --- full plan document validates against the real schema --------------------
const refPlanSchema = require('../schemas/reference-plan.schema.json');
const doc = buildPlanDocument(shot, manifest, 'veo', veoCaps);
assert.strictEqual(doc.shot, 'SH_004_002');
assert.strictEqual(doc.provider, 'veo');
const planCheck = schemaLib.validate(refPlanSchema, doc);
assert.ok(planCheck.valid,
  `plan violates reference-plan.schema.json: ${JSON.stringify(planCheck.errors.slice(0, 5))}`);
// round-trips through the YAML layer
assert.deepStrictEqual(yaml.parse(yaml.stringify(doc)), doc);

console.log('reference-plan: OK');
