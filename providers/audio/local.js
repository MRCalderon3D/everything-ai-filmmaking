'use strict';
/**
 * Local / manual audio provider.
 * For audio produced outside this scaffold: a DAW session, recorded VO,
 * licensed music, or a local model the user runs themselves. No env vars,
 * no network: generate() always returns a 'dry_run' record whose notes tell
 * the user exactly what to produce and where to put it.
 */

const { checkCapabilities, makeRecord, hashObject, packageParams } = require('../lib/common');

const provider = {
  id: 'local',
  kind: 'audio',
  label: 'Local / manual audio',
  env: [],
  capabilities: {
    // 0 = unbounded: the human/DAW decides.
    maxDurationSeconds: 0,
    voiceCloning: false,
    formats: ['wav', 'mp3'],
  },

  /** prompt-package -> a self-describing production brief. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const params = packageParams(promptPackage);
    return {
      provider: provider.id,
      kind: provider.kind,
      model: options.model || (promptPackage.model !== 'pending' && promptPackage.model) || 'manual',
      endpoint: null,
      method: null,
      body: {
        brief: promptPackage.prompt || '',
        duration_seconds: params.duration_seconds || null,
        format: options.format || 'wav',
        instructions: 'Produce this audio locally (record, DAW, or local model) ' +
          'and place the file in the shot\'s generations/ directory.',
      },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: [],
      },
    };
  },

  /** Always a dry_run record — the user produces the asset. */
  async generate(requestSpec, { outDir } = {}) {
    return makeRecord(requestSpec, {
      notes: 'local provider: nothing to call. Produce the audio described in ' +
        `the request body's brief ${outDir ? `and save it under ${outDir} ` : ''}` +
        'then update this record\'s media_files and status.',
    });
  },
};

module.exports = provider;
