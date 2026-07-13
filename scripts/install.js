#!/usr/bin/env node
'use strict';
/**
 * install.js — copy the scaffold into a target film project.
 *
 * Copies the selected generated harness wrapper dir(s), plus the shared
 * layers a project needs at runtime: rules/, contexts/, schemas/,
 * manifests/, hooks/, scripts/, providers/. Commands/agents/skills inside
 * the harness wrappers are filtered by the chosen profile
 * (manifests/profiles.json). Writes install-manifest.json in the target so
 * doctor.js can audit the install.
 */

const path = require('path');
const fs = require('fs');
const { ROOT, exists, readJson, readText, walk, toPosix, copyFileEnsuring, writeFileEnsuring } = require('./lib/fsx');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');

const HELP = `
install.js — install the scaffold into a target film project.

Usage:
  node scripts/install.js --target <dir> [--harness <name>] [--profile <name>]

Options:
  --target <dir>     Target project directory (required).
  --harness <name>   claude | codex | cursor | opencode | all  (default: claude)
  --profile <name>   full | writing-room | previs | generation (default: full)
  --force            Overwrite files that already exist in the target.
  --help             Show this help.

Run "npm run sync:harnesses" first — this installs the GENERATED wrapper
dirs. After installing, run "node scripts/doctor.js --target <dir>".
`;

const SHARED_DIRS = ['rules', 'contexts', 'schemas', 'manifests', 'hooks', 'scripts', 'providers'];

/** Decide whether a harness-wrapper file survives the profile filter. */
function includedInProfile(relPosix, profile) {
  // relPosix like ".claude/commands/story-bible.md", ".claude/skills/<n>/SKILL.md",
  // ".codex/prompts/<n>.md", ".cursor/commands/<n>.md", ".opencode/agents/<n>.md"
  const parts = relPosix.split('/');
  if (parts.length < 3) return true; // settings.json, AGENTS.md, ...
  const kindDir = parts[1];
  const base = parts[2].replace(/\.(md|mdc)$/i, '');
  if (kindDir === 'commands' || kindDir === 'prompts') return profile.commands.includes(base);
  if (kindDir === 'agents') return profile.agents.includes(base);
  if (kindDir === 'skills') return profile.skills.includes(parts[2]);
  return true; // rules and everything else always install
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  if (!flags.target || flags.target === true) fatal('--target <dir> is required (see --help)');
  const target = path.resolve(String(flags.target));
  const harnessArg = String(flags.harness || 'claude');
  const profileName = String(flags.profile || 'full');

  const profilesFile = path.join(ROOT, 'manifests', 'profiles.json');
  const harnessesFile = path.join(ROOT, 'manifests', 'harnesses.json');
  if (!exists(profilesFile) || !exists(harnessesFile)) {
    fatal('manifests/profiles.json or manifests/harnesses.json missing — repo incomplete');
  }
  const profiles = readJson(profilesFile).profiles || {};
  const profile = profiles[profileName];
  if (!profile) fatal(`unknown profile "${profileName}" (valid: ${Object.keys(profiles).join(', ')})`);

  const allHarnesses = (readJson(harnessesFile).harnesses || []).map((h) => h.id);
  const harnesses = harnessArg === 'all' ? allHarnesses : harnessArg.split(',').map((s) => s.trim());
  for (const h of harnesses) {
    if (!allHarnesses.includes(h)) fatal(`unknown harness "${h}" (valid: ${allHarnesses.join(', ')}, all)`);
  }

  if (path.resolve(target) === path.resolve(ROOT)) fatal('target must not be the scaffold repo itself');
  fs.mkdirSync(target, { recursive: true });

  const harnessDefs = readJson(harnessesFile).harnesses || [];
  const installed = [];
  let skippedExisting = 0;

  const copyOne = (srcAbs, relPosix) => {
    const dest = path.join(target, ...relPosix.split('/'));
    if (exists(dest) && !flags.force) {
      skippedExisting++;
      return;
    }
    copyFileEnsuring(srcAbs, dest);
    installed.push(relPosix);
  };

  // 1) harness wrapper dirs (generated), filtered by profile
  for (const id of harnesses) {
    const def = harnessDefs.find((h) => h.id === id);
    const dir = path.join(ROOT, def.targetDir);
    if (!exists(dir)) {
      console.warn(`warning: ${def.targetDir}/ not generated yet (run "npm run sync:harnesses"); skipping ${id}`);
      continue;
    }
    for (const file of walk(dir)) {
      const rel = toPosix(path.relative(ROOT, file));
      if (!includedInProfile(rel, profile)) continue;
      copyOne(file, rel);
    }
  }

  // 2) shared layers
  for (const dirName of SHARED_DIRS) {
    const dir = path.join(ROOT, dirName);
    if (!exists(dir)) {
      console.warn(`warning: ${dirName}/ missing in scaffold; skipping`);
      continue;
    }
    for (const file of walk(dir)) {
      copyOne(file, toPosix(path.relative(ROOT, file)));
    }
  }

  // 3) install manifest for doctor.js
  const versionFile = path.join(ROOT, 'VERSION');
  const installManifest = {
    tool: 'everything-ai-filmmaking',
    version: exists(versionFile) ? readText(versionFile).trim() : null,
    installedAt: new Date().toISOString(),
    source: toPosix(ROOT),
    harnesses,
    profile: profileName,
    fileCount: installed.length,
    files: installed.sort(),
  };
  writeFileEnsuring(path.join(target, 'install-manifest.json'),
    JSON.stringify(installManifest, null, 2) + '\n');

  console.log(`install: ${installed.length} files copied to ${target}`);
  if (skippedExisting) console.log(`install: ${skippedExisting} existing files kept (use --force to overwrite)`);
  console.log(`install: harness(es) ${harnesses.join(', ')}, profile "${profileName}"`);
  console.log('Next steps:');
  console.log(`  node scripts/doctor.js --target "${target}"`);
  console.log(`  node scripts/create-project.js --target "${target}" --title "My Film"`);
}

module.exports = { includedInProfile, SHARED_DIRS };

if (require.main === module) main();
