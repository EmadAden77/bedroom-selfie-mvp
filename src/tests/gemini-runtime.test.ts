// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import geminiHandler, { PROMPT_HINTS as serverCatalog, eligibleHintIds as serverEligible } from '../../api/generate-prompt'
import { PROMPT_HINTS as clientCatalog, eligibleHintIds as clientEligible } from '../engine/ai-prompt-guard'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'

const endpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-prompt'
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',nightLightingId:'led_spotlight',poseId:'standing'
}
const spec=()=>{
 const compiled=compilePrompt(ctx)
 expect(compiled.validation.isValid).toBe(true)
 return buildSceneSpecification(ctx,compiled.result,compiled.validation)
}
const post=(sceneSpecification:unknown,headers:Record<string,string>={})=>new Request(endpoint,{
 method:'POST',headers:{
  'content-type':'application/json','x-prompt-engine-access':'test-access-code-not-real-0123456789abcdef',...headers
 },body:JSON.stringify({sceneSpecification})
})
const fakeSelection=()=>new Response(JSON.stringify({candidates:[{content:{parts:[{
 text:JSON.stringify({ids:['mirror_optics','real_cloth']})
}]}}]}),{status:200,headers:{'content-type':'application/json'}})
const auth=()=>{
 vi.stubEnv('GEMINI_API_KEY','test-key-not-real')
 vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','test-access-code-not-real-0123456789abcdef')
}
afterEach(()=>{ vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Production Vercel legacy Gemini function regression',()=>{
 it('has no runtime dependency on src/engine and keeps the approved catalog identical',()=>{
  expect(serverCatalog).toEqual(clientCatalog)
  expect(serverEligible('mirror','standing')).toEqual(clientEligible('mirror','standing'))
  expect(serverEligible('front','seated_bed')).toEqual(clientEligible('front','seated_bed'))
 })
 it('responds to GET with a valid JSON 405 instead of crashing on load',async()=>{
  const response=await geminiHandler.fetch(new Request(endpoint))
  expect(response.status).toBe(405)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(await response.json()).toEqual({error:'POST only'})
 })
 it('reports missing environment without leaking its values',async()=>{
  vi.stubEnv('GEMINI_API_KEY','')
  vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','')
  const response=await geminiHandler.fetch(post(spec()))
  expect(response.status).toBe(503)
  const payload=await response.json() as {error:string;errorCode:string}
  expect(payload.errorCode).toBe('GEMINI_NOT_CONFIGURED')
  expect(payload.error).not.toContain('test-key-not-real')
 })
 it('rejects wrong access codes as JSON before calling the model',async()=>{
  auth()
  const response=await geminiHandler.fetch(post(spec(),{'x-prompt-engine-access':'wrong-code'}))
  expect(response.status).toBe(401)
  expect(response.headers.get('content-type')).toContain('application/json')
  const payload=await response.json() as {error:string}
  expect(payload.error).toContain('غير صحيح')
 })
 it('rejects forged capture metadata without contacting the model',async()=>{
  auth()
  const providerCall=vi.fn(async()=>fakeSelection())
  vi.stubGlobal('fetch',providerCall)
  const changed={...spec(),capture:{...spec().capture,mode:'floating-camera'}}
  const response=await geminiHandler.fetch(post(changed))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_CAPTURE')
  expect(providerCall).not.toHaveBeenCalled()
 })
 it('sends only validated capture metadata to Google, never immutable scene text',async()=>{
  auth()
  vi.stubEnv('GEMINI_MODEL','')
  let outboundBody=''
  let outboundUrl=''
  vi.stubGlobal('fetch',vi.fn(async(url:string,opts:{body:string})=>{
   outboundUrl=url
   outboundBody=opts.body
   return fakeSelection()
  }))
  const scene=spec()
  const privateSection=scene.derivedUnits[0].text
  const response=await geminiHandler.fetch(post(scene))
  expect(response.status).toBe(200)
  expect(outboundUrl).toContain('gemini-3.5-flash-lite')
  expect(outboundBody).toContain('led_spotlight')
  expect(outboundBody).not.toContain(privateSection)
  expect(outboundBody).not.toContain(scene.integrity)
  const result=await response.json() as Record<string,unknown>
  expect(result.source).toBe('legacy-hints')
  expect(result.authoritative).toBe(false)
  expect(result.selectedHintIds).toEqual(['mirror_optics','real_cloth'])
  expect(result).not.toHaveProperty('prompt')
  expect(result).not.toHaveProperty('enhancedPrompt')
 })
 it('reports provider timeout and outbound network errors with distinct safe error codes',async()=>{
  auth()
  const scene=spec()
  for(const [name,code,status] of [['TimeoutError','GEMINI_TIMEOUT',504],['TypeError','GEMINI_NETWORK',502]] as const){
   const error=new Error('The private provider connection failed')
   error.name=name
   vi.stubGlobal('fetch',vi.fn(async()=>{throw error}))
   const response=await geminiHandler.fetch(post(scene))
   expect(response.status).toBe(status)
   const body=await response.json() as {errorCode:string;error:string}
   expect(body.errorCode).toBe(code)
   expect(body.error).not.toContain('private provider')
  }
 })
 it('distinguishes rejected provider key and quota from network exceptions',async()=>{
  auth()
  const scene=spec()
  for(const [status,code] of [[403,'GEMINI_ACCESS'],[429,'GEMINI_QUOTA'],[404,'GEMINI_MODEL']] as const){
   vi.stubGlobal('fetch',vi.fn(async()=>new Response('remote details hidden',{status})))
   const response=await geminiHandler.fetch(post(scene))
   expect((await response.json() as {errorCode:string}).errorCode).toBe(code)
  }
 })
})
