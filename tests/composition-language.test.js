'use strict';
/** composition-language.js mirrors the shot schema's composition vocab and
 * composes sane framing phrases. */

const assert = require('assert');
const path = require('path');
const { SCHEME_TEXT, LOOKING_ROOM_TEXT, HEADROOM_TEXT, describeComposition } =
  require('../scripts/lib/composition-language');

const shotSchema = require(path.join(__dirname, '..', 'schemas', 'shot.schema.json'));
const comp = shotSchema.properties.camera.properties.composition.properties;

// Schema and lib agree, both directions.
assert.deepStrictEqual(Object.keys(SCHEME_TEXT).sort(), [...comp.scheme.enum].sort(),
  'scheme enum and SCHEME_TEXT disagree');
assert.deepStrictEqual(Object.keys(LOOKING_ROOM_TEXT).sort(), [...comp.looking_room.enum].sort(),
  'looking_room enum and LOOKING_ROOM_TEXT disagree');
assert.deepStrictEqual(Object.keys(HEADROOM_TEXT).sort(), [...comp.headroom.enum].sort(),
  'headroom enum and HEADROOM_TEXT disagree');

// Every scheme yields a non-empty phrase.
for (const scheme of comp.scheme.enum) {
  const phrase = describeComposition({ scheme });
  assert.ok(phrase && phrase.length > 10, `${scheme}: empty phrase`);
}

// Composition of modifiers; unmarked defaults stay silent; notes never leak.
assert.strictEqual(
  describeComposition({ scheme: 'short_sided', looking_room: 'denied', headroom: 'tight' }),
  'short-sided framing, subject facing the near frame edge with the empty space behind them, ' +
  'looking room denied, gaze pressed against the frame edge, tight headroom');
assert.strictEqual(
  describeComposition({ scheme: 'thirds', looking_room: 'standard', headroom: 'standard' }),
  'rule-of-thirds composition, subject on a thirds intersection');
assert.strictEqual(describeComposition({ notes: 'boards only' }), '');
assert.strictEqual(describeComposition(null), '');
assert.strictEqual(describeComposition(undefined), '');

console.log('composition-language: OK');
