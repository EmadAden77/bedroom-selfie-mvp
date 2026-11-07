// @vitest-environment node
import {describe,it,expect,vi,afterEach} from 'vitest'
afterEach(()=>{vi.unstubAllEnvs()})
import {captureLightingIssuesCore,inspectSharedScene} from '../../shared/physical-reality-core.mjs'
import {captureLightingIssues} from '../data/scene-consistency'
import {bedroomShots} from '../data/bedroom-shots'
import {nightLightingPresets} from '../data/night-lighting'
import geminiHandler from '../../api/generate-main-prompt'
import {compilePrompt} from '../compiler'
import {toSharedScene,evaluatePhysicalReality} from '../engine/physical-reality'
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
 it('returns identical structured CONFLICT, WARNING and UNKNOWN outcomes for all shot and lighting combinations',()=>{
  for(const shot of bedroomShots)for(const preset of nightLightingPresets){
   const ctx={...base,bedroomShotId:shot.id,nightLightingId:preset.id}
   expect(evaluatePhysicalReality(ctx).findings).toEqual(inspectSharedScene(toSharedScene(ctx)))
  }
  const mirror={...base,bedroomShotId:'mirror_wardrobe',poseId:'seated_bed',roomReferencePresent:false,referenceImagePresent:false}
  const findings=inspectSharedScene(toSharedScene(mirror))
  expect(findings.some(f=>f.status==='WARNING'&&f.id==='shot-posture')).toBe(true)
  expect(findings.some(f=>f.status==='UNKNOWN'&&f.id==='mirror-reference')).toBe(true)
  expect(evaluatePhysicalReality(mirror).findings).toEqual(findings)
 })
 it('accepts UNKNOWN evidence in the server preflight instead of treating it as a conflict',async()=>{
  vi.stubEnv('GEMINI_API_KEY','')
  const ctx={...base,referenceImagePresent:false,roomReferencePresent:false}
  const compiled=compilePrompt(ctx)
  expect(compiled.validation.isValid).toBe(true)
  const spec=buildSceneSpecification(ctx,compiled.result,compiled.validation)
  expect(inspectSharedScene(spec.physicalScene).some(f=>f.status==='UNKNOWN')).toBe(true)
  const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sceneSpecification:spec})
  }))
  expect(response.status).toBe(503)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('GEMINI_NOT_CONFIGURED')
 })
 it('reuses identical clothing, mirror and room findings in local engine and the portable core',()=>{
  const scenes:CompilationContext[]=[
   {...base,color:'white'},
   {...base,bedroomShotId:'mirror_floor',mirrorMovementId:'wave'},
   {...base,bedroomShotId:'mirror_floor_angle',mirrorPhoneHeightId:'face'},
   {...base,roomPhysicalState:{order:'invalid' as 'clear',surface:'dust',zones:['bed'],sessionLocked:true}},
   {...base,upperGarmentId:'regular_crewneck_tshirt',materialId:'mediumweight_jersey',fitId:'regular',surface:'ribbed',color:'charcoal'}
  ]
  for(const ctx of scenes){
   const shared=inspectSharedScene(toSharedScene(ctx))
   const local=evaluatePhysicalReality(ctx).findings.filter(x=>shared.some(s=>s.id===x.id))
   expect(local).toEqual(shared)
   expect(shared.length).toBeGreaterThan(0)
  }
 })
 it('blocks forged garment, room and occupied-hand selections at the server before Gemini',async()=>{
  const variants=[
   (spec:ReturnType<typeof buildSceneSpecification>)=>({
    ...spec,physicalScene:{...spec.physicalScene,color:'white'},selections:{...spec.selections,upperColor:'white'}
   }),
   (spec:ReturnType<typeof buildSceneSpecification>)=>({
    ...spec,physicalScene:{...spec.physicalScene,roomPhysicalState:{order:'bad' as 'clear',surface:'dust' as const,zones:['bed' as const],sessionLocked:true}},
    selections:{...spec.selections,roomPhysicalState:{order:'bad' as 'clear',surface:'dust' as const,zones:['bed' as const],sessionLocked:true}}
   }),
   (spec:ReturnType<typeof buildSceneSpecification>)=>({
    ...spec,physicalScene:{...spec.physicalScene,mirrorMovementId:'bad'},
    selections:{...spec.selections,mirrorMovementId:'bad'}
   })
  ]
  const compiled=compilePrompt(base)
  const original=buildSceneSpecification(base,compiled.result,compiled.validation)
  for(const mutate of variants){
   const changed=mutate(original)
   const {integrity:ignored,...unsigned}=changed
   const spec={...unsigned,integrity:sceneFingerprint(unsigned)}
   const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sceneSpecification:spec})
   }))
   expect(response.status).toBe(400)
   expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_PHYSICS')
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
  expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_PHYSICS_MISMATCH')
 })
})
