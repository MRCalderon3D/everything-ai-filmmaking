'use strict';
/**
 * Harness-native image provider.
 * For harnesses with built-in image generation — Codex generates with
 * gpt-image through the user's subscription (no API key, no per-call spend);
 * other harnesses may have an MCP image tool or a human in the loop.
 * No env vars, no network: generate() always returns a 'dry_run' record whose
 * notes instruct the harness/user to produce the asset and save it to the
 * expected output path. Provenance discipline is unchanged: the package is
 * compiled first, references are attached as input images, and the
 * generation record is completed after the tool call.
 */

const { checkCapabilities, makeRecord, hashObject, packageParams } = require('../lib/common');

const HARNESS_HINTS = {
  codex: 'Codex: generate with gpt-image, attaching the listed reference images as inputs.',
  claude: 'Claude Code: use an image-generation MCP tool if connected; otherwise hand the spec to a human.',
  cursor: 'Cursor: use a connected image tool or hand the spec to a human.',
  opencode: 'OpenCode: use a connected image tool or hand the spec to a human.',
};

const provider = {
  id: 'harness-native',
  kind: 'image',
  label: 'Harness-native image generation (Codex gpt-image, MCP tools, or human)',
  env: [],
  capabilities: {
    referenceImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '3:2', '2:3', '4:5'],
  },

  /** prompt-package -> a self-describing instruction spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const params = packageParams(promptPackage);
    const references = (promptPackage.references || []).map((r) => ({
      asset_id: r.asset_id,
      role: r.role,
      image_path: r.image_path || null,
    }));
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
        references,
        instructions: 'Generate this image with the harness\'s native image tool, ' +
          'attaching every listed reference image as an input so identity and ' +
          'set geometry hold. If the tool does not offer the exact aspect ratio ' +
          '(gpt-image natively renders 1:1, 3:2, 2:3), generate the nearest ' +
          'larger frame and crop to the target ratio, noting the crop in the ' +
          'generation record. Save the result into the shot\'s generations/ ' +
          'directory and complete the record.',
        harness_hints: HARNESS_HINTS,
      },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: references.map((r) => r.asset_id),
      },
    };
  },

  /** Always a dry_run record — the harness/user produces the asset. */
  async generate(requestSpec, { outDir } = {}) {
    return makeRecord(requestSpec, {
      notes: 'harness-native provider: no API to call. Generate the image with ' +
        'the harness\'s own image capability (Codex: gpt-image via the user\'s ' +
        'subscription — no API key, no marginal cost) using request.body.prompt ' +
        'and attaching request.body.references as input images, then ' +
        `save it ${outDir ? `under ${outDir} ` : ''}and update this record's ` +
        'media_files and status. Zero spend does not waive provenance: the ' +
        'record is completed like any paid generation.',
    });
  },
};

module.exports = provider;
