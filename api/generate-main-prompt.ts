/**
 * Gemini is the independent final prompt author. The local compiler is a separate
 * offline fallback, not a hidden source of mandatory text appended to Gemini.
 * Text-only scene choices are shared; no uploaded reference images leave this UI.
 */
type MainPayload = {
 sceneBrief?:unknown;shotId?:unknown;mode?:unknown;posture?:unknown;lighting?:unknown;target?:unknown
}
type ShotContext = {mode:string;lighting:string}
export type ImagePromptTarget = 'gemini'|'chatgpt'|'flux'|'midjourney'
export const IMAGE_TARGET_GUIDANCE:Record<ImagePromptTarget,string>={
 gemini:'Write a natural flowing image-generation prompt for Gemini / Imagen.',
 chatgpt:'Write direct, visually clear instructions for ChatGPT / GPT Image. When Hair styling says APPLY, explicitly describe the selected new arrangement of existing strands as visibly different from the reference hairstyle, with unchanged facial identity, true hairline, natural density, length and texture. The reference determines hair identity, not the old strand layout. When PRESERVE is selected, retain the reference strand arrangement.',
 flux:'Write concrete, positive descriptive photography prose for FLUX without synthetic keyword piles.',
 midjourney:'Write coherent photographic prose for Midjourney. Do not invent command-line flags or aspect ratios.'
}

export const PHYSICS_ONLY_SYSTEM = [
 'You are an independent, imaginative professional photorealistic selfie prompt writer.',
 'Apply Ghalyon BASIC strategy: understand the selected photographic intent, diagnose missing essentials and contradictory instructions, preserve verified scene constraints, and deliver a succinct complete prompt without asking questions. DETAIL clarification for freeform requests is handled by the separate Ghalyon optimizer.',
 'Write the FINAL image prompt yourself. You have creative freedom over composition, micro-action, framing, background details, wording, everyday imperfections and stylistic storytelling.',
 'Treat the incoming scene brief as the user selections and available reference context, not a template to copy verbatim. Honor deliberately selected garments, posture, camera mechanism and real reference subject/room when a reference is supplied; otherwise make interesting creative choices.',
 'Do NOT copy, append, reconstruct or mention the old local engine, mandatory locks, identity engine, room guard, anti-AI lists or long rule catalogues. Do not add section labels, meta-instructions, quality-tag lists or repetitive constraints. Your entire output is one self-sufficient English image prompt.',
 'The governing PHOTOGRAPHIC CONSTRAINTS are real-world PHYSICAL, OPTICAL, ANATOMICAL AND MECHANICAL PLAUSIBILITY: believable gravity, weight, balance, joint range, hands and phone grip, fabric tension, bedding compression only at contact, coherent mirror ray paths, single physical camera viewpoint, natural shadows, real light sources, sensible exposure and camera perspective.',
 'Creative freedom describes photographic composition and wording; always comply with the image-generation provider\'s ordinary content safety policies. Do not attempt to bypass safety filters or moderation.',
 'NATURAL SCENE DIRECTOR: Lead with the actual selected action, not a generic static pose. Add only activity-caused realism: bedding indentation at real load points, authentic garment folds, natural grip and slight imperfect handheld framing. Keep background elements and accessories compatible with what the chosen bedroom crop really contains. Do not import generic gym, street or car styling, extra products, makeup, new freckles, false sweat, added jewelry or extra hair into this bedroom scene. Selected expression and reference face take priority over generic playful smiles. A normal unflipped mirror reverses printed text; never demand forward-reading mirrored logos or lettering. Scene details must obey the selected camera, light sources, object support and real room reference.',
 'For a mirror selfie, the phone rear camera must face the real mirror; the screen faces the subject; the visible reflection must have valid lines of sight and no duplicated cameras or limbs.',
 'For a selected bedroom wardrobe mirror capture, preserve the same fixed RIGHT-wall sliding reflective panel, LEFT-wall bed and RIGHT-front dresser. Apply the selected free-hand gesture, phone height, distance, framing and gaze together without overriding any pose-specific hand occupancy, stance, sightline or real light source.',
 'When a MIRROR capture selects rear_flash, the recording phone\'s own rear LED points into the glass. Follow the LED-to-mirror-to-subject reflected beam, including real shadow occlusion and falloff. Localized clipping, bloom and glass marks occur only where physically plausible; a visible flash hotspot belongs near the geometrically reflected LED and rear camera module, never at an arbitrary mirror center. Do not force high ISO, an evenly lit face, an impossible hard wall shadow or fabricated skin pores.',
 'Hair styling has two independent modes. PRESERVE means keep the reference hairstyle and its strand arrangement. APPLY means deliberately restyle only existing strands into the user-selected visible direction, grouping and silhouette. Identity preservation locks the face, skull, hairline, temple recession, available length, density, fiber texture and color, NOT the original arrangement of strands. Do not dilute or silently discard an APPLY choice. Respect selected direction, volume and texture within the reference limits.',
 'If a user selects lived-in clutter, depict an ordinary untidy room by arranging believable folds in existing bedding and a few naturally supported loose everyday objects only where visible. Preserve the authoritative room topology, wardrobe mirror, original furniture, item identities and true floor material. Do not force a half-open closet, added furniture, watermarks, fictional dirt, front-camera optics, daylight, warm lamps, additional sources or artificial blur against the chosen scene and light.',
 'For a selected laptop selfie, describe exactly one genuinely supported laptop whose keyboard and display connect through a real hinge. Anchor its base to the chosen thighs, bed, floor, rug or existing dresser and keep genuine contact, support, hand occupancy, screen orientation, face direction and one camera viewpoint. A handheld phone occupies one hand so only the free hand can interact with the laptop; timer captures need a stable separate phone support. The selected laptop-screen lighting illuminates the subject only if that light preset is chosen. Do not fabricate an extra lamp, ghost laptop, readable fake GUI, floating device or physically impossible reflections.',
 'For a timer/self-supported capture, the device needs real support rather than a hovering imaginary photographer. A handheld selfie needs a reachable arm and realistic grip.',
 'Light must have a real emitting or reflecting source. If the chosen lighting is screen-only, no ceiling/daylight/extra lamps may light the scene. Sensor noise and autoexposure may vary within physical limits.',
 'Describe visually plausible observable facts and camera processing, not fantasy physics. Be creative, specific, human and natural. Do not fabricate unsupported numerical lens specifications.',
 'If the brief says a reference photo will accompany image generation, tell the image model to use that provided reference naturally for the person or room, but you do not receive image files and must not claim to have viewed them.',
 'Output one JSON object with exactly one property, prompt, containing a complete self-contained English photographic prompt of approximately 100-350 words. No external explanation.'
].join('\n')

