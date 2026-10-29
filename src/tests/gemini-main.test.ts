// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import handler,{assembleCreativePrompt,PHYSICS_ONLY_SYSTEM,MAIN_PROMPT_SCHEMA,IMAGE_TARGET_GUIDANCE,validatePhysicalPrompt} from '../../api/generate-main-prompt'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import type {CompilationContext} from '../domain/types'

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const endpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt'
const sceneBrief='A candid adult mirror selfie beside a bedroom dresser. Realistic fabric and body weight. Natural, lived-in bedroom. White t-shirt and charcoal trousers. Slightly tousled hair.'
const payload={sceneBrief,mode:'mirror',posture:'standing',shotId:'dresser_mirror',lighting:'ceiling_neutral',target:'gemini'}
const post=(data:unknown=payload,headers:Record<string,string>={})=>
 new Request(endpoint,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)})
const prompt='An adult stands naturally beside an ordinary dresser in a lived-in bedroom, making a candid mirror selfie with their phone facing the mirror. Their body weight rests realistically on one foot, the other leg loosely relaxed, while the shirt settles with gravity. Ceiling lighting casts everyday downward shadows across the face and clothes, and the camera records natural perspective with authentic smartphone exposure.'
const mockModel=(p=prompt)=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({prompt:p})}]}}]}),{status:200})
const context={mode:'mirror',lighting:'ceiling_neutral'}

