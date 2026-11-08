import {describe,it,expect} from 'vitest'
import {bedroomShots} from '../data/bedroom-shots'
import {compilePrompt} from '../compiler'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {mirrorMovements,mirrorDistances,mirrorPhoneHeights,mirrorFramings,mirrorGazes} from '../data/mirror-controls'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',
 lowerGarmentId:null,materialId:'lightweight_cotton_appearance_jersey',
 fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:false,nightLightingId:'led_spotlight'
}
describe('Independent mirror photography with Gemini and physical geometry',()=>{
 it('preserves all 15 canonical mirror poses and all original bedroom shots',()=>{
  expect(bedroomShots).toHaveLength(98)
  expect(bedroomShots.filter(s=>s.mode==='mirror')).toHaveLength(15)
  expect(mirrorMovements.length).toBeGreaterThanOrEqual(10)
  expect(mirrorDistances.length).toBe(4)
  expect(mirrorPhoneHeights.length).toBe(4)
  expect(mirrorFramings.length).toBe(4)
  expect(mirrorGazes.length).toBe(4)
 })
 it('compiles selected mirror motion and optics into separate local section',()=>{
  const c=compilePrompt({...base,bedroomShotId:'mirror_wardrobe',mirrorMovementId:'touch_hair',mirrorPhoneHeightId:'chest',mirrorDistanceId:'comfortable',mirrorFramingId:'full_body',mirrorGazeId:'screen'})
  expect(c.validation.isValid).toBe(true)
  const mirror=c.result.sections.find(s=>s.id==='mirror_composition')?.content||''
  expect(mirror).toContain('MIRROR COMPOSITION:')
  expect(mirror).toContain('Free fingertips lightly touch')
  expect(mirror).toContain('Phone at upper chest level')
  expect(mirror).toContain('existing free clearance between wardrobe and bed')
  expect(mirror).toContain('whole person')
  expect(mirror).toContain('real phone screen facing the subject')
  expect(mirror).toContain('Equal-angle reflection')
  expect(c.result.promptText).not.toContain('FRONT SELFIE CAPTURE:')
 })
 it('routes the same chosen movement, geometry and actual room to Gemini',()=>{
  const text=buildCreativeSceneBrief({...base,bedroomShotId:'mirror_wardrobe',mirrorMovementId:'peace',mirrorPhoneHeightId:'face',mirrorDistanceId:'close',mirrorFramingId:'three_quarter',mirrorGazeId:'reflection'})
  expect(text).toContain('Mirror scene geometry:')
  expect(text).toContain('RIGHT wall')
  expect(text).toContain('REAR-camera')
  expect(text).toContain('peace sign')
  expect(text).toContain('Phone held near face level')
  expect(text).not.toContain('Equal-angle')
  expect(text).not.toContain('FRONT SELFIE CAPTURE:')
 })
 it('rejects a second free-hand action on a fixed-action shot',()=>{
  const c=compilePrompt({...base,bedroomShotId:'mirror_jacket',mirrorMovementId:'peace'})
  expect(c.validation.isValid).toBe(false)
  expect(c.validation.errors).toContain('Mirror shot already assigns the free hand a task')
 })
 it('rejects a camera height contradicting a physically specified shot',()=>{
  const c=compilePrompt({...base,bedroomShotId:'mirror_floor_angle',mirrorPhoneHeightId:'face'})
  expect(c.validation.isValid).toBe(false)
  expect(c.validation.errors).toContain('Mirror camera height conflicts with selected shot')
 })
 it('keeps standard front selfie untouched by dormant mirror controls',()=>{
  const c=compilePrompt({...base,bedroomShotId:'bed_edge',mirrorMovementId:'touch_hair',mirrorPhoneHeightId:'waist'})
  expect(c.validation.isValid).toBe(true)
  expect(c.result.sections.some(s=>s.id==='mirror_composition')).toBe(false)
  expect(buildCreativeSceneBrief({...base,bedroomShotId:'bed_edge',mirrorMovementId:'touch_hair'})).not.toContain('Mirror scene geometry:')
 })
})
