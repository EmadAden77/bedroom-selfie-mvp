import {describe,it,expect} from 'vitest'
import type {CompilationContext} from '../domain/types'
import {OPTION_REGISTRY,ROOM_OPTION_REGISTRY,affectedFields,evaluatePhysicalReality,updatePhysicalReality,includeCompilerFindings,missingRegistrations} from '../engine/physical-reality'
import {compilePrompt} from '../compiler'
import {bedroomShots} from '../data/bedroom-shots'
import {nightLightingPresets} from '../data/night-lighting'
import {mirrorMovements,mirrorDistances,validateMirrorControls} from '../data/mirror-controls'
import {DEFAULT_ROOM_PHYSICAL_STATE} from '../data/room-physical-state'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:false,
 roomPhysicalState:{...DEFAULT_ROOM_PHYSICAL_STATE,zones:[...DEFAULT_ROOM_PHYSICAL_STATE.zones]},
 bedroomShotId:'',nightLightingId:'phone_screen_only',poseId:'seated_bed'
}
describe('Physical Reality Engine constraint graph',()=>{
 it('registers every current compilation field and declares independence or relationships',()=>{
  expect(missingRegistrations(base)).toEqual([])
  for(const key of Object.keys(OPTION_REGISTRY) as (keyof CompilationContext)[]){
   const entry=OPTION_REGISTRY[key]
   expect(entry.id).toBe(key)
   expect(entry.dependsOn.length||entry.independentReason).toBeTruthy()
  }
 })
 it('indexes all current shot, mirror and lighting option values from actual catalogues',()=>{
  expect(OPTION_REGISTRY.bedroomShotId.values).toEqual(['',...bedroomShots.map(x=>x.id)])
  expect(OPTION_REGISTRY.nightLightingId.values).toEqual(nightLightingPresets.map(x=>x.id))
  for(const x of mirrorMovements)expect(OPTION_REGISTRY.mirrorMovementId.values).toContain(x.id)
  for(const x of mirrorDistances)expect(OPTION_REGISTRY.mirrorDistanceId.values).toContain(x.id)
 })
 it('registers every nested physical room control and checks every selectable value safely',()=>{
  expect(Object.keys(ROOM_OPTION_REGISTRY).sort()).toEqual(['order','sessionLocked','surface','zones'])
  for(const order of ROOM_OPTION_REGISTRY.order.values)
   for(const surface of ROOM_OPTION_REGISTRY.surface.values){
    const state={...DEFAULT_ROOM_PHYSICAL_STATE,order:order as typeof DEFAULT_ROOM_PHYSICAL_STATE.order,
      surface:surface as typeof DEFAULT_ROOM_PHYSICAL_STATE.surface}
    expect(()=>evaluatePhysicalReality({...base,roomPhysicalState:state})).not.toThrow()
   }
  for(const field of Object.keys(OPTION_REGISTRY) as (keyof CompilationContext)[]){
   const item=OPTION_REGISTRY[field]
   if(!item.values)continue
   for(const value of item.values){
    const ctx={...base,[field]:value}
    expect(()=>evaluatePhysicalReality(ctx)).not.toThrow()
   }
  }
 })
 it('traverses transitive impacts without duplicate field IDs',()=>{
  const affected=affectedFields(['bedroomShotId'])
  expect(affected).toContain('nightLightingId')
  expect(affected).toContain('mirrorPhoneHeightId')
  expect(new Set(affected).size).toBe(affected.length)
 })
 it('rejects camera lighting contradiction through both engine and existing compiler',()=>{
  const ctx={...base,bedroomShotId:'ultrawide_rear',nightLightingId:'phone_screen_only'}
  const result=evaluatePhysicalReality(ctx)
  expect(result.status).toBe('CONFLICT')
  expect(result.findings.some(x=>x.category==='lighting'&&x.status==='CONFLICT')).toBe(true)
  expect(compilePrompt(ctx).validation.isValid).toBe(false)
 })
 it('legacy mirror validator does not promote missing reference evidence to an error',()=>{
  const ctx={...base,bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral'}
  expect(evaluatePhysicalReality(ctx).findings.some(f=>f.status==='UNKNOWN')).toBe(true)
  expect(validateMirrorControls(ctx)).toEqual([])
 })
 it('keeps unmeasured mirror geometry UNKNOWN, rather than physically impossible',()=>{
  const ctx={...base,bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral'}
  const result=evaluatePhysicalReality(ctx)
  expect(result.status).toBe('UNKNOWN')
  expect(result.findings.some(x=>x.id==='mirror-reference')).toBe(true)
  expect(compilePrompt(ctx).validation.isValid).toBe(true)
 })
 it('flags mirror hand occupancy conflicts without secretly repairing user choice',()=>{
  const ctx={...base,bedroomShotId:'mirror_floor',poseId:'seated_floor',nightLightingId:'ceiling_neutral',mirrorMovementId:'wave'}
  expect(evaluatePhysicalReality(ctx).findings.some(x=>x.id==='mirror-free-hand'&&x.status==='CONFLICT')).toBe(true)
  expect(ctx.mirrorMovementId).toBe('wave')
  expect(compilePrompt(ctx).validation.isValid).toBe(false)
 })
 it('does not require room measurements to compile a low-light mirror selfie',()=>{
  const ctx={...base,bedroomShotId:'mirror_wardrobe',poseId:'standing',roomReferencePresent:true,nightLightingId:'phone_screen_only'}
  const reality=evaluatePhysicalReality(ctx)
  expect(reality.findings.some(x=>x.id==='mirror-measurements')).toBe(true)
  expect(reality.findings.some(x=>x.status==='CONFLICT')).toBe(false)
 })
 it('preserves rare plausible selections without inventing numeric body measurements',()=>{
  const ctx={...base,bedroomShotId:'mirror_floor',poseId:'seated_floor',nightLightingId:'ceiling_neutral',mirrorDistanceId:'far'}
  expect(evaluatePhysicalReality(ctx).findings.some(x=>x.status==='CONFLICT')).toBe(false)
 })
 it('evaluates relevant rule subset and never mutates scene state',()=>{
  const ctx={...base}
  const before=JSON.stringify(ctx)
  const result=evaluatePhysicalReality(ctx,['promptTarget'])
  expect(result.evaluatedRules).toEqual([])
  expect(JSON.stringify(ctx)).toBe(before)
 })
 it('includes legacy compiler blockers in live physical diagnostics without rewriting selections',()=>{
  const ctx={...base,color:'invented emerald'}
  const validation=compilePrompt(ctx).validation
  expect(validation.isValid).toBe(false)
  const diagnostics=includeCompilerFindings(evaluatePhysicalReality(ctx),validation)
  expect(diagnostics.status).toBe('CONFLICT')
  expect(diagnostics.findings.some(f=>f.category==='clothing'&&f.status==='CONFLICT')).toBe(true)
  expect(ctx.color).toBe('invented emerald')
 })
 it('incrementally preserves unaffected findings and reaches identical full results across sequential changes',()=>{
  const one={...base}
  const full=evaluatePhysicalReality(one)
  const two={...one,promptTarget:'chatgpt' as const}
  const second=updatePhysicalReality(full,two,['promptTarget'])
  expect(second.recomputedRules).toEqual([])
  expect(second.findings).toEqual(evaluatePhysicalReality(two).findings)
  const three={...two,bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:'ceiling_neutral'}
  const third=updatePhysicalReality(second,three,['bedroomShotId','poseId','nightLightingId'])
  expect(third.status).toBe('CONFLICT')
  expect(third.findings).toEqual(evaluatePhysicalReality(three).findings)
  const four={...three,nightLightingId:'rear_flash'}
  const fourth=updatePhysicalReality(third,four,['nightLightingId'])
  expect(fourth.findings).toEqual(evaluatePhysicalReality(four).findings)
  expect(fourth.status).not.toBe('CONFLICT')
 })
 it('preserves error-on-conflict behavior through sequential changes',()=>{
  const steps:CompilationContext[]=[
   {...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'rear_flash',poseId:'standing'},
   {...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'ceiling_neutral',poseId:'standing'},
   {...base,bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral',poseId:'standing'}
  ]
  expect(steps.map(x=>evaluatePhysicalReality(x).findings.some(f=>f.status==='CONFLICT'))).toEqual([false,true,false])
 })
})
