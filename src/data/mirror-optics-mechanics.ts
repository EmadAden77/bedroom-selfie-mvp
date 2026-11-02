import type {CompilationContext} from '../domain/types'
import {bedroomShots,getShotPosture} from './bedroom-shots'

/**
 * One physical optical/mechanical contract for every wardrobe-mirror shot.
 * Prompts describe enforceable relationships; a prompt-only API cannot measure pixels.
 */
export function buildMirrorOpticsMechanics(ctx:CompilationContext):string{
 const shot=bedroomShots.find(x=>x.id===ctx.bedroomShotId)
 if(shot?.mode!=='mirror')return ''
 const posture=getShotPosture(shot.id)||'standing'
 const seated=posture==='seated_bed'||posture==='seated_floor'
 const mirrorSeat=posture==='seated_bed'
  ? 'Seated on the actual left-wall mattress edge: pelvis and thighs load the mattress, feet carry their share of weight on real floor tiles, knees and neck remain naturally aligned. The mattress depresses only at true contact.'
  :posture==='seated_floor'
  ? 'Seated on the photographed floor/rug: pelvis and legs have actual floor support, knees fold within joint limits, torso balances over the support polygon. Bed upholstery does not deform without contact.'
  :'Standing in the actual free aisle: soles contact tile or real rug, body centre of mass projects within the feet support area, knees and pelvis share realistic balance; standing feet never load the bed.'
 const phone='One actual Xiaomi 15 Ultra is held by exactly one hand. Rear-camera lens and rear LED, when enabled, point toward the SAME real wardrobe mirror; the display faces the holder. Grip pressure deforms fingers subtly; elbow, wrist, forearm and shoulder form one reachable connected chain. The other hand alone performs the selected action; do not invent extra fingers, double grips or an external photographer.'
 const glass='A single flat sliding wardrobe mirror on its actual right-wall track is the capture surface. Reflect each camera ray across the mirror normal (incidence equals reflection); the virtual subject appears the corresponding perpendicular distance behind the plane. Occlude at glass frame, phone, hands and furniture edges. No shifted glass plane, transparent door, mirrored duplicate room or impossible view through opaque walls. Original separate vanity mirror stays by the dresser, not a replacement capture mirror.'
 const scene='Use ONLY the one anchored room: left-wall bed, original vanity mirror right of wardrobe and real ceramic grid with consistent perspective vanishing lines. The user-specified bed/seating separation near 3 metres and sofa landmark near 5 metres are approximate viewpoint-dependent depth cues, never instructions to relocate furniture; sofa only if confirmed and within reflected field of view. Reflections reuse the same item identities, surface finish, grime locations and light positions. Mirror lettering follows ordinary unflipped reflection.'
 const light=ctx.nightLightingId==='rear_flash'
  ? 'FLASH: only the real rear LED fires during exposure; reflect its rays from the actual glass to surfaces that can receive them. Flash highlight position is bound to the real lens/LED geometry and exposure; glass bloom, occluding handset silhouette, falloff, clipped pixels and shadow direction arise only when optically possible. Do not assume a central hotspot, diffuse studio fill or equal light over the face.'
  :'NO FLASH: the rear LED is OFF. Exposure, shadows, skin and ceramic specular reflections follow only the selected real room sources. Never add an LED hotspot, invisible frontal fill or a reflected flash.'
 const camera='Use a single rear-camera exposure with actual ray geometry and reachable handheld framing; no front-selfie framing or floating viewpoint. Perspective must match the camera height and distance, including slight handheld tilt and plausible crop. Sensor grain, local sharpening, white balance and clipped highlights depend on exposure rather than a global artificial noise effect.'
 return 'MIRROR OPTICS AND BIOMECHANICS CONTRACT: '+mirrorSeat+' '+phone+' '+glass+' '+scene+' '+light+' '+camera+' The selected pose has priority over generic standing instructions; if the crop cannot contain distant furniture, omit it rather than breaking optics.'
}

export function mirrorMechanicalIssues(ctx:CompilationContext):string[]{
 const shot=bedroomShots.find(x=>x.id===ctx.bedroomShotId)
 if(shot?.mode!=='mirror')return []
 const errors:string[]=[]
 if(ctx.nightLightingId==='phone_screen_only')
  errors.push('شاشة الهاتف تتجه إلى الشخص في تصوير المرآة، لكنها لا تصلح وحدها لإضاءة الوجه والانعكاس بهذه الوضعية؛ اختر مصدرًا منزليًا أو الفلاش.')
 if(ctx.nightLightingId==='laptop_screen_only')
  errors.push('إضاءة اللابتوب تتطلب وضعية تحتوي لابتوب حقيقيًا، وليس سيلفي مرآة عاديًا.')
 return errors
}
