import type { CompilationContext } from '../../domain/types'
import type { AuditRatings } from './audit'
const instructions: Record<string,string> = {
 identity:'Preserve original face geometry, age and beard.',
 hair:'Make the selected hairstyle visible using existing strands and unchanged hairline.',
 room:'BED GEOMETRY: Maintain a single queen mattress 160 by 200 cm with consistent thickness and parallel edges, against the dark tufted headboard on the left wall. Keep one bed frame, two naturally sized sleeping pillows, one duvet and one nightstand. Avoid distorted geometry and floating bedding.',
 pose:'SUPPORT: The pelvis and lower back bear weight on the mattress. The upper back, shoulders and head compress the pillows naturally. Maintain a continuous neck alignment and realistic local bedding depressions.',
 hands:'Maintain anatomically continuous arms and natural fingers.',
 camera:'Align smartphone viewpoint with reachable arm position, face perspective and bed edges.',
 light:'Keep the phone screen as the only active light source, with soft illumination near the face and falloff toward the bedding and background.',
 clothing:'Preserve clothing material, color, fit and natural folds.'
}
export function makeAuditCorrection(ctx:CompilationContext,ratings:AuditRatings,notes:string):string {
 const failed=Object.keys(instructions).filter(id=>ratings[id]==='fail')
 if(!failed.length)return ''
 const passed=Object.keys(instructions).filter(id=>ratings[id]==='pass')
 return [
  'TARGETED MANUAL AUDIT CORRECTION',
  ctx.bedroomShotId==='pillow_stack'?'Selected shot: semi-reclined against pillows.':'Keep the original selected shot.',
  ...failed.map(id=>instructions[id]),
  passed.length?'KEEP VERIFIED DETAILS: '+passed.join(', ')+'.':'',
  notes.trim()?'Reviewer note: '+notes.trim():'',
  'Correct only flagged defects. The ratings are user supplied; no automatic visual diagnosis was performed.'
 ].filter(Boolean).join('\n\n')
}
