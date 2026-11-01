import type {CompilationContext} from '../domain/types'

/**
 * Spatial reference for the user's bedroom, not an inferred metric floor plan.
 * The numbers are user-specified approximate distances, never image measurements.
 * A mirror can only show objects on a real reflected camera-to-object ray.
 */
export const MIRROR_ROOM_REFERENCE_LAYOUT = [
 'REFERENCE ROOM PLAN (viewed from the doorway toward the dark back curtains): the bed and its headboard run along the LEFT wall; the fixed sliding mirrored wardrobe doors run along the RIGHT wall; the dresser/vanity and its separate existing vanity mirror are to the RIGHT of the wardrobe in this reference orientation, closer to the doorway. Keep this exact furniture order, surfaces, scale, tiles and walking aisle; do not swap, rotate, duplicate or relocate them.',
 'WARDROBE-MIRROR SELFIE: the person stands naturally on solid floor in the clear aisle facing the actual inward-facing sliding wardrobe mirror. Weight is balanced through both feet, shoulders and joints are comfortable. One hand holds one real phone with its REAR cameras pointed into that wardrobe glass and the screen facing the person. Camera, head, torso, arm and reflected image must share one valid planar-mirror perspective; no external photographer, transparent mirror, virtual camera or second phone.',
 'USER-SPECIFIED DEPTH CUES: the existing LEFT-wall bed lies roughly 3 metres BEHIND the standing subject in the described room geometry. The sofa is a more distant background landmark at roughly 5 metres from the subject IF that sofa actually exists in the supplied room reference. These are approximate intended separations, not verified scale readings, exact coordinates, or a reason to stretch the room. Preserve reference-relative depth, occlusion and parallax.',
 'TWO DISTINCT EXISTING MIRRORS: the wardrobe sliding mirror is the PRIMARY recording surface. The vanity/dresser mirror belongs to the dresser to its RIGHT in the supplied reference orientation; it is NOT the camera mirror, a duplicate wardrobe door or a newly installed panel. A glimpse of the vanity or vanity mirror is allowed only where the actual framing or reflected sightline reaches it.',
 'VISIBILITY TEST: trace the rear-camera ray to the wardrobe mirror and reflect it back into the real room by equal angles. The bed and sofa can appear only when within that real reflected field of view, and only if present in the reference. Never shift the bed or sofa into the reflection, stretch the standing subject, manufacture extra space, or demand that the wardrobe mirror simultaneously show all landmarks if its angle or crop cannot.',
 'SOURCE PRIORITY: the supplied room photograph decides which objects exist and their exact positions; the approximate 3 m and 5 m cues guide depth only where consistent. When the room reference is absent or ambiguous, do not pretend Gemini inspected it, and do not invent a sofa or a second mirror to fulfil a distance cue.'
].join('\n')

export function buildMirrorRoomReferenceGeometry(ctx:Pick<CompilationContext,'bedroomShotId'|'roomReferencePresent'>):string{
 if(!ctx.bedroomShotId?.startsWith('mirror_'))return ''
 return 'Fixed mirror-selfie room topology:\n'+MIRROR_ROOM_REFERENCE_LAYOUT+
  '\nRoom-reference availability: '+(ctx.roomReferencePresent
   ? 'The actual room photo accompanies the final image generation separately; Gemini prompt writing has NOT seen its pixels. Use it as the authoritative layout at image-generation time.'
   : 'No room photo is attached in this session. Treat location and approximate distance cues as user specifications, but do NOT invent unseen furniture or claim exact measurement.')
}
