/**
 * Shared inertia for every pointer-follow effect on the page.
 *
 * The lamp (Lamp.tsx, the per-act painting reveal) and the torch
 * (Torch.tsx, the page-wide dimmer) are one light with two renderings —
 * the same pointer drives both. If they trail the cursor at different
 * relative rates, a viewer sees two pools of light drifting apart instead
 * of one flashlight, which undercuts the whole premise. Exported from one
 * place so the two components' lerp factors cannot quietly diverge again.
 *
 * The lerp itself — `smooth += (raw - smooth) * POINTER_LERP` per frame —
 * is a fraction of the *remaining* gap, so it converges at the same
 * relative rate regardless of whether the quantity being smoothed is in
 * viewport-fraction space (Lamp) or pixel space (Torch): both close ~63%
 * of the gap in `1 / POINTER_LERP` frames.
 */
export const POINTER_LERP = 0.1;
