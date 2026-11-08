import { bedroomShots,getShotPosture } from './bedroom-shots'
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
  { id: 'toward_camera', label: 'نحو الكاميرا', text: 'Face oriented toward the actual recording camera, matching front, rear, timer and reflected capture.' },
  { id: 'toward_door', label: 'نحو الباب', text: 'Head oriented toward the doorway.' },
  { id: 'toward_window', label: 'نحو النافذة', text: 'Head oriented toward the existing curtained window; the window emits no light.' }
] as const
export function renderLightGeometry(ctx: CompilationContext): string {
  const shot = bedroomShots.find(s=>s.id===ctx.bedroomShotId)
  const actualPosture=shot?(getShotPosture(shot.id)||ctx.poseId):ctx.poseId
  const pose = poseOptions.find(x=>x.id===(actualPosture || 'seated_bed'))!
  const face = faceOptions.find(x=>x.id===(ctx.faceDirectionId || 'toward_camera'))!
  const lighting = ctx.nightLightingId || 'phone_screen'
  const stationary = shot?.mode === 'timer'
  const reflected = shot?.mode === 'mirror'
  const rear = shot?.mode === 'rear'
  // Capture mode owns camera-facing directions. A mirror never inherits a front-selfie instruction.
  const faceDescription = reflected
    ? shot?.id === 'mirror_phone_gaze'
      ? 'Head remains oriented toward the real wardrobe mirror; the eyes glance down at the actual handset display facing the subject (the handset screen facing the subject, not a reflected display). The rear camera still points at the mirror.'
      : shot?.id === 'mirror_mist'
        ? 'Head turns comfortably back over the near shoulder toward the reflected rear-camera lens in the wardrobe mirror while the torso remains partly turned away.'
        : shot?.id === 'mirror_half_face'
          ? 'Head faces the reflected rear-camera lens near the physical edge of the existing wardrobe mirror; the missing half of the reflection is outside the glass boundary.'
          : 'Head faces the reflected rear-camera lens in the existing wardrobe mirror; eye direction remains compatible with the selected pose and the physically held rear camera.'
    : face.id === 'toward_camera'
      ? stationary
        ? 'Face oriented toward the camera lens on its fixed timer support.'
        : rear
          ? 'Face oriented toward the hand-held rear-camera lens.'
          : face.text
      : face.text
  const usesPhone = lighting === 'phone_screen'
  const usesCeiling = lighting === 'led_spotlight'
  const pieces = [
    'Selfie pose geometry: ' + pose.text,
    'Face direction: ' + faceDescription,
    stationary ? 'The phone rests securely on a fixed support and captures with a timer; no hand holds it.' : reflected ? 'The camera points into the existing wardrobe mirror; subject and phone positions must satisfy real reflection lines.' : rear ? 'The subject holds the rear camera within feasible arm reach; camera viewpoint never floats.' : 'The hand-held front camera remains at feasible arm reach; the face orientation changes which surfaces receive light. Do not rotate room light sources with the head.'
  ]
  if (usesPhone && !rear && !reflected && !stationary) pieces.push('Phone display faces the subject near the camera optical axis. Illumination tracks phone-to-face distance and angle; the camera sensor does not emit light. Face-to-neck falloff remains natural.')
  if (usesCeiling) pieces.push('Ceiling fixtures remain above the physical room even when the head is horizontal; their projection onto face and bedding changes with posture.')
  if (lighting === 'laptop_screen') pieces.push('An open laptop must be positioned in front of the subject within viewing distance and aimed toward the face; face rotation and the laptop-screen normal determine exposure.')
  if (lighting === 'camera_flash') pieces.push('Rear LED flash is emitted from the actual rear camera module during exposure. Respect hard shadows, specular reflections and direct flash falloff.')
  pieces.push('PITCH-BLACK ROOM: Only the selected source emits photons. No ambient light, window light, daylight, second fixture, hidden fill and no selectively brightened face. Contact shadows, exposure and sensor noise follow this source.')
  return pieces.join(' ')
}
