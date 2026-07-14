'use strict';
/**
 * Manual video provider — for generating clips by hand in a web UI
 * (Higgsfield, Pika, or any tool without an API the scaffold speaks).
 * No env vars, no network: compile() produces a complete handoff spec —
 * the final prompt, the exact reference image files to upload, start/end
 * frames, duration, and aspect ratio — and generate() returns a 'dry_run'
 * record instructing the user to paste, generate, download, and register
 * the clip. Provenance discipline is unchanged: the record is completed
 * with the downloaded file like any API generation.
 */

const { checkCapabilities, makeRecord, hashObject, packageParams } = require('../lib/common');

const provider = {
  id: 'manual',
  kind: 'video',
  label: 'Manual video generation (Higgsfield or any web UI)',
  env: [],
  capabilities: {
    maxDurationSeconds: 10,
    referenceImages: 4,
    startEndFrames: true,
    aspectRatios: ['16:9', '9:16', '1:1', '4:5', '3:2', '2:3'],
    audio: false,
  },

  /** prompt-package -> a copy-paste handoff spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const params = packageParams(promptPackage);
    const references = (promptPackage.references || []).map((r) => ({
      asset_id: r.asset_id,
      role: r.role,
      image_path: r.image_path || null,
    }));
    const uploads = [];
    if (promptPackage.start_frame) uploads.push({ role: 'start_frame', image_path: promptPackage.start_frame });
    if (promptPackage.end_frame) uploads.push({ role: 'end_frame', image_path: promptPackage.end_frame });
    return {
      provider: provider.id,
      kind: provider.kind,
      model: options.model || (promptPackage.model !== 'pending' && promptPackage.model) || 'manual',
      endpoint: null,
      method: null,
      body: {
        prompt: promptPackage.prompt,
        negative_prompt: promptPackage.negative_prompt || null,
        aspect_ratio: params.aspect_ratio || '16:9',
        duration_seconds: params.duration_seconds || null,
        frames: uploads,
        references,
        instructions: 'Manual generation. In the web UI (e.g. Higgsfield): ' +
          '1) upload the start/end frames listed in body.frames when the tool ' +
          'supports frame conditioning — they carry the lens look and clip ' +
          'boundaries; 2) upload/attach the reference images in ' +
          'body.references in priority order (identity first) as far as the ' +
          'tool allows; 3) paste body.prompt, set the aspect ratio and ' +
          'duration; 4) download the result into the shot\'s generations/ ' +
          'directory and complete this generation record (media_files, ' +
          'status, model actually used, seed if shown).',
      },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: references.map((r) => r.asset_id),
      },
    };
  },

  /** Always a dry_run record — the user generates in the web UI. */
  async generate(requestSpec, { outDir } = {}) {
    return makeRecord(requestSpec, {
      notes: 'manual provider: no API to call. Generate the clip in your web ' +
        'UI following request.body.instructions (prompt, frames, and ' +
        'reference uploads are all listed in request.body), then save the ' +
        `downloaded file ${outDir ? `under ${outDir} ` : ''}and update this ` +
        'record\'s media_files and status. Manual generation does not waive ' +
        'provenance: the record is completed like any API generation.',
    });
  },
};

module.exports = provider;
