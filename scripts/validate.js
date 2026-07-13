#!/usr/bin/env node
'use strict';
/**
 * validate.js — the validation gate (what CI runs).
 *
 * Sections:
 *   1. Manifests parse and match the rosters in docs/conventions.md
 *   2. Every manifest file entry exists on disk
 *   3. agents/*.md      — frontmatter + required sections + skill refs
 *   4. commands/*.md    — frontmatter + sections; Invokes Agents / Required
 *                          Skills match commands.json and the rosters
 *   5. skills/<name>/SKILL.md — frontmatter + required sections + category
 *   6. schemas/          — parse as usable JSON Schema (draft 2020-12 subset)
 *   7. templates/        — validate against their schemas
 *   8. providers/        — export the required interface, match manifests
 *   9. hooks/hooks.json  — references existing hook files
 *  10. harness wrappers  — match what sync-harnesses.js would emit (drift)
 *
 * Sections degrade gracefully (report, not crash) when a directory is
 * missing. Non-zero exit on any failure.
 */

const path = require('path');
const { ROOT, exists, readJson, readText, walk, toPosix } = require('./lib/fsx');
const { loadManifests, entries, parseConventionsRosters } = require('./lib/manifest');
const { createReport } = require('./lib/report');
const { parseFrontmatter, sectionHeadings, sectionBullets } = require('./lib/md');
const schemaLib = require('./lib/schema');
const yaml = require('./lib/yaml');
const { helpIfRequested, parseArgs } = require('./lib/cli');

const HELP = `
validate.js — full validation gate for the scaffold.

Usage:
  node scripts/validate.js [--root <dir>] [--section <name>]

Options:
  --root <dir>      Scaffold root (default: this repository).
  --section <name>  Run a single section (manifests, files, agents, commands,
                    skills, schemas, templates, providers, hooks, harnesses).
  --help            Show this help.

Exit code 0 when everything passes, 1 otherwise.
`;

const SCHEMA_NAMES = [
  'project', 'story-bible', 'character', 'wardrobe', 'location',
  'location-map', 'prop', 'scene', 'beat', 'shot', 'reference-plan',
  'prompt-package', 'continuity-state', 'generation-record',
];

const AGENT_SECTIONS = ['Role', 'Responsibilities', 'Uses These Skills',
  'Collaborates With', 'Deliverables', 'Activation Guidance'];
const COMMAND_SECTIONS = ['Purpose', 'Use When', 'Inputs', 'Invokes Agents',
  'Required Skills', 'Process', 'Outputs', 'Notes'];
const SKILL_SECTIONS = ['Purpose', 'Use When', 'Inputs', 'Process', 'Outputs',
  'Quality Bar', 'Common Failure Modes', 'Related Agents', 'Related Commands', 'Notes'];
const SKILL_CATEGORIES = ['story', 'visual', 'production', 'generation', 'post'];

