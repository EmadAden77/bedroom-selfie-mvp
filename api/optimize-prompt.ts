// Stateless Ghalyon prompt optimization endpoint.
type Mode='auto'|'basic'|'detail'
type Target='chatgpt'|'claude'|'gemini'
type Reply={status:'questions'|'complete';questions:string[];optimizedPrompt:string;improvements:string[];proTip:string}
const tips:Record<Target,string>={
 chatgpt:'Use structured instructions and layered context.',
 claude:'Use explicit long-context boundaries and ordered task steps.',
 gemini:'Use multimodal prompting when the input contains media.'
}
export const SYSTEM='You are Ghalyon, a strategic prompt engineer. Improve user intent, not only phrasing. Keep relevant details, remove repetition, never invent facts. BASIC: finish without questions. DETAIL: ask up to three questions only when essential details are missing. AUTO: choose BASIC when clear, DETAIL otherwise. With supplied answers, finish without more questions. Choose creative, technical, educational or complex task structure as appropriate. Preserve all stated photographic identity, geometry, camera and physical lighting constraints. Write the resulting prompt in English unless the requested prompt language differs. Return concise improvements and a practical tip in Arabic. Output only structured JSON.'
export const SCHEMA={type:'object',properties:{
 status:{type:'string',enum:['questions','complete']},
 questions:{type:'array',items:{type:'string'}},
 optimizedPrompt:{type:'string'},improvements:{type:'array',items:{type:'string'}},proTip:{type:'string'}
},required:['status','questions','optimizedPrompt','improvements','proTip'],additionalProperties:false}
export function parseReply(text:string,mode:Mode,answered:boolean):Reply{
 const d=JSON.parse(text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'')) as Reply
 if(!d||!['questions','complete'].includes(d.status)||!Array.isArray(d.questions)||
 !Array.isArray(d.improvements)||typeof d.optimizedPrompt!=='string'||typeof d.proTip!=='string')
 throw Error('INVALID_RESPONSE')
 if(d.status==='questions'){
  if(mode==='basic'||answered||d.questions.length<1||d.questions.length>3||d.questions.some(q=>typeof q!=='string'||q.trim().length<8||q.length>400))throw Error('INVALID_QUESTIONS')
  return {status:'questions',questions:d.questions,optimizedPrompt:'',improvements:[],proTip:''}
 }
 if(d.questions.length||d.optimizedPrompt.trim().length<30||d.optimizedPrompt.length>14000||
 d.improvements.length<1||d.improvements.length>4||d.improvements.some(s=>typeof s!=='string'||!s.trim())||!d.proTip.trim())throw Error('INVALID_PROMPT')
 return {...d,questions:[]}
}
const json=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})
const fail=(errorCode:string,error:string,status=502)=>json({errorCode,error},status)
const attempts=new Map<string,{count:number;until:number}>()
function allowed(req:Request):boolean{
 const now=Date.now(),key=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'anonymous').split(',')[0].slice(0,80)
 const prev=attempts.get(key)
 if(!prev||prev.until<now){if(attempts.size>1500)for(const [k,v] of attempts)if(v.until<now)attempts.delete(k)
  attempts.set(key,{count:1,until:now+60000});return true}
 if(prev.count>=6)return false
 prev.count++;return true
}
export default {async fetch(req:Request):Promise<Response>{
 if(req.method!=='POST')return json({error:'POST only'},405)
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return fail('ORIGIN','رفض المصدر',403)
 if(req.headers.get('sec-fetch-site')&&!['same-origin','none'].includes(req.headers.get('sec-fetch-site')||''))return fail('CROSS_SITE','رفض الطلب من موقع آخر',403)
 if(!(req.headers.get('content-type')||'').toLowerCase().includes('application/json'))return fail('CONTENT_TYPE','تنسيق غير صالح',415)
 const size=Number(req.headers.get('content-length')||'0')
 if(size>20000)return fail('TOO_LARGE','الطلب كبير',413)
 let x:any;try{x=await req.json()}catch{return fail('BAD_JSON','تعذر قراءة الطلب',400)}
 if(JSON.stringify(x).length>20000)return fail('TOO_LARGE','الطلب كبير',413)
 const {idea,target,mode,answers=[]}=x||{}
 if(typeof idea!=='string'||idea.trim().length<8||idea.length>10000||
 !['chatgpt','claude','gemini'].includes(target)||!['auto','basic','detail'].includes(mode)||
 !Array.isArray(answers)||answers.length>3||answers.some(a=>!a||typeof a.question!=='string'||typeof a.answer!=='string'||a.question.length>400||a.answer.length>1500))return fail('INVALID_INPUT','البيانات غير صالحة',400)
 const key=process.env.GEMINI_API_KEY
 if(!key)return fail('GEMINI_NOT_CONFIGURED','خدمة Gemini غير مفعلة',503)
 if(!allowed(req))return fail('RATE_LIMIT','طلبات كثيرة. أعد المحاولة لاحقاً.',429)
 const model=process.env.GEMINI_MAIN_MODEL||'gemini-3.5-flash-lite'
 if(!/^[a-zA-Z0-9._-]{3,80}$/.test(model))return fail('MODEL_CONFIG','اسم النموذج غير صالح',503)
 try{
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
   method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM+' '+tips[target as Target]}]},
    contents:[{role:'user',parts:[{text:JSON.stringify({idea,mode,target,answers})}]}],
    generationConfig:{temperature:0.4,maxOutputTokens:3500,responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:SCHEMA}}}}),
   signal:AbortSignal.timeout(30000)
  })
  if(!res.ok){
   if(res.status===429)return fail('GEMINI_QUOTA','اكتملت حصة Gemini المتاحة',429)
   if(res.status===401||res.status===403)return fail('GEMINI_ACCESS','تحقق من صلاحيات Gemini على الخادم')
   if(res.status===404)return fail('GEMINI_MODEL','نموذج Gemini المحدد غير متاح')
   if(res.status===400)return fail('GEMINI_REQUEST','رفضت Google إعدادات الطلب')
   return fail('GEMINI_UPSTREAM','خدمة Gemini غير متاحة')
  }
  const data=await res.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>}
  const replyText=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||''
  try{return json(parseReply(replyText,mode,answers.length>0))}
  catch{return fail('INVALID_PROVIDER_REPLY','صيغة استجابة Gemini غير صالحة',422)}
 }catch(error){
  const name=(error as Error)?.name
  const timeout=name==='TimeoutError'||name==='AbortError'
  return fail(timeout?'GEMINI_TIMEOUT':'GEMINI_NETWORK',timeout?'انتهت مهلة اتصال Gemini':'تعذر الاتصال بـ Gemini',timeout?504:502)
 }
}}