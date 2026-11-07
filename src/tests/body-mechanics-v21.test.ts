import {describe,it,expect} from 'vitest'
import {evaluateBodyMechanics,renderBodyMechanics,type BodyMechanicalInput} from '../../shared/body-mechanics'
import {deriveBodyScene} from '../engine/body-mechanics'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {evaluatePhysicalReality} from '../engine/physical-reality'
import type {CompilationContext} from '../domain/types'

const basic:BodyMechanicalInput={
 shotId:'mirror_wardrobe',posture:'standing',capture:'mirror',
 holdingHand:'auto',supportChoice:'auto',freeHandTask:'auto',feetVisibility:'unknown'
}
const body=(changes:Partial<BodyMechanicalInput>={})=>evaluateBodyMechanics({...basic,...changes})
const scene:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral',poseId:'standing'
}
const errorCodes=(data:ReturnType<typeof body>)=>data.issues.map(i=>i.code)

describe('Physical Reality Engine V2.1 — deterministic body contacts and mechanics',()=>{
 it('01 valid standing selfie',()=>{
  const x=body()
  expect(x.status).toBe('VALID')
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.feet',targetId:'room.floor',contactType:'support'}))
 })
 it('02 valid seated bed selfie',()=>{
  const x=body({shotId:'bed_edge',posture:'seated_bed',capture:'front'})
  expect(x.status).toBe('VALID')
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.pelvis',targetId:'bed.mattress'}))
 })
 it('03 valid seated floor mirror selfie',()=>{
  const x=body({shotId:'mirror_floor',posture:'seated_floor'})
  expect(x.status).toBe('VALID')
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.pelvis',targetId:'room.floor'}))
 })
 it('04 pelvis contact causes qualitative local mattress depression',()=>{
  const x=body({shotId:'bed_edge',posture:'seated_bed',capture:'front'})
  expect(x.deformations).toContainEqual(expect.objectContaining({targetId:'bed.mattress',region:'pelvis_contact',cause:'subject.pelvis'}))
 })
 it('05 standing on floor does not depress the bed',()=>{
  expect(body().deformations.filter(d=>d.targetId==='bed.mattress')).toEqual([])
 })
 it('06 floor-sitting without bed contact does not depress mattress',()=>{
  expect(body({shotId:'mirror_floor',posture:'seated_floor'}).deformations).toEqual([])
 })
 it('07 pillow deformation follows an explicitly selected contact shot only',()=>{
  const touched=body({shotId:'cheek_pillow',posture:'side_lying_right',capture:'front'})
  expect(touched.deformations.some(d=>d.targetId==='bed.pillow')).toBe(true)
  const notTouched=body({shotId:'bed_edge',posture:'seated_bed',capture:'front'})
  expect(notTouched.deformations.some(d=>d.targetId==='bed.pillow')).toBe(false)
 })
 it('08 phone grip occupies one camera hand',()=>{
  const x=body({holdingHand:'right'})
  expect(x.contacts.filter(c=>c.contactType==='grip')).toEqual([
   expect.objectContaining({actorId:'subject.right_hand',targetId:'phone'})
  ])
 })
 it('09 rejects conflicting second phone grip by free hand',()=>{
  expect(errorCodes(body({freeHandTask:'phone'}))).toContain('BODY_HAND_OCCUPANCY_CONFLICT')
 })
 it('10 front camera keeps a physical phone grip',()=>{
  const x=body({posture:'seated_bed',shotId:'bed_edge',capture:'front'})
  expect(x.status).toBe('VALID')
  expect(x.contacts.some(c=>c.contactType==='grip'&&c.targetId==='phone')).toBe(true)
 })
 it('11 rear-camera mirror keeps a real grip and unmeasured ray geometry',()=>{
  const x=body()
  expect(x.contacts.some(c=>c.contactType==='grip')).toBe(true)
  expect(x.uncertainties).toContain('MIRROR_RAY_COORDINATES_UNMEASURED')
 })
 it('12 timer camera requires stable independent surface with no gripped phone',()=>{
  const x=body({shotId:'cross_legged_timer',posture:'seated_bed',capture:'timer'})
  expect(x.status).toBe('VALID')
  expect(x.contacts.some(c=>c.actorId==='phone'&&c.targetId==='existing.stable_support')).toBe(true)
  expect(x.contacts.filter(c=>c.contactType==='grip')).toEqual([])
 })
 it('13 timer cannot retain an explicit camera hand',()=>{
  expect(errorCodes(body({shotId:'cross_legged_timer',posture:'seated_bed',capture:'timer',holdingHand:'left'}))).toContain('BODY_TIMER_HAND_OCCUPIED')
 })
 it('14 feet outside frame are not declared missing',()=>{
  const x=body({feetVisibility:'outside_crop'})
  expect(x.status).toBe('VALID')
  expect(x.visibility.feet).toBe('outside_crop')
  expect(x.contacts.some(c=>c.actorId==='subject.feet')).toBe(true)
 })
 it('15 visually occluded feet retain physical support',()=>{
  const x=body({feetVisibility:'occluded'})
  expect(x.status).toBe('VALID')
  expect(x.visibility.feet).toBe('occluded')
  expect(x.issues).toEqual([])
 })
 it('16 missing standing foot support is invalid',()=>{
  expect(errorCodes(body({feetVisibility:'absent'}))).toContain('BODY_STANDING_FEET_ABSENT')
 })
 it('17 explicitly unsupported seated posture is invalid',()=>{
  expect(errorCodes(body({shotId:'bed_edge',posture:'seated_bed',capture:'front',supportChoice:'none'}))).toContain('BODY_SUPPORT_CONFLICT')
 })
 it('18 lying bed body with explicitly selected floor-only support is invalid',()=>{
  expect(errorCodes(body({shotId:'ceiling_gaze',posture:'supine',capture:'front',supportChoice:'floor'}))).toContain('BODY_SUPPORT_CONFLICT')
 })
 it('19 unknown support or missing posture needs information, not rejection',()=>{
  expect(body({supportChoice:'unknown'}).status).toBe('NEEDS_INFORMATION')
  const x=body({shotId:'',posture:''})
  expect(x.status).toBe('NEEDS_INFORMATION')
  expect(x.contacts.some(c=>c.contactType==='support'&&c.actorId==='subject.pelvis')).toBe(false)
 })
 it('20 no invented numerical wrist, shoulder or elbow angles',()=>{
  const x=renderBodyMechanics(body())
  expect(x).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:degrees?|°|N|cm)\b/i)
  expect(x).toContain('exact joint angles are not asserted')
 })
 it('21 standing mechanics do not move any room furniture',()=>{
  const x=renderBodyMechanics(body())
  expect(x).not.toMatch(/move the bed|relocate the wardrobe|shift furniture/i)
  expect(x).toContain('room anchors')
 })
 it('22 preserves the user-selected posture even when another shot is chosen',()=>{
  const c={...scene,poseId:'prone',bedroomShotId:'mirror_wardrobe'}
  const before=structuredClone(c)
  const x=deriveBodyScene(c)
  expect(x.input.posture).toBe('standing')
  expect(c).toEqual(before)
 })
 it('23 preserves user clothing choices and body identity',()=>{
  const c={...scene,color:'apparent dark charcoal-gray as observed',bodyHoldingHand:'left' as const}
  deriveBodyScene(c)
  expect(c.color).toBe(scene.color)
  expect(c.upperGarmentId).toBe(scene.upperGarmentId)
 })
 it('24 fixed right-handed pose detects a left-hand conflict',()=>{
  const x=body({shotId:'side_knee_tucked',posture:'side_lying_left',capture:'front',holdingHand:'left'})
  expect(errorCodes(x)).toContain('BODY_FIXED_HAND_CONFLICT')
 })
 it('25 derived phone hand honors a shot-specific explicit fact without inventing the other side',()=>{
  const x=body({shotId:'side_knee_tucked',posture:'side_lying_left',capture:'front'})
  expect(x.contacts.find(c=>c.contactType==='grip')).toEqual(expect.objectContaining({actorId:'subject.right_hand',certainty:'derived'}))
  expect(body().contacts.find(c=>c.contactType==='grip')?.actorId).toBe('subject.camera_hand')
 })
 it('26 floor-to-bed free elbow contact does not convert seated floor pelvis into bed support',()=>{
  const x=body({shotId:'floor_elbow_bed_edge',posture:'seated_floor',capture:'front'})
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.free_elbow',targetId:'bed.mattress'}))
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.pelvis',targetId:'room.floor'}))
  expect(x.deformations).toEqual([expect.objectContaining({region:'elbow_contact'})])
 })
 it('27 V1 strict rear LED flash remains sole light after biomechanics derivation',()=>{
  const c={...scene,bedroomShotId:'mirror_rear_flash',phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY' as const}
  const before=c.nightLightingId
  deriveBodyScene(c)
  expect(evaluatePhysicalReality(c).emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_rear_led'])
  expect(c.nightLightingId).toBe(before)
 })
 it('28 V1 strict front display light remains sole light',()=>{
  const c={...scene,bedroomShotId:'bed_edge',phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY' as const}
  deriveBodyScene(c)
  expect(evaluatePhysicalReality(c).emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_display'])
 })
 it('29 local compilation is deterministic and inserts the canonical body unit',()=>{
  const a=compilePrompt(scene),b=compilePrompt(scene)
  expect(a.validation.isValid).toBe(true)
  expect(a.result.promptText).toBe(b.result.promptText)
  expect(a.result.sections.find(s=>s.id==='body_mechanics_v21')?.content).toBe(renderBodyMechanics(deriveBodyScene(scene)))
 })
 it('30 rejects invalid support before compiling and sending to Gemini',()=>{
  const c={...scene,bodySupportChoice:'none' as const}
  const {validation,result}=compilePrompt(c)
  expect(validation.isValid).toBe(false)
  expect(result.promptText).toBe('')
  expect(validation.errors.some(e=>e.includes('BODY_SUPPORT_CONFLICT'))).toBe(true)
 })
 it('31 Gemini specification contains the same deterministically derived body state',()=>{
  const compiled=compilePrompt(scene)
  const spec=buildSceneSpecification(scene,compiled.result,compiled.validation)
  expect(spec.bodyMechanics).toEqual(deriveBodyScene(scene))
  expect(spec.derivedUnits.find(u=>u.id==='body_mechanics_v21')?.text).toBe(renderBodyMechanics(spec.bodyMechanics))
  expect(spec.mandatoryUnitIds).toContain('body_mechanics_v21')
 })
 it('33 pillow supported under a free forearm never invents head contact',()=>{
  const x=body({shotId:'side_pillow_under_arm',posture:'side_lying_right',capture:'front'})
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.free_forearm',targetId:'bed.pillow',cause:'selected_pillow_forearm_contact'}))
  expect(x.contacts.some(c=>c.actorId==='subject.head_or_back'&&c.targetId==='bed.pillow')).toBe(false)
  expect(x.deformations.find(d=>d.targetId==='bed.pillow')?.region).toBe('forearm_contact')
 })
 it('34 free hand pillow grip is a shot-derived contact, not a second phone grip',()=>{
  const x=body({shotId:'hug_pillow',posture:'seated_bed',capture:'front'})
  expect(x.contacts.some(c=>c.actorId==='subject.free_hand'&&c.targetId==='bed.pillow'&&c.contactType==='grip')).toBe(true)
  expect(x.contacts.filter(c=>c.targetId==='phone'&&c.contactType==='grip')).toHaveLength(1)
 })
 it('35 explicit idle free-hand choice conflicting with pillow-hug action is invalid',()=>{
  const x=body({shotId:'hug_pillow',posture:'seated_bed',capture:'front',freeHandTask:'free'})
  expect(errorCodes(x)).toContain('BODY_FREE_HAND_TASK_CONFLICT')
 })
 it('36 free hand contacts selected clothing without replacing the garment',()=>{
  const x=body({shotId:'edge_shirt_hem',posture:'seated_bed',capture:'front'})
  expect(x.contacts).toContainEqual(expect.objectContaining({actorId:'subject.free_hand',targetId:'selected.shirt_hem'}))
  expect(renderBodyMechanics(x)).toContain('actual selected shirt hem')
 })
 it('32 support input validation rejects malformed enum values',()=>{
  expect(()=>body({supportChoice:'chair' as any})).toThrow('BODY_INPUT_INVALID')
 })
})
