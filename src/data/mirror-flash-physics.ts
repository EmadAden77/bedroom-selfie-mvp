import type {CompilationContext} from '../domain/types'
import {isMirrorShotId} from './mirror-controls'

/** One rear LED, one fixed mirror, and a physically connected illumination path. */
export function isMirrorFlash(ctx:CompilationContext):boolean{
 return isMirrorShotId(ctx.bedroomShotId)&&ctx.nightLightingId==='rear_flash'
}

/** Preserve flash when changing mirror poses; never leave screen-only light aimed away from the mirror. */
export function nextMirrorLighting(shotId:string,currentLighting:string):string{
 if(shotId==='mirror_rear_flash')return 'rear_flash'
 return currentLighting==='phone_screen_only'?'ceiling_neutral':currentLighting
}

export function renderMirrorFlashPhysics(ctx:CompilationContext):string{
 if(!isMirrorFlash(ctx))return ''
 return [
  'MIRROR FLASH OPTICS: The one actual rear LED fires during the rear-camera exposure, aimed toward the existing RIGHT-wall wardrobe mirror, never outward from the screen.',
  'Illuminate the subject and room only along unobstructed LED-to-glass-to-subject reflected rays, observing equal incidence and reflection angles, finite glass edges, phone occlusion and distance falloff from the virtual reflected source behind the mirror. Do not assume the face is evenly or directly flash-lit.',
  'The LED has a fixed offset from the actual rear camera module. Any bright specular flash reflection, localized clipped white highlight, bloom or optical ghost must align with that real LED reflection and camera sightline, not an arbitrary hotspot in the center of the glass. Flare is conditional on aim and sensor exposure, not a mandatory opaque disk.',
  'Cast a sharp shadow only where the reflected flash reaches a real nearby wall, bed or furniture surface and the subject or phone actually occludes the reflected light. Keep dark corners underexposed without fictional studio fill.',
  'Preserve the reference skin without invented pores, blemishes or plastic smoothing. Restrained skin shine follows illuminated surface normals. Subtle existing mirror smudges or dust show only where real specular illumination reveals them.',
  'Smartphone rear-camera image processing has finite dynamic range, possible localized highlight clipping, realistic white balance, restrained JPEG sharpening and shadow noise scaled to actual exposure; flash need not force high ISO. Mild wide-angle perspective follows camera optics rather than an invented exact focal length.',
  'No extra light emitter, invented lens flare, overexposed entire face, fixed central blast, artificial noise overlay, duplicate handset or floating camera.'
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
