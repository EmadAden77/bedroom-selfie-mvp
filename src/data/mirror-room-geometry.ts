import type {CompilationContext} from '../domain/types'

/** User-specified depth for standing captures; no measurements are extracted from pixels. */
const ROOM_TOPOLOGY=[
 'REFERENCE ROOM PLAN: View from doorway toward curtains: bed on LEFT wall, wardrobe sliding mirror on RIGHT wall. The vanity/dresser mirror stays on the dresser to the RIGHT of wardrobe near doorway. Preserve furniture positions.',
 'REFLECTION: trace camera-to-wardrobe-to-room rays by equal angles. Furniture appears only when within that real reflected field of view. Never shift furniture into frame; do not invent a sofa, mirror, person, camera, limb.'
].join('\n')
const STANDING_MIRROR=[
 'WARDROBE-MIRROR SELFIE: Person stands balanced in clear aisle facing wardrobe glass. One handheld phone: REAR cameras at glass, screen at person. Wardrobe is PRIMARY recording surface. Vanity mirror stays separate.',
 'DEPTH: preserve the original left-wall bed and the user-estimated roughly 3-metre subject-to-bed separation where the photographed layout permits it. The sofa is an approximately 5-metre depth landmark only if physically confirmed and within the reflected view. Treat these as optional reference-relative cues, never reasons to move furniture.'
].join('\n')
const SEATED_MIRROR=[
 'WARDROBE-MIRROR SELFIE: Person stays seated on the selected real rug/bed support, with natural weight contacts. One handheld phone: REAR cameras at wardrobe glass, screen at person. Wardrobe remains PRIMARY recording surface.',
 'DEPTH: bed remains LEFT and supports the subject only for the bed-edge seat; floor-seat shots keep floor contact. Do not impose a standing 3-metre bed clearance on seated poses. A sofa is a distant landmark only where confirmed and optically visible.'
].join('\n')

export const MIRROR_ROOM_REFERENCE_LAYOUT=ROOM_TOPOLOGY+'\n'+STANDING_MIRROR

export function buildMirrorRoomReferenceGeometry(ctx:Pick<CompilationContext,'bedroomShotId'|'roomReferencePresent'>):string{
 if(!ctx.bedroomShotId?.startsWith('mirror_'))return ''
 const seated=ctx.bedroomShotId==='mirror_floor'||ctx.bedroomShotId==='mirror_bed_reflection'
 return 'Fixed mirror-selfie room topology:\n'+ROOM_TOPOLOGY+'\n'+(seated?SEATED_MIRROR:STANDING_MIRROR)+
  '\nRoom reference: '+(ctx.roomReferencePresent
   ? 'Room photo is available to attach separately at final image generation; Gemini prompt writer has not seen image pixels. Do not claim that this app has sent it to the final image generator.'
   : 'No room photo is attached. Treat depth as approximate user guidance. Do NOT invent unseen furniture.')
}
