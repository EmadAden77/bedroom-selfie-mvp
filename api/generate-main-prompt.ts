/**
 * Gemini is a constrained language/layout editor, not a scene designer.
 * All final English facts come byte-for-byte from the locally compiled scene.
 * Keep this serverless module self-contained (Vercel Node ESM cannot import src/).
 */
export const MAX_SCENE_REQUEST_BYTES=220000
export const MAX_SCENE_BRIEF_CHARS=12000 // legacy public constant
export const MAX_SCENE_CONSTRAINTS=100
export const MAX_SCENE_FACT_CHARS=20000

export type ImagePromptTarget='gemini'|'chatgpt'|'flux'|'midjourney'
type CaptureMode='front'|'mirror'|'rear'|'timer'
type Category='identity'|'hair'|'expression'|'clothing'|'action'|'room'|'mirror'|'lighting'|'camera'|'materials'
type Fact={id:string;category:Category;content:string}
type Selection={
 shotId:string;captureMode:CaptureMode;posture:string;lightingId:string;ownPortrait:boolean;
 hairVariantId:string;hairstyleMode:string;expressionVariantId:string;
 upperGarmentId:string;lowerGarmentId:string|null;upperColor:string;lowerColor:string|null;
 faceDirection:string;mirrorMovement:string;mirrorGaze:string;
 roomState:{order:string;surface:string;zones:string[];sessionLocked:boolean}|null
}
export type TrustedSceneSpecification={
 version:1;source:'validated_local_compiler';selections:Selection
 references:{subject:'reference_declared_unseen'|'not_provided';room:'reference_declared_unseen'|'not_provided'}
 derived:{
  recordingCamera:'front'|'rear'|'supported';mirrorSurface:'wardrobe_plane'|'none';
  bodySupport:'floor'|'bed'|'selected_pose';actualLightSource:string;naturalSceneDirection:string
 }
 constraints:Fact[];mandatoryConstraintIds:string[];unspecified:string[];conflicts:string[]
}
const categories:readonly Category[]=['identity','hair','expression','clothing','action','room','mirror','lighting','camera','materials']
export const IMAGE_TARGET_GUIDANCE:Record<ImagePromptTarget,string>={
 gemini:'Format a clear, readable prompt for Gemini / Imagen without altering any scene facts.',
 chatgpt:'Format a clear, readable prompt for ChatGPT / GPT Image without altering selected reference identity, visible hair styling, clothing or scene mechanics.',
 flux:'Format clear photographic instructions for FLUX without changing any supplied constraints.',
 midjourney:'Format clear photographic instructions for Midjourney; do not add flags or creative scene details.'
}
export const PROMPT_EDITOR_SYSTEM=[
 'You are a CONSTRAINED PROMPT EDITOR, not an image scene creator. The app has ALREADY resolved identity, anatomy, camera, light, room, real mirror optics, furniture, materials, physical support and daily clutter.',
 'You receive the user selections, declared but unseen references, derived physics and a full set of MANDATORY locally compiled English facts. Never replace, invent, paraphrase away, weaken or change any fact, actor, clothing, color, light, viewpoint, body pose, object position or reference-bound uncertainty.',
 'Allowed edit operations: reorder the fact IDs WITHIN their importance category; choose either paragraph separation or compact lines. This provides clearer structured English presentation without losing constraints. All facts are already correctly written by the local engine. Return IDs only; DO NOT produce creative prose, rewritten fact text, new objects or a separate prompt.',
 'Semantic integrity is PROVEN by rendering only trusted source fact contents after independently validating the proposed exact permutation. Do not remove even apparently repeated facts: local compiler has already deduplicated guards. Never substitute a more aesthetic pose or an unseen fixture.',
 'The selected clothing, original reference face and hair, weight-bearing body position, capture lens and fixed wardrobe mirror are immutable. MIRROR MECHANICS HARD CONSTRAINT: one rear-camera phone held with reachable grip, fixed wardrobe mirror plane, correct reflected sightlines and body support; any flash must be exactly the selected physical source.',
 'A declared reference photo was NOT visually inspected by this text editor. Do not assert that an unseen person/room detail was verified. If a scene is incomplete or contradictory, do not fix it by improvising; invalid scenes are rejected upstream before you are called.',
 'Return exactly JSON {orderedConstraintIds:[...],layout:"paragraphs"|"compact"}. Include every mandatory ID exactly once, arranged so priority categories remain identity, hair, expression, clothing, action, room, mirror, lighting, camera, materials. No other fields.'
].join('\n')
/** Alias retained for the external mirror-regression tests; it is NOT creative-writing guidance. */
export const PHYSICS_ONLY_SYSTEM=PROMPT_EDITOR_SYSTEM
export const MAIN_PROMPT_SCHEMA={
 type:'object',
 properties:{
  orderedConstraintIds:{type:'array',items:{type:'string'}},
  layout:{type:'string',enum:['paragraphs','compact']}
 },
 required:['orderedConstraintIds','layout'],additionalProperties:false
} as const

