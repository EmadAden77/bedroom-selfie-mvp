import { bedroomShots } from './bedroom-shots'
import type { CompilationContext } from '../domain/types'

export const poseOptions = [
  { id: 'seated_bed', label: 'جالس على السرير', text: 'Seated on the bed; upright head, shoulders and torso. Shadows follow upright anatomy.' },
  { id: 'reclined_pillows', label: 'متكئ على الوسائد', text: 'Semi-reclined against pillows; head tilted back with shoulders supported. Pillow contact produces real occlusion and shadow.' },
  { id: 'side_lying_right', label: 'مستلقي على الجانب الأيمن', text: 'Lying on the right side; right cheek and shoulder approach pillow support. Light direction is evaluated relative to the tilted face, not the room floor.' },
  { id: 'side_lying_left', label: 'مستلقي على الجانب الأيسر', text: 'Lying on the left side; left cheek and shoulder approach pillow support. Light direction is evaluated relative to the tilted face, not the room floor.' },
  { id: 'supine', label: 'مستلقي على الظهر', text: 'Lying on the back; face directed upward unless separately turned. Mattress supports the back and head.' },
  { id: 'prone', label: 'على البطن', text: 'Prone on mattress; chest and pelvis supported, head lifted only as far as the neck permits, one arm free for camera.' },
  { id: 'seated_floor', label: 'جالس على الأرض', text: 'Seated on bedroom floor, hips supported by floor; legs folded comfortably, torso upright.' },
  { id: 'standing', label: 'واقف بجانب السرير', text: 'Standing near the bed; upright gravity-dependent shadows and clothing drape.' }
] as const
export const faceOptions = [
  { id: 'toward_camera', label: 'نحو الكاميرا', text: 'Face oriented toward the held front camera.' },
  { id: 'toward_lamp', label: 'نحو المصباح الجانبي', text: 'Head turned toward the bedside lamp location; illuminated side becomes more frontal.' },
  { id: 'away_from_lamp', label: 'بعيدًا عن المصباح', text: 'Head turned away from the bedside lamp; lamp-side cheek may fall into shadow.' },
  { id: 'toward_door', label: 'نحو الباب', text: 'Head oriented toward the doorway.' },
  { id: 'toward_window', label: 'نحو النافذة', text: 'Head oriented toward the uncovered window.' }
] as const
export const lampSideOptions = [
  { id: 'left', label: 'يسار الشخص', text: 'on the subject left side' },
  { id: 'right', label: 'يمين الشخص', text: 'on the subject right side' }
] as const

export function renderLightGeometry(ctx: CompilationContext): string {
  const pose = poseOptions.find(x=>x.id===(ctx.poseId || 'seated_bed'))!
  const face = faceOptions.find(x=>x.id===(ctx.faceDirectionId || 'toward_camera'))!
  const side = lampSideOptions.find(x=>x.id===(ctx.lampSideId || 'left'))!
  const lighting = ctx.nightLightingId || 'phone_screen_only'
  const shot = bedroomShots.find(s=>s.id===ctx.bedroomShotId)
  const stationary = shot?.mode === 'timer'
  const reflected = shot?.mode === 'mirror'
  const rear = shot?.mode === 'rear'
  const usesLamp = lighting === 'bedside_warm' || lighting === 'lamp_and_screen'
  const usesPhone = lighting === 'phone_screen_only' || lighting === 'lamp_and_screen' || lighting === 'ceiling_and_screen'
  const usesCeiling = lighting === 'ceiling_dim' || lighting === 'ceiling_neutral' || lighting === 'ceiling_and_screen'
  const pieces = [
    'Selfie pose geometry: ' + pose.text,
    'Face direction: ' + face.text,
    stationary ? 'The phone rests securely on a fixed support and captures with a timer; no hand holds it.' : reflected ? 'The camera points into the existing wardrobe mirror; subject and phone positions must satisfy real reflection lines.' : rear ? 'The subject holds the rear camera within feasible arm reach; camera viewpoint never floats.' : 'The hand-held front camera remains at feasible arm reach; the face orientation changes which surfaces receive light. Do not rotate room light sources with the head.'
  ]
  if (usesLamp) pieces.push('Bedside lamp fixed ' + side.text + ' on the nightstand. Recompute cheek, nose, pillow and neck shadows from this source and the actual head tilt; do not force the same bright cheek across poses.')
  if (usesPhone && !rear && !reflected && !stationary) pieces.push('Phone display faces the subject near the camera optical axis. Illumination tracks phone-to-face distance and angle; the camera sensor does not emit light. Face-to-neck falloff remains natural.')
  if (usesCeiling) pieces.push('Ceiling fixtures remain above the physical room even when the head is horizontal; their projection onto face and bedding changes with posture.')
  if (lighting === 'hallway_spill') pieces.push('Doorway spill is fixed at the real door; turning away reduces direct facial illumination. No light reaches surfaces blocked by walls.')
  if (lighting === 'window_streetlight') pieces.push('External streetlight passes only through an uncovered window; curtain, wall and bed occlusion determine the visible spill.')
  if (lighting === 'laptop_screen_only') pieces.push('An open laptop must be positioned in front of the subject within viewing distance and aimed toward the face; face rotation and the laptop-screen normal determine exposure.')
  if (lighting === 'rear_flash') pieces.push('Rear LED flash is emitted from the actual rear camera module during exposure. Respect hard shadows, specular reflections and direct flash falloff.')
  if (lighting === 'television_screen' || lighting === 'decorative_led' || lighting === 'sunset_projector') pieces.push('Decorative source must physically exist at a fixed location in the room. Evaluate face visibility from orientation, occlusion and falloff.')
  if (lighting === 'near_darkness') pieces.push('Changing pose cannot generate new light. Preserve severe underexposure.')
  pieces.push('All contact shadows, clothing shading and image noise follow these same light sources. No cinematic rim light, floating camera, invented softbox, isolated face enhancement.')
  return pieces.join(' ')
}
