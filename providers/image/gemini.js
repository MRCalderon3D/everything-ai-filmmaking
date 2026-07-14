'use strict';
/**
 * Google Gemini image provider ("Nano Banana").
 * Default model 'gemini-2.5-flash-image' is configuration, current as of
 * 2026 — override with options.model or the package's `model` field.
 * Shares GOOGLE_API_KEY with the Veo video provider.
 *
 * Dialect note (Google's own prompting guide): Gemini-class models respond
 * to NARRATIVE PROSE, not keyword lists — prompt-compilation composes
 * sentences already; do not degrade them into comma soup for this provider.
 * Reference images are attached as inline image parts in live mode.
 */

const fs = require('fs');
const path = require('path');
const {
  assertEnv, checkCapabilities, makeRecord, markSucceeded, markFailed,
  hashObject, packageParams, refImage, refId, sleep,
} = require('../lib/common');

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MIME_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const provider = {
  id: 'gemini',
  kind: 'image',
  label: 'Google Gemini (Nano Banana)',
  env: ['GOOGLE_API_KEY'],
  capabilities: {
    referenceImages: 3,
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  },

  /** prompt-package -> generateContent request spec. Pure, no I/O. */
  compile(promptPackage, options = {}) {
    checkCapabilities(promptPackage, provider.capabilities, provider.id);
    const model = options.model || (promptPackage.model !== 'pending' && promptPackage.model) || DEFAULT_MODEL;
    const params = packageParams(promptPackage);
    const refs = Array.isArray(promptPackage.references) ? promptPackage.references : [];
    let text = promptPackage.prompt;
    if (promptPackage.negative_prompt) {
      // Gemini takes exclusions as prose, not a separate field.
      text += ` Avoid: ${promptPackage.negative_prompt}.`;
    }
    return {
      provider: provider.id,
      kind: provider.kind,
      model,
      endpoint: `${API_BASE}/models/${model}:generateContent`,
      method: 'POST',
      body: {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: params.aspect_ratio || '16:9' },
        },
      },
      meta: {
        shot_id: promptPackage.shot || null,
        asset_id: promptPackage.asset || null,
        prompt_package_id: promptPackage.id || null,
        prompt_package_hash: hashObject(promptPackage),
        references_used: refs.map(refId),
        // Live mode reads these files and attaches them as inline images.
        reference_paths: refs.map(refImage).filter(Boolean),
      },
    };
  },

  /** Dry-run by default; live mode calls generateContent with retry/backoff. */
  async generate(requestSpec, { dryRun = true } = {}) {
    if (dryRun) {
      return makeRecord(requestSpec, {
        notes: 'Dry run: no network call. Re-run with --live to submit to the Gemini API.',
      });
    }
    assertEnv(provider.env);
    const record = makeRecord(requestSpec, { status: 'pending' });
    try {
      // Attach reference images as inline parts (identity first).
      const parts = requestSpec.body.contents[0].parts;
      const missing = [];
      for (const p of requestSpec.meta.reference_paths || []) {
        const file = path.resolve(String(p));
        if (!fs.existsSync(file)) { missing.push(p); continue; }
        parts.push({
          inline_data: {
            mime_type: MIME_BY_EXT[path.extname(file).toLowerCase()] || 'image/png',
            data: fs.readFileSync(file).toString('base64'),
          },
        });
      }
      // 429/5xx: bounded exponential backoff, per Google's guidance.
      let res = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const raw = await fetch(requestSpec.endpoint, {
          method: 'POST',
          headers: {
            'x-goog-api-key': process.env.GOOGLE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestSpec.body),
        });
        if (raw.status === 429 || raw.status >= 500) {
          await sleep(2000 * Math.pow(2, attempt));
          continue;
        }
        res = await raw.json().catch(() => null);
        if (!raw.ok) {
          const msg = (res && res.error && res.error.message) || `HTTP ${raw.status}`;
          throw new Error(`Gemini API error: ${String(msg).slice(0, 300)}`);
        }
        break;
      }
      if (!res) throw new Error('Gemini API unavailable after retries (rate limit or server errors)');

      const candidate = (res.candidates && res.candidates[0]) || {};
      const images = ((candidate.content && candidate.content.parts) || [])
        .filter((pt) => pt.inlineData && pt.inlineData.data);
      if (!images.length) {
        const block = (res.promptFeedback && res.promptFeedback.blockReason) ||
          candidate.finishReason || 'no image parts in response';
        // Safety blocks are prompt defects to fix upstream, not retried blind:
        // rephrase less graphically (see rules/image/image-generation.md) and
        // reroll as a NEW attempt so provenance shows both.
        throw new Error(`Gemini returned no image (${block}). If safety-blocked, rephrase the flagged content less graphically and reroll.`);
      }
      record._media = images.map((pt, i) => ({
        data_base64: pt.inlineData.data,
        format: (pt.inlineData.mimeType || 'image/png').split('/')[1],
        suggested_name: `${record.id}${images.length > 1 ? `_${i + 1}` : ''}.${(pt.inlineData.mimeType || 'image/png').split('/')[1]}`,
      }));
      markSucceeded(record, `Gemini returned ${images.length} image(s)` +
        (missing.length ? ` (skipped ${missing.length} missing reference file(s): ${missing.join(', ')})` : ''),
        record._media.map((m) => m.suggested_name));
    } catch (err) {
      markFailed(record, err);
    }
    return record;
  },
};

module.exports = provider;
