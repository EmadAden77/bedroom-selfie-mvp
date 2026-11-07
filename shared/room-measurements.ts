/**
 * Every constant in this file must have a documented source.
 * 'unmeasured' means we do not know the value and MUST NOT infer it.
 * Downstream rules must return 'unknown' when a value is unmeasured.
 *
 * PR7a is a DATA INVENTORY ONLY: nothing here is consumed by rendering,
 * compilation, validation, SceneSpecification, Gemini, or prompt authority.
 *
 * Pose IDs are the canonical BodyPosture IDs in shared/body-mechanics.ts,
 * also exposed by src/data/light-geometry.ts (poseOptions).
 * Coverage: src/tests/room-measurements-pr7a.test.ts.
 */
import type {BodyPosture} from './body-mechanics'

/** Source: src/data/bedroom-shots.ts, pillow_stack: "160 by 200 cm queen mattress". */
export const BED_LENGTH_CM = 200

/** Source: src/data/bedroom-shots.ts, pillow_stack: "160 by 200 cm queen mattress". */
export const BED_WIDTH_CM = 160

/**
 * UNMEASURED: src/data/mirror-controls.ts and
 * src/data/mirror-room-geometry.ts describe a fixed wardrobe mirror,
 * but specify no numeric width. Do not infer dimensions from scene text.
 */
export const MIRROR_WIDTH_CM: number | null = null

export type PoseId = BodyPosture
export type PoseFootprint = {
 lengthCm: number | null
 widthCm: number | null
 source: string
}

/**
 * Source for IDs: shared/body-mechanics.ts (BodyPosture) and
 * src/data/light-geometry.ts (poseOptions).
 * Footprints are UNMEASURED: neither source defines a floor-space extent.
 * A body height, pose description or support contact is not a footprint.
 */
export const POSE_FOOTPRINTS_CM2: Record<PoseId, PoseFootprint> = {
 standing:          {lengthCm:null,widthCm:null,source:'unmeasured'},
 seated_bed:        {lengthCm:null,widthCm:null,source:'unmeasured'},
 seated_floor:      {lengthCm:null,widthCm:null,source:'unmeasured'},
 reclined_pillows:  {lengthCm:null,widthCm:null,source:'unmeasured'},
 side_lying_right:  {lengthCm:null,widthCm:null,source:'unmeasured'},
 side_lying_left:   {lengthCm:null,widthCm:null,source:'unmeasured'},
 supine:            {lengthCm:null,widthCm:null,source:'unmeasured'},
 prone:             {lengthCm:null,widthCm:null,source:'unmeasured'}
}

/**
 * These are approximate, user-estimated PROMPT DEPTH CUES, not measured
 * positions or a verified simultaneous layout. No sofa is implied to exist.
 * Source: src/data/mirror-room-geometry.ts, STANDING_MIRROR "DEPTH" text;
 * also src/data/mirror-optics-mechanics.ts, scene text.
 * They are frozen in PR7a; resolving them belongs to PR8.
 */
export const IMPLICIT_DISTANCES = {
 personToBedCm: 300,
 optionalCouchCm: 500
} as const

/** Per-constant provenance; verified by src/tests/room-measurements-pr7a.test.ts. */
export const MEASUREMENT_SOURCES = {
 bedLengthCm:'src/data/bedroom-shots.ts (pillow_stack: 160 by 200 cm queen mattress)',
 bedWidthCm:'src/data/bedroom-shots.ts (pillow_stack: 160 by 200 cm queen mattress)',
 mirrorWidthCm:'unmeasured',
 poseFootprints:'unmeasured',
 personToBedCm:'src/data/mirror-room-geometry.ts (STANDING_MIRROR: roughly 3-metre); src/data/mirror-optics-mechanics.ts (scene: near 3 metres)',
 optionalCouchCm:'src/data/mirror-room-geometry.ts (STANDING_MIRROR: approximately 5-metre); src/data/mirror-optics-mechanics.ts (scene: near 5 metres)'
} as const
