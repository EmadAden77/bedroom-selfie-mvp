import type { CompilationContext, PromptSection, ValidationResult } from '../domain/types'
import { bedroomShots, getShotPosture } from '../data/bedroom-shots'
import { isMirrorFlash } from '../data/mirror-flash-physics'
import { isLivedInClutter } from '../data/bedroom-clutter'
import { isLaptopSelfieShot } from '../data/laptop-selfie-physics'
import {mirrorRearFlashNeedsSource} from '../../shared/capture-lighting-rules'

/** Final deterministic consistency gate. Only proven contradictions block export. */
export function validateFinalRealism(ctx: CompilationContext, sections: PromptSection[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const shot = bedroomShots.find(s => s.id === ctx.bedroomShotId)
  const posture = shot ? getShotPosture(shot.id) : (ctx.poseId || 'seated_bed')
  const byId = new Map(sections.map(s => [s.id, s.content]))
  const geometry = byId.get('light_pose_geometry') || ''
  const camera = byId.get('camera_physics') || ''
  const body = byId.get('body_pose_physics') || ''
  const room = byId.get('bedroom_environment_lock') || ''
  const light = ctx.nightLightingId || 'phone_screen_only'
  if (!geometry || !camera || !body || !room) errors.push('Final realism: a required physics section is missing')
  if (!posture) errors.push('Final realism: shot posture was not resolved')
  if (posture === 'supine' && !body.includes('Back, pelvis and head are supported')) errors.push('Final realism: supine body support conflicts with shot')
  if (posture === 'standing' && !body.includes('Feet support the whole body')) errors.push('Final realism: standing body support conflicts with shot')
  if (posture === 'side_lying_right' && !body.includes('Right shoulder, right hip')) errors.push('Final realism: right-side contact missing')
  if (posture === 'side_lying_left' && !body.includes('Left shoulder, left hip')) errors.push('Final realism: left-side contact missing')
  if (shot?.mode === 'mirror') {
    const mirrorMechanics=byId.get('mirror_composition')||''
    if(!mirrorMechanics.includes('MIRROR OPTICS AND BIOMECHANICS CONTRACT:'))errors.push('Final realism: mirror optical mechanics contract missing')
    if(!mirrorMechanics.includes('Wardrobe')&&!mirrorMechanics.includes('wardrobe'))errors.push('Final realism: wardrobe mirror surface lost')
    if (!camera.includes('MIRROR CAPTURE:') || !byId.get('bedroom_shot_' + shot.id)?.includes('Xiaomi 15 Ultra')) errors.push('Final realism: mirror capture device mismatch')
    // Catch incompatible instructions even when leaked by another prompt section.
    if (/FRONT SELFIE CAPTURE:|front-facing smartphone|front-facing camera|held front camera|hand-held front camera/i.test(sections.map(s => s.content).join(' '))) {
      errors.push('Final realism: front selfie camera instruction leaked into mirror capture')
    }
  } else if (shot?.mode === 'timer') {
    if (!camera.includes('TIMER CAPTURE:') || !body.includes('No phone grip from the subject')) errors.push('Final realism: timer camera conflicts with hand occupancy')
  } else if (shot?.mode === 'rear') {
    if (!camera.includes('REAR CAMERA CAPTURE:')) errors.push('Final realism: rear capture camera mismatch')
  } else if (!camera.includes('FRONT SELFIE CAPTURE:')) errors.push('Final realism: front camera profile missing')
  if (!room.includes('bedside nightstand') || !room.includes('sliding-door wardrobe')) errors.push('Final realism: fixed bedroom topology missing')
  if(ctx.roomPhysicalState){
    if(!byId.get('physical_room_state')?.includes('PHYSICAL ROOM STATE'))errors.push('Final realism: physical room state missing')
    if(byId.has('lived_in_bedroom_clutter'))errors.push('Final realism: legacy clutter conflicts with selected room state')
  }else{
    if(isLivedInClutter(ctx)&&!byId.get('lived_in_bedroom_clutter')?.includes('LIVED-IN BEDROOM CLUTTER:'))errors.push('Final realism: selected lived-in clutter instructions missing')
    if(!isLivedInClutter(ctx)&&byId.has('lived_in_bedroom_clutter'))errors.push('Final realism: unselected clutter leaked into prompt')
  }
  if (light === 'phone_screen_only' && !byId.get('night_lighting_phone_screen_only')?.includes('sole active light source')) errors.push('Final realism: phone-only lighting contradicts source')
  if (light === 'window_streetlight' && !ctx.windowUncovered) errors.push('Final realism: external streetlight blocked by closed curtains')
  if (mirrorRearFlashNeedsSource(shot?.id,light)) errors.push('Final realism: mirror flash requires rear LED source')
  if (isMirrorFlash(ctx) && !byId.get('mirror_flash_physics')?.includes('MIRROR FLASH OPTICS:')) errors.push('Final realism: mirror flash ray path missing')
  if (!isMirrorFlash(ctx) && byId.has('mirror_flash_physics')) errors.push('Final realism: mirror flash instructions leaked into a non-flash capture')
  if(isLaptopSelfieShot(ctx.bedroomShotId)&&!byId.get('laptop_selfie_physics')?.includes('LAPTOP SELFIE PHYSICS:'))errors.push('Final realism: laptop support physics missing')
  if(!isLaptopSelfieShot(ctx.bedroomShotId)&&byId.has('laptop_selfie_physics'))errors.push('Final realism: laptop pose instructions leaked into unrelated shot')
  if (ctx.faceDirectionId === 'toward_window' && !ctx.windowUncovered) warnings.push('Final realism: gaze points toward a curtained window')
  if (light === 'phone_screen_only' && shot?.mode === 'timer') warnings.push('Final realism: timer setup with phone screen as the only illuminant may be underexposed')
  return { isValid: errors.length === 0, errors, warnings }
}
