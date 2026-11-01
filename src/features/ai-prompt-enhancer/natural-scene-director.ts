import type {CompilationContext} from '../../domain/types'
import {bedroomShots} from '../../data/bedroom-shots'
import {isLaptopSelfieShot} from '../../data/laptop-selfie-physics'

/**
 * Natural Scene Director: adds context-specific observable action, never a new pose,
 * person, prop, room layout, camera or light source.
 * The selected shot and user references remain authoritative.
 */
export function buildNaturalSceneDirection(ctx:CompilationContext):string{
 const shot=bedroomShots.find(item=>item.id===ctx.bedroomShotId)
 const laptop=isLaptopSelfieShot(ctx.bedroomShotId)
 const mirror=shot?.mode==='mirror'
 const timer=shot?.mode==='timer'
 const action=laptop
  ? 'Describe a candid instant of the selected laptop activity: one supported, hinged laptop, the recording phone in its selected handheld or supported-timer position, and only the actually available hand interacting.'
  : timer
  ? 'Describe a quiet instant after setting the real phone timer on its selected stable support. Do not turn this into a handheld capture.'
  : mirror
  ? 'Describe the selected mirror-selfie action in progress. Follow the exact free-hand movement, gaze and phone position already selected; do not add a competing gesture or a second mirror.'
  : 'Describe a candid instant within the selected bedroom selfie action, rather than a staged pose. Keep one reachable recording phone and only the already selected hand or object interaction.'
 const contacts=laptop
  ? 'Show small physically caused effects: weight and fabric compression only under the actual laptop and body contact; its screen, hinge, hands and support stay connected.'
  : shot?.category===0
  ? 'Show local bedding and pillow compression under actual body contact and ordinary clothing folds at hips, elbows and knees as the selected posture permits.'
  : mirror
  ? 'Show relaxed weight distribution and fabric movement only where the selected hand or body genuinely touches clothing or furniture; reflective sightlines and mirror edges remain exact.'
  : 'Show only subtle real contact pressure, fabric folds or handheld-camera framing caused by the selected action; avoid theatrical posing.'
 const setting=ctx.bedroomClutterId==='lived_in_messy'
  ? 'Where the crop reveals them, use the already selected rumpled bedding and physically supported small loose items, without altering existing furniture.'
  : 'Use only existing visible bedroom architecture and objects; do not invent generic clutter, accessories or extra furniture for atmosphere.'
 const optics=mirror
  ? 'Ordinary mirror reflections reverse printed lettering unless the entire final photograph is deliberately flipped; never force forward-readable text inside an unflipped mirror.'
  : 'Use the selected real smartphone viewpoint; mirror-text rules are not applicable to this non-mirror capture.'
 return [
  'Natural scene direction:',
  action,contacts,setting,optics,
  'Context check: activity, any prop, chosen clothing, expression, camera support, body balance and lighting must agree with the actual shot and existing references. Do not introduce makeup, jewelry, sweat, freckles, blemishes, extra hair or a smile that was not selected or visible in the reference. No additional light source, facial redesign or artificial room topology.'
 ].join(' ')
}

/** A small preflight for unambiguously contradictory user selections. */
export function naturalSceneSelectionIssues(ctx:CompilationContext):string[]{
 const shot=bedroomShots.find(item=>item.id===ctx.bedroomShotId)
 if(!shot)return []
 const issues:string[]=[]
 if(shot.id==='mirror_rear_flash'&&ctx.nightLightingId&&ctx.nightLightingId!=='rear_flash'){
  issues.push('وضعية فلاش المرآة تتطلب اختيار إضاءة الفلاش الخلفي حتى تتوافق اللقطة مع مصدر الضوء الحقيقي.')
 }
 if(ctx.nightLightingId==='laptop_screen_only'&&!isLaptopSelfieShot(shot.id)){
  issues.push('إضاءة شاشة اللابتوب لا تصلح لهذه الوضعية من دون وجود لابتوب فعلي في المشهد.')
 }
 return issues
}
