'use strict';
/**
 * Canonical composition-language map — turns a shot's structured
 * `camera.composition` (schemas/shot.schema.json) into model-ready framing
 * language, mirroring camera-moves.js and lens-language.js.
 *
 * Composition is a framing attribute: like lens character, it rides in the
 * keyframes for keyframe-conditioned video providers (Runway Gen-4, manual
 * web UIs) and is included in text prompts everywhere else. Callers gate it
 * with lens-language's lensPolicy().
 */

const SCHEME_TEXT = {
  thirds: 'rule-of-thirds composition, subject on a thirds intersection',
  centered_symmetry: 'centered symmetrical composition',
  short_sided: 'short-sided framing, subject facing the near frame edge with the empty space behind them',
  negative_space: 'large negative space dominating the frame around the subject',
  frame_within_frame: 'subject framed within a frame inside the shot (doorway, window, opening)',
  leading_lines: 'strong leading lines steering the eye to the subject',
};

const LOOKING_ROOM_TEXT = {
  ample: 'ample looking room in the gaze direction',
  standard: null, // unmarked default
  denied: 'looking room denied, gaze pressed against the frame edge',
};

const HEADROOM_TEXT = {
  generous: 'generous headroom',
  standard: null, // unmarked default
  tight: 'tight headroom',
};

/**
 * Compose the model-ready framing phrase for a shot's composition block.
 * Returns '' when nothing is declared — composition is opt-in per shot.
 * `notes` is planning intent for boards and is deliberately NOT compiled.
 */
function describeComposition(composition) {
  if (!composition) return '';
  const bits = [];
  if (composition.scheme && SCHEME_TEXT[composition.scheme]) {
    bits.push(SCHEME_TEXT[composition.scheme]);
  }
  const lr = composition.looking_room && LOOKING_ROOM_TEXT[composition.looking_room];
  if (lr) bits.push(lr);
  const hr = composition.headroom && HEADROOM_TEXT[composition.headroom];
  if (hr) bits.push(hr);
  return bits.join(', ');
}

module.exports = { SCHEME_TEXT, LOOKING_ROOM_TEXT, HEADROOM_TEXT, describeComposition };
