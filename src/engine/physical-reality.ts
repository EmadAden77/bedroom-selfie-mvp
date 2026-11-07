import type {CompilationContext} from '../domain/types'
import {bedroomShots} from '../data/bedroom-shots'
import {isLaptopSelfieShot} from '../data/laptop-selfie-physics'

export type PhoneOnlyMode='OFF'|'DARK_ROOM_REAR_FLASH_ONLY'|'DARK_ROOM_FRONT_SCREEN_ONLY'
export type EmitterId='window'|'ceiling'|'bedside'|'hallway'|'streetlight'|'laptop'|'television'|'decorative_led'|'projector'|'phone_rear_led'|'phone_display'|'ambient_leakage'
export type PhysicalEmitter={id:EmitterId;enabled:boolean;origin:string;direction:string;character:string;certainty:'known'|'estimated'|'unknown'}
export type PhysicalIssue={code:string;message:string;corrections:{label:string;patch:Partial<CompilationContext>}[]}
export type PhysicalReality={mode:PhoneOnlyMode;effectiveLightingId:string;emitters:PhysicalEmitter[];effects:string[];issues:PhysicalIssue[];warnings:string[];certainty:'known'|'estimated'|'unknown'}
export const PHONE_ONLY_ILLUMINATION=true

const presets:Record<string,EmitterId[]>={
 phone_screen_only:['phone_display'],rear_flash:['phone_rear_led'],
 bedside_warm:['bedside'],ceiling_dim:['ceiling'],ceiling_neutral:['ceiling'],
 ceiling_led_neutral:['ceiling'],ceiling_led_soft_diffused:['ceiling'],
 ceiling_led_bed_side:['ceiling'],ceiling_led_wardrobe_side:['ceiling'],
 ceiling_led_single_downlight:['ceiling'],lamp_and_screen:['bedside','phone_display'],
 ceiling_and_screen:['ceiling','phone_display'],hallway_spill:['hallway'],
 window_streetlight:['streetlight'],laptop_screen_only:['laptop'],
 television_screen:['television'],decorative_led:['decorative_led'],
 sunset_projector:['projector'],near_darkness:['ambient_leakage']
}
const emitters:Record<EmitterId,Omit<PhysicalEmitter,'enabled'>>={
 window:{id:'window',origin:'Existing window only',direction:'From actual window opening',character:'Daylight when present and uncovered',certainty:'unknown'},
 ceiling:{id:'ceiling',origin:'Existing ceiling fixtures',direction:'Downward from installed fixture locations',character:'Finite domestic beam spread',certainty:'estimated'},
 bedside:{id:'bedside',origin:'Existing bedside lamp',direction:'From fixed nightstand position',character:'Warm local spill',certainty:'estimated'},
 hallway:{id:'hallway',origin:'Actual illuminated doorway',direction:'Through actual door opening',character:'Directional spill',certainty:'unknown'},
 streetlight:{id:'streetlight',origin:'External streetlight through an uncovered window',direction:'From window sightline',character:'Weak external spill',certainty:'unknown'},
 laptop:{id:'laptop',origin:'Actual open laptop display',direction:'Screen normal toward nearby subject',character:'Broad weak screen spill',certainty:'estimated'},
 television:{id:'television',origin:'Existing selected television',direction:'Along actual screen normal',character:'Display emission',certainty:'unknown'},
 decorative_led:{id:'decorative_led',origin:'Installed selected LED strip',direction:'From installed strip',character:'Localized colored light',certainty:'unknown'},
 projector:{id:'projector',origin:'Existing selected projector',direction:'Actual projector beam',character:'Directional projected patch',certainty:'unknown'},
 phone_rear_led:{id:'phone_rear_led',origin:'Recording phone rear LED beside rear camera module',direction:'Outward from the back of the phone toward the wardrobe mirror',character:'Brief concentrated photography flash',certainty:'known'},
 phone_display:{id:'phone_display',origin:'Recording phone front display',direction:'Outward from display surface toward the face',character:'Weak broad near-field display emission',certainty:'known'},
 ambient_leakage:{id:'ambient_leakage',origin:'Unspecified external leakage',direction:'Unverified',character:'Extremely weak ambient leakage',certainty:'unknown'}
}
const issue=(code:string,message:string,corrections:PhysicalIssue['corrections']=[]):PhysicalIssue=>({code,message,corrections})
export function evaluatePhysicalReality(ctx:CompilationContext):PhysicalReality{
 const mode=ctx.phoneOnlyIlluminationMode||'OFF'
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const camera=shot?.mode||'front'
 const lighting=ctx.nightLightingId||'phone_screen_only'
 const issues:PhysicalIssue[]=[]
 const warnings:string[]=[]
 if(!['OFF','DARK_ROOM_REAR_FLASH_ONLY','DARK_ROOM_FRONT_SCREEN_ONLY'].includes(mode))
  issues.push(issue('INVALID_PHONE_MODE','وضع إضاءة الهاتف غير معروف.'))
 if(mode==='DARK_ROOM_REAR_FLASH_ONLY'&&(camera!=='mirror'||ctx.bedroomShotId!=='mirror_rear_flash'))
  issues.push(issue('REAR_MIRROR_REQUIRED','فلاش الهاتف فقط يتطلب لقطة المرآة بالكاميرا الخلفية.',[{label:'اختيار لقطة فلاش المرآة',patch:{bedroomShotId:'mirror_rear_flash',poseId:'standing'}}]))
 if(mode==='DARK_ROOM_FRONT_SCREEN_ONLY'&&camera!=='front')
  issues.push(issue('FRONT_SELFIE_REQUIRED','ضوء الشاشة فقط يتطلب تصويرًا أماميًا، لا تصوير المرآة أو المؤقت.',[{label:'إلغاء الوضع الصارم',patch:{phoneOnlyIlluminationMode:'OFF'}}]))
 if(mode!=='OFF'&&ctx.windowUncovered)
  warnings.push('النافذة مكشوفة في الإعدادات المحفوظة، لكن الوضع الصارم يفترض انعدام الضوء الخارجي؛ إذا كان الضوء يدخل فعليًا فلا يمكن إثبات حصرية الهاتف.')
 if(mode!=='OFF'&&isLaptopSelfieShot(ctx.bedroomShotId))issues.push(issue('LAPTOP_SCREEN_CONFLICT','لقطة اللابتوب الحالية تفترض شاشة مضاءة؛ اختر لقطة هاتف مستقلة لتفعيل حصرية الضوء.'))
 if(mode==='OFF'&&lighting==='laptop_screen_only'&&!isLaptopSelfieShot(ctx.bedroomShotId))
  issues.push(issue('LAPTOP_REQUIRED','ضوء اللابتوب يستلزم لقطة لابتوب حقيقية.'))
 const effectiveLightingId=mode==='DARK_ROOM_REAR_FLASH_ONLY'?'rear_flash':mode==='DARK_ROOM_FRONT_SCREEN_ONLY'?'phone_screen_only':lighting
 const active=new Set<EmitterId>(mode==='DARK_ROOM_REAR_FLASH_ONLY'?['phone_rear_led']:mode==='DARK_ROOM_FRONT_SCREEN_ONLY'?['phone_display']:(presets[effectiveLightingId]||[]))
 const physicalEmitters=(Object.keys(emitters) as EmitterId[]).map(id=>({...emitters[id],enabled:active.has(id)}))
 const effects=mode==='DARK_ROOM_REAR_FLASH_ONLY'?[
  'Only the actual rear LED fires during rear-camera mirror exposure. The phone display emits no scene light.',
  'Flash is aimed toward the existing wardrobe mirror. Reflected rays, real glass boundaries, hand and phone occlusion govern illumination of the photographer and room.',
  'Concentrated flash reflection can clip local detail. Specular glare and shadows follow actual paths; no uniformly bright face, distant background fill, hidden ambient and studio light.',
  'Existing bedding, tiles, skin and clothes respond only where flash rays and their physically credible reflected paths reach them. Unlit regions remain dark.'
 ]:mode==='DARK_ROOM_FRONT_SCREEN_ONLY'?[
  'Only the phone display emits light during a front-camera capture; the rear LED is switched off.',
  'Display emission travels outward from the actual screen toward the face. Orientation, brightness, distance and occlusion govern close-range soft light and eye reflections.',
  'Light diminishes rapidly down the neck and torso. Distant room surfaces stay dark unless reached by actual display emission and reflections from existing surfaces.',
  'Limited exposure, sensor grain and subdued highlights follow weak display illumination; no hidden ambient, ring light, studio source and bright background.'
 ]:[
  'Illumination is attributable only to enabled physical emitters and reflections from existing surfaces.',
  'Surface brightness, cast shadows, occlusion, specular response and exposure depend on real placement and material; do not add an independent fill emitter.'
 ]
 if(mode!=='OFF'&&physicalEmitters.filter(e=>e.enabled).length!==1)issues.push(issue('EXCLUSIVITY','يجب وجود مصدر هاتف واحد فقط.'))
 return {mode,effectiveLightingId,emitters:physicalEmitters,effects,issues,warnings,certainty:mode==='OFF'?'unknown':'estimated'}
}
/** Derived effective context: original user selections and stored lighting remain unchanged. */
export function effectivePhysicalContext(ctx:CompilationContext):CompilationContext{
 const result=evaluatePhysicalReality(ctx)
 return {...ctx,nightLightingId:result.effectiveLightingId}
}
export function renderPhysicalReality(ctx:CompilationContext):string{
 const state=evaluatePhysicalReality(ctx)
 const on=state.emitters.filter(e=>e.enabled)
 return ['PHYSICAL REALITY ENGINE V1:', 'Active physical emitters: '+on.map(e=>e.id+' at '+e.origin).join(', ')+'.',
  ...state.effects, 'No exact ray tracing, force values, geometry measurements and unseen furniture are asserted.'].join(' ')
}

