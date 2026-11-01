import type { CompilationContext } from '../domain/types'
import { bedroomShots } from './bedroom-shots'

/** Capture-consistent geometry, optics and sensor behavior, not an invented studio camera. */
export function renderCameraPhysics(ctx: CompilationContext): string {
  const shot = bedroomShots.find(s => s.id === ctx.bedroomShotId)
  const mode = shot?.mode ?? 'front'
  const base = 'CAMERA PHYSICS: A casual smartphone photograph with ordinary handheld framing, physically credible camera-to-subject distance, modest sensor noise appropriate to actual lighting, natural autofocus and restrained computational HDR. No beauty smoothing, synthetic skin texture, fake shallow-depth portrait blur, artificial studio fill, extreme edge stretching, duplicated hands, disconnected arms, floating camera, perfect commercial symmetry.'
  if (mode === 'mirror') return [
    base,
    'MIRROR CAPTURE: Rear-facing handset visible in the existing wardrobe mirror. The displayed camera viewpoint and reflected phone position follow real equal-angle reflection geometry.',
    'The Xiaomi 15 Ultra appearance follows the selected real recording handset, without inventing an iPhone and never changes device identity between captures. A real gripping hand holds the device at the selected waist-to-eye height within normal shoulder and wrist reach, with correct finger contacts. The screen faces the subject and rear camera lenses face the mirror.',
    'Reflected distances, mirror perspective and occlusion are physically consistent. Room lighting determines noise, shadow and flash reflection. No additional selfie camera viewpoint.'
  ].join(' ')
  if (mode === 'timer') return [
    base,
    'TIMER CAPTURE: Smartphone stands on a stable physical support. The shutter is triggered by timer. Neither hand holds the photographing phone.',
    'Camera height and perspective follow its actual fixed placement. A realistic mobile wide-angle field of view shows the supported subject and relevant room parts.',
    'No invisible photographer, floating rig, selfie arm, simulated hand-held movement.'
  ].join(' ')
  if (mode === 'rear') return [
    base,
    'REAR CAMERA CAPTURE: Use a physically reachable rear-facing smartphone camera. Wider-angle perspective and normal nearby subject distortion are plausible.',
    'The device stays supported by the photographing hand; arm length and shoulder geometry bound the camera distance. No mirror reflection unless an existing mirror lies within the actual frame.'
  ].join(' ')
  return [
    base,
    'FRONT SELFIE CAPTURE: Xiaomi 15 Ultra front-facing smartphone camera perspective, with plausible wide-angle phone optics and naturally broad depth of field; do not invent a precise focal length.',
    'Held at realistic available arm distance from the face when pose permits. Camera pitch, yaw and roll reflect the chosen pose; the forearm extends from a real shoulder with a feasible elbow and wrist angle.',
    'Mild wide-angle proximity effects only, realistic face-to-background scale, modest edge distortion and no exaggerated head enlargement.',
    'Phone screen illumination contributes solely when the selected lighting setup actually enables it; no automatic front flash.',
    'Noise, white balance variation and JPEG detail follow the exposure. Preserve ordinary imperfect handheld alignment.'
  ].join(' ')
}
