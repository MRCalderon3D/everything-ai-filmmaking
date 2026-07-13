#!/usr/bin/env node
'use strict';
/**
 * run-all.js — discover tests/*.test.js, run each in a child process,
 * report a pass/fail summary, exit non-zero on any failure.
 * Plain node, no framework. Run one file directly: node tests/<file>.test.js
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const TESTS_DIR = __dirname;

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node tests/run-all.js [--filter <substring>]');
    console.log('Runs every tests/*.test.js in a child process.');
    process.exit(0);
  }
  const filterIdx = process.argv.indexOf('--filter');
  const filter = filterIdx !== -1 ? process.argv[filterIdx + 1] : null;

  const files = fs.readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.test.js'))
    .filter((f) => !filter || f.includes(filter))
    .sort();

  if (!files.length) {
    console.error('no test files found');
    process.exit(1);
  }

  const results = [];
  for (const file of files) {
    const abs = path.join(TESTS_DIR, file);
    const started = Date.now();
    const res = spawnSync(process.execPath, [abs], { encoding: 'utf8', timeout: 120000 });
    const ms = Date.now() - started;
    const ok = res.status === 0;
    results.push({ file, ok, ms, res });
    console.log(`${ok ? '✓' : '✗'} ${file} (${ms}ms)`);
    if (!ok) {
      const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
      if (out) console.log(out.split('\n').map((l) => `    ${l}`).join('\n'));
      if (res.error) console.log(`    spawn error: ${res.error.message}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(`${results.length - failed.length}/${results.length} test files passed`);
  if (failed.length) {
    console.log(`failed: ${failed.map((f) => f.file).join(', ')}`);
    process.exit(1);
  }
}

main();
