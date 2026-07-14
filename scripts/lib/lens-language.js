'use strict';
/**
 * Canonical lens-language map — the single source for turning a shot's
 * optics (camera.lens_mm, lens_type, anamorphic_squeeze, t_stop,
 * depth_of_field) plus the project lens_kit into model-ready prompt language.
 *
 * Grounded in vendor prompt guides (see docs/research/lens-language.md):
 * FLUX is lens-literal ("35mm f/1.4" beats vague quality words), Veo endorses
 * lens/focus vocabulary placed at the head of the prompt, and Runway Gen-4 is
 * the outlier — its video prompt is motion-only and restating image-borne
 * visual attributes degrades motion, so lens character must be baked into the
 * conditioning keyframe instead.
 */

/** Full-frame focal bands and what each argues. Bands are contiguous. */
const FOCAL_BANDS = [
  { key: 'ultra_wide', maxMm: 24, phrase: (mm) => `ultra wide-angle ${mm}mm lens, expansive stretched perspective`, argument: 'vistas and establishing scale; distorts faces at close range — keep people off the close foreground' },
  { key: 'wide', maxMm: 40, phrase: (mm) => `${mm}mm wide-angle lens`, argument: 'embeds the subject in context; the documentary workhorse for tight spaces' },
  { key: 'normal', maxMm: 66, phrase: (mm) => `${mm}mm lens, natural human-eye perspective`, argument: 'neutral rendering; perspective closest to unassisted vision' },
  { key: 'short_tele', maxMm: 106, phrase: (mm) => `${mm}mm portrait lens, flattering compressed perspective`, argument: 'the beauty lens for close-ups; gently compresses features and melts background' },
  { key: 'tele', maxMm: 200, phrase: (mm) => `${mm}mm telephoto lens, compressed space`, argument: 'isolation and surveillance; stacks planes, detaches the viewer' },
  { key: 'long_tele', maxMm: Infinity, phrase: (mm) => `${mm}mm long telephoto lens, extreme compression`, argument: 'voyeuristic distance; subject trapped in flattened space' },
];

const LENS_TYPE_TEXT = {
  spherical: null, // the default; unmarked
  anamorphic: (squeeze) => `${squeeze || 2}x anamorphic lens, oval bokeh, subtle horizontal lens flares, cinematic widescreen character`,
  macro: () => 'macro lens, extreme close focus, shallow plane of detail',
  tilt_shift: () => 'tilt-shift lens, selective miniature plane of focus',
  fisheye: () => 'fisheye lens, extreme curved distortion',
};

const DOF_TEXT = {
  shallow: 'shallow depth of field',
  medium: null, // unmarked default
  deep: 'deep focus, foreground and background equally sharp',
};

/**
 * Per-provider lens-token policy, from the vendors' own prompt guides:
 *  - text: include lens language in the prompt (Veo, Kling, Seedance, and
 *    all image providers — FLUX-family models are explicitly lens-literal).
 *  - keyframe_only: NEVER put lens tokens in the video prompt; the look is
 *    carried by the conditioning keyframe (Runway Gen-4: text is for motion,
 *    restating visual attributes reduces motion quality).
 */
const PROVIDER_LENS_POLICY = {
  runway: 'keyframe_only',
  // Manual web-UI generation is usually keyframe-conditioned (Higgsfield
  // image-to-video): the lens look rides in the uploaded frames, and the
  // pasted prompt stays motion-first.
  manual: 'keyframe_only',
};

function lensPolicy(providerId, kind) {
  if (kind === 'video' && PROVIDER_LENS_POLICY[providerId]) {
    return PROVIDER_LENS_POLICY[providerId];
  }
  return 'text';
}

function focalBand(mm) {
  return FOCAL_BANDS.find((b) => mm < b.maxMm) || FOCAL_BANDS[FOCAL_BANDS.length - 1];
}

/**
 * Compose the model-ready lens phrase for a shot's camera block, folding in
 * the project lens_kit's type and character when the shot doesn't override
 * them. Returns '' when there is nothing to say.
 */
function describeLens(cam, lensKit) {
  if (!cam) return '';
  const kit = lensKit || {};
  const bits = [];
  if (cam.lens_mm) {
    bits.push(focalBand(cam.lens_mm).phrase(cam.lens_mm));
  }
  const type = cam.lens_type || kit.lens_type;
  if (type && LENS_TYPE_TEXT[type]) {
    const squeeze = cam.anamorphic_squeeze || kit.anamorphic_squeeze;
    bits.push(LENS_TYPE_TEXT[type](squeeze));
  }
  if (cam.t_stop) bits.push(`f/${cam.t_stop}`);
  const dof = cam.depth_of_field && DOF_TEXT[cam.depth_of_field];
  if (dof) bits.push(dof);
  if (kit.character) bits.push(kit.character);
  return bits.join(', ');
}

/**
 * Check a shot's focal length against the project lens_kit.
 * Returns { ok, message }. A missing kit or missing lens_mm passes — the
 * discipline is opt-in via project.yaml, mandatory once declared
 * (rules/visual/visual-language.md).
 */
function checkKit(cam, lensKit) {
  if (!cam || !cam.lens_mm || !lensKit || !Array.isArray(lensKit.focal_lengths_mm)) {
    return { ok: true, message: null };
  }
  if (lensKit.focal_lengths_mm.includes(cam.lens_mm)) {
    return { ok: true, message: null };
  }
  return {
    ok: false,
    message: `lens_mm ${cam.lens_mm} is outside the project lens kit [${lensKit.focal_lengths_mm.join(', ')}] — off-kit lenses are a marked style event (rules/visual/visual-language.md); use --allow-off-kit only with an approved deviation`,
  };
}

module.exports = { FOCAL_BANDS, LENS_TYPE_TEXT, DOF_TEXT, PROVIDER_LENS_POLICY, lensPolicy, focalBand, describeLens, checkKit };
