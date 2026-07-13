'use strict';
/** All 8 manifests parse and have the contracted shapes and counts. */

const assert = require('assert');
const { loadManifests } = require('../scripts/lib/manifest');

const { manifests, errors } = loadManifests();
assert.deepStrictEqual(errors, [], `manifest load errors: ${JSON.stringify(errors)}`);

// agents.json
const agents = manifests['agents.json'].agents;
assert.strictEqual(agents.length, 17, `expected 17 agents, got ${agents.length}`);
for (const a of agents) {
  assert.ok(a.name && a.file && a.description, `agent entry incomplete: ${JSON.stringify(a)}`);
  assert.strictEqual(a.file, `agents/${a.name}.md`);
}

// commands.json
const commands = manifests['commands.json'].commands;
assert.strictEqual(commands.length, 20, `expected 20 commands, got ${commands.length}`);
for (const c of commands) {
  assert.ok(c.name && c.file && c.description, `command entry incomplete: ${c.name}`);
  assert.ok(Array.isArray(c.agents) && c.agents.length > 0, `${c.name}: agents[] required`);
  assert.ok(Array.isArray(c.skills) && c.skills.length > 0, `${c.name}: skills[] required`);
}

// spot-check the authoritative map rows
const smartShot = commands.find((c) => c.name === 'smart-shot');
assert.deepStrictEqual(smartShot.agents, [
  'visual-director', 'cinematographer', 'shot-planner', 'storyboard-artist',
  'continuity-supervisor', 'prompt-director',
]);
assert.deepStrictEqual(smartShot.skills, [
  'scene-blocking', 'cinematography', 'shot-sequencing', 'reference-selection',
  'storyboard-generation', 'prompt-compilation',
]);
const refPlan = commands.find((c) => c.name === 'reference-plan');
assert.deepStrictEqual(refPlan.agents, ['prompt-director', 'continuity-supervisor']);
assert.deepStrictEqual(refPlan.skills, ['reference-selection']);

// skills.json
const skills = manifests['skills.json'].skills;
assert.strictEqual(skills.length, 20, `expected 20 skills, got ${skills.length}`);
const categories = ['story', 'visual', 'production', 'generation', 'post'];
for (const s of skills) {
  assert.ok(s.name && s.file && s.description, `skill entry incomplete: ${s.name}`);
  assert.strictEqual(s.file, `skills/${s.name}/SKILL.md`);
  assert.ok(categories.includes(s.category), `${s.name}: bad category ${s.category}`);
}
assert.strictEqual(skills.find((s) => s.name === 'script-analysis').category, 'story');
assert.strictEqual(skills.find((s) => s.name === 'reference-selection').category, 'production');
assert.strictEqual(skills.find((s) => s.name === 'edit-planning').category, 'post');

// providers
const img = manifests['image-providers.json'].providers;
const vid = manifests['video-providers.json'].providers;
const aud = manifests['audio-providers.json'].providers;
assert.deepStrictEqual(img.map((p) => p.id), ['fal', 'replicate', 'comfyui', 'harness-native']);
assert.deepStrictEqual(vid.map((p) => p.id), ['veo', 'kling', 'runway', 'seedance', 'fal']);
assert.deepStrictEqual(aud.map((p) => p.id), ['elevenlabs', 'fal', 'local']);
for (const p of [...img, ...vid, ...aud]) {
  assert.ok(p.file && typeof p.label === 'string' && Array.isArray(p.env) &&
    p.capabilities && typeof p.capabilities === 'object',
    `provider entry incomplete: ${p.id}`);
}
const veo = vid.find((p) => p.id === 'veo');
assert.strictEqual(veo.capabilities.maxDurationSeconds, 8);
assert.strictEqual(veo.capabilities.referenceImages, 3);
assert.strictEqual(veo.capabilities.audio, true);
assert.deepStrictEqual(veo.capabilities.aspectRatios, ['16:9', '9:16']);
assert.strictEqual(vid.find((p) => p.id === 'kling').capabilities.maxDurationSeconds, 10);

// profiles
const profiles = manifests['profiles.json'].profiles;
assert.deepStrictEqual(Object.keys(profiles).sort(),
  ['full', 'generation', 'previs', 'writing-room']);
assert.strictEqual(profiles.full.commands.length, 20);
assert.strictEqual(profiles.full.agents.length, 17);
assert.strictEqual(profiles.full.skills.length, 20);
assert.ok(profiles['writing-room'].commands.includes('story-bible'));
assert.ok(!profiles['writing-room'].commands.includes('generate-clips'));
assert.ok(profiles.previs.commands.includes('storyboard'));
assert.ok(!profiles.previs.commands.includes('generate-keyframes'));
assert.ok(profiles.generation.commands.includes('reference-plan'));
assert.ok(profiles.generation.commands.includes('continuity-review'));

// harnesses
const harnesses = manifests['harnesses.json'].harnesses;
assert.deepStrictEqual(harnesses.map((h) => h.id), ['claude', 'codex', 'cursor', 'opencode', 'agents']);
assert.deepStrictEqual(harnesses.map((h) => h.targetDir), ['.claude', '.codex', '.cursor', '.opencode', '.agents']);

console.log('manifests-parse: OK');
