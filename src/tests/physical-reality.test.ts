import {describe,it,expect} from 'vitest'
import {evaluatePhysicalReality,effectivePhysicalContext,renderPhysicalReality} from '../engine/physical-reality'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:'camera_flash',
 phoneOnlyIlluminationMode:'OFF'
}
describe('Single-emitter blackout physical reality',()=>{
 it('respects explicitly selected rear flash with no automatic light switching',()=>{
  const snapshot=structuredClone(base)
  const physical=evaluatePhysicalReality(base)
  expect(physical.issues).toEqual([])
  expect(physical.effectiveLightingId).toBe('camera_flash')
  expect(physical.emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_rear_led'])
  expect(effectivePhysicalContext(base)).toEqual(base)
  expect(base).toEqual(snapshot)
  expect(renderPhysicalReality(base)).toContain('microscopic skin texture')
 })
 it('permits a front selfie lit only by the phone screen',()=>{
  const ctx={...base,bedroomShotId:'bed_edge',nightLightingId:'phone_screen',poseId:'seated_bed'}
  const result=evaluatePhysicalReality(ctx)
  expect(result.issues).toEqual([])
  expect(result.emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_display'])
  expect(result.effects.join(' ')).toContain('cool blue color cast')
  expect(result.effects.join(' ')).toContain('rectangular catchlight')
 })
 it('rejects incompatible mirror-flash selections without rewriting the shot',()=>{
  const ctx={...base,nightLightingId:'led_spotlight'}
  const physical=evaluatePhysicalReality(ctx)
  expect(physical.issues.map(i=>i.code)).toContain('MIRROR_FLASH_REQUIRED')
  expect(ctx.bedroomShotId).toBe('mirror_rear_flash')
  const result=compilePrompt(ctx)
  expect(result.validation.isValid).toBe(false)
  expect(result.result.promptText).toBe('')
 })
 it('rejects rear-camera flash in a front selfie and laptop light without a laptop',()=>{
  expect(evaluatePhysicalReality({...base,bedroomShotId:'bed_edge'}).issues.map(i=>i.code)).toContain('FLASH_CAMERA_REQUIRED')
  expect(evaluatePhysicalReality({...base,bedroomShotId:'bed_edge',nightLightingId:'laptop_screen'}).issues.map(i=>i.code)).toContain('LAPTOP_REQUIRED')
 })
 it('locks selected flash physics into the Gemini scene specification',()=>{
  const {validation,result}=compilePrompt(base)
  expect(validation.errors).toEqual([])
  expect(result.sections.find(s=>s.id==='night_lighting_camera_flash')?.content).toContain('hard-edged shadows')
  expect(result.sections.find(s=>s.id==='physical_reality')?.content).toContain('phone_rear_led')
  const spec=buildSceneSpecification(base,result,validation)
  expect(spec.capture.lighting).toBe('camera_flash')
  expect(spec.lighting.activeLightSource).toBe('camera_flash')
  expect(spec.mandatoryUnitIds).toContain('physical_reality')
 })
})
