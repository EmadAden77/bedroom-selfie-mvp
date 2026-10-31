import {describe,it,expect} from 'vitest'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {poseInteractionRules} from '../data/pose-interaction'
import {compilePrompt} from '../compiler'
import type {CompilationContext} from '../domain/types'
const ctx:CompilationContext={hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',referenceImagePresent:false}
describe('Physical bedroom pose interactions',()=>{
 it('preserves previous poses and includes new laptop interactions',()=>{
  expect(bedroomShots).toHaveLength(98)
  expect(new Set(bedroomShots.map(s=>s.id)).size).toBe(98)
  expect(Object.keys(poseInteractionRules)).toHaveLength(38)
  expect(new Set(Object.values(poseInteractionRules)).size).toBe(38)
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


describe('15 physically coherent wardrobe mirror poses',()=>{
 const mirrors=bedroomShots.filter(s=>s.mode==='mirror')
 it('keeps mirror options unique and anchored to one existing wardrobe mirror',()=>{
  expect(mirrors).toHaveLength(15)
  expect(new Set(mirrors.map(s=>s.description)).size).toBe(15)
  for(const shot of mirrors){
   expect(shot.requires).toBe('mirror')
   expect(shot.category).toBe(1)
   expect(shot.description).not.toMatch(/hand mirror|leaning mirror|dresser mirror|condensation on mirror/i)
   expect(getShotPosture(shot.id)).toBeDefined()
  }
 })
 it.each(mirrors)('$id compiles with only one consistent rear-camera mirror setup',shot=>{
  const light=shot.id==='mirror_rear_flash'?'rear_flash':'ceiling_neutral'
  const compiled=compilePrompt({...ctx,bedroomShotId:shot.id,poseId:'supine',faceDirectionId:'toward_camera',nightLightingId:light})
  expect(compiled.validation.isValid).toBe(true)
  expect(compiled.result.errors).toHaveLength(0)
  expect(compiled.result.promptText).toContain('MIRROR ROOM GEOMETRY:')
  expect(compiled.result.promptText).toContain('iPhone 15 Pro Max')
  expect(compiled.result.promptText).toContain('sliding wardrobe')
  expect(compiled.result.promptText).not.toContain('FRONT SELFIE CAPTURE:')
  if(shot.id==='mirror_bed_reflection'){
   expect(compiled.result.promptText).toContain('BED CONTACT CONTINUITY:')
   expect(getShotPosture(shot.id)).toBe('seated_bed')
  }
  if(shot.id==='mirror_floor')expect(getShotPosture(shot.id)).toBe('seated_floor')
  if(shot.id==='mirror_dresser')expect(getShotPosture(shot.id)).toBe('standing')
 })
 it('mirror phone gaze refers to the real display on the subject side',()=>{
  const compiled=compilePrompt({...ctx,bedroomShotId:'mirror_phone_gaze',nightLightingId:'ceiling_neutral'})
  const geometry=compiled.result.sections.find(s=>s.id==='light_pose_geometry')?.content||''
  expect(geometry).toContain('actual handset display facing the subject')
  expect(geometry).not.toContain('screen as seen in the wardrobe mirror')
 })
})
