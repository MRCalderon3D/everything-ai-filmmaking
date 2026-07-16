#!/usr/bin/env node
'use strict';
/**
 * doctor.js — diagnose the scaffold (and optionally an installed target).
 *
 * Checks: Node version, repo integrity (manifests vs disk), harness wrapper
 * freshness, provider env vars (reports SET/missing by NAME only — values
 * are never printed), and with --target: install-manifest + production/
 * workspace sanity.
 */

const path = require('path');
const fs = require('fs');
const { ROOT, exists, readJson } = require('./lib/fsx');
const { loadManifests, entries } = require('./lib/manifest');
const { createReport } = require('./lib/report');
const { parseArgs, helpIfRequested } = require('./lib/cli');

const HELP = `
doctor.js — diagnose the scaffold and provider environment.

Usage:
  node scripts/doctor.js [--target <dir>]

Options:
  --target <dir>  Also check an installed film project (install-manifest.json
                  and production/ workspace).
  --help          Show this help.

Env var values are NEVER printed — only whether each is set.
`;

function checkNode(report) {
  report.section('Runtime');
  const major = parseInt(process.versions.node.split('.')[0], 10);
  report.check(major >= 18, `Node ${process.versions.node} (require >= 18)`);
  report.check(typeof fetch === 'function', 'global fetch available (needed for live generation)');
}

function checkRepo(report) {
  report.section('Repo integrity (manifests vs disk)');
  const { manifests, errors } = loadManifests(ROOT);
  for (const err of errors) report.fail(`manifests/${err.file}: ${err.message}`);
  if (!errors.length) report.pass('all 8 manifests parse');
  const lists = [
    ['agents.json', 'agents'], ['commands.json', 'commands'], ['skills.json', 'skills'],
    ['image-providers.json', 'providers'], ['video-providers.json', 'providers'],
    ['audio-providers.json', 'providers'],
  ];
  let missing = 0;
  let total = 0;
  for (const [file, key] of lists) {
    for (const entry of entries(manifests, file, key)) {
      total++;
      if (!exists(path.join(ROOT, ...String(entry.file).split('/')))) {
        missing++;
        report.fail(`${entry.file} missing (listed in ${file})`);
      }
    }
  }
  if (!missing) report.pass(`all ${total} manifest-listed files exist`);
  return manifests;
}

function checkHarnesses(report) {
  report.section('Harness wrapper freshness');
  let sync;
  try {
    sync = require('./sync-harnesses');
  } catch (err) {
    report.fail(`cannot load sync-harnesses.js: ${err.message}`);
    return;
  }
  try {
    const plan = sync.buildPlan(ROOT);
    if (!Object.keys(plan).length) {
      report.warn('nothing to generate yet (source layers or harnesses.json missing)');
      return;
    }
    const drift = sync.diffPlan(ROOT, plan);
    report.check(drift.length === 0,
      drift.length === 0 ? `${Object.keys(plan).length} generated files up to date`
        : `${drift.length} wrapper file(s) stale — run "npm run sync:harnesses"`);
  } catch (err) {
    report.fail(`drift check failed: ${err.message}`);
  }
}

function checkEnv(report, manifests) {
  report.section('Provider environment (names only, values never shown)');
  // Capability staleness: provider limits change between model releases.
  // Manifests carry a snapshot_date; past 30 days, verify against the
  // providers' current docs before trusting duration/reference limits.
  for (const file of ['image-providers.json', 'video-providers.json', 'audio-providers.json']) {
    const snap = manifests[file] && manifests[file].snapshot_date;
    if (!snap) continue;
    const ageDays = Math.floor((Date.now() - Date.parse(snap)) / 86400000);
    if (Number.isFinite(ageDays) && ageDays > 30) {
      report.warn(`${file}: capabilities snapshot is ${ageDays} days old (${snap}) — verify limits against current provider docs`);
    }
  }
  const seen = new Map(); // env var -> [provider labels]
  for (const file of ['image-providers.json', 'video-providers.json', 'audio-providers.json']) {
    for (const p of entries(manifests, file, 'providers')) {
      for (const name of p.env || []) {
        if (!seen.has(name)) seen.set(name, []);
        seen.get(name).push(`${p.id} (${file.split('-')[0]})`);
      }
    }
  }
  if (!seen.size) {
    report.warn('no provider env vars declared (provider manifests missing?)');
    return;
  }
  for (const [name, users] of [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (process.env[name]) report.pass(`${name} is set — enables ${users.join(', ')}`);
    else report.info(`${name} NOT set — ${users.join(', ')} limited to dry-run`);
  }
}

function checkTarget(report, targetDir) {
  report.section(`Target project: ${targetDir}`);
  if (!exists(targetDir)) {
    report.fail('target directory does not exist');
    return;
  }
  const manifestFile = path.join(targetDir, 'install-manifest.json');
  if (!exists(manifestFile)) {
    report.fail('install-manifest.json missing — run scripts/install.js --target <dir>');
  } else {
    try {
      const im = readJson(manifestFile);
      report.pass(`installed ${im.installedAt} — harness(es) ${(im.harnesses || []).join(', ')}, profile "${im.profile}"`);
      let missing = 0;
      for (const rel of im.files || []) {
        if (!exists(path.join(targetDir, ...rel.split('/')))) {
          missing++;
          if (missing <= 5) report.fail(`installed file missing: ${rel}`);
        }
      }
      if (missing > 5) report.fail(`... and ${missing - 5} more missing files`);
      if (!missing) report.pass(`all ${(im.files || []).length} installed files present`);
    } catch (err) {
      report.fail(`install-manifest.json unreadable: ${err.message}`);
    }
  }
  // Workspace roots: production/ plus any sibling directory holding a
  // project.yaml (renamed multi-production workspaces).
  const fs = require('fs');
  const roots = [];
  for (const d of fs.readdirSync(targetDir)) {
    const full = path.join(targetDir, d);
    try {
      if (fs.statSync(full).isDirectory() && exists(path.join(full, 'project.yaml'))) roots.push(full);
    } catch (err) { /* unreadable entry: skip */ }
  }
  if (!roots.length && exists(path.join(targetDir, 'production'))) roots.push(path.join(targetDir, 'production'));
  if (!roots.length) {
    report.info('no workspace found (no directory with project.yaml) — run scripts/create-project.js');
    return;
  }
  for (const prod of roots) {
    const name = path.basename(prod);
    report.check(exists(path.join(prod, 'project.yaml')), `${name}/project.yaml exists`);
    for (const dir of ['story', 'characters', 'locations', 'scenes', 'references', 'continuity']) {
      report.check(exists(path.join(prod, dir)), `${name}/${dir}/ exists`);
    }
  }
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  const report = createReport();
  checkNode(report);
  const manifests = checkRepo(report);
  checkHarnesses(report);
  checkEnv(report, manifests);
  if (flags.target && flags.target !== true) {
    checkTarget(report, path.resolve(String(flags.target)));
  }
  process.exit(report.finish());
}

if (require.main === module) main();
