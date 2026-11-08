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
 bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'phone_screen' as const,
 windowUncovered:false}
const active=(x:CompilationContext)=>evaluatePhysicalReality(x).emitters.filter(e=>e.enabled).map(e=>e.id)
describe('Blackout lighting state transition and authority regression',()=>{
 it('never overrides selected emitters or unrelated identity, room and clothing',()=>{
  const original=structuredClone(selected)
  const changed={...selected,nightLightingId:'led_spotlight' as const}
  expect(active(selected)).toEqual(['phone_display'])
  expect(active(changed)).toEqual(['ceiling'])
  expect(effectivePhysicalContext(changed)).toEqual(changed)
  expect(selected).toEqual(original)
 })
 it('requires users to correct invalid capture and lighting combinations',()=>{
  const invalid={...selected,bedroomShotId:'mirror_rear_flash'}
  expect(evaluatePhysicalReality(invalid).issues.map(i=>i.code)).toContain('MIRROR_FLASH_REQUIRED')
  expect(compilePrompt(invalid).result.promptText).toBe('')
  const corrected=reconcileCaptureSelection(invalid,{nightLightingId:'camera_flash' as const})
  expect(corrected.bedroomShotId).toBe('mirror_rear_flash')
  expect(corrected.upperGarmentId).toBe(selected.upperGarmentId)
  expect(active(corrected)).toEqual(['phone_rear_led'])
  expect(compilePrompt(corrected).validation.isValid).toBe(true)
 })
 it('preserves one local source throughout the Gemini specification and scene brief',()=>{
  for(const [shotId,light,emitter,pose] of [
   ['mirror_rear_flash','camera_flash','phone_rear_led','standing'],
   ['bed_edge','phone_screen','phone_display','seated_bed']
  ] as const){
   const ctx={...selected,bedroomShotId:shotId,nightLightingId:light,poseId:pose}
   const {result,validation}=compilePrompt(ctx)
   expect(validation.isValid).toBe(true)
   const spec=buildSceneSpecification(ctx,result,validation)
   expect(spec.capture.lighting).toBe(light)
   expect(spec.derivedUnits.find(u=>u.id==='physical_reality')?.text).toContain('Active physical emitters: '+emitter+' at ')
   expect(buildCreativeSceneBrief(ctx)).toContain('Real-world illumination choice (sole emitter): '+light)
   expect(ctx.nightLightingId).toBe(light)
  }
 })
 it('blocks entering daylight in an otherwise blacked-out bedroom',()=>{
  const ctx={...selected,windowUncovered:true}
  expect(evaluatePhysicalReality(ctx).issues.map(i=>i.code)).toContain('BLACKOUT_WINDOW')
  expect(compilePrompt(ctx).result.promptText).toBe('')
  expect(compilePrompt(selected).result.promptText).toContain('no daylight')
 })
 it('detects active extra emitters even without a legacy override switch',()=>{
  expect(explicitUnauthorizedEmitter('A warm bedside lamp illuminates the face.','phone_screen')).toBe('bedside lamp')
  expect(explicitUnauthorizedEmitter('Portrait lit by ceiling lights.','phone_screen')).toBe('ceiling lights')
  expect(explicitUnauthorizedEmitter('The studio fill is on.','phone_screen')).toBe('studio fill')
  expect(explicitUnauthorizedEmitter('No bedside lamp; without ceiling lights; ring light off.','phone_screen')).toBeNull()
  expect(explicitUnauthorizedEmitter('Passive wall reflections from the phone emitter illuminate nearby skin.','phone_screen')).toBeNull()
 })
})
