'use strict';
/**
 * ElevenLabs audio provider (text-to-speech).
 * Default model 'eleven_multilingual_v2' is configuration, current as of
 * 2025 — override with options.model or the package's `model` field. The
 * voice comes from options.voiceId (or a `voice_id` in parameters). Live
 * output is returned as base64 on the record's non-persisted `_media`
 * field — generate-assets.js writes the file and fills media_files.
 */

const {
  assertEnv, checkCapabilities, makeRecord, markFailed, hashObject, packageParams,
} = require('../lib/common');

const DEFAULT_MODEL = 'eleven_multilingual_v2';
const API_BASE = 'https://api.elevenlabs.io/v1';
// "Rachel", a default ElevenLabs library voice id — configuration, not secret.
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';

const provider = {
  id: 'elevenlabs',
  kind: 'audio',
  label: 'ElevenLabs',
  env: ['ELEVENLABS_API_KEY'],
  capabilities: {
    maxDurationSeconds: 600,
    voiceCloning: true,
    formats: ['mp3', 'wav', 'pcm'],
  },

  /** prompt-package -> ElevenLabs TTS request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const voiceId = options.voiceId || params.voice_id || DEFAULT_VOICE;
    const text = promptPackage.prompt;
    if (!text) {
      throw new Error(`prompt package ${promptPackage.id || ''} has no prompt text for TTS`);
    }
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `${API_BASE}/text-to-speech/${voiceId}`,
      method: 'POST',
      body: {
        text,
        model_id: model,
        voice_settings: options.voiceSettings || { stability: 0.5, similarity_boost: 0.75 },
      },
      meta: {
        shot_id: promptPackage.shot || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: [],
      },
    };
  },

  async generate(requestSpec, { dryRun = true } = {}) {
    if (dryRun) {
      return makeRecord(requestSpec, {
        notes: 'Dry run: no network call. Re-run with --live to synthesize with ElevenLabs.',
      });
    }
    assertEnv(provider.env);
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      const res = await fetch(requestSpec.endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(requestSpec.body),
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        throw new Error(`HTTP ${res.status} from ElevenLabs: ${detail}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      record.status = 'succeeded';
      record.response = { summary: `ElevenLabs synthesized ${buf.length} bytes of audio`, error: null };
      // Non-persisted side channel: generate-assets.js writes the file, sets
      // media_files, and strips `_media` before the record hits disk.
      record._media = [{ suggested_name: `${record.id}.mp3`, format: 'mp3', data_base64: buf.toString('base64') }];
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
