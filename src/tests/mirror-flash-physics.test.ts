import {describe,it,expect} from 'vitest'
import {compilePrompt} from '../compiler'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {isMirrorFlash,nextMirrorLighting} from '../data/mirror-flash-physics'
import {PHYSICS_ONLY_SYSTEM,validatePhysicalPrompt} from '../../api/generate-main-prompt'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',
 lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',
 fitId:'regular',
 stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:false,
 bedroomShotId:'mirror_wardrobe',
 nightLightingId:'rear_flash',
 faceDirectionId:'toward_camera'
}

describe('Mirror rear LED flash optics',()=>{
 it('keeps rear flash active while changing between mirror poses',()=>{
  expect(nextMirrorLighting('mirror_wardrobe','rear_flash')).toBe('rear_flash')
  expect(nextMirrorLighting('mirror_floor','rear_flash')).toBe('rear_flash')
  expect(nextMirrorLighting('mirror_rear_flash','ceiling_neutral')).toBe('rear_flash')
  expect(nextMirrorLighting('mirror_wardrobe','phone_screen_only')).toBe('ceiling_neutral')
  expect(nextMirrorLighting('mirror_wardrobe','bedside_warm')).toBe('bedside_warm')
 })
 it.each(['mirror_wardrobe','mirror_rear_flash','mirror_bed_reflection','mirror_floor_angle'])('compiles reflected flash rays for %s',shot=>{
  const c=compilePrompt({...base,bedroomShotId:shot})
  expect(c.validation.isValid).toBe(true)
  const section=c.result.sections.find(s=>s.id==='mirror_flash_physics')?.content||''
  expect(section).toContain('MIRROR FLASH OPTICS:')
  expect(section).toContain('LED-to-glass-to-subject')
  expect(section).toContain('LED reflection')
  expect(section).toContain('flash need not force high ISO')
  expect(section).toContain('Cast a sharp shadow only where')
  expect(c.result.sections.filter(s=>s.id.startsWith('night_lighting_'))).toHaveLength(1)
  expect(c.result.promptText).not.toContain('FRONT SELFIE CAPTURE:')
 })
 it('sends conditional mirror flash physics into the concise Gemini scene brief',()=>{
  const brief=buildCreativeSceneBrief(base)
  expect(brief).toContain('Mirror scene geometry:')
  expect(brief).toContain('Mirror flash optics:')
  expect(brief).toContain('LED-to-mirror-to-subject')
  expect(brief).toContain('geometrically reflected LED')
  expect(brief).toContain('Flash does not automatically imply high ISO')
  expect(brief.length).toBeLessThan(6500)
  expect(PHYSICS_ONLY_SYSTEM).toContain('MIRROR capture selects rear_flash')
 })
 it('does not activate mirror flash physics in nonflash or nonmirror captures',()=>{
  for(const c of [
   {...base,nightLightingId:'ceiling_neutral'},
   {...base,bedroomShotId:'bed_edge',nightLightingId:'rear_flash'}
  ]){
   expect(isMirrorFlash(c)).toBe(false)
   const compiled=compilePrompt(c)
   expect(compiled.result.sections.some(s=>s.id==='mirror_flash_physics')).toBe(false)
   expect(buildCreativeSceneBrief(c)).not.toContain('Mirror flash optics:')
  }
 })
 it('requires actual LED flash in the Gemini flash-mode response',()=>{
  const context={mode:'mirror',lighting:'rear_flash'}
  const noFlash='A casual nighttime mirror selfie with a real phone and everyday room light.'
  expect(()=>validatePhysicalPrompt(noFlash,context)).toThrow('missing_rear_flash')
  const realFlash='A real rear LED flash reflects off the bedroom wardrobe mirror, producing localized natural highlights on the subject.'
  expect(()=>validatePhysicalPrompt(realFlash,context)).not.toThrow()
 })
 it('does not permit disabling flash on the fixed flash shot in the local compiler',()=>{
  const c=compilePrompt({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'ceiling_neutral'})
  expect(c.validation.isValid).toBe(false)
 })
})
