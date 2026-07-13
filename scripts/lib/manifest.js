'use strict';
/** Load all scaffold manifests and parse the rosters from docs/conventions.md. */

const path = require('path');
const fs = require('fs');
const { ROOT, readJson, readText } = require('./fsx');

const MANIFEST_FILES = [
  'agents.json',
  'commands.json',
  'skills.json',
  'image-providers.json',
  'video-providers.json',
  'audio-providers.json',
  'profiles.json',
  'harnesses.json',
];

/**
 * Load every manifest from <root>/manifests.
 * Returns { manifests: {basename: parsed|null}, errors: [{file, message}] }.
 */
function loadManifests(root = ROOT) {
  const dir = path.join(root, 'manifests');
  const manifests = {};
  const errors = [];
  for (const name of MANIFEST_FILES) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      manifests[name] = null;
      errors.push({ file: name, message: 'missing' });
      continue;
    }
    try {
      manifests[name] = readJson(file);
    } catch (err) {
      manifests[name] = null;
      errors.push({ file: name, message: `invalid JSON: ${err.message}` });
    }
  }
  return { manifests, errors };
}

/** Convenience accessors on a loadManifests() result. */
function entries(manifests, name, key) {
  const m = manifests[name];
  if (!m || !Array.isArray(m[key])) return [];
  return m[key];
}

function extractList(md, label) {
  // Matches e.g. "**Agents (17):** a, b,\nc, d." — list ends at the first period.
  const re = new RegExp(`\\*\\*${label} \\((\\d+)\\):\\*\\*([^.]*)\\.`);
  const m = md.match(re);
  if (!m) return null;
  const names = m[2]
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { count: parseInt(m[1], 10), names };
}

/**
 * Parse rosters from docs/conventions.md.
 * Returns { agents, commands, skills, providers: {image, video, audio},
 *           counts: {...} } or throws when the file is missing.
 */
function parseConventionsRosters(root = ROOT) {
  const file = path.join(root, 'docs', 'conventions.md');
  const md = readText(file);
  const agents = extractList(md, 'Agents');
  const commands = extractList(md, 'Commands');
  const skills = extractList(md, 'Skills');

  // Providers line: "**Providers (12):** image: fal, ... · video: ... · audio: ..."
  const provMatch = md.match(/\*\*Providers \((\d+)\):\*\*([^.]*)\./);
  const providers = { image: [], video: [], audio: [] };
  let providerCount = 0;
  if (provMatch) {
    providerCount = parseInt(provMatch[1], 10);
    for (const part of provMatch[2].split('·')) {
      const seg = part.trim();
      const idx = seg.indexOf(':');
      if (idx === -1) continue;
      const kind = seg.slice(0, idx).trim();
      const names = seg.slice(idx + 1).split(',').map((s) => s.trim()).filter(Boolean);
      if (providers[kind]) providers[kind] = names;
    }
  }

  return {
    agents: agents ? agents.names : [],
    commands: commands ? commands.names : [],
    skills: skills ? skills.names : [],
    providers,
    counts: {
      agents: agents ? agents.count : 0,
      commands: commands ? commands.count : 0,
      skills: skills ? skills.count : 0,
      providers: providerCount,
    },
  };
}

module.exports = { MANIFEST_FILES, loadManifests, entries, parseConventionsRosters };
