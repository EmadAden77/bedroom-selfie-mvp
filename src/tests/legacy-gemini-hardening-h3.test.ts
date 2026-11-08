// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import endpoint from '../../api/generate-prompt'
import {MAX_SCENE_REQUEST_BYTES} from '../../api/generate-main-prompt'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'

const url='https://bedroom-selfie-mvp.vercel.app/api/generate-prompt'
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,
 roomReferencePresent:true,bedroomShotId:'mirror_wardrobe',poseId:'standing',
 nightLightingId:'ceiling_neutral'
}
const getSpec=()=>{
 const {validation,result}=compilePrompt(base)
 expect(validation.isValid).toBe(true)
 return buildSceneSpecification(base,result,validation)
}
const setup=()=>{
 vi.stubEnv('GEMINI_API_KEY','H3_SECRET_API_KEY_MUST_NEVER_LEAK')
 vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','H3_TEST_CALLER_TOKEN')
}
const post=(body:unknown,headers:Record<string,string>={})=>new Request(url,{
 method:'POST',
 headers:{'content-type':'application/json','x-prompt-engine-access':'H3_TEST_CALLER_TOKEN',...headers},
 body:JSON.stringify(body)
})
const providerReply=()=>new Response(JSON.stringify({
 candidates:[{content:{parts:[{text:JSON.stringify({ids:['mirror_optics','real_cloth']})}]}}]
}),{status:200,headers:{'content-type':'application/json'}})

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})

describe('H3 legacy Gemini endpoint: defensively bounded, advisory only',()=>{
 it('rejects non-POST with JSON 405',async()=>{
  const result=await endpoint.fetch(new Request(url,{method:'GET'}))
  expect(result.status).toBe(405)
  expect(result.headers.get('cache-control')).toBe('no-store')
 })
 it('rejects non-JSON content-type with 415 before using Gemini',async()=>{
  setup()
  const upstream=vi.fn(async()=>providerReply())
  vi.stubGlobal('fetch',upstream)
  const result=await endpoint.fetch(post({sceneSpecification:getSpec()},{'content-type':'text/plain'}))
  expect(result.status).toBe(415)
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects measured oversized JSON body with 413 even without content-length',async()=>{
  setup()
  const request=post({sceneSpecification:getSpec(),untrustedPadding:'x'.repeat(MAX_SCENE_REQUEST_BYTES)})
  expect(request.headers.get('content-length')).toBeNull()
  const result=await endpoint.fetch(request)
  expect(result.status).toBe(413)
 })
 it('rejects invalid SceneSpecification with 400 before contacting Gemini',async()=>{
  setup()
  const upstream=vi.fn(async()=>providerReply())
  vi.stubGlobal('fetch',upstream)
  const response=await endpoint.fetch(post({
   sceneSpecification:{version:1,derivedUnits:[{id:'identity',text:'tampered',immutable:false}]},
   prompt:'old completely unverified prompt '.repeat(20),mode:'mirror',posture:'standing'
  }))
  expect(response.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects cross-site Sec-Fetch-Site and foreign Origin',async()=>{
  setup()
  expect((await endpoint.fetch(post({sceneSpecification:getSpec()},{'sec-fetch-site':'cross-site'}))).status).toBe(403)
  expect((await endpoint.fetch(post({sceneSpecification:getSpec()},{origin:'https://example.com'}))).status).toBe(403)
 })
 it('accepts a verified SceneSpec without returning any prompt, authority or secret',async()=>{
  setup()
  const spec=getSpec()
  const before=structuredClone(spec)
  let outgoing=''
  const upstream=vi.fn(async(_url:string,opts:{body:string})=>{
   outgoing=opts.body
   return providerReply()
  })
  vi.stubGlobal('fetch',upstream)
  const result=await endpoint.fetch(post({sceneSpecification:spec}))
  expect(result.status).toBe(200)
  expect(result.headers.get('cache-control')).toBe('no-store')
  const raw=await result.text()
  const body=JSON.parse(raw) as Record<string,unknown>
  expect(body.selectedHintIds).toEqual(['mirror_optics','real_cloth'])
  expect(body.authoritative).toBe(false)
  expect(body.source).toBe('legacy-hints')
  expect(body).not.toHaveProperty('prompt')
  expect(body).not.toHaveProperty('enhancedPrompt')
  expect(body).not.toHaveProperty('validated',true)
  expect(raw).not.toContain('H3_SECRET_API_KEY_MUST_NEVER_LEAK')
  expect(raw).not.toContain('H3_TEST_CALLER_TOKEN')
  expect(upstream).toHaveBeenCalledTimes(1)
  expect(outgoing).not.toContain('H3_TEST_CALLER_TOKEN')
  expect(outgoing).not.toContain(spec.derivedUnits[0].text)
  expect(spec).toEqual(before)
 })
})
