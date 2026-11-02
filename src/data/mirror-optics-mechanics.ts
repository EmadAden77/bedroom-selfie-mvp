import type {CompilationContext} from '../domain/types'
import {bedroomShots,getShotPosture} from './bedroom-shots'

/**
 * One physical optical/mechanical contract for every wardrobe-mirror shot.
 * Prompts describe enforceable relationships; a prompt-only API cannot measure pixels.
 */
export function buildMirrorOpticsMechanics(ctx:CompilationContext,compact=false):string{
 const shot=bedroomShots.find(x=>x.id===ctx.bedroomShotId)
 if(shot?.mode!=='mirror')return ''
 const posture=getShotPosture(shot.id)||'standing'
 const mirrorSeat=posture==='seated_bed'
  ? 'Seated on the actual left-wall mattress edge: pelvis and thighs load the mattress, feet carry their share of weight on real floor tiles, knees and neck remain naturally aligned. The mattress depresses only at true contact.'
  :posture==='seated_floor'
  ? 'Seated on the photographed floor/rug: pelvis and legs have actual floor support, knees fold within joint limits, torso balances over the support polygon. Bed upholstery does not deform without contact.'
  :'Standing in the actual free aisle: soles contact the selected real tile/rug surface, body centre of mass projects within the feet support area, knees and pelvis share realistic balance; standing feet never load the bed.'
 const phone='One actual Xiaomi 15 Ultra is held by exactly one hand. Rear-camera lens and rear LED, when enabled, point toward the SAME real wardrobe mirror; the display faces the holder. Grip pressure deforms fingers subtly; elbow, wrist, forearm and shoulder form one reachable connected chain. The other hand alone performs the selected action; do not invent extra fingers, double grips and an external photographer.'
 const glass='A single flat sliding wardrobe mirror on its actual right-wall track is the capture surface. Reflect each camera ray across the mirror normal (incidence equals reflection); the virtual subject appears the corresponding perpendicular distance behind the plane. Occlude at glass frame, phone, hands and furniture edges. No shifted glass plane, transparent door, mirrored duplicate room and impossible view through opaque walls. Original separate vanity mirror stays by the dresser, not a replacement capture mirror.'
 const scene='Use ONLY the one anchored room: left-wall bed, original vanity mirror right of wardrobe and real ceramic grid with consistent perspective vanishing lines. The user-specified bed/seating separation near 3 metres and sofa landmark near 5 metres are approximate viewpoint-dependent depth cues, never instructions to relocate furniture; sofa only if confirmed and within reflected field of view. Reflections reuse the same item identities, surface finish, grime locations and light positions. Mirror lettering follows ordinary unflipped reflection.'
 const light=ctx.nightLightingId==='rear_flash'
  ? 'FLASH: only the real rear LED fires during exposure; reflect its rays from the actual glass to surfaces that can receive them. Flash highlight position is bound to the real lens/LED geometry and exposure; glass bloom, occluding handset silhouette, falloff, clipped pixels and shadow direction arise only when consistent with the actual optical path. Do not assume a central hotspot, diffuse studio fill and equal light over the face.'
  :'NO FLASH: the rear LED is OFF. Exposure, shadows, skin and ceramic specular reflections follow only the selected real room sources. Never add an LED hotspot, invisible frontal fill and a reflected flash.'
 const camera='Use a single rear-camera exposure with actual ray geometry and reachable handheld framing; no front-selfie framing and floating viewpoint. Perspective must match the camera height and distance, including slight handheld tilt and plausible crop. Sensor grain, local sharpening, white balance and clipped highlights depend on exposure rather than a global artificial noise effect.'
 if(compact)return [
  'MIRROR OPTICS AND BIOMECHANICS CONTRACT:',
  posture==='seated_bed'?'Hips load the real bed edge, feet are grounded; do not call this standing.':posture==='seated_floor'?'Pelvis loads the actual floor/rug; no unsupported bed contact.':'Feet support the standing body on real floor; no bed compression.',
  'One Xiaomi 15 Ultra rear-camera phone: glass-facing lenses and selected LED, screen facing holder, single connected gripping arm and one independent free-hand task.',
  'Wardrobe mirror is one fixed plane: equal-angle rays, correct virtual depths, frame and phone occlusions; vanity mirror stays physically separate. Reuse the same reflected room, ceramic grid and item identities.',
  'Approximate bed/sofa depth cues never override room geometry and reflected field of view.',
  ctx.nightLightingId==='rear_flash'?'Rear LED flash reflects only along valid rays, with conditional glare and directional shadows.':'Rear LED remains off; illumination has only the selected real sources.',
  'Natural camera exposure, joint loads, surface contacts and crop; no extra people, invisible camera and fictitious fill.'
 ].join(' ')
 return 'MIRROR OPTICS AND BIOMECHANICS CONTRACT: '+mirrorSeat+' '+phone+' '+glass+' '+scene+' '+light+' '+camera+' The selected pose has priority over generic standing instructions; if the crop cannot contain distant furniture, omit it rather than breaking optics.'
}

