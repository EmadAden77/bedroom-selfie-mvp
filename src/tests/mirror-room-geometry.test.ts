import {describe,expect,it} from 'vitest'
import type {CompilationContext} from '../domain/types'
import {buildMirrorRoomReferenceGeometry} from '../data/mirror-room-geometry'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {renderMirrorComposition} from '../data/mirror-controls'
import {PHYSICS_ONLY_SYSTEM} from '../../api/generate-main-prompt'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'gray',surface:'knit',
 referenceImagePresent:false,roomReferencePresent:true,nightLightingId:'ceiling_neutral',
 bedroomShotId:'mirror_wardrobe'
}

describe('Reference-grounded mirror room geometry',()=>{
 it('is active only for wardrobe-mirror poses, never regular selfies',()=>{
  expect(buildMirrorRoomReferenceGeometry(base)).toContain('WARDROBE-MIRROR SELFIE')
  expect(buildMirrorRoomReferenceGeometry({...base,bedroomShotId:'mirror_floor'})).toContain('REFERENCE ROOM PLAN')
  expect(buildMirrorRoomReferenceGeometry({...base,bedroomShotId:'high_angle'})).toBe('')
 })
 it('keeps rug-seated and bed-edge mirror poses physically seated',()=>{
  for(const shot of ['mirror_floor','mirror_bed_reflection']){
   const text=buildMirrorRoomReferenceGeometry({...base,bedroomShotId:shot})
   expect(text).toContain('Person stays seated')
   expect(text).toContain('selected real rug/bed support')
   expect(text).not.toContain('Person stands balanced')
   expect(text).toContain('Do not impose a standing 3-metre bed clearance')
  }
 })
 it('preserves two real mirrors but one primary recording surface',()=>{
  const layout=buildMirrorRoomReferenceGeometry(base)
  expect(layout).toContain('LEFT wall')
  expect(layout).toContain('RIGHT wall')
  expect(layout).toContain('vanity/dresser mirror')
  expect(layout).toContain('PRIMARY recording surface')
  expect(layout).toContain('REAR cameras')
  expect(layout).toContain('equal angles')
 })
 it('treats 3 m and 5 m as approximate geometry, not optical proof',()=>{
  const layout=buildMirrorRoomReferenceGeometry(base)
  expect(layout).toContain('roughly 3-metre')
  expect(layout).toContain('5-metre depth landmark')
  expect(layout).toContain('only if physically confirmed')
  expect(layout).toContain('only when within that real reflected field of view')
  expect(layout).toContain('do not invent a sofa')
 })
 it('reaches the main Gemini scene and offline fallback, without transferring photos',()=>{
  const brief=buildCreativeSceneBrief(base)
  const local=renderMirrorComposition(base)
  for(const output of [brief,local]){
   expect(output).toContain('Fixed mirror-selfie room topology:')
   expect(output).toContain('roughly 3-metre')
   expect(output).toContain('5-metre depth landmark')
   expect(output).toContain('The vanity/dresser mirror')
  }
  expect(brief).toContain('Gemini does not receive or see it')
 })
 it('does not assume unseen sofa or claim provider saw room reference',()=>{
  const layout=buildMirrorRoomReferenceGeometry({...base,roomReferencePresent:false})
  expect(layout).toContain('No room photo is attached')
  expect(layout).toContain('Do NOT invent unseen furniture')
  expect(PHYSICS_ONLY_SYSTEM).toContain('CONSTRAINED PROMPT EDITOR')
  expect(layout).toContain('real reflected field of view')
 })
})
