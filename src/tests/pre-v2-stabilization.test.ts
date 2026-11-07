import {describe,it,expect} from 'vitest'
import {evaluatePhysicalReality,effectivePhysicalContext,explicitUnauthorizedEmitter} from '../engine/physical-reality'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {reconcileCaptureSelection} from '../data/scene-consistency'
import type {CompilationContext} from '../domain/types'

const selected:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:'lamp_and_screen',
 windowUncovered:false,phoneOnlyIlluminationMode:'OFF'
}
const active=(x:CompilationContext)=>evaluatePhysicalReality(x).emitters.filter(e=>e.enabled).map(e=>e.id)

describe('V1 stabilization — state transitions, causal light and downstream parity',()=>{
 it('overrides effective emitters without mutating retained lighting, identity, clothing or room state',()=>{
  const original=structuredClone(selected)
  const flash={...selected,phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY' as const}
  expect(active(selected)).toEqual(['bedside','phone_display'])
  expect(active(flash)).toEqual(['phone_rear_led'])
  expect(effectivePhysicalContext(flash).nightLightingId).toBe('rear_flash')
  expect(selected).toEqual(original)
  expect(evaluatePhysicalReality({...flash,phoneOnlyIlluminationMode:'OFF'}).effectiveLightingId).toBe('lamp_and_screen')
  expect(active({...flash,phoneOnlyIlluminationMode:'OFF'})).toEqual(['bedside','phone_display'])
 })
 it('requires explicit camera choice when switching strict modes; no pose or clothing rewrites',()=>{
  const flash={...selected,phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY' as const}
  const front={...flash,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY' as const}
  expect(evaluatePhysicalReality(front).issues.some(i=>i.code==='FRONT_SELFIE_REQUIRED')).toBe(true)
  expect(compilePrompt(front).result.promptText).toBe('')
  const changed=reconcileCaptureSelection(front,{bedroomShotId:'bed_edge'})
  expect(changed.poseId).toBe('standing')
  expect(changed.upperGarmentId).toBe(selected.upperGarmentId)
  expect(changed.nightLightingId).toBe('lamp_and_screen')
  expect(evaluatePhysicalReality(changed).issues).toEqual([])
  expect(active(changed)).toEqual(['phone_display'])
  const compiled=compilePrompt(changed)
  expect(compiled.validation.isValid).toBe(true)
  expect(compiled.result.sections.find(s=>s.id==='night_lighting_phone_screen_only')).toBeDefined()
  expect(compiled.result.sections.find(s=>s.id==='night_lighting_lamp_and_screen')).toBeUndefined()
 })
 it('preserves the captured lighting authority for Gemini and optional auxiliary editor brief',()=>{
  for(const [shotId,mode,light,emitter] of [
   ['mirror_rear_flash','DARK_ROOM_REAR_FLASH_ONLY','rear_flash','phone_rear_led'],
   ['bed_edge','DARK_ROOM_FRONT_SCREEN_ONLY','phone_screen_only','phone_display']
  ] as const){
   const ctx={...selected,bedroomShotId:shotId,phoneOnlyIlluminationMode:mode}
   const {result,validation}=compilePrompt(ctx)
   expect(validation.isValid).toBe(true)
   const spec=buildSceneSpecification(ctx,result,validation)
   expect(spec.capture.lighting).toBe(light)
   expect(spec.selections.phoneOnlyIlluminationMode).toBe(mode)
   expect(spec.derivedUnits.find(u=>u.id==='physical_reality')?.text).toContain('Active physical emitters: '+emitter+' at ')
   const brief=buildCreativeSceneBrief(ctx)
   expect(brief).toContain('Real-world illumination choice: '+light)
   expect(brief).toContain('Active physical emitters: '+emitter+' at ')
   expect(brief).not.toContain('Real-world illumination choice: lamp_and_screen')
   expect(ctx.nightLightingId).toBe('lamp_and_screen')
  }
 })
 it('does not turn unverified external daylight into a simulated fact',()=>{
  const state=evaluatePhysicalReality({...selected,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY',bedroomShotId:'bed_edge',windowUncovered:true})
  expect(state.certainty).toBe('estimated')
  expect(state.warnings.some(w=>w.includes('النافذة'))).toBe(true)
  expect(state.emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_display'])
 })
 it('rejects explicit extra emitters in free-form AI responses, while allowing exclusions',()=>{
  for(const mode of ['DARK_ROOM_REAR_FLASH_ONLY','DARK_ROOM_FRONT_SCREEN_ONLY'] as const){
   expect(explicitUnauthorizedEmitter('A warm bedside lamp illuminates the face.',mode)).toBe('bedside lamp')
   expect(explicitUnauthorizedEmitter('Portrait lit by ceiling lights.',mode)).toBe('ceiling lights')
   expect(explicitUnauthorizedEmitter('The studio fill is on.',mode)).toBe('studio fill')
   expect(explicitUnauthorizedEmitter('No bedside lamp; without ceiling lights; ring light off.',mode)).toBeNull()
   expect(explicitUnauthorizedEmitter('Passive wall reflections from the phone emitter illuminate nearby skin.',mode)).toBeNull()
  }
  expect(explicitUnauthorizedEmitter('A warm bedside lamp illuminates the face.','OFF')).toBeNull()
 })
})
