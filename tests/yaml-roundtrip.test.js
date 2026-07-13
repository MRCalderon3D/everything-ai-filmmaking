'use strict';
/** scripts/lib/yaml.js: parse the supported subset, round-trip losslessly. */

const assert = require('assert');
const yaml = require('../scripts/lib/yaml');

// --- parsing the subset -----------------------------------------------------

const doc = yaml.parse(`
---
# a project-ish document
id: SC_004            # trailing comment
title: "The Long: Night"
ratio: 16:9
duration: 6
weight: 2.5
approved: true
draft: false
empty: null
tilde: ~
quoted_single: 'it''s fine'
tags: [drama, "neo noir", 3]
inline_map: {a: 1, b: right}
nested:
  level2:
    deep: value
  list_under_key:
    - one
    - two
same_indent_list:
- alpha
- beta
shots:
  - id: SH_004_001
    order: 1
    camera:
      move: push-in
  - id: SH_004_002
    order: 2
block_literal: |
  line one
  line two
block_folded: >-
  folded into
  one line
`);

assert.strictEqual(doc.id, 'SC_004');
assert.strictEqual(doc.title, 'The Long: Night');
assert.strictEqual(doc.ratio, '16:9', '16:9 must stay a string');
assert.strictEqual(doc.duration, 6);
assert.strictEqual(doc.weight, 2.5);
assert.strictEqual(doc.approved, true);
assert.strictEqual(doc.draft, false);
assert.strictEqual(doc.empty, null);
assert.strictEqual(doc.tilde, null);
assert.strictEqual(doc.quoted_single, "it's fine");
assert.deepStrictEqual(doc.tags, ['drama', 'neo noir', 3]);
assert.deepStrictEqual(doc.inline_map, { a: 1, b: 'right' });
assert.strictEqual(doc.nested.level2.deep, 'value');
assert.deepStrictEqual(doc.nested.list_under_key, ['one', 'two']);
assert.deepStrictEqual(doc.same_indent_list, ['alpha', 'beta']);
assert.strictEqual(doc.shots.length, 2);
assert.strictEqual(doc.shots[0].id, 'SH_004_001');
assert.strictEqual(doc.shots[0].camera.move, 'push-in');
assert.strictEqual(doc.shots[1].order, 2);
assert.strictEqual(doc.block_literal, 'line one\nline two\n');
assert.strictEqual(doc.block_folded, 'folded into one line');

// comments inside quoted strings survive
assert.strictEqual(yaml.parse('k: "a # not a comment"').k, 'a # not a comment');

// top-level list documents
assert.deepStrictEqual(yaml.parse('- 1\n- 2\n'), [1, 2]);

// empty / comment-only documents
assert.strictEqual(yaml.parse(''), null);
assert.strictEqual(yaml.parse('# only a comment\n'), null);

// errors on unsupported constructs
assert.throws(() => yaml.parse('a: &anchor 1'), /not supported/);
assert.throws(() => yaml.parse('\ta: 1'), /tab indentation/);
assert.throws(() => yaml.parse('a: 1\n---\nb: 2'), /multiple documents/);

// --- round trip --------------------------------------------------------------

const original = {
  id: 'GEN_SH_004_002_01',
  shot_id: 'SH_004_002',
  status: 'dry_run',
  cost_estimate: 2.5,
  duration_seconds: 6,
  aspect_ratio: '16:9',
  ok: true,
  missing: null,
  weird_string: 'true',          // must stay a string
  numeric_string: '007',         // must stay a string
  colon_string: 'note: keep',
  multiline: 'line one\nline two',
  empty_list: [],
  empty_map: {},
  references: [
    { id: 'CHAR_MARA_FACE_MASTER_V03', role: 'identity', path: 'refs/mara.png' },
    { id: 'LOC_DINER_ANGLE_A', role: 'location', nested: { angle: 45 } },
  ],
  outputs: ['a.mp4', 'b.mp4'],
  request: {
    model: 'veo-3.0-generate-001',
    body: { instances: [{ prompt: 'a rainy street at night — #moody' }] },
  },
};

const text = yaml.stringify(original);
assert.ok(!text.includes('\r'), 'stringify must emit LF only');
assert.ok(text.endsWith('\n'), 'stringify must end with a newline');
const reparsed = yaml.parse(text);
assert.deepStrictEqual(reparsed, original, `round trip mismatch:\n${text}`);

// double round trip is stable (idempotent formatting)
assert.strictEqual(yaml.stringify(yaml.parse(text)), text);

// scalars needing quotes
const tricky = yaml.parse(yaml.stringify({ a: '16:9', b: 'null', c: '- dash', d: '#hash', e: 'yes: no' }));
assert.deepStrictEqual(tricky, { a: '16:9', b: 'null', c: '- dash', d: '#hash', e: 'yes: no' });

console.log('yaml-roundtrip: OK');