const fail=(errorCode:string,error:string,status=502)=>reply({errorCode,error},status)
const reply=(value:Record<string,unknown>,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
})
const code=(v:unknown)=>typeof v==='string'&&v.length<=100&&/^[a-zA-Z0-9_-]*$/.test(v)
function categoryOf(id:string):Category{
 if(id.includes('identity')||id==='reference_identity')return 'identity'
 if(id.includes('hair'))return 'hair'
 if(id.includes('expression')||id.includes('gaze'))return 'expression'
 if(id.startsWith('upper_')||id.startsWith('lower_')||id.includes('clothing'))return 'clothing'
 if(id==='local_natural_scene_director'||id.includes('shot_')||id.includes('body_pose')||id==='pose_interaction'||id.includes('laptop_selfie'))return 'action'
 if(id.includes('bedroom_environment')||id.includes('background_continuity')||id.includes('room_state')||id.includes('clutter'))return 'room'
 if(id.includes('mirror'))return 'mirror'
 if(id.includes('light'))return 'lighting'
 if(id.includes('camera'))return 'camera'
 return 'materials'
}
function physicalSceneErrors(s:TrustedSceneSpecification):string[]{
 const e:string[]=[]
 const p=s.selections,d=s.derived
 if(s.conflicts.length)e.push('unresolved_local_conflicts')
 if(!p.ownPortrait&&s.constraints.some(x=>x.id==='body_pose_physics'&&/193 cm|83 kg/.test(x.content)))e.push('personal_body_profile_transfer')
 if(p.captureMode==='mirror'&&(d.recordingCamera!=='rear'||d.mirrorSurface!=='wardrobe_plane'))e.push('mirror_camera_geometry')
 if(p.captureMode!=='mirror'&&d.mirrorSurface!=='none')e.push('extraneous_mirror')
 if(p.captureMode==='front'&&d.recordingCamera!=='front')e.push('front_camera_geometry')
 if(p.captureMode==='timer'&&d.recordingCamera!=='supported')e.push('timer_camera_support')
 if(p.captureMode==='rear'&&d.recordingCamera!=='rear')e.push('rear_camera_geometry')
 if(p.lightingId==='rear_flash'&&!['mirror','rear'].includes(p.captureMode))e.push('rear_flash_capture')
 if(p.lightingId==='phone_screen_only'&&p.captureMode==='rear')e.push('rear_screen_conflict')
 if(p.lightingId==='laptop_screen_only'&&!p.shotId.startsWith('laptop_'))e.push('laptop_light_without_laptop')
 if(p.shotId==='mirror_rear_flash'&&p.lightingId!=='rear_flash')e.push('missing_selected_flash')
 if(d.actualLightSource!==p.lightingId)e.push('light_source_changed')
 const expectedSupport=p.posture==='seated_bed'?'bed':p.posture==='standing'||p.posture==='seated_floor'?'floor':'selected_pose'
 if(d.bodySupport!==expectedSupport)e.push('body_support_changed')
 if(p.roomState?.sessionLocked&&!s.constraints.some(x=>x.id==='physical_room_state'&&x.content.includes('SESSION CONTINUITY:')))e.push('session_continuity_missing')
 if(p.captureMode==='mirror'&&!s.constraints.some(x=>x.id==='mirror_composition'&&x.content.includes('MIRROR OPTICS AND BIOMECHANICS CONTRACT')))e.push('mirror_physics_missing')
 if(!s.constraints.some(x=>x.id==='camera_physics'))e.push('camera_physics_missing')
 if(!s.constraints.some(x=>x.id==='light_pose_geometry'))e.push('light_geometry_missing')
 if(!s.constraints.some(x=>x.id==='bedroom_environment_lock'))e.push('bedroom_reference_missing')
 if(!s.constraints.some(x=>x.id==='local_natural_scene_director'&&x.content===d.naturalSceneDirection))e.push('director_changed')
 return e
}
export function validateSceneSpecification(value:unknown):TrustedSceneSpecification{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('SCENE_SPEC_INVALID')
 const v=value as Record<string,any>
 if(v.version!==1||v.source!=='validated_local_compiler'||!v.selections||!v.references||!v.derived||!Array.isArray(v.constraints)||!Array.isArray(v.mandatoryConstraintIds)||!Array.isArray(v.unspecified)||!Array.isArray(v.conflicts))throw Error('SCENE_SPEC_INVALID')
 if(v.constraints.length<10||v.constraints.length>MAX_SCENE_CONSTRAINTS)throw Error('SCENE_FACT_COUNT')
 if(v.constraints.some((x:any)=>!x||!code(x.id)||!categories.includes(x.category)||x.category!==categoryOf(x.id)||typeof x.content!=='string'||x.content.trim().length<12||x.content.length>MAX_SCENE_FACT_CHARS))throw Error('SCENE_FACT_INVALID')
 const ids=v.constraints.map((x:Fact)=>x.id)
 if(new Set(ids).size!==ids.length||v.mandatoryConstraintIds.length!==ids.length||v.mandatoryConstraintIds.some((x:unknown,i:number)=>x!==ids[i]))throw Error('SCENE_MANDATORY_IDS')
 const p=v.selections as Selection
 if(typeof p.ownPortrait!=='boolean'||!['front','mirror','rear','timer'].includes(p.captureMode)||![p.shotId,p.posture,p.lightingId,p.hairVariantId,p.hairstyleMode,p.expressionVariantId,p.upperGarmentId,p.faceDirection,p.mirrorMovement,p.mirrorGaze].every(code)||
  typeof p.upperColor!=='string'||p.upperColor.length>100||!(p.lowerGarmentId===null||code(p.lowerGarmentId))||!(p.lowerColor===null||typeof p.lowerColor==='string'))throw Error('SCENE_SELECTIONS')
 if(p.roomState&&(!Array.isArray(p.roomState.zones)||p.roomState.zones.some(x=>!['bed','floor','dresser','nightstand'].includes(x))||typeof p.roomState.sessionLocked!=='boolean'))throw Error('SCENE_ROOM_STATE')
 if(!['reference_declared_unseen','not_provided'].includes(v.references.subject)||!['reference_declared_unseen','not_provided'].includes(v.references.room))throw Error('SCENE_REFERENCE_FLAGS')
 if(!Array.isArray(v.unspecified)||v.unspecified.some((x:unknown)=>typeof x!=='string')||v.conflicts.some((x:unknown)=>typeof x!=='string'))throw Error('SCENE_UNKNOWN_FLAGS')
 const s=v as TrustedSceneSpecification
 if(physicalSceneErrors(s).length)throw Error('SCENE_PHYSICS_CONFLICT:'+physicalSceneErrors(s).join(','))
 return s
}
export function approvedPromptFromPlan(spec:TrustedSceneSpecification,modelJson:unknown):{prompt:string;order:string[];layout:'paragraphs'|'compact'}{
 if(!modelJson||typeof modelJson!=='object'||Array.isArray(modelJson))throw Error('EDITOR_SCHEMA')
 const response=modelJson as Record<string,unknown>
 if(Object.keys(response).sort().join(',')!=='layout,orderedConstraintIds'||
  !Array.isArray(response.orderedConstraintIds)||!['paragraphs','compact'].includes(String(response.layout)))throw Error('EDITOR_SCHEMA')
 const order=response.orderedConstraintIds
 const canonical=new Map(spec.constraints.map(x=>[x.id,x]))
 if(order.length!==canonical.size||new Set(order).size!==order.length||order.some(id=>typeof id!=='string'||!canonical.has(id)))throw Error('EDITOR_CONSTRAINT_MUTATION')
 let previous=-1
 for(const id of order as string[]){
  const rank=categories.indexOf(canonical.get(id)!.category)
  if(rank<previous)throw Error('EDITOR_PRIORITY_CONFLICT')
  previous=rank
 }
 const layout=response.layout as 'paragraphs'|'compact'
 // The semantic checker is a proof-preserving renderer: 100% of the
 // selected source facts, 0 free-text generated claims. Regex alone cannot
 // verify paraphrase entailment, so unproven paraphrases are not accepted.
 const prompt=(order as string[]).map(id=>canonical.get(id)!.content.trim()).join(layout==='compact'?'\n':'\n\n')
 return {prompt,order:order as string[],layout}
}
export function validatePhysicalPrompt(prompt:string,context:{mode:string;lighting:string}):void{
 // Legacy secondary diagnostic only; approval uses approvedPromptFromPlan above.
 if(context.mode==='mirror'&&/\b(?:front-camera mirror selfie|mirror selfie captured with the front camera|mirror selfie (?:captured|taken|shot|photographed) (?:using|with|on) (?:the )?front(?:-facing)? camera)\b/i.test(prompt))throw Error('mirror_front_camera_conflict')
 if(context.mode==='mirror'&&!/mirror|reflection/i.test(prompt))throw Error('missing_mirror')
}
const requests=new Map<string,{count:number;until:number}>()
function allowBurst(req:Request){
 const now=Date.now()
 const ip=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'anonymous').split(',')[0].trim().slice(0,80)
 const x=requests.get(ip)
 if(!x||x.until<=now){
  if(requests.size>2000)for(const [k,v] of requests)if(v.until<=now)requests.delete(k)
  requests.set(ip,{count:1,until:now+60000});return true
 }
 if(x.count>=6)return false
 x.count++;return true
}
export default {
 async fetch(request:Request):Promise<Response>{
  if(request.method!=='POST')return reply({error:'POST only'},405)
  const origin=request.headers.get('origin')
  if(origin&&origin!==new URL(request.url).origin)return fail('ORIGIN_REJECTED','تم رفض مصدر الطلب.',403)
  const site=request.headers.get('sec-fetch-site')
  if(site&&!['same-origin','none'].includes(site))return fail('CROSS_SITE','لا يمكن استخدام هذا المسار من موقع مختلف.',403)
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))return fail('JSON_REQUIRED','نوع البيانات غير صحيح.',415)
  if(Number(request.headers.get('content-length')||0)>MAX_SCENE_REQUEST_BYTES)return fail('TOO_LARGE','حجم مواصفات المشهد يتجاوز الحد.',413)
  let requestData:unknown
  try{
   const raw=await request.text()
   if(new TextEncoder().encode(raw).length>MAX_SCENE_REQUEST_BYTES)return fail('TOO_LARGE','حجم مواصفات المشهد يتجاوز الحد.',413)
   requestData=JSON.parse(raw)
  }catch{return fail('BAD_JSON','تعذر قراءة الطلب.',400)}
  if(!requestData||typeof requestData!=='object'||Array.isArray(requestData))return fail('INVALID_SELECTION','مواصفات المشهد غير متاحة.',400)
  const data=requestData as Record<string,unknown>
  if(!Object.prototype.hasOwnProperty.call(data,'sceneSpecification'))return fail('SCENE_SPEC_REQUIRED','يجب اعتماد مشهد محلي قبل استدعاء المحرر.',400)
  let spec:TrustedSceneSpecification
  try{spec=validateSceneSpecification(data.sceneSpecification)}
  catch(err){return fail('SCENE_SPEC_CONFLICT','مواصفات المشهد المحلي غير صالحة: '+(err instanceof Error?err.message:'SCENE'),422)}
  const target=data.target
  if(typeof target!=='string'||!['gemini','chatgpt','flux','midjourney'].includes(target))return fail('INVALID_TARGET','نموذج الصور المستهدف غير صالح.',400)
  const key=process.env.GEMINI_API_KEY
  if(!key)return fail('GEMINI_NOT_CONFIGURED','مفتاح Gemini غير متاح على الخادم.',503)
  if(!allowBurst(request))return fail('GEMINI_RATE_LIMIT','طلبات كثيرة؛ أعد المحاولة بعد دقيقة.',429)
  const model=process.env.GEMINI_MAIN_MODEL||'gemini-3.5-flash-lite'
  if(!/^[a-zA-Z0-9._-]{3,80}$/.test(model))return fail('MODEL_CONFIG','إعداد النموذج غير صالح.',503)
  const genRequest={
   systemInstruction:{parts:[{text:PROMPT_EDITOR_SYSTEM+'\n'+IMAGE_TARGET_GUIDANCE[target as ImagePromptTarget]}]},
   contents:[{role:'user',parts:[{text:JSON.stringify({
    validatedSceneSpecification:spec,
    task:'Reorder only the locally approved fact IDs within the existing importance ranks. Choose a line/paragraph layout. Do not write any scene prose.'
   })}]}],
   generationConfig:{temperature:0,maxOutputTokens:1700,responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:MAIN_PROMPT_SCHEMA}}}
  }
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},
    body:JSON.stringify(genRequest),signal:AbortSignal.timeout(30000)
   })
   if(!response.ok){
    console.warn('[Gemini constrained editor] upstream HTTP',response.status)
    if(response.status===429)return fail('GEMINI_QUOTA','وصلت إلى حصة Google المتاحة.',429)
    if([401,403].includes(response.status))return fail('GEMINI_ACCESS','Google رفضت صلاحيات مفتاح Gemini.')
    if(response.status===404)return fail('GEMINI_MODEL','النموذج غير متاح.')
    return fail('GEMINI_UPSTREAM','تعذر تنفيذ التحرير لدى Gemini.')
   }
   const raw=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>}
   const modelText=raw.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||''
   let edited:{prompt:string;order:string[];layout:'paragraphs'|'compact'}
   try{edited=approvedPromptFromPlan(spec,JSON.parse(modelText.trim()))}
   catch(err){
    console.warn('[Gemini constrained editor] rejected model plan',err instanceof Error?err.message:'unknown')
    return fail('GEMINI_CONSTRAINT_VIOLATION','لم يُعتمد تحرير Gemini لأنه غيّر قيود المشهد أو ترتيب الأولوية.',422)
   }
   return reply({prompt:edited.prompt,source:'gemini_editor',validated:true,order:edited.order,layout:edited.layout,model})
  }catch(err){
   const timeout=(err as Error)?.name==='TimeoutError'||(err as Error)?.name==='AbortError'
   console.warn('[Gemini constrained editor] network',timeout?'TIMEOUT':'NETWORK')
   return fail(timeout?'GEMINI_TIMEOUT':'GEMINI_NETWORK',timeout?'انتهت مهلة Gemini.':'تعذر الاتصال بـGemini.',timeout?504:502)
  }
 }
}
