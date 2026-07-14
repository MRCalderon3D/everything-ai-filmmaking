'use strict';
/** camera-moves.js covers every movement.type the shot schema allows and
 * composes sane model-ready phrases. */

const assert = require('assert');
const path = require('path');
const { MOVES, DIRECTION_TEXT, describe } = require('../scripts/lib/camera-moves');

const shotSchema = require(path.join(__dirname, '..', 'schemas', 'shot.schema.json'));
const movement = shotSchema.properties.camera.properties.movement.properties;
const typeEnum = movement.type.enum;
const directionEnum = movement.direction.enum;

// Every schema move has a phrase entry, and no orphan entries exist.
for (const type of typeEnum) {
  assert.ok(MOVES[type], `no camera-moves entry for schema move "${type}"`);
  assert.ok(['reliable', 'risky', 'ai_native'].includes(MOVES[type].reliability),
    `${type}: bad reliability tier`);
}
for (const type of Object.keys(MOVES)) {
  assert.ok(typeEnum.includes(type), `camera-moves entry "${type}" not in shot schema enum`);
}

// Every schema direction has phrase text.
for (const dir of directionEnum) {
  assert.ok(DIRECTION_TEXT[dir], `no direction text for "${dir}"`);
}

// describe() returns a non-empty phrase for every move.
for (const type of typeEnum) {
  const phrase = describe({ type, speed: 'slow', direction: 'right' });
  assert.ok(phrase && phrase.length > 5, `${type}: empty phrase`);
}

// Spot-check composition.
assert.strictEqual(describe({ type: 'static' }),
  'locked-off static camera, no camera movement');
assert.strictEqual(describe({ type: 'pan', direction: 'left', speed: 'slow' }),
  'slow pan to the left');
assert.strictEqual(describe({ type: 'dolly_in', speed: 'slow', distance_m: 0.7 }),
  'slow dolly in, camera moving toward the subject (0.7m travel)');
assert.strictEqual(describe({ type: 'whip_pan', direction: 'right', speed: 'slow' }),
  'fast whip pan to the right'); // speed suppressed: a whip pan is fast by definition
assert.strictEqual(describe({ type: 'zoom', direction: 'out', speed: 'medium' }),
  'medium optical zoom out, lens zoom only, camera position fixed');
assert.strictEqual(describe({ type: 'orbit', direction: 'counterclockwise', degrees: 180 }),
  'orbit counterclockwise around the subject, camera circling at constant distance (180 degree sweep)');

// Unknown/missing types degrade to '' so callers can fall back.
assert.strictEqual(describe(null), '');
assert.strictEqual(describe({}), '');
assert.strictEqual(describe({ type: 'warp_drive' }), '');

console.log('camera-moves: OK');
