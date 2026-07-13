'use strict';
/**
 * Consistent console reporting for validation-style CLIs.
 * Usage:
 *   const report = require('./lib/report').createReport();
 *   report.section('Manifests');
 *   report.pass('agents.json parses');
 *   report.fail('commands.json missing entry: smart-shot');
 *   process.exit(report.finish());
 */

const PASS = '✓'; // ✓
const FAIL = '✗'; // ✗

function createReport(options = {}) {
  const log = options.log || ((...args) => console.log(...args));
  const state = { passed: 0, failed: 0, warned: 0, sections: [] };

  return {
    section(title) {
      state.sections.push(title);
      log('');
      log(`## ${title}`);
    },
    pass(message) {
      state.passed++;
      log(`  ${PASS} ${message}`);
    },
    fail(message) {
      state.failed++;
      log(`  ${FAIL} ${message}`);
    },
    warn(message) {
      state.warned++;
      log(`  ! ${message}`);
    },
    info(message) {
      log(`  - ${message}`);
    },
    check(ok, message) {
      if (ok) this.pass(message);
      else this.fail(message);
      return ok;
    },
    get failed() {
      return state.failed;
    },
    get passed() {
      return state.passed;
    },
    /** Print summary, return exit code (0 ok, 1 failures). */
    finish() {
      log('');
      const parts = [`${state.passed} passed`, `${state.failed} failed`];
      if (state.warned) parts.push(`${state.warned} warnings`);
      log(`${state.failed === 0 ? PASS : FAIL} ${parts.join(', ')}`);
      return state.failed === 0 ? 0 : 1;
    },
  };
}

module.exports = { createReport, PASS, FAIL };
