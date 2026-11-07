// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import handler,{
 IMAGE_PROMPT_AUDITOR_V8_SYSTEM,AUDITOR_V8_SCHEMA,validateAuditorV8Output,
 MAX_AUDIT_REQUEST_BYTES,MAX_AUDIT_PROMPT_CHARS,MAX_AUDIT_BRIEF_CHARS,MAX_FINAL_WORDS
} from '../../api/audit-image-prompt'

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
const url='https://bedroom-selfie-mvp.vercel.app/api/audit-image-prompt'
const prompt='A relaxed selfie in a normal bedroom with real ceiling light and a single Xiaomi phone. The person stands on the existing ceramic floor. Preserve the supplied person identity and reference room as physically represented.'
const payload={
 prompt,sceneBrief:'Selected mirror pose before the right-wall wardrobe glass, original bed at left, separate vanity mirror beside dresser; ceiling light chosen.',
 captureMode:'mirror',shotId:'mirror_wardrobe',lighting:'ceiling_neutral',
 subjectReferencePresent:true,roomReferencePresent:true,ownPortrait:true
}
const repaired='Use the person reference as the identity anchor for the same subject, keeping the original facial proportions, temple hairline, skin tone and beard gaps. A casual, attainable mirror selfie uses the Xiaomi 15 Ultra rear camera pointing toward the fixed right-wall wardrobe mirror; its screen faces the photographer and one hand holds it. The original bed remains on the left and the separate dresser mirror stays in its place. Feet carry the standing body weight, a loose shirt folds naturally, the actual ceiling light determines shadows and reflections, and the ceramic grout grid remains continuous. Preserve only reference-confirmed items and locally supported room disorder; no imagined marks, impossible reflections or studio lighting.'
const ok={
 repairNotes:['المشكلة: زاوية الكاميرا غير محددة؛ الإصلاح: استخدام الكاميرا الخلفية أمام مرآة الدولاب.'],
 sceneCameraSurfaceDetails:'سيلفي مرآة بالكاميرا الخلفية؛ جدران وسيراميك مطابقان للمرجع، وغبار محدود إن كان مرئيًا.',
 finalImagePrompt:repaired
}
const request=(value:unknown=payload,headers:Record<string,string>={})=>new Request(url,{
 method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(value)
})
const provider=(data:unknown=ok,status=200)=>new Response(JSON.stringify({
 candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]
}),{status})