function sameSet(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function setDiff(a, b) {
  const sb = new Set(b);
  return [...new Set(a)].filter((x) => !sb.has(x));
}

// ---------------------------------------------------------------------------

function sectionManifests(report, ctx) {
  report.section('Manifests vs rosters (docs/conventions.md)');
  for (const err of ctx.manifestErrors) {
    report.fail(`manifests/${err.file}: ${err.message}`);
  }
  if (!ctx.rosters) {
    report.fail('docs/conventions.md rosters could not be parsed');
    return;
  }
  const pairs = [
    ['agents.json', 'agents', ctx.rosters.agents],
    ['commands.json', 'commands', ctx.rosters.commands],
    ['skills.json', 'skills', ctx.rosters.skills],
  ];
  for (const [file, key, roster] of pairs) {
    const names = entries(ctx.manifests, file, key).map((e) => e.name);
    if (!ctx.manifests[file]) continue; // already reported
    if (report.check(sameSet(names, roster) && names.length === roster.length,
      `manifests/${file}: ${names.length} entries match the ${key} roster (${roster.length})`)) {
      // also verify no duplicates
      if (new Set(names).size !== names.length) report.fail(`manifests/${file}: duplicate names`);
    } else {
      const missing = setDiff(roster, names);
      const extra = setDiff(names, roster);
      if (missing.length) report.info(`missing: ${missing.join(', ')}`);
      if (extra.length) report.info(`extra: ${extra.join(', ')}`);
    }
  }
  for (const kind of ['image', 'video', 'audio']) {
    const file = `${kind}-providers.json`;
    if (!ctx.manifests[file]) continue;
    const ids = entries(ctx.manifests, file, 'providers').map((p) => p.id);
    const roster = ctx.rosters.providers[kind] || [];
    if (!report.check(sameSet(ids, roster) && ids.length === roster.length,
      `manifests/${file}: providers match roster (${roster.join(', ')})`)) {
      report.info(`manifest has: ${ids.join(', ')}`);
    }
  }
  if (ctx.manifests['profiles.json']) {
    const profiles = ctx.manifests['profiles.json'].profiles || {};
    const expected = ['full', 'writing-room', 'previs', 'generation'];
    report.check(sameSet(Object.keys(profiles), expected),
      'manifests/profiles.json: profiles are full, writing-room, previs, generation');
    for (const [name, prof] of Object.entries(profiles)) {
      const bad = [];
      for (const c of prof.commands || []) if (!ctx.rosters.commands.includes(c)) bad.push(`command ${c}`);
      for (const a of prof.agents || []) if (!ctx.rosters.agents.includes(a)) bad.push(`agent ${a}`);
      for (const s of prof.skills || []) if (!ctx.rosters.skills.includes(s)) bad.push(`skill ${s}`);
      report.check(bad.length === 0,
        bad.length === 0 ? `profile "${name}" references roster names only`
          : `profile "${name}" references unknown names: ${bad.join(', ')}`);
    }
  }
  if (ctx.manifests['harnesses.json']) {
    const ids = (ctx.manifests['harnesses.json'].harnesses || []).map((h) => h.id);
    report.check(sameSet(ids, ['claude', 'codex', 'cursor', 'opencode', 'agents']),
      'manifests/harnesses.json: harnesses are claude, codex, cursor, opencode, agents');
  }
}

function sectionFiles(report, ctx) {
  report.section('Manifest file entries exist on disk');
  const lists = [
    ['agents.json', 'agents'], ['commands.json', 'commands'], ['skills.json', 'skills'],
    ['image-providers.json', 'providers'], ['video-providers.json', 'providers'],
    ['audio-providers.json', 'providers'],
  ];
  let missing = 0;
  let total = 0;
  for (const [file, key] of lists) {
    for (const entry of entries(ctx.manifests, file, key)) {
      total++;
      const p = path.join(ctx.root, ...String(entry.file).split('/'));
      if (!exists(p)) {
        missing++;
        report.fail(`${file}: ${entry.name || entry.id} -> ${entry.file} does not exist`);
      }
    }
  }
  if (missing === 0) report.pass(`all ${total} manifest file entries exist`);
}

function checkDocSections(report, label, body, required) {
  const headings = sectionHeadings(body).map((h) => h.toLowerCase());
  const missing = required.filter((s) => !headings.includes(s.toLowerCase()));
  return report.check(missing.length === 0,
    missing.length === 0 ? `${label}: all required sections present`
      : `${label}: missing sections: ${missing.join(', ')}`);
}

function sectionAgents(report, ctx) {
  report.section('agents/*.md');
  if (!exists(path.join(ctx.root, 'agents')) || walk(path.join(ctx.root, 'agents')).length === 0) {
    report.fail('agents/ is missing or empty (not written yet?)');
    return;
  }
  for (const entry of entries(ctx.manifests, 'agents.json', 'agents')) {
    const file = path.join(ctx.root, ...String(entry.file).split('/'));
    if (!exists(file)) continue; // reported in files section
    let parsed;
    try {
      parsed = parseFrontmatter(readText(file));
    } catch (err) {
      report.fail(`${entry.file}: frontmatter error: ${err.message}`);
      continue;
    }
    const fm = parsed.frontmatter;
    if (!fm) { report.fail(`${entry.file}: missing frontmatter`); continue; }
    const fmOk = fm.name === entry.name && typeof fm.description === 'string' &&
      Array.isArray(fm.tools) && typeof fm.model === 'string';
    report.check(fmOk, `${entry.file}: frontmatter valid (name/description/tools/model)` +
      (fmOk ? '' : ` — got name=${fm.name}, tools=${JSON.stringify(fm.tools)}, model=${fm.model}`));
    checkDocSections(report, entry.file, parsed.body, AGENT_SECTIONS);
    if (ctx.rosters) {
      const used = sectionBullets(parsed.body, 'Uses These Skills');
      const unknown = used.filter((s) => !ctx.rosters.skills.includes(s));
      report.check(unknown.length === 0,
        unknown.length === 0 ? `${entry.file}: referenced skills exist`
          : `${entry.file}: references unknown skills: ${unknown.join(', ')}`);
    }
  }
}

function sectionCommands(report, ctx) {
  report.section('commands/*.md');
  if (!exists(path.join(ctx.root, 'commands')) || walk(path.join(ctx.root, 'commands')).length === 0) {
    report.fail('commands/ is missing or empty (not written yet?)');
    return;
  }
  for (const entry of entries(ctx.manifests, 'commands.json', 'commands')) {
    const file = path.join(ctx.root, ...String(entry.file).split('/'));
    if (!exists(file)) continue;
    let parsed;
    try {
      parsed = parseFrontmatter(readText(file));
    } catch (err) {
      report.fail(`${entry.file}: frontmatter error: ${err.message}`);
      continue;
    }
    if (!parsed.frontmatter || typeof parsed.frontmatter.description !== 'string') {
      report.fail(`${entry.file}: frontmatter must carry a description string`);
    } else {
      report.pass(`${entry.file}: frontmatter valid`);
    }
    checkDocSections(report, entry.file, parsed.body, COMMAND_SECTIONS);

    const listedAgents = sectionBullets(parsed.body, 'Invokes Agents');
    const listedSkills = sectionBullets(parsed.body, 'Required Skills');
    if (ctx.rosters) {
      const badA = listedAgents.filter((a) => !ctx.rosters.agents.includes(a));
      const badS = listedSkills.filter((s) => !ctx.rosters.skills.includes(s));
      report.check(badA.length === 0 && badS.length === 0,
        badA.length === 0 && badS.length === 0
          ? `${entry.file}: Invokes Agents / Required Skills use roster names only`
          : `${entry.file}: non-roster names: ${[...badA, ...badS].join(', ')}`);
    }
    const missingA = setDiff(entry.agents || [], listedAgents);
    const missingS = setDiff(entry.skills || [], listedSkills);
    report.check(missingA.length === 0 && missingS.length === 0,
      missingA.length === 0 && missingS.length === 0
        ? `${entry.file}: sections cover commands.json agents/skills`
        : `${entry.file}: missing from sections — agents: [${missingA.join(', ')}] skills: [${missingS.join(', ')}]`);
  }
}

function sectionSkills(report, ctx) {
  report.section('skills/*/SKILL.md');
  if (!exists(path.join(ctx.root, 'skills')) || walk(path.join(ctx.root, 'skills')).length === 0) {
    report.fail('skills/ is missing or empty (not written yet?)');
    return;
  }
  for (const entry of entries(ctx.manifests, 'skills.json', 'skills')) {
    const file = path.join(ctx.root, ...String(entry.file).split('/'));
    if (!exists(file)) continue;
    let parsed;
    try {
      parsed = parseFrontmatter(readText(file));
    } catch (err) {
      report.fail(`${entry.file}: frontmatter error: ${err.message}`);
      continue;
    }
    const fm = parsed.frontmatter || {};
    const fmOk = fm.name === entry.name && typeof fm.description === 'string' &&
      fm.origin === 'everything-ai-filmmaking' && SKILL_CATEGORIES.includes(fm.category);
    report.check(fmOk, `${entry.file}: frontmatter valid (name/description/origin/category)` +
      (fmOk ? '' : ` — got name=${fm.name}, origin=${fm.origin}, category=${fm.category}`));
    if (fm.category && entry.category && fm.category !== entry.category) {
      report.fail(`${entry.file}: category ${fm.category} != manifest category ${entry.category}`);
    }
    checkDocSections(report, entry.file, parsed.body, SKILL_SECTIONS);
  }
}

function sectionSchemas(report, ctx) {
  report.section('schemas/*.schema.json');
  const dir = path.join(ctx.root, 'schemas');
  if (!exists(dir)) {
    report.fail('schemas/ is missing (not written yet?)');
    return;
  }
  for (const name of SCHEMA_NAMES) {
    const file = path.join(dir, `${name}.schema.json`);
    if (!exists(file)) {
      report.fail(`schemas/${name}.schema.json missing`);
      continue;
    }
    let doc;
    try {
      doc = readJson(file);
    } catch (err) {
      report.fail(`schemas/${name}.schema.json: invalid JSON: ${err.message}`);
      continue;
    }
    const check = schemaLib.checkSchemaDocument(doc);
    if (!check.valid) {
      report.fail(`schemas/${name}.schema.json: ${check.errors.slice(0, 3).join('; ')}`);
      continue;
    }
    const expectedId = `https://everything-ai-filmmaking.dev/schemas/${name}.schema.json`;
    if (doc.$id && doc.$id !== expectedId) {
      report.fail(`schemas/${name}.schema.json: $id is ${doc.$id}, expected ${expectedId}`);
    } else {
      report.pass(`schemas/${name}.schema.json parses and compiles`);
    }
    ctx.schemas[name] = doc;
  }
}

function sectionTemplates(report, ctx) {
  report.section('templates/ validate against schemas');
  const dir = path.join(ctx.root, 'templates');
  if (!exists(dir)) {
    report.fail('templates/ is missing (not written yet?)');
    return;
  }
  const files = walk(dir, { filter: (f) => /\.ya?ml$/i.test(f) });
  if (!files.length) {
    report.fail('templates/ contains no YAML files');
    return;
  }
  let checked = 0;
  for (const file of files) {
    const rel = toPosix(path.relative(ctx.root, file));
    const base = path.basename(file).replace(/\.ya?ml$/i, '');
    const schemaName = SCHEMA_NAMES.includes(base) ? base
      : (base === 'map' ? 'location-map'
        : (base === 'scene-state' ? 'continuity-state' : null));
    let doc;
    try {
      doc = yaml.parse(readText(file));
    } catch (err) {
      report.fail(`${rel}: YAML parse error: ${err.message}`);
      continue;
    }
    if (!schemaName || !ctx.schemas[schemaName]) {
      report.info(`${rel}: no matching schema (skipped)`);
      continue;
    }
    checked++;
    const result = schemaLib.validate(ctx.schemas[schemaName], doc);
    report.check(result.valid,
      result.valid ? `${rel} validates against ${schemaName}.schema.json`
        : `${rel} violates ${schemaName}.schema.json: ${result.errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join('; ')}`);
  }
  if (checked === 0) report.warn('no templates were schema-checked (schemas missing?)');
}

function sectionProviders(report, ctx) {
  report.section('providers/ interface vs manifests');
  const kinds = [['image', 'image-providers.json'], ['video', 'video-providers.json'], ['audio', 'audio-providers.json']];
  for (const [kind, manifestName] of kinds) {
    for (const entry of entries(ctx.manifests, manifestName, 'providers')) {
      const file = path.join(ctx.root, ...String(entry.file).split('/'));
      if (!exists(file)) continue; // reported in files section
      let mod;
      try {
        mod = require(file);
      } catch (err) {
        report.fail(`${entry.file}: require failed: ${err.message}`);
        continue;
      }
      const problems = [];
      if (mod.id !== entry.id) problems.push(`id "${mod.id}" != manifest "${entry.id}"`);
      if (mod.kind !== kind) problems.push(`kind "${mod.kind}" != "${kind}"`);
      if (typeof mod.label !== 'string' || !mod.label) problems.push('label missing');
      if (!Array.isArray(mod.env)) problems.push('env must be an array');
      else if (!schemaLib.deepEqual(mod.env, entry.env)) problems.push('env differs from manifest');
      if (!mod.capabilities || typeof mod.capabilities !== 'object') problems.push('capabilities missing');
      else if (!schemaLib.deepEqual(mod.capabilities, entry.capabilities)) problems.push('capabilities differ from manifest');
      if (typeof mod.compile !== 'function') problems.push('compile() missing');
      if (typeof mod.generate !== 'function') problems.push('generate() missing');
      report.check(problems.length === 0,
        problems.length === 0 ? `${entry.file}: interface + manifest match`
          : `${entry.file}: ${problems.join('; ')}`);
    }
  }
}

function sectionHooks(report, ctx) {
  report.section('hooks/hooks.json');
  const file = path.join(ctx.root, 'hooks', 'hooks.json');
  if (!exists(file)) {
    report.fail('hooks/hooks.json missing');
    return;
  }
  let config;
  try {
    config = readJson(file);
  } catch (err) {
    report.fail(`hooks/hooks.json: invalid JSON: ${err.message}`);
    return;
  }
  const expected = ['validate-after-write', 'protect-approved-assets',
    'detect-continuity-drift', 'require-cost-confirmation'];
  const ids = (config.hooks || []).map((h) => h.id);
  report.check(sameSet(ids, expected), `hooks.json wires the 4 hooks (${expected.join(', ')})`);
  for (const hook of config.hooks || []) {
    const script = path.join(ctx.root, ...String(hook.script).split('/'));
    report.check(exists(script), `${hook.id}: ${hook.script} ${exists(script) ? 'exists' : 'MISSING'}`);
  }
}

function sectionHarnesses(report, ctx) {
  report.section('Generated harness wrappers (drift vs sync-harnesses.js)');
  let sync;
  try {
    sync = require('./sync-harnesses');
  } catch (err) {
    report.fail(`could not load sync-harnesses.js: ${err.message}`);
    return;
  }
  let plan;
  try {
    plan = sync.buildPlan(ctx.root);
  } catch (err) {
    report.fail(`buildPlan failed: ${err.message}`);
    return;
  }
  if (!Object.keys(plan).length) {
    report.fail('nothing to generate (harnesses.json or source layers missing)');
    return;
  }
  const drift = sync.diffPlan(ctx.root, plan);
  if (drift.length === 0) {
    report.pass(`all ${Object.keys(plan).length} generated files match`);
  } else {
    report.fail(`${drift.length} file(s) drifted — run "npm run sync:harnesses"`);
    for (const d of drift.slice(0, 15)) report.info(d);
    if (drift.length > 15) report.info(`... and ${drift.length - 15} more`);
  }
}

// ---------------------------------------------------------------------------

const SECTIONS = {
  manifests: sectionManifests,
  files: sectionFiles,
  agents: sectionAgents,
  commands: sectionCommands,
  skills: sectionSkills,
  schemas: sectionSchemas,
  templates: sectionTemplates,
  providers: sectionProviders,
  hooks: sectionHooks,
  harnesses: sectionHarnesses,
};

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  const root = flags.root ? path.resolve(String(flags.root)) : ROOT;
  const report = createReport();

  const loaded = loadManifests(root);
  let rosters = null;
  try {
    rosters = parseConventionsRosters(root);
  } catch (err) {
    rosters = null;
  }
  const ctx = {
    root,
    manifests: loaded.manifests,
    manifestErrors: loaded.errors,
    rosters,
    schemas: {},
  };

  const names = flags.section ? [String(flags.section)] : Object.keys(SECTIONS);
  // schemas must run before templates so ctx.schemas is populated
  if (names.includes('templates') && !names.includes('schemas')) names.unshift('schemas');
  for (const name of names) {
    const fn = SECTIONS[name];
    if (!fn) {
      console.error(`unknown section "${name}" (valid: ${Object.keys(SECTIONS).join(', ')})`);
      process.exit(1);
    }
    try {
      fn(report, ctx);
    } catch (err) {
      report.fail(`section "${name}" crashed: ${err.message}`);
    }
  }
  process.exit(report.finish());
}

module.exports = { SECTIONS, SCHEMA_NAMES };

if (require.main === module) main();