export const MAIN_PROMPT_SCHEMA={
 type:'object',
 properties:{prompt:{type:'string',description:'Complete, creative, coherent English photo-generation prompt; physics, optics, mechanics and anatomy must be realistic.'}},
 required:['prompt'],
 additionalProperties:false
} as const

const respond=(value:Record<string,unknown>,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
})
const fail=(code:string,error:string,status=502)=>respond({errorCode:code,error},status)
const isCode=(value:unknown)=>typeof value==='string'&&value.length<=90&&/^[a-zA-Z0-9_-]*$/.test(value)
const requests=new Map<string,{count:number;until:number}>()
const allowBurst=(req:Request)=>{
 const now=Date.now()
 const ip=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'anonymous').split(',')[0].trim().slice(0,80)
 const r=requests.get(ip)
 if(!r||r.until<=now){
  if(requests.size>2000){for(const [key,x] of requests)if(x.until<=now)requests.delete(key)}
  requests.set(ip,{count:1,until:now+60000});return true
 }
 if(r.count>=6)return false
 r.count++;return true
}

export const validatePhysicalPrompt=(prompt:string,context:ShotContext):void=>{
 if(/\b(?:floating (?:phone|camera)|levitating (?:phone|camera)|third (?:arm|hand)|extra (?:arm|hand)|disconnected (?:arm|hand)|impossible reflection|reflection without a mirror|gravity[- ]defying|light without a source)\b/i.test(prompt)){
  throw Error('mechanically_impossible')
 }
 if(context.mode==='mirror'&&!/\b(?:mirror|reflection|reflective wardrobe)\b/i.test(prompt)){
  throw Error('missing_mirror')
 }
 if(context.mode==='mirror'&&/\b(?:unreversed|unmirrored|forward[- ]facing|forward[- ]reading)\s+(?:text|writing|lettering|logo)\b/i.test(prompt)){
  throw Error('mirror_text_conflict')
 }
 if(context.mode==='mirror'&&/\b(?:text|writing|lettering|logo)\s+(?:appears|is|reads)\s+(?:perfectly\s+)?(?:unreversed|unmirrored|forward[- ]facing)\b/i.test(prompt)){
  throw Error('mirror_text_conflict')
 }
 if(context.mode==='mirror'&&context.lighting==='rear_flash'&&!/\b(?:flash|LED)\b/i.test(prompt)){
  throw Error('missing_rear_flash')
 }
 if(context.mode==='timer'&&/\b(?:handheld selfie|holding the recording phone|phone held in (?:his|her|their) hand)\b/i.test(prompt)){
  throw Error('timer_grip_conflict')
 }
 if(['phone_screen_only','laptop_screen_only'].includes(context.lighting)&&/\b(?:ceiling lights? (?:illuminat(?:e|es)|lit)|daylight (?:illuminat(?:e|es)|fills)|sunlight (?:floods|fills)|lamp (?:illuminat(?:e|es)|lights up)|softbox (?:illuminat(?:e|es)|lights up)|window light (?:fills|falls|streams|illuminates)|warm lamp glow (?:fills|falls|illuminates))\b/i.test(prompt)){
  throw Error('screen_light_conflict')
 }
 if(/\b(?:invisible (?:lamp|light source)|physically impossible|impossible camera angle)\b/i.test(prompt)){
  throw Error('unphysical_source')
 }
}

