'use strict';
/**
 * Shared helpers for hook handlers.
 * Hooks read one JSON event from stdin, print human messages to stderr,
 * and exit 0 (allow) or 2 (block). They must never crash the harness:
 * unknown events exit 0.
 */

const path = require('path');
const fs = require('fs');

/** Scaffold root: hooks/ lives directly under it (repo or installed target). */
const SCAFFOLD_ROOT = path.dirname(__dirname);

/** Read all of stdin and parse it as JSON. Resolves to {} on empty/bad input. */
function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch (err) {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));
  });
}

/** Extract the written file path from the event, across harness dialects. */
function eventFilePath(event) {
  return event.file ||
    event.path ||
    event.file_path ||
    (event.tool_input && (event.tool_input.file_path || event.tool_input.path)) ||
    null;
}

/** Extract the shell command from the event, across harness dialects. */
function eventCommand(event) {
  return event.command ||
    (event.tool_input && event.tool_input.command) ||
    null;
}

/**
 * Locate the production/ workspace containing (or containing-directory of)
 * the given file. Returns the absolute path of production/ or null.
 */
function findProductionRoot(file) {
  const abs = path.resolve(file);
  // A workspace root is any ancestor directory containing project.yaml —
  // 'production' is the default name, not a requirement (multi-production
  // clones rename their workspaces, e.g. production-zombie-test/).
  let dir = fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? abs : path.dirname(abs);
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, 'project.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: literal 'production' path segment (fresh workspaces whose
  // project.yaml has not been written yet).
  const parts = abs.split(path.sep);
  const idx = parts.lastIndexOf('production');
  if (idx === -1) return null;
  return parts.slice(0, idx + 1).join(path.sep);
}

/** Relative path inside production/ with forward slashes, or null. */
function productionRelPath(file) {
  const root = findProductionRoot(file);
  if (!root) return null;
  return path.relative(root, path.resolve(file)).split(path.sep).join('/');
}

/**
 * Map a production/-relative path to the schema name that governs it.
 * Returns null for files validation does not know.
 */
function schemaNameFor(relPath) {
  const base = relPath.split('/').pop();
  if (!/\.ya?ml$/i.test(base)) return null;
  if (relPath === 'project.yaml') return 'project';
  if (base === 'story-bible.yaml') return 'story-bible';
  if (base === 'character.yaml') return 'character';
  if (base === 'wardrobe.yaml') return 'wardrobe';
  if (base === 'location.yaml') return 'location';
  if (base === 'map.yaml' && relPath.startsWith('locations/')) return 'location-map';
  if (base === 'prop.yaml') return 'prop';
  if (base === 'scene.yaml') return 'scene';
  if (/^BT_/.test(base)) return 'beat';
  if (/^SH_/.test(base)) return 'shot';
  if (base === 'reference-plan.yaml') return 'reference-plan';
  if (/^GEN_/.test(base)) return 'generation-record';
  if (base === 'scene-state.yaml' || base === 'continuity-state.yaml') return 'continuity-state';
  if (relPath.split('/').includes('prompts')) return 'prompt-package';
  return null;
}

/** Load a schema by name from the scaffold's schemas/ dir, or null. */
function loadSchema(name) {
  const file = path.join(SCAFFOLD_ROOT, 'schemas', `${name}.schema.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}

function requireScriptsLib(name) {
  return require(path.join(SCAFFOLD_ROOT, 'scripts', 'lib', name));
}

module.exports = {
  SCAFFOLD_ROOT,
  readStdinJson,
  eventFilePath,
  eventCommand,
  findProductionRoot,
  productionRelPath,
  schemaNameFor,
  loadSchema,
  requireScriptsLib,
};
