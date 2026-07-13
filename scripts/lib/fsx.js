'use strict';
/** Filesystem helpers. Zero dependencies, Windows-safe paths. */

const fs = require('fs');
const path = require('path');

/** Repo root = two levels up from scripts/lib/. */
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Recursively walk a directory, returning absolute file paths (sorted,
 * deterministic). Skips node_modules and .git. Returns [] if dir is missing.
 * @param {string} dir
 * @param {{filter?: (absPath: string) => boolean}} [opts]
 */
function walk(dir, opts = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) {
        if (!opts.filter || opts.filter(abs)) out.push(abs);
      }
    }
  }
  out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return out;
}

function exists(p) {
  return fs.existsSync(p);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Write a file, creating parent directories. Content normalized to LF. */
function writeFileEnsuring(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (typeof content === 'string') content = content.replace(/\r\n/g, '\n');
  fs.writeFileSync(file, content);
}

function copyFileEnsuring(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Copy a directory tree. Returns list of destination files written. */
function copyDir(srcDir, destDir, opts = {}) {
  const written = [];
  for (const file of walk(srcDir, opts)) {
    const rel = path.relative(srcDir, file);
    const dest = path.join(destDir, rel);
    copyFileEnsuring(file, dest);
    written.push(dest);
  }
  return written;
}

/** Convert a path to forward slashes (for reporting / stable manifests). */
function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

/** List immediate subdirectory names of dir (sorted); [] if missing. */
function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

module.exports = {
  ROOT,
  walk,
  exists,
  readText,
  readJson,
  writeFileEnsuring,
  copyFileEnsuring,
  copyDir,
  toPosix,
  listDirs,
};
