'use strict';
/**
 * scripts/lib/schema.js: validates good documents, rejects bad ones, and —
 * when the schemas/ and templates/ layers exist (written by other authors) —
 * validates the repo templates against their schemas. Missing layers are
 * skipped gracefully; scripts/validate.js is the hard gate for those.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const schemaLib = require('../scripts/lib/schema');
const yaml = require('../scripts/lib/yaml');

// --- a schema exercising every supported keyword -----------------------------

const shotSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['id', 'scene_id', 'order', 'camera'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^SH_\\d{3}_\\d{3}$' },
    scene_id: { type: 'string', pattern: '^SC_\\d{3}$' },
    order: { type: 'integer', minimum: 1, maximum: 999 },
    duration_seconds: { type: 'number', minimum: 0.5, maximum: 60 },
    axis: { type: ['string', 'null'] },
    screen_direction: { enum: ['left', 'right', 'neutral'] },
    status: { $ref: '#/$defs/status' },
    description: { type: 'string', minLength: 1, format: 'free-text' },
    characters: { type: 'array', items: { $ref: '#/$defs/characterRef' } },
    framing: {
      oneOf: [
        { type: 'string' },
        { type: 'object', required: ['size'], properties: { size: { type: 'string' } } },
      ],
    },
    camera: {
      anyOf: [
        { type: 'object', required: ['move'], properties: { move: { type: 'string' } }, additionalProperties: true },
        { type: 'string' },
      ],
    },
  },
  $defs: {
    status: { enum: ['draft', 'review', 'approved'] },
    characterRef: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' }, wardrobe: { type: ['string', 'null'] } },
      additionalProperties: false,
    },
  },
};

const goodShot = {
  id: 'SH_004_002',
  scene_id: 'SC_004',
  order: 2,
  duration_seconds: 6,
  axis: 'AXIS_SC004_A',
  screen_direction: 'left',
  status: 'review',
  description: 'Mara slides into the booth.',
  characters: [{ id: 'CHAR_MARA', wardrobe: 'WARD_MARA_01' }],
  framing: { size: 'MCU' },
  camera: { move: 'push-in', lens: '35mm' },
};
const good = schemaLib.validate(shotSchema, goodShot);
assert.ok(good.valid, `good doc should validate: ${JSON.stringify(good.errors)}`);

const badShot = {
  id: 'shot-2',                     // pattern violation
  scene_id: 'SC_004',
  order: 0,                         // minimum violation
  duration_seconds: 120,            // maximum violation
  screen_direction: 'up',           // enum violation
  status: 'final',                  // $ref enum violation
  description: '',                  // minLength violation
  characters: [{ wardrobe: 'W1' }], // items: required id missing
  framing: 42,                      // oneOf: no branch matches
  camera: { pan: 'left' },          // anyOf: no branch matches
  extra_field: true,                // additionalProperties: false
};
const bad = schemaLib.validate(shotSchema, badShot);
assert.ok(!bad.valid, 'bad doc must fail');
const messages = bad.errors.map((e) => `${e.path} ${e.message}`).join('\n');
for (const needle of ['pattern', 'minimum', 'maximum', 'enum', 'minLength',
  'required property "id"', 'oneOf', 'anyOf', 'additional property "extra_field"']) {
  assert.ok(messages.includes(needle), `expected an error mentioning ${needle}:\n${messages}`);
}
// missing required "camera" when absent entirely
const missing = schemaLib.validate(shotSchema, { id: 'SH_001_001', scene_id: 'SC_001', order: 1 });
assert.ok(!missing.valid && JSON.stringify(missing.errors).includes('camera'));

// type arrays + integer distinction
assert.ok(!schemaLib.validate({ type: 'integer' }, 1.5).valid);
assert.ok(schemaLib.validate({ type: 'integer' }, 2).valid);
assert.ok(schemaLib.validate({ type: ['string', 'null'] }, null).valid);

// patternProperties: matching keys are not "additional" and are validated
const patternSchema = {
  type: 'object',
  additionalProperties: false,
  patternProperties: { '^[a-z][a-z0-9_]*$': { type: 'string', minLength: 1 } },
};
assert.ok(schemaLib.validate(patternSchema, { mara: 'beside_bench' }).valid);
assert.ok(!schemaLib.validate(patternSchema, { mara: '' }).valid, 'pattern value schema must apply');
assert.ok(!schemaLib.validate(patternSchema, { MARA: 'x' }).valid, 'non-matching key is additional');

// schema document sanity checker
assert.ok(schemaLib.checkSchemaDocument(shotSchema).valid);
assert.ok(!schemaLib.checkSchemaDocument({ $ref: '#/$defs/nope' }).valid, 'unresolvable ref must be flagged');
assert.ok(!schemaLib.checkSchemaDocument({ pattern: '([' }).valid, 'bad regex must be flagged');

// --- repo schemas + templates (skipped gracefully when not written yet) -----

const ROOT = path.resolve(__dirname, '..');
const schemasDir = path.join(ROOT, 'schemas');
const templatesDir = path.join(ROOT, 'templates');
if (fs.existsSync(schemasDir) && fs.existsSync(templatesDir)) {
  const schemas = {};
  for (const f of fs.readdirSync(schemasDir).filter((f) => f.endsWith('.schema.json'))) {
    const doc = JSON.parse(fs.readFileSync(path.join(schemasDir, f), 'utf8'));
    const check = schemaLib.checkSchemaDocument(doc);
    assert.ok(check.valid, `schemas/${f} not usable: ${check.errors.join('; ')}`);
    schemas[f.replace('.schema.json', '')] = doc;
  }
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name))
      : (/\.ya?ml$/i.test(e.name) ? [path.join(dir, e.name)] : []));
  let checked = 0;
  for (const file of walk(templatesDir)) {
    const base = path.basename(file).replace(/\.ya?ml$/i, '');
    const name = schemas[base] ? base
      : (base === 'map' && schemas['location-map'] ? 'location-map'
        : (base === 'scene-state' && schemas['continuity-state'] ? 'continuity-state' : null));
    if (!name) continue;
    const doc = yaml.parse(fs.readFileSync(file, 'utf8'));
    const result = schemaLib.validate(schemas[name], doc);
    assert.ok(result.valid,
      `template ${file} violates ${name} schema: ${JSON.stringify(result.errors.slice(0, 3))}`);
    checked++;
  }
  console.log(`schema-validator: OK (${checked} template(s) validated against repo schemas)`);
} else {
  console.log('schema-validator: OK (repo schemas/templates not present yet — skipped that part)');
}
