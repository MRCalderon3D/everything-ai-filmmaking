'use strict';
/**
 * Harness-native image provider.
 * For harnesses with built-in image generation (or a human in the loop).
 * No env vars, no network: generate() always returns a 'dry_run' record whose
 * notes instruct the harness/user to produce the asset and save it to the
 * expected output path.
 */

const { checkCapabilities, makeRecord, hashObject, packageParams } = require('../lib/common');

const provider = {
  id: 'harness-native',
  kind: 'image',
  label: 'Harness-native image generation',
  env: [],
  capabilities: {
    referenceImages: 0,
    aspectRatios: ['1:1', '16:9', '9:16'],
  },

  /** prompt-package -> a self-describing instruction spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const params = packageParams(promptPackage);
    return {
      provider: provider.id,
      kind: provider.kind,
      model: options.model || (promptPackage.model !== 'pending' && promptPackage.model) || 'harness-native',
      endpoint: null,
      method: null,
      body: {
        prompt: promptPackage.prompt,
        negative_prompt: promptPackage.negative_prompt || null,
        aspect_ratio: params.aspect_ratio || '16:9',
        instructions: 'Generate this image with the harness\'s native image tool ' +
          'or manually, then save it into the shot\'s generations/ directory.',
      },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: [],
      },
    };
  },

  /** Always a dry_run record — the harness/user produces the asset. */
  async generate(requestSpec, { outDir } = {}) {
    return makeRecord(requestSpec, {
      notes: 'harness-native provider: no API to call. Generate the image with ' +
        'the harness\'s own image capability using request.body.prompt, then ' +
        `save it ${outDir ? `under ${outDir} ` : ''}and update this record's ` +
        'media_files and status manually or via the harness.',
    });
  },
};

module.exports = provider;
