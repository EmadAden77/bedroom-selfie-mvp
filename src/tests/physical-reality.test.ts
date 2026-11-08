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
 bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:'led_spotlight',
 phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY'
}
describe('Physical Reality Engine V1',()=>{
 it('allows only the rear LED in strict mirror flash and preserves stored lighting',()=>{
  const original=structuredClone(base)
  const p=evaluatePhysicalReality(base)
  expect(p.issues).toEqual([])
  expect(p.effectiveLightingId).toBe('camera_flash')
  expect(p.emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_rear_led'])
  expect(base).toEqual(original)
  expect(effectivePhysicalContext(base).nightLightingId).toBe('camera_flash')
  expect(base.nightLightingId).toBe('led_spotlight')
  expect(evaluatePhysicalReality({...base,phoneOnlyIlluminationMode:'OFF'}).effectiveLightingId).toBe('led_spotlight')
  expect(renderPhysicalReality(base)).toContain('existing wardrobe mirror')
 })
 it('allows only the phone display in front capture',()=>{
  const p=evaluatePhysicalReality({...base,bedroomShotId:'bed_edge',phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'})
  expect(p.issues).toEqual([])
  expect(p.emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_display'])
  expect(p.effectiveLightingId).toBe('phone_screen')
  expect(p.effects.join(' ')).toContain('rear LED is switched off')
 })
 it('rejects mismatched cameras without changing any shot',()=>{
  const ctx={...base,bedroomShotId:'mirror_wardrobe'}
  const p=evaluatePhysicalReality(ctx)
  expect(p.issues.map(i=>i.code)).toContain('REAR_MIRROR_REQUIRED')
  expect(ctx.bedroomShotId).toBe('mirror_wardrobe')
  const failed=compilePrompt(ctx)
  expect(failed.validation.isValid).toBe(false)
  expect(failed.result.promptText).toBe('')
 })
 it('rejects rear LED in front screen mode and disabled laptop scenes',()=>{
  const bad=evaluatePhysicalReality({...base,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'})
  expect(bad.issues.map(i=>i.code)).toContain('FRONT_SELFIE_REQUIRED')
  const laptop=evaluatePhysicalReality({...base,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY',bedroomShotId:'laptop_bed'})
  expect(laptop.issues.map(i=>i.code)).toContain('LAPTOP_SCREEN_CONFLICT')
 })
 it('compiles source restrictions into immutable Gemini specification',()=>{
  const {validation,result}=compilePrompt(base)
  expect(validation.errors).toEqual([])
  expect(validation.isValid).toBe(true)
  expect(result.sections.find(s=>s.id==='night_lighting_camera_flash')).toBeDefined()
  expect(result.sections.find(s=>s.id==='physical_reality')?.content).toContain('phone_rear_led')
  expect(result.promptText).not.toContain('dim household illumination remains subordinate')
  const spec=buildSceneSpecification(base,result,validation)
  expect(spec.capture.lighting).toBe('camera_flash')
  expect(spec.selections.phoneOnlyIlluminationMode).toBe('DARK_ROOM_REAR_FLASH_ONLY')
  expect(spec.mandatoryUnitIds).toContain('physical_reality')
 })
})
