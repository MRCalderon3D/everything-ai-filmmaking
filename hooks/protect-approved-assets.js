#!/usr/bin/env node
'use strict';
/**
 * Hook: protect-approved-assets (event: before a file write/edit).
 * Blocks writes to production/references/ assets whose status is "approved"
 * in production/references/manifest.yaml. Approved masters are immutable —
 * supersede with a new version instead.
 * Exit 0 = allow; exit 2 = block (message on stderr).
 */

const path = require('path');
const fs = require('fs');
const {
  readStdinJson, eventFilePath, findProductionRoot, productionRelPath,
  requireScriptsLib,
} = require('./lib');

async function main() {
  const event = await readStdinJson();
  const file = eventFilePath(event);
  if (!file) return 0;
  const rel = productionRelPath(file);
  if (!rel || !rel.startsWith('references/')) return 0;
  if (rel === 'references/manifest.yaml') return 0; // status changes live here

  const prodRoot = findProductionRoot(file);
  const manifestFile = path.join(prodRoot, 'references', 'manifest.yaml');
  if (!fs.existsSync(manifestFile)) return 0;

  let manifest;
  try {
    const yaml = requireScriptsLib('yaml');
    manifest = yaml.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch (err) {
    return 0; // unreadable manifest: do not block on our own failure
  }
  const assets = (manifest && manifest.assets) || [];
  const relNoPrefix = rel.replace(/^references\//, '');
  const base = rel.split('/').pop();
  for (const asset of assets) {
    if (!asset || asset.status !== 'approved') continue;
    const assetPath = String(asset.path || '').replace(/\\/g, '/').replace(/^(\.\/)?(production\/)?(references\/)?/, '');
    const matches = (assetPath && (assetPath === relNoPrefix || assetPath === base)) ||
      (asset.id && (base.startsWith(asset.id) || relNoPrefix.split('/').includes(asset.id)));
    if (matches) {
      process.stderr.write(
        `protect-approved-assets: BLOCKED write to production/${rel} — asset ` +
        `${asset.id || assetPath} is approved and immutable. Create a new version ` +
        '(_V##) and update references/manifest.yaml to supersede it instead.\n'
      );
      return 2;
    }
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`protect-approved-assets: internal error: ${err.message}\n`);
  process.exit(0);
});
