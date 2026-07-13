#!/usr/bin/env node
'use strict';
/**
 * Hook: require-cost-confirmation (event: before a shell command runs).
 * Blocks `generate-assets ... --live` (and `npm run generate:assets --
 * ... --live`) unless the explicit `--yes` confirmation flag is present.
 * Cost-control policy: live generation always needs a human-confirmed
 * estimate. Exit 0 = allow; exit 2 = block.
 */

const { readStdinJson, eventCommand } = require('./lib');

async function main() {
  const event = await readStdinJson();
  const command = eventCommand(event);
  if (!command || typeof command !== 'string') return 0;
  const isGenerate = /generate-assets(\.js)?\b/.test(command) || /generate:assets/.test(command);
  if (!isGenerate) return 0;
  const live = /(^|\s)--live(\s|$|=)/.test(command);
  const confirmed = /(^|\s)--yes(\s|$|=)/.test(command);
  if (live && !confirmed) {
    process.stderr.write(
      'require-cost-confirmation: BLOCKED live generation without --yes.\n' +
      'Live runs spend provider credits. First dry-run to review the request\n' +
      'and cost estimate, then re-run with BOTH --live and --yes to confirm.\n'
    );
    return 2;
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`require-cost-confirmation: internal error: ${err.message}\n`);
  process.exit(0);
});
