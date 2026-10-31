import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'

/** Distinct laptop poses stay separate from the old dark-screen reflection effect. */
export function isLaptopSelfieShot(id:string|undefined):boolean{
 return Boolean(id&&id.startsWith('laptop_')&&id!=='laptop_reflection')
}
export function nextLaptopLighting(id:string,current:string):string{
 if(isLaptopSelfieShot(id)&&current==='phone_screen_only')return 'laptop_screen_only'
 if(!isLaptopSelfieShot(id)&&current==='laptop_screen_only'){
  const mirror=bedroomShots.find(s=>s.id===id)?.mode==='mirror'
  return mirror?'ceiling_neutral':'phone_screen_only'
 }
 return current
}
export function renderLaptopSelfiePhysics(ctx:CompilationContext):string{
 if(!isLaptopSelfieShot(ctx.bedroomShotId))return ''
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const timer=shot?.mode==='timer'
 const lighting=ctx.nightLightingId||'phone_screen_only'
 const lightRule=lighting==='laptop_screen_only'
  ? 'LAPTOP DISPLAY ILLUMINATION: Its open powered display is the real sole active scene light. Cast weak directionally plausible light on screen-facing hands, face and nearby bedding, with rapidly falling brightness, dim room and exposure-dependent noise. Phone display, ceiling fixtures and nightstand lamp add no competing illumination.'
  : lighting==='phone_screen_only'
  ? 'PHONE DISPLAY ILLUMINATION: The recording handset screen is the only significant active light. The laptop display stays dark and does not contribute face illumination. Keep the laptop and background severely underexposed, with genuine phone-screen falloff.'
  : 'HOUSEHOLD LIGHTING: The selected room-light preset alone controls scene visibility and shadows. A laptop display can show a modest practical image but cannot secretly brighten the entire face, ceiling and room.'
 return [
  'LAPTOP SELFIE PHYSICS: Include exactly one normal functional laptop with a continuous base, attached hinged screen, physically supported underside and correct keyboard, trackpad and real hinge rotation. Keep a plausible screen aspect, normal laptop thickness, believable viewing direction and correct occlusion from the chosen camera position.',
  'POSITION AND SUPPORT: Follow the selected shot precisely. The laptop base maintains real contact with the specified thigh, mattress, room floor, existing rug and dresser support from the shot. Its center of mass stays above its actual support area; screen hinge stiffness counters its lid weight. Unsupported hovering, impossible diagonal balance and missing hinge are forbidden. Bedding compression exists only beneath genuine contact.',
  timer
   ? 'TIMER HANDS: Both hands can type only because the photographing phone is placed on its own real stable surface at the chosen shot location. The camera never floats. Maintain a real viewing path between its front lens and the visible subject.'
   : 'HANDHELD SELFIE HANDS: One real hand and continuous shoulder-to-wrist arm hold the Xiaomi 15 Ultra front-facing camera at reachable arm distance. Only the free hand can touch keys, trackpad, laptop lid and notebook. No simultaneous two-handed typing in handheld mode.',
  'PHYSICAL LAPTOP GEOMETRY: The laptop screen faces the user and has realistic reflections from the selected room lights. The smartphone camera sees the screen face, outer lid and keyboard solely when the actual sightline permits; no transparent lid, duplicated keyboard, third hand, projected user interface, impossible floating screen and false reflected viewpoint.',
  lightRule,
  'Preserve original identity, hairline, facial proportions, room dimensions, LEFT-wall bed, RIGHT-wall mirrored sliding wardrobe, existing dresser and real floor clearance. A real candid smartphone snapshot has imperfect but physically coherent framing, natural fabric folds and believable exposure. Never force brand logos, readable text, fake app windows and staged professional blur.'
 ].join(' ')
}
export function buildLaptopGeminiBrief(ctx:CompilationContext):string{
 if(!isLaptopSelfieShot(ctx.bedroomShotId))return ''
 const mode=bedroomShots.find(s=>s.id===ctx.bedroomShotId)?.mode
 const light=ctx.nightLightingId||'phone_screen_only'
 return [
  'SELECTED LAPTOP SELFIE: The laptop is the real physical object interacting with the person, not a floating foreground graphic. Use the exact selected shot action, camera viewpoint and support location. A single hinged laptop base rests stably on the specified thighs, mattress, floor, rug or existing dresser; hands, contact, display viewing angle, key reach, gravity and camera line of sight agree.',
  mode==='timer'
   ? 'Camera method: real smartphone on a stable physical support, timer shutter, both hands free to type. Do not depict a hand holding the phone.'
   : 'Camera method: hand-held Xiaomi 15 Ultra front-camera selfie at attainable arm reach. Exactly one hand is occupied holding the phone; only the other hand can type briefly, scroll, touch the screen edge or rest naturally. Never show both hands typing with a hand-held phone.',
  light==='laptop_screen_only'
   ? 'Laptop screen is the sole physical light source. It faces the subject and lights only nearby surfaces weakly with realistic falloff; no other room or phone light.'
   : light==='phone_screen_only'
   ? 'Phone display alone provides real illumination; laptop screen stays dark and does not light the face. Dim objects and natural noise must remain physically credible.'
   : 'Respect the selected household light preset. Laptop display contributes at most minor physically plausible glow, not an invented new light source.',
  'Keep true room geometry and object anchors; avoid duplicated laptops, phantom grips, transparent lid, floating keyboard, perfect readable fake interface, invented fixed optics, beautified skin and stylized cinematic lighting.'
 ].join('\n')
}