/** A bounded safety check for free-form AI output. Does not claim full semantic verification. */
export function explicitUnauthorizedEmitter(text:string,mode:PhoneOnlyMode):string|null{
 if(mode==='OFF')return null
 const sources=/\b(?:ceiling lights?|ceiling leds?|ceiling fixtures?|bedside lamps?|room lamps?|window daylight|window light|streetlights?|laptop screens?|television screens?|decorative leds?|ring lights?|studio lights?|studio fill|ambient fill|hidden fill)\b/gi
 for(const hit of text.matchAll(sources)){
  const at=hit.index
  const prefix=text.slice(Math.max(0,at-55),at).split(/[.!?;\n]/).pop()||''
  const suffix=text.slice(at+hit[0].length,at+hit[0].length+65).split(/[.!?;\n]/)[0]
  if(/\b(?:no|without|not|exclude|forbid|never|off|inactive|disabled|unlit)\b/i.test(prefix)||
     /^\s*(?:is|are|remain|stay|switched|turned)?\s*(?:off|inactive|disabled|unlit|forbidden|excluded)\b/i.test(suffix))continue
  if(/\b(?:with|under|from|by|plus|using|and)\s+(?:an?\s+|the\s+)?$/i.test(prefix)||
     /^\s*(?:(?:is|are)\s+)?(?:on|active|lit|glowing|illuminating|illuminates|casts|shines|emits|provides|switched on|turned on)\b/i.test(suffix)||
     /\b(?:lit|illuminated|brightened)\s+by\s*$/i.test(prefix))return hit[0]
 }
 return null
}
