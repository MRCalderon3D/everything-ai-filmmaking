'use strict';
/** Tiny CLI argument parser + --help support. Zero dependencies. */

/**
 * Parse argv into { flags: {name: value|true}, positional: [] }.
 * "--name value" and "--name=value" both work; a flag followed by another
 * flag or end of argv is boolean true. "--no-name" sets name to false.
 */
function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith('--')) {
      let name = arg.slice(2);
      let value;
      const eq = name.indexOf('=');
      if (eq !== -1) {
        value = name.slice(eq + 1);
        name = name.slice(0, eq);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        value = argv[++i];
      } else if (name.startsWith('no-')) {
        flags[name.slice(3)] = false;
        continue;
      } else {
        value = true;
      }
      flags[name] = value;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

/** Print help text and exit 0 when --help/-h is present. */
function helpIfRequested(argv, helpText) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(helpText.trim() + '\n');
    process.exit(0);
  }
}

function fatal(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

module.exports = { parseArgs, helpIfRequested, fatal };
