import type {CompilationContext} from '../domain/types'
import {bedroomShots} from '../data/bedroom-shots'
import {isLaptopSelfieShot} from '../data/laptop-selfie-physics'
import {isLightingPresetId,LIGHTING_EMITTER,LIGHTING_FRAGMENTS,physicalRealityText,type LightingOption} from '../../shared/lighting-decision'

export type EmitterId='ceiling'|'phone_rear_led'|'phone_display'|'laptop'
export type PhysicalEmitter={id:EmitterId;enabled:boolean;origin:string;direction:string;character:string;certainty:'known'|'estimated'|'unknown'}
export type PhysicalIssue={code:string;message:string;corrections:{label:string;patch:Partial<CompilationContext>}[]}
export type PhysicalReality={effectiveLightingId:LightingOption;emitters:PhysicalEmitter[];effects:string[];issues:PhysicalIssue[];warnings:string[];certainty:'known'|'estimated'|'unknown'}

const issue=(code:string,message:string,corrections:PhysicalIssue['corrections']=[]):PhysicalIssue=>({code,message,corrections})
export function evaluatePhysicalReality(ctx:CompilationContext):PhysicalReality{
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const capture=shot?.mode||'front'
 const lighting=ctx.nightLightingId||'phone_screen'
 const issues:PhysicalIssue[]=[]
 const warnings:string[]=[]
 if(!isLightingPresetId(lighting))
  issues.push(issue('UNKNOWN_LIGHTING_PREFERENCE','مصدر إضاءة غير معروف. اختر واحدًا من المصادر الأربعة الجديدة.'))
 if(ctx.windowUncovered)
  issues.push(issue('BLACKOUT_WINDOW','الغرفة يجب أن تكون معتمة تمامًا؛ لا يسمح بدخول أي ضوء من النافذة.',[{label:'إغلاق الستائر',patch:{windowUncovered:false}}]))
 if(lighting==='camera_flash'&&capture!=='mirror'&&capture!=='rear')
  issues.push(issue('FLASH_CAMERA_REQUIRED','الفلاش الخلفي يتطلب كاميرا خلفية أو تصوير مرآة.'))
 if(lighting==='phone_screen'&&capture==='rear')
  issues.push(issue('PHONE_SCREEN_REAR_CONFLICT','شاشة الهاتف لا يمكنها إضاءة شخص تصوره الكاميرا الخلفية من الجانب المقابل.'))
 if(lighting==='laptop_screen'&&!isLaptopSelfieShot(ctx.bedroomShotId))
  issues.push(issue('LAPTOP_REQUIRED','ضوء شاشة اللابتوب يحتاج وضعية فيها لابتوب مفتوح ومستقر.'))
 if(ctx.bedroomShotId==='mirror_rear_flash'&&lighting!=='camera_flash')
  issues.push(issue('MIRROR_FLASH_REQUIRED','وضعية فلاش المرآة تتطلب فلاش الكاميرا الخلفية.'))
 if(['curtain_shadows','door_light_strip','silhouette','half_light'].includes(ctx.bedroomShotId||''))
  issues.push(issue('BLACKOUT_SHOT_CONFLICT','هذه الوضعية تفترض إضاءة إضافية لا تتفق مع الغرفة المظلمة؛ اختر وضعية أخرى.'))
 const emitters:PhysicalEmitter[]=(Object.keys(LIGHTING_EMITTER) as LightingOption[]).map(source=>{
  const e=LIGHTING_EMITTER[source]
  return {id:e.id as EmitterId,enabled:lighting===source,origin:e.origin,direction:e.direction,
   character:'Finite single-source falloff and occlusion',certainty:source==='led_spotlight'?'estimated':'known'}
 })
 if(emitters.filter(e=>e.enabled).length!==1)
  issues.push(issue('SINGLE_LIGHT_REQUIRED','يجب تحديد مصدر إضاءة واحد فقط.'))
 if(lighting==='led_spotlight'&&!ctx.roomReferencePresent)
  warnings.push('موضع سبوت السقف غير موثّق بصورة غرفة؛ لا يجوز اختراع مكانه أو قياسه.')
 return {effectiveLightingId:lighting,emitters,
  effects:isLightingPresetId(lighting)?[LIGHTING_FRAGMENTS[lighting]]:[],
  issues,warnings,certainty:'estimated'}
}
/** The user selection is the sole authority: never replace it behind the UI. */
export function effectivePhysicalContext(ctx:CompilationContext):CompilationContext{
 return {...ctx}
}
export function renderPhysicalReality(ctx:CompilationContext):string{
 const selected=ctx.nightLightingId||'phone_screen'
 if(!isLightingPresetId(selected))throw Error('UNKNOWN_LIGHTING_PREFERENCE')
 return physicalRealityText(selected)
}

/** A bounded safety check for free-form AI output. Does not claim full semantic verification. */
export function explicitUnauthorizedEmitter(text:string,selectedLight:LightingOption):string|null{
 const sources=/\b(?:ceiling lights?|ceiling leds?|ceiling fixtures?|ceiling spotlight|led spotlight|bedside lamps?|room lamps?|window daylight|window light|daylight|streetlights?|laptop screens?|laptop display|phone screens?|smartphone screens?|camera flash|rear flash|rear led|television screens?|decorative leds?|ring lights?|studio lights?|studio fill|ambient fill|ambient light|hidden fill)\b/gi
 for(const hit of text.matchAll(sources)){
  const found=hit[0].toLowerCase()
  if(selectedLight==='led_spotlight'&&/^(?:ceiling light|ceiling led|ceiling fixture|ceiling spotlight|led spotlight)$/.test(found))continue
  if(selectedLight==='camera_flash'&&/^(?:camera flash|rear flash|rear led)$/.test(found))continue
  if(selectedLight==='phone_screen'&&/^(?:phone screen|smartphone screen)$/.test(found))continue
  if(selectedLight==='laptop_screen'&&/^(?:laptop screen|laptop display)$/.test(found))continue
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
