import type {CompilationContext} from '../domain/types'

/** User-specified room relationships, not measurements extracted from the photo. */
export const MIRROR_ROOM_REFERENCE_LAYOUT=[
 'REFERENCE ROOM PLAN: View from doorway toward curtains: bed on LEFT wall, wardrobe sliding mirror on RIGHT wall. The vanity/dresser mirror stays on the dresser to the RIGHT of wardrobe near doorway. Preserve furniture positions.',
 'WARDROBE-MIRROR SELFIE: Person stands balanced in clear aisle facing wardrobe glass. One handheld phone: REAR cameras at glass, screen at person. Wardrobe is PRIMARY recording surface. Vanity mirror stays separate.',
 'DEPTH: bed roughly 3 metres behind subject; sofa roughly 5 metres deeper IF that sofa actually exists in the uploaded room photo. Distances are approximate depth cues.',
 'REFLECTION: trace camera-to-wardrobe-to-room rays by equal angles. Furniture appears only when within that real reflected field of view. Never shift furniture into frame; do not invent a sofa, mirror, person, camera, limb.'
].join('\n')

export function buildMirrorRoomReferenceGeometry(ctx:Pick<CompilationContext,'bedroomShotId'|'roomReferencePresent'>):string{
 if(!ctx.bedroomShotId?.startsWith('mirror_'))return ''
 return 'Fixed mirror-selfie room topology:\n'+MIRROR_ROOM_REFERENCE_LAYOUT+
  '\nRoom reference: '+(ctx.roomReferencePresent
   ? 'Photo provided separately to final image generator. Gemini prompt writer has not seen image pixels.'
   : 'No room photo is attached. Treat depth as approximate. Do NOT invent unseen furniture.')
}
