'use strict';
/** The rosters parsed from docs/conventions.md match the manifests exactly. */

const assert = require('assert');
const { loadManifests, parseConventionsRosters } = require('../scripts/lib/manifest');

const rosters = parseConventionsRosters();
const { manifests, errors } = loadManifests();
assert.deepStrictEqual(errors, [], `manifest load errors: ${JSON.stringify(errors)}`);

function asSortedSet(list) {
  return [...new Set(list)].sort();
}

// counts declared in conventions.md headers
assert.strictEqual(rosters.counts.agents, 17);
assert.strictEqual(rosters.counts.commands, 20);
assert.strictEqual(rosters.counts.skills, 20);
assert.strictEqual(rosters.counts.providers, 12);
assert.strictEqual(rosters.agents.length, 17, `parsed ${rosters.agents.length} agent names`);
assert.strictEqual(rosters.commands.length, 20);
assert.strictEqual(rosters.skills.length, 20);

assert.deepStrictEqual(
  asSortedSet(manifests['agents.json'].agents.map((a) => a.name)),
  asSortedSet(rosters.agents),
  'agents.json does not match the conventions roster');

assert.deepStrictEqual(
  asSortedSet(manifests['commands.json'].commands.map((c) => c.name)),
  asSortedSet(rosters.commands),
  'commands.json does not match the conventions roster');

assert.deepStrictEqual(
  asSortedSet(manifests['skills.json'].skills.map((s) => s.name)),
  asSortedSet(rosters.skills),
  'skills.json does not match the conventions roster');

assert.deepStrictEqual(
  asSortedSet(manifests['image-providers.json'].providers.map((p) => p.id)),
  asSortedSet(rosters.providers.image),
  'image-providers.json does not match the conventions roster');
assert.deepStrictEqual(
  asSortedSet(manifests['video-providers.json'].providers.map((p) => p.id)),
  asSortedSet(rosters.providers.video),
  'video-providers.json does not match the conventions roster');
assert.deepStrictEqual(
  asSortedSet(manifests['audio-providers.json'].providers.map((p) => p.id)),
  asSortedSet(rosters.providers.audio),
  'audio-providers.json does not match the conventions roster');

// commands.json agents/skills arrays reference roster names only
for (const c of manifests['commands.json'].commands) {
  for (const a of c.agents) assert.ok(rosters.agents.includes(a), `${c.name}: unknown agent ${a}`);
  for (const s of c.skills) assert.ok(rosters.skills.includes(s), `${c.name}: unknown skill ${s}`);
}

console.log('rosters-match-conventions: OK');
