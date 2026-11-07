// @vitest-environment node
import {describe,it,expect} from 'vitest'
import {captureLightingIssuesCore} from '../../shared/physical-reality-core.mjs'
import {captureLightingIssues} from '../data/scene-consistency'
import {bedroomShots} from '../data/bedroom-shots'
import {nightLightingPresets} from '../data/night-lighting'
import geminiHandler from '../../api/generate-main-prompt'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,sceneFingerprint} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,bedroomShotId:'mirror_wardrobe',
 nightLightingId:'ceiling_neutral',poseId:'standing'
}
describe('Physical reality portable runtime contract',()=>{
 it('has exactly the same camera/lighting result for every declared shot and light preset',()=>{
  for(const shot of bedroomShots)for(const light of nightLightingPresets){
   const ctx={bedroomShotId:shot.id,nightLightingId:light.id}
   expect(captureLightingIssuesCore(shot.id,shot.mode,light.id)).toEqual(captureLightingIssues(ctx))
  }
 })
 it('blocks a forged server request with an incompatible capture-light pair before Gemini',async()=>{
  const compiled=compilePrompt(base)
  expect(compiled.validation.isValid).toBe(true)
  const original=buildSceneSpecification(base,compiled.result,compiled.validation)
  const changed={...original,capture:{...original.capture,mode:'rear' as const,lighting:'phone_screen_only'}}
  const {integrity:ignored,...unsigned}=changed
  const spec={...unsigned,integrity:sceneFingerprint(unsigned)}
  const req=new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sceneSpecification:spec})
  })
  const response=await geminiHandler.fetch(req)
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_PHYSICS')
 })
})
