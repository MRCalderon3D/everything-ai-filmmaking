'use strict';
/**
 * Canonical camera-move phrase map — the single source for turning a shot's
 * structured `camera.movement` into model-ready prompt language.
 *
 * The vocabulary mirrors the `movement.type` enum in schemas/shot.schema.json
 * and the taxonomy in rules/video/motion-language.md. Phrases follow the
 * pattern video models parse most reliably: named move + direction + subject
 * relation, camera motion kept separate from subject motion.
 *
 * Reliability tiers:
 *   reliable  — current video models execute this consistently.
 *   risky     — frequent smear/geometry failures; needs start/end frames or
 *               a cut instead (rules/video/motion-language.md).
 *   ai_native — impossible or impractical for a physical camera; a marked
 *               stylistic device that MUST carry a declared motivation.
 */

const DIRECTION_TEXT = {
  left: 'to the left',
  right: 'to the right',
  up: 'upward',
  down: 'downward',
  in: 'in',
  out: 'out',
  clockwise: 'clockwise',
  counterclockwise: 'counterclockwise',
};

/** move type -> { category, reliability, base phrase builder } */
const MOVES = {
  static: {
    category: 'pan-tilt',
    reliability: 'reliable',
    base: () => 'locked-off static camera, no camera movement',
  },
  pan: {
    category: 'pan-tilt',
    reliability: 'reliable',
    base: (m) => `pan ${dirText(m, 'right')}`,
  },
  whip_pan: {
    category: 'pan-tilt',
    reliability: 'risky',
    base: (m) => `fast whip pan ${dirText(m, 'right')}`,
  },
  tilt: {
    category: 'pan-tilt',
    reliability: 'reliable',
    base: (m) => `tilt ${dirText(m, 'up')}`,
  },
  zoom: {
    category: 'lens',
    reliability: 'reliable',
    base: (m) => `optical zoom ${dirText(m, 'in')}, lens zoom only, camera position fixed`,
  },
  crash_zoom: {
    category: 'lens',
    reliability: 'risky',
    base: (m) => `sudden crash zoom ${dirText(m, 'in')}`,
  },
  dolly_in: {
    category: 'dolly-track',
    reliability: 'reliable',
    base: () => 'dolly in, camera moving toward the subject',
  },
  dolly_out: {
    category: 'dolly-track',
    reliability: 'reliable',
    base: () => 'dolly out, camera pulling away from the subject',
  },
  tracking: {
    category: 'dolly-track',
    reliability: 'reliable',
    base: (m) => `tracking shot following the subject${m.direction ? ` ${DIRECTION_TEXT[m.direction]}` : ''}`,
  },
  push_past: {
    category: 'dolly-track',
    reliability: 'reliable',
    base: () => 'camera pushes past the foreground subject and continues beyond it',
  },
  truck: {
    category: 'physical',
    reliability: 'reliable',
    base: (m) => `trucking move ${dirText(m, 'right')}, camera sliding laterally`,
  },
  pedestal: {
    category: 'physical',
    reliability: 'reliable',
    base: (m) => `pedestal ${dirText(m, 'up')}, camera rising or lowering vertically without tilting`,
  },
  arc: {
    category: 'physical',
    reliability: 'reliable',
    base: (m) => `arc move ${dirText(m, 'clockwise')} partway around the subject`,
  },
  orbit: {
    category: 'physical',
    reliability: 'risky',
    base: (m) => `orbit ${dirText(m, 'clockwise')} around the subject, camera circling at constant distance`,
  },
  crane: {
    category: 'crane-aerial',
    reliability: 'reliable',
    base: (m) => `crane ${dirText(m, 'up')}, camera sweeping vertically over the scene`,
  },
  handheld: {
    category: 'human-camera',
    reliability: 'reliable',
    base: () => 'handheld camera with natural micro-shake',
  },
  steadicam: {
    category: 'human-camera',
    reliability: 'reliable',
    base: () => 'smooth steadicam glide following the subject',
  },
  fpv: {
    category: 'human-camera',
    reliability: 'risky',
    base: () => 'first-person point-of-view camera, seeing through the character\'s eyes',
  },
  snorricam: {
    category: 'human-camera',
    reliability: 'risky',
    base: () => 'body-mounted snorricam rig, subject locked in frame while the background moves around them',
  },
  infinite_zoom: {
    category: 'ai-native',
    reliability: 'ai_native',
    base: () => 'continuous infinite zoom pushing deeper and deeper into the scene',
  },
  earth_zoom_out: {
    category: 'ai-native',
    reliability: 'ai_native',
    base: () => 'camera pulls back continuously from the subject, rising through aerial altitude into an orbital earth zoom out',
  },
  pass_through: {
    category: 'ai-native',
    reliability: 'ai_native',
    base: () => 'camera passes seamlessly through the obstacle (window, wall, keyhole) without a cut',
  },
};

function dirText(movement, fallback) {
  const d = movement && movement.direction;
  return DIRECTION_TEXT[d] || DIRECTION_TEXT[fallback];
}

/**
 * Compose the model-ready camera phrase for a shot's movement object
 * (schemas/shot.schema.json camera.movement). Returns '' for unknown types
 * so callers can fall back rather than emit garbage.
 */
function describe(movement) {
  if (!movement || !movement.type) return '';
  const entry = MOVES[movement.type];
  if (!entry) return '';
  if (movement.type === 'static') return entry.base(movement);
  const parts = [];
  if (movement.speed && !['whip_pan', 'crash_zoom'].includes(movement.type)) {
    parts.push(movement.speed);
  }
  parts.push(entry.base(movement));
  const extras = [];
  if (movement.distance_m) extras.push(`${movement.distance_m}m travel`);
  if (movement.degrees) extras.push(`${movement.degrees} degree sweep`);
  let phrase = parts.join(' ');
  if (extras.length) phrase += ` (${extras.join(', ')})`;
  return phrase;
}

module.exports = { MOVES, DIRECTION_TEXT, describe };
