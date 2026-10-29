/**
 * Passwordless primary Gemini prompt writer for a single-owner, publicly reachable app.
 * Google receives only text specifications, never uploaded subject/room photos.
 * Immutable local physics/identity text remains authoritative in the result.
 * This is not user authentication. Protect costs with Vercel WAF per-IP rate limits.
 */
type MainPayload = {basePrompt?:unknown;shotId?:unknown;mode?:unknown;posture?:unknown;lighting?:unknown;target?:unknown}
type ModelOutput = {scene?:unknown;camera?:unknown;naturalism?:unknown}
const reply=(data:Record<string,unknown>,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}
})
const fail=(code:string,error:string,status=502)=>reply({errorCode:code,error},status)
export const sanitizeMainSections=(value:unknown):ModelOutput=>{
 if(typeof value!=='object'||value===null)throw Error('model_output')
 const obj=value as ModelOutput
 for(const key of ['scene','camera','naturalism'] as const){
  const s=obj[key]
  if(typeof s!=='string'||s.trim().length<28||s.length>2400)throw Error('model_output')
  if(/<script|\b(ignore (all|previous)|system prompt|api[_ -]?key|secret|new person|different face)\b/i.test(s))throw Error('model_output')
 }
 return obj
}
export const assembleMainPrompt=(modelText:string,immutablePrompt:string):string=>{
 if(typeof immutablePrompt!=='string'||immutablePrompt.trim().length<100||immutablePrompt.length>25000)throw Error('base_prompt')
 let data:unknown
 try{data=JSON.parse(modelText.replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'').trim())}
 catch{throw Error('model_output')}
 const parts=sanitizeMainSections(data)
 return [
  'GEMINI-GENERATED PRIMARY IMAGE PROMPT — FINAL ENGLISH OUTPUT:',
  parts.scene,parts.camera,parts.naturalism,
  'MANDATORY REFERENCE IDENTITY, ROOM CONTINUITY, BODY, LIGHTING AND CAMERA LOCKS (authoritative over the generated scene):',
  immutablePrompt.trim(),
  'FINAL CONSISTENCY: If any descriptive phrase above conflicts with a reference feature, selected garment, bedroom object, mirror ray, light source or body pose, the mandatory locks control. Keep the existing identity unchanged.'
 ].join('\n\n')
}
// Best-effort per-instance burst ceiling (not a distributed quota or identity check).
// For robust cross-region enforcement, configure Vercel Firewall rate limiting.
const burstWindows=new Map<string,{count:number;endsAt:number}>()
const burstAllowed=(request:Request,now=Date.now()):boolean=>{
 const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'anonymous').split(',')[0].trim().slice(0,80)
 const existing=burstWindows.get(ip)
 if(!existing||existing.endsAt<=now){
  if(burstWindows.size>2000){for(const [k,v] of burstWindows){if(v.endsAt<=now)burstWindows.delete(k)}}
  burstWindows.set(ip,{count:1,endsAt:now+60000})
  return true
 }
 if(existing.count>=6)return false
 existing.count+=1
 return true
}
const allowed=(value:unknown)=>typeof value==='string'&&value.length<=90&&/^[a-zA-Z0-9_-]*$/.test(value)
export default {
 async fetch(request:Request):Promise<Response>{
  if(request.method!=='POST')return reply({error:'POST only'},405)
  // Origin checks reduce accidental cross-site use, but cannot authenticate callers.
  const origin=request.headers.get('origin')
  if(origin&&origin!==new URL(request.url).origin)return fail('ORIGIN_REJECTED','تم رفض مصدر الطلب.',403)
  const site=request.headers.get('sec-fetch-site')
  if(site&&!['same-origin','none'].includes(site))return fail('CROSS_SITE','لا يمكن استدعاء المحرك من موقع مختلف.',403)
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))return fail('JSON_REQUIRED','نوع البيانات غير صحيح.',415)
  const size=Number(request.headers.get('content-length')||'0')
  if(size>30000)return fail('TOO_LARGE','حجم الطلب كبير.',413)
  const key=process.env.GEMINI_API_KEY
  if(!key)return fail('GEMINI_NOT_CONFIGURED','مفتاح Gemini غير متاح على الخادم.',503)
  let payload:MainPayload
  try{payload=await request.json() as MainPayload}catch{return fail('BAD_JSON','تعذر قراءة المدخلات.',400)}
  const {basePrompt,shotId,mode,posture,lighting,target}=payload
  if(typeof basePrompt!=='string'||basePrompt.length<100||basePrompt.length>24000||
   ![mode,posture,lighting,shotId,target].every(allowed)||
   !['front','mirror','rear','timer'].includes(String(mode))||
   !['gemini','chatgpt'].includes(String(target))||
   !/Reference identity anchored to reference image/i.test(basePrompt)||
   !/BEDROOM ENVIRONMENT LOCK|bedroom environment/i.test(basePrompt)){
    return fail('INVALID_SELECTION','الخيارات غير صالحة. اختر وضعية وملابس صحيحة أولًا.',400)
   }
  if(!burstAllowed(request))return fail('GEMINI_RATE_LIMIT','طلبات كثيرة من نفس الشبكة. حاول مرة أخرى بعد دقيقة، أو استخدم البرومبت المحلي.',429)
  const model=process.env.GEMINI_MAIN_MODEL||'gemini-3.5-flash-lite'
  if(!/^[a-zA-Z0-9._-]{3,80}$/.test(model))return fail('MODEL_CONFIG','اسم النموذج غير صالح.',503)
  try{
   // The model authors primary scene/camera text; local canonical prompt is a locked,
   // exact reference contract and is never left for the LLM to paraphrase away.
   const genRequest={
    systemInstruction:{parts:[{text:
     'You are the PRIMARY author of a photorealistic English smartphone bedroom selfie image prompt. Use the scene specifications and existing canonical rules supplied by the application. Produce ONLY a JSON object with string fields scene, camera, naturalism. Each field 1-5 concise detailed sentences. scene: selected subject posture, location, natural hand interactions and framing; camera: correct physical viewpoint, phone grip and mirror reflection if selected; naturalism: actual light-source exposure, realistic skin/fabric/phone processing. Never invent furniture, new mirrors, windows, props, lighting sources, hairstyles, facial features, people, or anatomy. Do not switch front vs rear camera, do not invent cinematic light. The reference identity and bedroom geometry are fixed even if the model does not see the reference photos. Do not output the existing canonical rules themselves; the app appends the exact original protected constraints after your generated prose.'}]},
    contents:[{role:'user',parts:[{text:JSON.stringify({
      captureMode:mode,posture,shotId,lighting,target,
      canonicalRulesAndSelectedOptions:basePrompt
    })}]}],
    generationConfig:{responseMimeType:'application/json',temperature:0.45,maxOutputTokens:1800}
   }
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},
    body:JSON.stringify(genRequest),signal:AbortSignal.timeout(30000)
   })
   if(!response.ok){
    console.warn('[Gemini main] upstream status',response.status)
    if(response.status===429)return fail('GEMINI_QUOTA','وصلت إلى حد الاستخدام في Google. جرب المحرك المحلي.',429)
    if([401,403].includes(response.status))return fail('GEMINI_ACCESS','Google رفضت صلاحيات مفتاح Gemini.',502)
    if(response.status===404)return fail('GEMINI_MODEL','النموذج غير متاح لحساب Google.',502)
    return fail('GEMINI_UPSTREAM','تعذر تنفيذ الطلب لدى Google.',502)
   }
   const raw=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>}
   const modelText=raw.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||''
   let prompt:string
   try{prompt=assembleMainPrompt(modelText,basePrompt)}
   catch{return fail('GEMINI_VALIDATION','رد Gemini غير متوافق مع قواعد الهوية والتصوير. يمكنك إعادة التوليد.',422)}
   return reply({prompt,source:'gemini',model})
  }catch(error){
   const err=error as Error
   const timedOut=err?.name==='TimeoutError'||err?.name==='AbortError'
   console.warn('[Gemini main] request failure',timedOut?'timeout':'network')
   return fail(timedOut?'GEMINI_TIMEOUT':'GEMINI_NETWORK',
    timedOut?'انتهت مهلة Gemini؛ يمكنك إعادة التوليد أو استخدام النسخة المحلية.':'تعذر الاتصال بـGemini؛ النسخة المحلية ما زالت متاحة.',timedOut?504:502)
  }
 }
}
