import type {CompilationContext} from '../domain/types'
import {isMirrorShotId} from './mirror-controls'

/** One rear LED, one fixed mirror, and a physically connected illumination path. */
export function isMirrorFlash(ctx:CompilationContext):boolean{
 return isMirrorShotId(ctx.bedroomShotId)&&ctx.nightLightingId==='camera_flash'
}

/** Preserve flash when changing mirror poses; never leave screen-only light aimed away from the mirror. */
/** Never auto-correct a lighting choice when selecting a shot. */
export function nextMirrorLighting(_shotId:string,currentLighting:string):string{
 return currentLighting
}

export function renderMirrorFlashPhysics(ctx:CompilationContext):string{
 if(!isMirrorFlash(ctx))return ''
 return [
  'MIRROR FLASH OPTICS: The one actual rear LED fires during the rear-camera exposure, aimed toward the fixed RIGHT-wall wardrobe mirror. The screen never emits this flash.',
  'Follow an unobstructed LED-to-glass-to-subject path: equal incidence and reflection angles, actual glass boundaries, phone occlusion, and distance falloff from the virtual LED image behind the mirror. Do not assume the subject receives uniform frontal flash illumination.',
  'The LED reflection has a fixed position beside the actual reflected rear camera module. Clipped highlights, bloom, and lens ghosts appear only if the optical aim plus camera exposure permit them. Never insert a compulsory central white flare.',
  'Cast a sharp shadow only where reflected flash reaches an existing receiving surface (wall, bedding, furniture) and a physically present object blocks that ray. Keep distant room corners underexposed without studio fill.',
  'Preserve natural reference skin texture and realistic surface shine; do not invent pores, blemishes, makeup and smoothing effects. Faint existing glass dust and smudges emerge only when the flash genuinely reveals them.',
  'The smartphone rear camera records finite dynamic range, local clipping, white-balance variation, restrained JPEG sharpening, and exposure-dependent shadow grain; flash need not force high ISO. Maintain plausible wide-angle optics without inventing a numerical focal length.',
  'No extra LED source, fixed central hotspot, fabricated shadows, exaggerated noise overlay, duplicated phone, floating camera and studio lighting.'
 ].join(' ')
}

export function buildMirrorFlashGeminiBrief(ctx:CompilationContext):string{
 if(!isMirrorFlash(ctx))return ''
 return [
  'Mirror flash optics: one real rear LED on the recording phone fires into the fixed RIGHT-wall wardrobe mirror; reflected LED-to-mirror-to-subject rays determine where the person, bed and room are lit, including natural occlusion, directional shadows and distance falloff.',
  'Keep any clipped flash hotspot beside the geometrically reflected LED near the rear camera module, only if the camera aim and exposure make it visible; bloom or lens ghosts must originate there, never in an arbitrary mirror center.',
  'Dark room corners remain naturally underexposed. Flash does not automatically imply high ISO, balanced frontal illumination or hard shadows on nonexistent surfaces. Preserve reference skin, with restrained conditional shine, faint existing glass marks and sensor noise only when supported by exposure.',
  'No additional source, studio fill, cosmetic smoothing, fake flare, invented pores, arbitrary 24mm lens specification or duplicate phone.'
 ].join('\n')
}
