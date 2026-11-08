// @vitest-environment node
import {describe,it,expect} from 'vitest'
import endpoint from '../../api/authorize-final-prompt'
import {assertAuthoritative} from '../../shared/authoritative-prompt'
import {assembleEditorialPrompt} from '../../shared/editorial-contract'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'

const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral'
}
const getReady=()=>{
 const {validation,result}=compilePrompt(ctx)
 expect(validation.isValid).toBe(true)
 const spec=buildSceneSpecification(ctx,result,validation)
 return {spec,prompt:result.promptText}
}
const post=(data:unknown)=>new Request('https://bedroom-selfie-mvp.vercel.app/api/authorize-final-prompt',{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)
})
describe('PR4 unified server-side Final Prompt authority gate',()=>{
 it('server accepts exactly the approved local compiler output, independently of React state',async()=>{
  const {spec,prompt}=getReady()
  const result=await endpoint.fetch(post({sceneSpecification:spec,candidate:{source:'local',prompt}}))
  // PR7b-1 Category 1: former HTTP 400 FINAL_ROOM_UNCONFIRMED → HTTP 403
  // ROOM_UNVERIFIED without an explicit scene-bound acknowledgement.
  // Exact compiler bytes and provenance remain asserted without weakening.
  expect(spec.roomGeometry.userConfirmed).toBe(false)
  expect(prompt).toBe(spec.derivedUnits
   .filter(u=>u.id!=='natural_scene_director'&&u.id!=='room_geometry')
   .map(u=>u.text).join('\n\n'))
  expect(result.status).toBe(403)
  expect((await result.json() as {errorCode:string}).errorCode).toBe('ROOM_UNVERIFIED')
  expect(()=>assertAuthoritative(spec,{source:'local',prompt})).toThrow('ROOM_UNVERIFIED')
 })
 it.each(['ghalyon','auditor-v8'])('server HTTP 403 refuses a %s advisory draft as active final prompt',async source=>{
  const {spec,prompt}=getReady()
  const proposed='A deliberately invented studio with a second light masquerading as a final prompt.'
  const response=await endpoint.fetch(post({
   sceneSpecification:spec,
   candidate:{source,prompt:proposed}
  }))
  expect(response.status).toBe(403)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('ADVISORY_NOT_AUTHORITATIVE')
  expect(()=>assertAuthoritative(spec,{source,prompt})).toThrow('ADVISORY_NOT_AUTHORITATIVE')
 })
 it('server rejects malformed HTTP body that attempts to set activeGeneratedPrompt directly',async()=>{
  const {spec}=getReady()
  const response=await endpoint.fetch(post({
   sceneSpecification:spec,
   activeGeneratedPrompt:'Ghalyon free text used to hijack app state',
   candidate:{source:'local',prompt:'Forged free text'}
  }))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('FINAL_DIRECT_STATE_REJECTED')
 })
 it('server rejects relabeling advisory text as local even if its source tag is forged',async()=>{
  const {spec}=getReady()
  const candidate={source:'local',prompt:'Free prose from Auditor v8'}
  const response=await endpoint.fetch(post({sceneSpecification:spec,candidate}))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('FINAL_LOCAL_MISMATCH')
 })
 it('the same gate validates the existing Gemini editorial-only final assembly',async()=>{
  const {spec}=getReady()
  const order=[...spec.mandatoryUnitIds]
  const prompt=assembleEditorialPrompt(spec,{sectionOrder:order,openingLineSelection:'canonical'}).prompt
  const candidate={source:'gemini-editor',prompt,sectionOrder:order,openingLineSelection:'canonical'}
  const response=await endpoint.fetch(post({sceneSpecification:spec,candidate}))
  // PR7b-1 Category 1: former HTTP 400 FINAL_ROOM_UNCONFIRMED → HTTP 403
  // ROOM_UNVERIFIED before explicit acknowledgement; strict section checks remain.
  expect(prompt).toBe(assembleEditorialPrompt(spec,{sectionOrder:order,openingLineSelection:'canonical'}).prompt)
  expect(spec.roomGeometry.userConfirmed).toBe(false)
  expect(response.status).toBe(403)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('ROOM_UNVERIFIED')
  expect(()=>assertAuthoritative(spec,candidate)).toThrow('ROOM_UNVERIFIED')
 })
 it('server rejects an altered or extra body in a forged editor response',async()=>{
  const {spec}=getReady()
  const order=[...spec.mandatoryUnitIds]
  const candidate={source:'gemini-editor',prompt:'An invented room with changed constraints',
   sectionOrder:order,openingLineSelection:'canonical'}
  const response=await endpoint.fetch(post({sceneSpecification:spec,candidate}))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('FINAL_EDITOR_MISMATCH')
 })
 it('server refuses direct prompt submissions without a validated SceneSpecification',async()=>{
  const response=await endpoint.fetch(post({candidate:{source:'local',prompt:'some text'}}))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('FINAL_REQUEST_SCHEMA')
 })
})
