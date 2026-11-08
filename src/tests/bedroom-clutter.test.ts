import {describe,it,expect} from 'vitest'
import {compilePrompt} from '../compiler'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {buildBedroomClutterGeminiBrief,renderBedroomClutter,isLivedInClutter} from '../data/bedroom-clutter'
import type {CompilationContext} from '../domain/types'
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',hairstyleMode:'preserve',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',
 lowerGarmentId:null,materialId:'lightweight_cotton_appearance_jersey',
 fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:false,nightLightingId:'led_spotlight',
 bedroomClutterId:'reference'
}
describe('Optional realistic lived-in bedroom clutter',()=>{
 it('keeps existing room default and has no clutter-specific output',()=>{
  const compiled=compilePrompt(base)
  expect(compiled.validation.isValid).toBe(true)
  expect(isLivedInClutter(base)).toBe(false)
  expect(renderBedroomClutter(base)).toBe('')
  expect(compiled.result.sections.some(s=>s.id==='lived_in_bedroom_clutter')).toBe(false)
  expect(buildCreativeSceneBrief(base)).not.toContain('Selected room appearance:')
 })
 it('rejects unknown clutter selection rather than silently inventing props',()=>{
  const invalid=compilePrompt({...base,bedroomClutterId:'fake' as CompilationContext['bedroomClutterId']})
  expect(invalid.validation.isValid).toBe(false)
  expect(invalid.validation.errors).toContain('Invalid bedroom clutter appearance')
 })
 it.each(['','mirror_wardrobe','mirror_rear_flash','bed_edge'])('produces valid realistic local prompt for shot %s',shot=>{
  const light=shot==='mirror_rear_flash'?'camera_flash':'led_spotlight'
  const c=compilePrompt({...base,bedroomClutterId:'lived_in_messy',bedroomShotId:shot,nightLightingId:light})
  expect(c.validation.isValid).toBe(true)
  expect(c.result.errors).toHaveLength(0)
  const section=c.result.sections.find(s=>s.id==='lived_in_bedroom_clutter')?.content||''
  expect(section).toContain('LIVED-IN BEDROOM CLUTTER:')
  expect(section).toContain('gravity-loaded folds')
  expect(section).toContain('existing bedside nightstand')
  expect(section).toContain('glossy beige floor')
  expect(section).toContain('9:16')
  expect(c.result.sections.filter(s=>s.id==='lived_in_bedroom_clutter')).toHaveLength(1)
  if(shot.startsWith('mirror_')){
   expect(c.result.promptText).toContain('MIRROR CAPTURE:')
   expect(c.result.promptText).not.toContain('FRONT SELFIE CAPTURE:')
  }
 })
 it('does not add unselected daylight or replace the selected screen-only light',()=>{
  const c=compilePrompt({...base,bedroomClutterId:'lived_in_messy',nightLightingId:'phone_screen'})
  expect(c.validation.isValid).toBe(true)
  expect(c.result.sections.find(s=>s.id==='night_lighting_phone_screen')?.content).toContain('the ONLY active light')
  expect(c.result.sections.filter(s=>s.id.startsWith('night_lighting_'))).toHaveLength(1)
  expect(c.result.sections.find(s=>s.id==='lived_in_bedroom_clutter')?.content).toContain('selected lighting')
 })
 it('preserves photo furniture geometry while permitting only movable clutter',()=>{
  const ctx={...base,bedroomClutterId:'lived_in_messy' as const,roomReferencePresent:true}
  const compiled=compilePrompt(ctx)
  expect(compiled.validation.isValid).toBe(true)
  expect(compiled.result.sections.find(s=>s.id==='background_continuity')?.content).toContain('small movable clutter')
  expect(compiled.result.sections.find(s=>s.id==='bedroom_environment_lock')?.content).toContain('ROOM IMAGE REFERENCE:')
  expect(compiled.result.sections.find(s=>s.id==='lived_in_bedroom_clutter')?.content).not.toContain('half-open wardrobe door reveals')
 })
 it('sends faithful, compact and light-conditional messy room brief to Gemini',()=>{
  const ctx={...base,bedroomClutterId:'lived_in_messy' as const,bedroomShotId:'mirror_wardrobe'}
  const brief=buildCreativeSceneBrief(ctx)
  expect(brief).toContain('Selected room appearance:')
  expect(brief).toContain('gravity')
  expect(brief).toContain('LEFT-wall bed')
  expect(brief).toContain('RIGHT-wall sliding wardrobe mirror')
  expect(brief).toContain('glossy beige tile floor')
  expect(brief).toContain('Use ONLY the separately selected real lighting')
  expect(brief).toContain('Mirror scene geometry:')
  expect(brief.length).toBeLessThan(12000)
  expect(buildBedroomClutterGeminiBrief(base)).toBe('')
 })
})
