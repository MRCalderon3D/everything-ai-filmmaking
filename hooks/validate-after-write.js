#!/usr/bin/env node
'use strict';
/**
 * Hook: validate-after-write (event: after a file write/edit).
 * Reads a JSON event from stdin ({file} or a harness tool-use payload).
 * If the file lives under production/ and matches a schema-known artifact,
 * parse it as YAML and validate against its schema.
 * Exit 0 = fine / not our business; exit 2 = validation failed (message on
 * stderr so the harness surfaces it to the agent).
 */

const fs = require('fs');
const {
  readStdinJson, eventFilePath, productionRelPath, schemaNameFor, loadSchema,
  requireScriptsLib,
} = require('./lib');

async function main() {
  const event = await readStdinJson();
  const file = eventFilePath(event);
  if (!file) return 0;
  const rel = productionRelPath(file);
  if (!rel) return 0; // not inside a production/ workspace
  const schemaName = schemaNameFor(rel);
  if (!schemaName) return 0; // not a schema-known artifact
  const schema = loadSchema(schemaName);
  if (!schema) return 0; // schema not installed; nothing to enforce
  if (!fs.existsSync(file)) return 0;

  let yaml;
  let schemaLib;
  try {
    yaml = requireScriptsLib('yaml');
    schemaLib = requireScriptsLib('schema');
  } catch (err) {
    return 0; // tooling not installed alongside hooks; do not block
  }

  let doc;
  try {
    doc = yaml.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    process.stderr.write(`validate-after-write: production/${rel} is not parseable YAML: ${err.message}\n`);
    return 2;
  }
  const result = schemaLib.validate(schema, doc);
  if (!result.valid) {
    const lines = result.errors.slice(0, 10).map((e) => `  ${e.path}: ${e.message}`);
    process.stderr.write(
      `validate-after-write: production/${rel} violates schemas/${schemaName}.schema.json:\n` +
      lines.join('\n') + (result.errors.length > 10 ? `\n  ... and ${result.errors.length - 10} more` : '') + '\n'
    );
    return 2;
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`validate-after-write: internal error: ${err.message}\n`);
  process.exit(0); // never block on our own bugs
});
