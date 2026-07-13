'use strict';
/**
 * ComfyUI image provider (self-hosted).
 * COMFYUI_HOST is a host:port (e.g. 127.0.0.1:8188), not a secret, but is
 * still required before live runs. The workflow graph is configuration:
 * pass a full ComfyUI API-format workflow via options.workflow; the default
 * below is a minimal txt2img graph for a checkpoint named in options.model /
 * the package's `model` field (default 'sd_xl_base_1.0.safetensors').
 */

const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, fetchJson, pollUntil, packageParams, refId,
} = require('../lib/common');

const DEFAULT_MODEL = 'sd_xl_base_1.0.safetensors';

const ASPECT_TO_SIZE = {
  '1:1': [1024, 1024],
  '16:9': [1344, 768],
  '9:16': [768, 1344],
  '4:3': [1152, 896],
  '3:4': [896, 1152],
  '21:9': [1536, 640],
};

function defaultWorkflow(pkg, model) {
  const params = packageParams(pkg);
  const [width, height] = ASPECT_TO_SIZE[params.aspect_ratio || '16:9'] || ASPECT_TO_SIZE['16:9'];
  return {
    1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: model } },
    2: { class_type: 'CLIPTextEncode', inputs: { text: pkg.prompt || '', clip: ['1', 1] } },
    3: { class_type: 'CLIPTextEncode', inputs: { text: pkg.negative_prompt || '', clip: ['1', 1] } },
    4: { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    5: {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0],
        seed: params.seed || 0, steps: 28, cfg: 6.5, sampler_name: 'euler', scheduler: 'normal', denoise: 1,
      },
    },
    6: { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    7: { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: pkg.shot || 'eaf' } },
  };
}

const provider = {
  id: 'comfyui',
  kind: 'image',
  label: 'ComfyUI (self-hosted)',
  env: ['COMFYUI_HOST'],
  capabilities: {
    referenceImages: 8,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
  },

  /** prompt-package -> ComfyUI /prompt request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const workflow = options.workflow || defaultWorkflow(promptPackage, model);
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      // Host is resolved from COMFYUI_HOST at generate() time; keep the
      // request spec host-independent so it is portable between machines.
      endpoint: '/prompt',
      method: 'POST',
      body: { prompt: workflow },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: refs.map(refId),
      },
    };
  },

  async generate(requestSpec, { dryRun = true } = {}) {
    if (dryRun) {
      return makeRecord(requestSpec, {
        notes: 'Dry run: no network call. Re-run with --live with COMFYUI_HOST set.',
      });
    }
    assertEnv(provider.env);
    const host = process.env.COMFYUI_HOST.replace(/\/$/, '');
    const base = host.startsWith('http') ? host : `http://${host}`;
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const queued = await fetchJson(`${base}${requestSpec.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestSpec.body),
      });
      const promptId = queued.prompt_id;
      const history = await pollUntil(async () => {
        const h = await fetchJson(`${base}/history/${promptId}`);
        return h && h[promptId] ? h[promptId] : null;
      }, { intervalMs: 2000 });
      const urls = [];
      for (const node of Object.values(history.outputs || {})) {
        for (const img of node.images || []) {
          urls.push(`${base}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`);
        }
      }
      markSucceeded(record, `comfyui workflow finished with ${urls.length} image(s)`, urls, promptId);
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
