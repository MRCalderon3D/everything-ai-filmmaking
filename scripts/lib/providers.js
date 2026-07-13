'use strict';
/** Resolve provider modules from the provider manifests. */

const path = require('path');
const { ROOT, exists, readJson } = require('./fsx');

const KIND_TO_MANIFEST = {
  image: 'image-providers.json',
  video: 'video-providers.json',
  audio: 'audio-providers.json',
};

/** List provider manifest entries for a kind (or all kinds). */
function listProviders(kind = null, root = ROOT) {
  const kinds = kind ? [kind] : Object.keys(KIND_TO_MANIFEST);
  const out = [];
  for (const k of kinds) {
    const file = path.join(root, 'manifests', KIND_TO_MANIFEST[k]);
    if (!exists(file)) continue;
    for (const entry of readJson(file).providers || []) {
      out.push(Object.assign({ kind: k }, entry));
    }
  }
  return out;
}

/**
 * Load a provider module by kind + id. Throws with a helpful message when
 * unknown. Returns { entry, module }.
 */
function loadProvider(kind, id, root = ROOT) {
  const candidates = listProviders(kind, root);
  const entry = candidates.find((p) => p.id === id);
  if (!entry) {
    const known = candidates.map((p) => `${p.kind}:${p.id}`).join(', ');
    throw new Error(`unknown ${kind || ''} provider "${id}" (known: ${known || 'none — manifests missing?'})`);
  }
  const file = path.join(root, ...String(entry.file).split('/'));
  if (!exists(file)) throw new Error(`provider file missing: ${entry.file}`);
  return { entry, module: require(file) };
}

module.exports = { listProviders, loadProvider, KIND_TO_MANIFEST };
