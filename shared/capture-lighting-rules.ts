/**
 * Canonical, side-effect-free capture/light compatibility predicates.
 * These three existing conditions were duplicated in browser preflight and
 * server SceneSpecification validation. This file only MOVES their comparisons;
 * it does not define lighting preferences or change any corrective action.
 *
 * @see src/tests/capture-lighting-rules-pr5.test.ts (all three exact truth tables)
 * @see src/tests/gemini-main.test.ts (server validates the resulting spec)
 * @see src/tests/natural-scene-director.test.ts (existing preflight behavior)
 */

/** Rule CL-1: mirror_rear_flash requires the existing rear-flash preset.
 * Test: src/tests/capture-lighting-rules-pr5.test.ts (CL-1 truth table).
 */
export const mirrorRearFlashNeedsSource = (shotId:string|undefined,lighting:string):boolean =>
 shotId==='mirror_rear_flash'&&lighting!=='rear_flash'

/** Rule CL-2: rear LED flash cannot be an active source for front/timer capture.
 * Test: src/tests/capture-lighting-rules-pr5.test.ts (CL-2 truth table).
 */
export const captureAllowsRearFlash = (mode:string|undefined):boolean =>
 mode==='rear'||mode==='mirror'

/** Rule CL-3: the forward-facing handset display cannot light a rear photo.
 * Test: src/tests/capture-lighting-rules-pr5.test.ts (CL-3 truth table).
 */
export const rearCaptureScreenOnlyConflict = (mode:string|undefined,lighting:string):boolean =>
 lighting==='phone_screen_only'&&mode==='rear'
