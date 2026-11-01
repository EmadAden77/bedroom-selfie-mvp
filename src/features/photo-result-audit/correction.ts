import type { CompilationContext } from '../../domain/types'
import type { AuditRatings } from './audit'
import {getAuditCriteria} from './audit'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
const instructions: Record<string,string> = {
 identity:'Preserve original face geometry, age and beard.',
 hair:'Make the selected hairstyle visible using existing strands and unchanged hairline.',
 room:'BED GEOMETRY: Preserve the original bed and pillow count from the room reference, the existing wardrobe and separate dresser mirror, true walking clearance and straight furniture edges. Correct distorted perspective and floating bedding without inventing dimensions.',
 pose:'SUPPORT: Respect the chosen shot posture, actual supporting surfaces, connected joints, reachable camera and contact-dependent bedding compression. Do not force a seated body into a standing shot.',
 hands:'Maintain anatomically continuous arms and natural fingers.',
 camera:'Align smartphone viewpoint with reachable arm position, face perspective and bed edges.',
 light:'Use only the originally selected light sources. Respect actual emitter positions, distance, occlusion, exposure, reflection and falloff without introducing lamps or daylight.',
 clothing:'Preserve clothing material, color, fit and natural folds.',
 tile_grid:'Match the reference ceramic tile boundaries and grout lines, specular response, floor/rug contacts and real reflected fixture positions.',
 surface_materials:'Keep reference wall texture, finish, paint and surface wear; confine selected faint dust to credible corners beneath furniture and avoid fabricated damage.',
 room_objects:'Preserve the selected stable movable-object anchors with proper supports, contact shadows, distinct item identities and continuous cables.',
 room_session:'Keep each session object fixed between views unless touched. A mirror may show it only through the true reflected sightline.'
}
export function makeAuditCorrection(ctx:CompilationContext,ratings:AuditRatings,notes:string):string {
 const active=new Set(getAuditCriteria(ctx).map(c=>c.id))
 const failed=Object.keys(instructions).filter(id=>active.has(id)&&ratings[id]==='fail')
 if(!failed.length)return ''
 const passed=Object.keys(instructions).filter(id=>active.has(id)&&ratings[id]==='pass')
 return [
  'TARGETED MANUAL AUDIT CORRECTION',
  ctx.bedroomShotId==='pillow_stack'?'Selected shot: semi-reclined against pillows.':'Keep the original selected shot.',
  ...failed.map(id=>instructions[id]),
  passed.length?'KEEP VERIFIED DETAILS: '+passed.join(', ')+'.':'',
  notes.trim()?'Reviewer note: '+notes.trim():'',
  'Correct only flagged defects. The ratings are user supplied; no automatic visual diagnosis was performed.'
 ].filter(Boolean).join('\n\n')
}
