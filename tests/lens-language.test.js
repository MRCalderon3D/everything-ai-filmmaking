'use strict';
/** lens-language.js: bands cover all focal lengths, phrases compose, kit
 * enforcement and provider policy behave. */

const assert = require('assert');
const path = require('path');
const lens = require('../scripts/lib/lens-language');

const shotSchema = require(path.join(__dirname, '..', 'schemas', 'shot.schema.json'));
const camProps = shotSchema.properties.camera.properties;
const projectSchema = require(path.join(__dirname, '..', 'schemas', 'project.schema.json'));

// Schema and lib agree on lens_type and squeeze vocabularies.
assert.deepStrictEqual(
  camProps.lens_type.enum.filter((t) => t !== 'spherical').sort(),
  Object.keys(lens.LENS_TYPE_TEXT).filter((t) => lens.LENS_TYPE_TEXT[t]).sort(),
  'lens_type enum and LENS_TYPE_TEXT disagree');
assert.deepStrictEqual(camProps.anamorphic_squeeze.enum, [1.33, 1.5, 1.65, 1.8, 2]);
assert.ok(projectSchema.properties.lens_kit, 'project schema lacks lens_kit');

// Bands are contiguous from 0 to Infinity.
let prev = 0;
for (const band of lens.FOCAL_BANDS) {
  assert.ok(band.maxMm > prev, `band ${band.key} not ascending`);
  prev = band.maxMm;
}
assert.strictEqual(prev, Infinity, 'bands must end at Infinity');
for (const mm of [12, 24, 28, 35, 50, 85, 135, 300]) {
  assert.ok(lens.focalBand(mm), `no band for ${mm}mm`);
}

// Phrase composition.
assert.strictEqual(lens.describeLens({ lens_mm: 85 }), '85mm portrait lens, flattering compressed perspective');
assert.strictEqual(
  lens.describeLens({ lens_mm: 50, t_stop: 1.4, depth_of_field: 'shallow' }),
  '50mm lens, natural human-eye perspective, f/1.4, shallow depth of field');
assert.ok(
  lens.describeLens({ lens_mm: 40 }, { lens_type: 'anamorphic', anamorphic_squeeze: 2, character: 'vintage warmth' })
    .includes('2x anamorphic lens'), 'kit anamorphic not folded in');
assert.ok(lens.describeLens({ lens_mm: 40 }, { character: 'vintage warmth' }).endsWith('vintage warmth'));
assert.strictEqual(lens.describeLens({ lens_mm: 50, depth_of_field: 'medium' }), '50mm lens, natural human-eye perspective');
assert.strictEqual(lens.describeLens(null), '');
assert.strictEqual(lens.describeLens({}), '');

// Kit enforcement.
const kit = { focal_lengths_mm: [28, 50, 85] };
assert.strictEqual(lens.checkKit({ lens_mm: 50 }, kit).ok, true);
assert.strictEqual(lens.checkKit({ lens_mm: 40 }, kit).ok, false);
assert.ok(lens.checkKit({ lens_mm: 40 }, kit).message.includes('outside the project lens kit'));
assert.strictEqual(lens.checkKit({ lens_mm: 40 }, null).ok, true, 'no kit declared = pass');
assert.strictEqual(lens.checkKit({}, kit).ok, true, 'no lens_mm = pass');

// Provider policy: Runway video prompts are motion-only; everyone else text.
assert.strictEqual(lens.lensPolicy('runway', 'video'), 'keyframe_only');
assert.strictEqual(lens.lensPolicy('runway', 'image'), 'text');
assert.strictEqual(lens.lensPolicy('veo', 'video'), 'text');
assert.strictEqual(lens.lensPolicy('fal', 'image'), 'text');

console.log('lens-language: OK');
