import {describe,it,expect} from 'vitest'
import {compilePrompt} from '../compiler'
import {bedroomShots} from '../data/bedroom-shots'
import {captureLightingIssues,reconcileCaptureSelection} from '../data/scene-consistency'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {renderBedroomEnvironment} from '../data/bedroom-environment'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,
 roomReferencePresent:true,bedroomShotId:'mirror_wardrobe',nightLightingId:'led_spotlight',
 poseId:'standing',faceDirectionId:'toward_camera',lampSideId:'left'
}

describe('Cross-engine scene invariants',()=>{
 it('uses the same real Xiaomi 15 Ultra in direct and mirror captures',()=>{
  for(const shotId of ['mirror_wardrobe','mirror_rear_flash','bed_edge']){
   const mirror=shotId.startsWith('mirror_')
   const ctx={...base,bedroomShotId:shotId,nightLightingId:shotId==='mirror_rear_flash'?'camera_flash':'led_spotlight'}
   const {validation,result}=compilePrompt(ctx)
   expect(validation.isValid).toBe(true)
   expect(result.promptText).toContain('Xiaomi 15 Ultra')
   expect(result.promptText).not.toContain('iPhone 15 Pro Max')
   expect(result.promptText).not.toContain('21–22 mm')
   expect(buildCreativeSceneBrief(ctx)).toContain('Xiaomi 15 Ultra')
   if(mirror){
    expect(result.promptText).toContain('MIRROR CAPTURE:')
    expect(result.promptText).toContain('vanity mirror')
    expect(result.promptText).not.toContain('FRONT SELFIE CAPTURE:')
   }
  }
 })
 it('only says what is visible in the reference and never claims camera focal length',()=>{
  const room=renderBedroomEnvironment(base)
  expect(room).toContain('trust the actual photographed geometry and furniture')
  expect(room).not.toContain('5.2 m by 6.2 m')
  expect(room).not.toContain('60 by 60 cm')
  expect(room).not.toContain('160 by 200 cm')
  expect(room).toContain('original dresser mirror')
 })
 it('never lets a capture mode borrow a light source facing away from the person',()=>{
  expect(captureLightingIssues({...base,bedroomShotId:'bed_edge',nightLightingId:'camera_flash'})).toHaveLength(1)
  expect(captureLightingIssues({...base,bedroomShotId:'ultrawide_rear',nightLightingId:'phone_screen'})).toHaveLength(1)
  expect(captureLightingIssues({...base,bedroomShotId:'mirror_wardrobe',nightLightingId:'camera_flash'})).toEqual([])
  expect(captureLightingIssues({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'led_spotlight'})).toHaveLength(1)
  expect(captureLightingIssues({...base,bedroomShotId:'bed_edge',nightLightingId:'laptop_screen'})).toHaveLength(1)
 })
 it('does not silently change pose, shot or unrelated selections when user switches light',()=>{
  const selected=reconcileCaptureSelection({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'camera_flash'},{nightLightingId:'led_spotlight'})
  expect(selected.bedroomShotId).toBe('mirror_rear_flash')
  expect(selected.nightLightingId).toBe('led_spotlight')
  const explicit=reconcileCaptureSelection({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'camera_flash'},{bedroomShotId:'mirror_floor',nightLightingId:'led_spotlight'})
  expect(explicit.bedroomShotId).toBe('mirror_floor')
  expect(explicit.poseId).toBe('standing') // pose updates are the responsibility of the explicit shot selector
  const clothing=reconcileCaptureSelection(base,{color:'blue'})
  expect(clothing.bedroomShotId).toBe('mirror_wardrobe')
  expect(clothing.color).toBe('blue')
 })
 it.each(bedroomShots.filter(s=>s.mode==='mirror'))('preserves the wardrobe reflective surface in $id',shot=>{
  const lighting=shot.id==='mirror_rear_flash'?'camera_flash':'led_spotlight'
  const compiled=compilePrompt({...base,bedroomShotId:shot.id,nightLightingId:lighting})
  expect(compiled.validation.isValid).toBe(true)
  const prompt=compiled.result.promptText
  expect(prompt).toContain('fixed vertical sliding wardrobe mirror')
  expect(prompt).toContain('Xiaomi 15 Ultra')
  expect(prompt).not.toContain('Apple iPhone 15 Pro Max')
 })
})