export const assembleCreativePrompt=(modelText:string,context:ShotContext):string=>{
 let output:unknown
 try{output=JSON.parse(modelText.replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'').trim())}
 catch{throw Error('model_format')}
 if(!output||typeof output!=='object'||Array.isArray(output))throw Error('model_format')
 const data=output as Record<string,unknown>
 if(Object.keys(data).join(',')!=='prompt'||typeof data.prompt!=='string')throw Error('model_schema')
 const prompt=data.prompt.trim()
 if(prompt.length<120||prompt.length>8500)throw Error('prompt_length')
 if(/<script|api[_ -]?key|system prompt|BEGIN PRIVATE KEY/i.test(prompt))throw Error('unsafe_output')
 validatePhysicalPrompt(prompt,context)
 return prompt
}

export default {
 async fetch(request:Request):Promise<Response>{
  if(request.method!=='POST')return respond({error:'POST only'},405)
  const origin=request.headers.get('origin')
  if(origin&&origin!==new URL(request.url).origin)return fail('ORIGIN_REJECTED','تم رفض مصدر الطلب.',403)
  const site=request.headers.get('sec-fetch-site')
  if(site&&!['same-origin','none'].includes(site))return fail('CROSS_SITE','لا يمكن استدعاء المحرك من موقع مختلف.',403)
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))return fail('JSON_REQUIRED','نوع البيانات غير صحيح.',415)
  if(Number(request.headers.get('content-length')||'0')>10000)return fail('TOO_LARGE','حجم الطلب كبير.',413)
  const key=process.env.GEMINI_API_KEY
  if(!key)return fail('GEMINI_NOT_CONFIGURED','مفتاح Gemini غير متاح على الخادم.',503)
  let payload:MainPayload
  try{payload=await request.json() as MainPayload}catch{return fail('BAD_JSON','تعذر قراءة الطلب.',400)}
  const {sceneBrief,shotId,mode,posture,lighting,target}=payload
  if(typeof sceneBrief!=='string'||sceneBrief.trim().length<50||sceneBrief.length>6500||
     ![mode,posture,lighting,shotId,target].every(isCode)||
     !['front','mirror','rear','timer'].includes(String(mode))||
     !['gemini','chatgpt','flux','midjourney'].includes(String(target))){
   return fail('INVALID_SELECTION','الخيارات أو وصف المشهد غير صالح.',400)
  }
  if(!allowBurst(request))return fail('GEMINI_RATE_LIMIT','طلبات كثيرة من نفس الشبكة. أعد المحاولة بعد دقيقة.',429)
  const model=process.env.GEMINI_MAIN_MODEL||'gemini-3.5-flash-lite'
  if(!/^[a-zA-Z0-9._-]{3,80}$/.test(model))return fail('MODEL_CONFIG','إعداد النموذج غير صالح.',503)
  const system=PHYSICS_ONLY_SYSTEM+'\n\n'+IMAGE_TARGET_GUIDANCE[target as ImagePromptTarget]
  const genRequest={
   systemInstruction:{parts:[{text:system}]},
   contents:[{role:'user',parts:[{text:JSON.stringify({
     selectedSceneBrief:sceneBrief,
     captureMode:mode,posture,shotId,lighting,target,
     request:'Create one independent creative photographic image prompt. Follow physical, mechanical and optical realism only; do not append the local fallback text.'
   })}]}],
   generationConfig:{
    temperature:0.85,maxOutputTokens:2600,
    responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:MAIN_PROMPT_SCHEMA}}
   }
  }
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},
    body:JSON.stringify(genRequest),signal:AbortSignal.timeout(30000)
   })
   if(!response.ok){
    console.warn('[Gemini creative] upstream HTTP',response.status)
    if(response.status===429)return fail('GEMINI_QUOTA','وصلت إلى حصة Google المتاحة.',429)
    if([401,403].includes(response.status))return fail('GEMINI_ACCESS','Google رفضت صلاحيات مفتاح Gemini.')
    if(response.status===404)return fail('GEMINI_MODEL','النموذج غير متاح.')
    return fail('GEMINI_UPSTREAM','تعذر تنفيذ الطلب لدى Google.')
   }
   const raw=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>}
   const text=raw.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||''
   let prompt:string
   try{prompt=assembleCreativePrompt(text,{mode:String(mode),lighting:String(lighting)})}
   catch{return fail('GEMINI_VALIDATION','تعذر قبول الوصف بسبب تنسيق الرد أو تعارض في الفيزياء أو ميكانيكا التصوير. أعد المحاولة.',422)}
   return respond({prompt,source:'gemini',model})
  }catch(error){
   const timedOut=(error as Error)?.name==='TimeoutError'||(error as Error)?.name==='AbortError'
   console.warn('[Gemini creative] request failure',timedOut?'TIMEOUT':'NETWORK')
   return fail(timedOut?'GEMINI_TIMEOUT':'GEMINI_NETWORK',timedOut?'انتهت مهلة Gemini.':'تعذر الاتصال بـGemini.',timedOut?504:502)
  }
 }
}
