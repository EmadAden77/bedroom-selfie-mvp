import {describe,it,expect} from 'vitest'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {poseInteractionRules} from '../data/pose-interaction'
import {compilePrompt} from '../compiler'
import type {CompilationContext} from '../domain/types'
const ctx:CompilationContext={hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',referenceImagePresent:false}
describe('30 new bedroom poses',()=>{
 it('extends exactly sixty shots with thirty unique real interactions',()=>{
  expect(bedroomShots).toHaveLength(90)
  expect(new Set(bedroomShots.map(s=>s.id)).size).toBe(90)
  expect(Object.keys(poseInteractionRules)).toHaveLength(30)
  expect(new Set(Object.values(poseInteractionRules)).size).toBe(30)
 })
 it.each(bedroomShots.filter(s=>s.id in poseInteractionRules))('Interaction $id has posture and valid compiled prompt',s=>{
   expect(getShotPosture(s.id)).toBeDefined()
   const compiled=compilePrompt({...ctx,bedroomShotId:s.id,nightLightingId:'ceiling_dim'})
   expect(compiled.validation.isValid).toBe(true)
   expect(compiled.result.errors).toHaveLength(0)
   expect(compiled.result.sections.find(v=>v.id==='pose_interaction')?.content).toContain(poseInteractionRules[s.id])
   if(s.mode==='timer')expect(compiled.result.promptText).toContain('stable phone support')
 })
 it('previous poses do not acquire additional interaction commands',()=>{
   const compiled=compilePrompt({...ctx,bedroomShotId:'bed_edge',nightLightingId:'ceiling_dim'})
   expect(compiled.result.sections.some(s=>s.id==='pose_interaction')).toBe(false)
 })
})
