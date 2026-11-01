import {describe,it,expect} from 'vitest'
import {compilePrompt} from '../compiler'
import type {CompilationContext} from '../domain/types'
import {DEFAULT_ROOM_PHYSICAL_STATE,selectedRoomObjects,renderRoomPhysicalState,validateRoomPhysicalState,ROOM_ZONES} from '../data/room-physical-state'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {getAuditCriteria} from '../features/photo-result-audit/audit'
import {makeAuditCorrection} from '../features/photo-result-audit/correction'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral',
 roomPhysicalState:{...DEFAULT_ROOM_PHYSICAL_STATE,zones:[...DEFAULT_ROOM_PHYSICAL_STATE.zones]}
}
describe('Physical room state (user configured)',()=>{
 it('defaults to visible clutter, limited dust, all four editable zones and fixed session arrangement',()=>{
  const state=DEFAULT_ROOM_PHYSICAL_STATE
  expect(state).toMatchObject({order:'clear',surface:'dust',sessionLocked:true,zones:['bed','floor','dresser','nightstand']})
  expect(selectedRoomObjects(state)).toHaveLength(8)
  expect(new Set(selectedRoomObjects(state).map(o=>o.id)).size).toBe(8)
  expect(ROOM_ZONES).toHaveLength(4)
 })
 it('keeps the exact same object anchors and positions across camera angles',()=>{
  const normal=renderRoomPhysicalState(base)
  const mirror=renderRoomPhysicalState({...base,bedroomShotId:'mirror_floor',nightLightingId:'rear_flash'})
  const front=renderRoomPhysicalState({...base,bedroomShotId:'bed_edge',nightLightingId:'phone_screen_only'})
  expect(normal).toBe(mirror)
  expect(normal).toBe(front)
  expect(normal).toContain('SESSION CONTINUITY:')
  expect(normal).toContain('floor_shoes_01')
  expect(normal).toContain('nightstand_cable_01')
 })
 it('keeps dust local, ceramic grid and both real mirror sightlines grounded',()=>{
  const text=renderRoomPhysicalState(base)
  expect(text).toContain('LIMITED DUST:')
  expect(text).toContain('skirting corners')
  expect(text).toContain('ceramic tile grid')
  expect(text).toContain('grout alignment')
  expect(text).toContain('SAME anchored room objects')
  expect(text).toContain('actual fixtures')
  expect(text).toContain('No dirt film')
  expect(text).toMatch(/Do not|do not|Never invent/)
 })
 it('respects selected zones and preserves reference-only state with no new items',()=>{
  const state={...DEFAULT_ROOM_PHYSICAL_STATE,zones:['floor'] as const}
  // compile-time readonly zone arrays are normalized to the actual mutable domain array.
  const floor={...state,zones:[...state.zones]}
  expect(selectedRoomObjects(floor)).toHaveLength(2)
  expect(selectedRoomObjects(floor).every(x=>x.zone==='floor')).toBe(true)
  const ref={...DEFAULT_ROOM_PHYSICAL_STATE,order:'reference' as const}
  expect(selectedRoomObjects(ref)).toEqual([])
  expect(renderRoomPhysicalState({...base,roomPhysicalState:ref})).toContain('add no objects')
 })
 it('rejects malformed zones and surface IDs',()=>{
  expect(validateRoomPhysicalState({...DEFAULT_ROOM_PHYSICAL_STATE,zones:['bed','bed']})).toContain('Invalid editable room zones')
  expect(validateRoomPhysicalState({...DEFAULT_ROOM_PHYSICAL_STATE,zones:['roof' as any]})).toContain('Invalid editable room zones')
  expect(validateRoomPhysicalState({...DEFAULT_ROOM_PHYSICAL_STATE,surface:'broken' as any})).toContain('Invalid room surface')
 })
 it('feeds the real state into local prompt AND concise Gemini brief without legacy clutter repetition',()=>{
  const local=compilePrompt(base)
  expect(local.validation.isValid).toBe(true)
  expect(local.result.errors).toEqual([])
  expect(local.result.sections.filter(s=>s.id==='physical_room_state')).toHaveLength(1)
  expect(local.result.sections.some(s=>s.id==='lived_in_bedroom_clutter')).toBe(false)
  expect(local.result.promptText).toContain('PHYSICAL ROOM STATE')
  const gemini=buildCreativeSceneBrief(base)
  expect(gemini).toContain('PHYSICAL ROOM STATE:')
  expect(gemini).toContain('dresser_items_01')
  expect(gemini).toContain('LIMITED DUST:')
  expect(gemini).not.toContain('Selected room appearance: an authentically lived-in')
  expect(gemini.length).toBeLessThan(12000)
 })
 it('keeps the existing legacy clutter mode compatible when new controls are absent',()=>{
  const legacy={...base,roomPhysicalState:undefined,bedroomClutterId:'lived_in_messy' as const}
  const compiled=compilePrompt(legacy)
  expect(compiled.validation.isValid).toBe(true)
  expect(compiled.result.sections.some(s=>s.id==='lived_in_bedroom_clutter')).toBe(true)
  expect(compiled.result.sections.some(s=>s.id==='physical_room_state')).toBe(false)
 })
 it('adds room surface and object review criteria only when room state is configured',()=>{
  const criteria=getAuditCriteria(base)
  expect(criteria).toHaveLength(12)
  expect(criteria.map(x=>x.id)).toContain('tile_grid')
  expect(criteria.map(x=>x.id)).toContain('room_session')
  expect(criteria.find(x=>x.id==='camera')?.expectation).toContain('Xiaomi 15 Ultra')
  const correction=makeAuditCorrection(base,{tile_grid:'fail',room_objects:'fail',identity:'pass'},'check contacts')
  expect(correction).toContain('reference ceramic tile boundaries')
  expect(correction).toContain('selected stable movable-object anchors')
  expect(correction).toContain('KEEP VERIFIED DETAILS: identity')
  expect(getAuditCriteria({...base,roomPhysicalState:undefined})).toHaveLength(8)
 })
})