describe('Gemini creative freedom with physics-only checks',()=>{
 it('requires no password and returns valid POST-only JSON',async()=>{
  const result=await handler.fetch(new Request(endpoint))
  expect(result.status).toBe(405)
  vi.stubEnv('GEMINI_API_KEY','')
  const r=await handler.fetch(post())
  expect(r.status).toBe(503)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('GEMINI_NOT_CONFIGURED')
 })
 it('rejects cross-site requests and unknown model targets',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only')
  expect((await handler.fetch(post(payload,{origin:'https://evil.example'}))).status).toBe(403)
  expect((await handler.fetch(post({...payload,target:'unsupported'}))).status).toBe(400)
 })
 it('receives a concise brief rather than old immutable text or user photos',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only')
  let outbound:any
  vi.stubGlobal('fetch',vi.fn(async(_u:string,o:{body:string})=>{outbound=JSON.parse(o.body);return mockModel()}))
  const r=await handler.fetch(post(payload,{'x-forwarded-for':'creative-case-1'}))
  expect(r.status).toBe(200)
  const data=await r.json() as {prompt:string;source:string}
  expect(data.prompt).toBe(prompt)
  expect(data.source).toBe('gemini')
  const body=JSON.stringify(outbound)
  expect(body).toContain(sceneBrief)
  expect(body).not.toContain('canonicalRulesAndSelectedOptions')
  expect(body).not.toContain('MANDATORY REFERENCE IDENTITY')
  expect(body).not.toContain('data:image')
  expect(outbound.systemInstruction.parts[0].text).toContain(PHYSICS_ONLY_SYSTEM)
  expect(outbound.generationConfig.responseFormat.text.schema).toEqual(MAIN_PROMPT_SCHEMA)
  expect(outbound.generationConfig.temperature).toBeGreaterThan(0.5)
 })
 it('Gemini owns the entire prompt: no hidden identity/bedroom suffix, section headings or app-generated negatives',()=>{
  const result=assembleCreativePrompt(JSON.stringify({prompt}),context)
  expect(result).toBe(prompt)
  expect(result).not.toContain('FINAL CONSISTENCY')
  expect(result).not.toContain('IDENTITY FIDELITY ENGINE')
  expect(result).not.toContain('MANDATORY REFERENCE')
 })
 it('accepts freely varied natural content and realistic camera processing',()=>{
  const creative='A relaxed visitor takes a spontaneous mirror selfie in a compact bedroom, wearing simple ordinary clothing. A slight tilt and everyday clutter add personality. A real warm lamp illuminates the visible surfaces, while the rest of the room retains plausible shadow falloff. Natural glass reflection and body weight provide a convincing ordinary smartphone photograph.'
  expect(assembleCreativePrompt(JSON.stringify({prompt:creative}),context)).toBe(creative)
 })
 it('rejects explicitly impossible body mechanics and light with no source',()=>{
  const bad=prompt+' An extra arm extends out of nowhere, and a floating camera levitates beside the face.'
  expect(()=>validatePhysicalPrompt(bad,context)).toThrow('mechanically_impossible')
 })
 it('checks mirror, timer and physically selected screen illumination',()=>{
  const noMirror=prompt.replace(/mirror/gi,'glass')
  expect(()=>validatePhysicalPrompt(noMirror,context)).toThrow('missing_mirror')
  expect(()=>validatePhysicalPrompt(prompt+' Handheld selfie with the recording phone.',{mode:'timer',lighting:'ceiling_neutral'})).toThrow('timer_grip_conflict')
  expect(()=>validatePhysicalPrompt(prompt+' Daylight fills the whole room.',{mode:'front',lighting:'phone_screen_only'})).toThrow('screen_light_conflict')
 })
 it('does not reject imaginative lighting/realistic photography for aesthetic or identity lock keywords alone',()=>{
  const artistic=prompt+' The photographer uses a small ring light mounted on a real desk beside the phone, illuminating the scene with consistent soft shadows.'
  expect(()=>validatePhysicalPrompt(artistic,context)).not.toThrow()
 })
 it('rejects JSON with model-generated extra attributes or too little content',()=>{
  expect(MAIN_PROMPT_SCHEMA.required).toEqual(['prompt'])
  expect(MAIN_PROMPT_SCHEMA.additionalProperties).toBe(false)
  expect(()=>assembleCreativePrompt(JSON.stringify({prompt,extra:'local lock'}),context)).toThrow('model_schema')
  expect(()=>assembleCreativePrompt(JSON.stringify({prompt:'short'}),context)).toThrow('prompt_length')
  expect(()=>assembleCreativePrompt('invalid json',context)).toThrow('model_format')
 })
 it('each image model gets its own guidance without old mandatory instructions',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only')
  for(const target of ['gemini','chatgpt','flux','midjourney'] as const){
   let outbound:any
   vi.stubGlobal('fetch',vi.fn(async(_u:string,o:{body:string})=>{outbound=JSON.parse(o.body);return mockModel()}))
   const r=await handler.fetch(post({...payload,target},{'x-forwarded-for':'creative-'+target}))
   expect(r.status).toBe(200)
   expect(outbound.systemInstruction.parts[0].text).toContain(IMAGE_TARGET_GUIDANCE[target])
  }
 })
 it('handles provider quotas without leaking private details',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only-secret')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('private error',{status:429})))
  const r=await handler.fetch(post({...payload,shotId:'quota-case'},{'x-forwarded-for':'creative-quota'}))
  expect(r.status).toBe(429)
  const data=await r.json() as {error:string;errorCode:string}
  expect(data.errorCode).toBe('GEMINI_QUOTA')
  expect(data.error).not.toContain('private')
 })
})

describe('Concise creative scene selection',()=>{
 const ctx:CompilationContext={
  hairVariantId:'natural_slightly_tousled',
  expressionVariantId:'neutral_relaxed',
  upperGarmentId:'regular_crewneck_tshirt',
  lowerGarmentId:'relaxed_sweatpants',
  materialId:'lightweight_cotton_appearance_jersey',
  fitId:'regular',
  stateId:'lightly_worn',
  color:'white',surface:'solid',
  referenceImagePresent:true,roomReferencePresent:true,
  bedroomShotId:'dresser_mirror',
  nightLightingId:'ceiling_neutral',
  realismIntensity:'natural'
 }
 it('uses selected clothing and hair, not the huge assembled local prompt',()=>{
  const brief=buildCreativeSceneBrief(ctx)
  expect(brief).toContain('slightly tousled')
  expect(brief).toContain('white')
  expect(brief).toContain('ceiling_neutral')
  expect(brief).not.toContain('IDENTITY FIDELITY ENGINE')
  expect(brief).not.toContain('BEDROOM ENVIRONMENT LOCK')
  expect(brief.length).toBeLessThan(3000)
 })
 it('never implies Gemini saw a user photo',()=>{
  const brief=buildCreativeSceneBrief(ctx)
  expect(brief).toContain('Gemini does not receive or see it')
 })
})