describe('IMAGE PROMPT AUDITOR & PHOTOGRAPHIC REALISM ENGINE v8 policy',()=>{
 it('covers all ten layers, genuine mirror optics and causal dirt without undetectable claims',()=>{
  for(const layer of ['L1 SCENE','L2 IDENTITY','L3 BODY','L4 CAMERA','L5 LIGHT','L6 ONE PIPELINE','L7 MATERIALS','L8 CAUSAL CHAOS','L9 CONTEXT','L10 FINAL GATE']){
   expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain(layer)
  }
  expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain('source -> transport/contact -> deposition')
  expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain('exactly one connected')
  expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain('ChatGPT Images')
  expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain('193 cm')
  expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain('NOT visually examined')
  expect(IMAGE_PROMPT_AUDITOR_V8_SYSTEM).toContain('50-500 words')
 })
 it('is self-contained for production Node ESM',()=>{
  const source=readFileSync(new URL('../../api/audit-image-prompt.ts',import.meta.url),'utf8')
  expect(source).not.toMatch(/from\s*['"]\.\.\/src\//)
  expect(source).not.toContain('imageGeneration')
 })
 it('exposes exactly the 3 fields requested for A, B and C',()=>{
  expect(AUDITOR_V8_SCHEMA.required).toEqual(['repairNotes','sceneCameraSurfaceDetails','finalImagePrompt'])
  expect(AUDITOR_V8_SCHEMA.additionalProperties).toBe(false)
  expect(validateAuditorV8Output(ok)).toEqual(ok)
  expect(validateAuditorV8Output({...ok,repairNotes:[]})).toHaveProperty('repairNotes',[])
 })
 it('rejects invented model extras, non-Arabic notes, and more than five notes',()=>{
  expect(()=>validateAuditorV8Output({...ok,hidden:'secret'})).toThrow('AUDIT_SCHEMA')
  expect(()=>validateAuditorV8Output({...ok,repairNotes:Array.from({length:6},()=>ok.repairNotes[0])})).toThrow('AUDIT_NOTES')
  expect(()=>validateAuditorV8Output({...ok,repairNotes:['This is English, not Arabic.']})).toThrow('AUDIT_NOTES')
  expect(()=>validateAuditorV8Output({...ok,sceneCameraSurfaceDetails:'plain English text'})).toThrow('AUDIT_SCENE')
 })
 it('enforces the 500 word final prompt and rejects negative-prompt and AI undetectability gimmicks',()=>{
  expect(MAX_FINAL_WORDS).toBe(500)
  expect(()=>validateAuditorV8Output({...ok,finalImagePrompt:'ordinary '.repeat(501)})).toThrow('AUDIT_FINAL')
  expect(()=>validateAuditorV8Output({...ok,finalImagePrompt:repaired+'\nNegative Prompt: unreal details'})).toThrow('AUDIT_FINAL')
  expect(()=>validateAuditorV8Output({...ok,finalImagePrompt:repaired+' masterpiece 8k'})).toThrow('AUDIT_FINAL')
  expect(()=>validateAuditorV8Output({...ok,finalImagePrompt:'\x60\x60\x60english\n'+repaired+'\n\x60\x60\x60'})).toThrow('AUDIT_FINAL')
 })
})
describe('V8 serverless endpoint',()=>{
 it('accepts POST only and protects against unrelated origins',async()=>{
  expect((await handler.fetch(new Request(url))).status).toBe(405)
  expect((await handler.fetch(request(payload,{origin:'https://evil.invalid'}))).status).toBe(403)
  expect((await handler.fetch(request(payload,{'sec-fetch-site':'cross-site'}))).status).toBe(403)
  expect((await handler.fetch(new Request(url,{method:'POST',body:'{}'}))).status).toBe(415)
 })
 it('rejects malformed payloads and enforces character limits independently',async()=>{
  const oversized='a'.repeat(MAX_AUDIT_PROMPT_CHARS+1)
  const r=await handler.fetch(request({...payload,prompt:oversized}))
  expect(r.status).toBe(413)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('PROMPT_TOO_LONG')
  const scene=await handler.fetch(request({...payload,sceneBrief:'z'.repeat(MAX_AUDIT_BRIEF_CHARS+1)}))
  expect(scene.status).toBe(413)
  expect((await scene.json() as {errorCode:string}).errorCode).toBe('SCENE_TOO_LONG')
  expect((await handler.fetch(request({...payload,captureMode:'flying'}))).status).toBe(400)
  expect((await handler.fetch(request({...payload,ownPortrait:'yes'}))).status).toBe(400)
  expect((await handler.fetch(request({...payload,prompt:''}))).status).toBe(400)
  const huge=await handler.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,extra:'x'.repeat(MAX_AUDIT_REQUEST_BYTES+1)})}))
  expect(huge.status).toBe(413)
 })
 it('does not reject valid full-length Arabic prompt and scene descriptions by byte size',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const arabicPrompt='وصف غرفة نوم طبيعية. '.repeat(700).slice(0,MAX_AUDIT_PROMPT_CHARS)
  const arabicScene='شخص أمام مرآة الدولاب بإضاءة السقف. '.repeat(400).slice(0,MAX_AUDIT_BRIEF_CHARS)
  expect(arabicPrompt.length).toBeLessThanOrEqual(MAX_AUDIT_PROMPT_CHARS)
  expect(arabicScene.length).toBeLessThanOrEqual(MAX_AUDIT_BRIEF_CHARS)
  let outgoing:any
  vi.stubGlobal('fetch',vi.fn(async(_url:string,opts:{body:string})=>{
   outgoing=JSON.parse(opts.body)
   return provider()
  }))
  const response=await handler.fetch(request({...payload,prompt:arabicPrompt,sceneBrief:arabicScene},{
   'x-forwarded-for':'audit-v8-arabic-utf8'
  }))
  expect(response.status).toBe(200)
  const forwarded=JSON.parse(outgoing.contents[0].parts[0].text)
  expect(forwarded.rawPromptToRepair).toBe(arabicPrompt)
  expect(forwarded.selectedAppSceneContext).toBe(arabicScene)
 })
 it('returns transparent JSON when Gemini API is not configured',async()=>{
  vi.stubEnv('GEMINI_API_KEY','')
  const response=await handler.fetch(request())
  expect(response.status).toBe(503)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('GEMINI_NOT_CONFIGURED')
 })
 it('forwards only text and flags, never uploads reference pictures or produces an image',async()=>{
  vi.stubEnv('GEMINI_API_KEY','not-a-real-secret')
  let outbound:any
  let destination=''
  vi.stubGlobal('fetch',vi.fn(async(u:string,opts:{body:string})=>{
   destination=u;outbound=JSON.parse(opts.body);return provider()
  }))
  const r=await handler.fetch(request(payload,{'x-forwarded-for':'audit-v8-forward-payload'}))
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({...ok,source:'gemini',version:'v8',model:'gemini-3.5-flash-lite'})
  expect(destination).toContain(':generateContent')
  const data=JSON.parse(outbound.contents[0].parts[0].text)
  expect(data.rawPromptToRepair).toBe(prompt)
  expect(data.selectedAppSceneContext).toBe(payload.sceneBrief)
  expect(data.selectedCaptureMode).toBe('mirror')
  expect(data.subjectReferenceDeclared).toBe(true)
  expect(data.roomReferenceDeclared).toBe(true)
  expect(data.userOwnPortrait).toBe(true)
  expect(JSON.stringify(outbound)).not.toMatch(/data:image|base64|inlineData|fileUri/)
  expect(outbound.systemInstruction.parts[0].text).toContain('L10 FINAL GATE')
  expect(outbound.generationConfig.responseFormat.text.schema).toEqual(AUDITOR_V8_SCHEMA)
 })
 it('preserves other peoples attributes when own portrait is not selected',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  let data:any
  vi.stubGlobal('fetch',vi.fn(async(_u:string,o:{body:string})=>{
   data=JSON.parse(o.body);return provider({...ok,repairNotes:[]})
  }))
  const r=await handler.fetch(request({...payload,ownPortrait:false,subjectReferencePresent:false,roomReferencePresent:false,captureMode:'timer'},{
   'x-forwarded-for':'audit-v8-other-portrait'
  }))
  expect(r.status).toBe(200)
  const user=JSON.parse(data.contents[0].parts[0].text)
  expect(user.userOwnPortrait).toBe(false)
  expect(user.subjectReferenceDeclared).toBe(false)
  expect(user.selectedCaptureMode).toBe('timer')
 })
 it('returns clear provider failure codes and never returns an invalid >500-word output',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  vi.stubGlobal('fetch',vi.fn(async()=>provider({...ok,finalImagePrompt:'camera '.repeat(501)})))
  const r=await handler.fetch(request(payload,{'x-forwarded-for':'audit-v8-invalid-result'}))
  expect(r.status).toBe(422)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('AUDITOR_INVALID_RESPONSE')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('overload',{status:429})))
  const quota=await handler.fetch(request(payload,{'x-forwarded-for':'audit-v8-quota'}))
  expect(quota.status).toBe(429)
  expect((await quota.json() as {errorCode:string}).errorCode).toBe('GEMINI_QUOTA')
 })
})
