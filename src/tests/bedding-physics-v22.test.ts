import {describe,it,expect} from 'vitest'
import {evaluateBodyMechanics,type BodyMechanicalInput} from '../../shared/body-mechanics'
import {DEFAULT_BEDDING_SELECTION,evaluateBedding,renderBedding,type BeddingSelection} from '../../shared/bedding-physics'
import {deriveBeddingScene} from '../engine/bedding-physics'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {evaluatePhysicalReality} from '../engine/physical-reality'
import type {CompilationContext} from '../domain/types'
const base:BodyMechanicalInput={shotId:'bed_edge',posture:'seated_bed',capture:'front',holdingHand:'auto',supportChoice:'auto',freeHandTask:'auto',feetVisibility:'unknown'}
const body=(patch:Partial<BodyMechanicalInput>={})=>evaluateBodyMechanics({...base,...patch})
const bedding=(patch:Partial<BodyMechanicalInput>={},selection:BeddingSelection=DEFAULT_BEDDING_SELECTION)=>evaluateBedding(body(patch),selection)
const ctx:CompilationContext={hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,materialId:'lightweight_cotton_appearance_jersey',
 fitId:'regular',stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'ceiling_neutral'}
const errors=(s:ReturnType<typeof bedding>)=>s.issues.map(i=>i.code)

describe('Physical Reality Engine V2.2 — causal bedding',()=>{
 it('01 uses existing stable frame and mattress IDs without asserting unseen textiles',()=>{
  const state=bedding()
  expect(state.objects.map(o=>o.id)).toEqual(['bed.frame','bed.mattress','bed.pillow','bed.sheet','bed.blanket'])
  expect(state.objects.find(o=>o.id==='bed.sheet')?.presence).toBe('unknown')
  expect(state.objects.find(o=>o.id==='bed.blanket')?.presence).toBe('unknown')
 })
 it('02 derives seat pelvis compression from V2.1 and never invents a depth',()=>{
  const s=bedding()
  expect(s.responses).toContainEqual(expect.objectContaining({targetId:'bed.mattress',region:'pelvis_edge',degree:'moderate',cause:'v21_contact_body_on_bed'}))
  expect(renderBedding(s)).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:cm|mm|Pa|kPa|N)\b/)
 })
 it('03 standing on actual floor cannot deform the mattress',()=>{
  const s=bedding({shotId:'mirror_wardrobe',posture:'standing',capture:'mirror'})
  expect(s.responses.filter(r=>r.targetId==='bed.mattress')).toEqual([])
 })
 it('04 sitting on floor near bed cannot deform mattress',()=>{
  const s=bedding({shotId:'mirror_floor',posture:'seated_floor',capture:'mirror'})
  expect(s.responses.filter(r=>r.targetId==='bed.mattress')).toEqual([])
 })
 it('05 a floor-based elbow touching bed independently depresses only elbow region',()=>{
  const s=bedding({shotId:'floor_elbow_bed_edge',posture:'seated_floor'})
  expect(s.responses.filter(r=>r.targetId==='bed.mattress')).toEqual([
   expect.objectContaining({region:'elbow',degree:'slight'})
  ])
 })
 it('06 supine pose distributes mattress response over pelvis and torso only',()=>{
  const s=bedding({shotId:'ceiling_gaze',posture:'supine'})
  expect(s.responses.filter(r=>r.targetId==='bed.mattress').map(r=>r.region)).toEqual(['pelvis','torso'])
 })
 it('07 prone posture maintains mattress support without inventing a pillow',()=>{
  const s=bedding({shotId:'belly_elbows',posture:'prone'})
  expect(s.responses.filter(r=>r.targetId==='bed.pillow')).toEqual([])
 })
 it('08 actual cheek on pillow compresses locally',()=>{
  const s=bedding({shotId:'cheek_pillow',posture:'side_lying_right'})
  expect(s.responses).toContainEqual(expect.objectContaining({targetId:'bed.pillow',region:'head_back'}))
 })
 it('09 a forearm pillow shot compresses the forearm site, not the head',()=>{
  const s=bedding({shotId:'side_pillow_under_arm',posture:'side_lying_right'})
  expect(s.responses.filter(r=>r.targetId==='bed.pillow').map(r=>r.region)).toEqual(['forearm'])
 })
 it('10 hugging a pillow produces only hand-related pillow compression',()=>{
  const s=bedding({shotId:'hug_pillow'})
  expect(s.responses.filter(r=>r.targetId==='bed.pillow').map(r=>r.region)).toEqual(['hand'])
 })
 it('11 an untouched but confirmed pillow has no fabricated compression',()=>{
  const s=bedding({shotId:'bed_edge'}, {sheet:'reference',pillow:'confirmed',blanket:'reference'})
  expect(s.objects.find(o=>o.id==='bed.pillow')?.presence).toBe('confirmed')
  expect(s.responses.filter(r=>r.targetId==='bed.pillow')).toEqual([])
 })
 it('12 a selected pillow absence conflicts only with a pillow-dependent shot',()=>{
  const selection:BeddingSelection={sheet:'reference',pillow:'absent',blanket:'reference'}
  expect(errors(bedding({shotId:'cheek_pillow',posture:'side_lying_right'},selection))).toContain('BEDDING_PILLOW_ABSENT')
  expect(errors(bedding({shotId:'bed_edge'},selection))).toEqual([])
 })
 it('13 a confirmed bedsheet follows mattress and local body load',()=>{
  const s=bedding({}, {sheet:'confirmed',pillow:'reference',blanket:'reference'})
  expect(s.contacts).toContainEqual(expect.objectContaining({actorId:'bed.sheet',targetId:'bed.mattress',kind:'support'}))
  expect(s.responses).toContainEqual(expect.objectContaining({targetId:'bed.sheet',region:'pelvis_edge',effect:'folds'}))
 })
 it('14 an absent sheet receives no contact or folds',()=>{
  const s=bedding({}, {sheet:'absent',pillow:'reference',blanket:'reference'})
  expect(s.contacts.some(c=>c.targetId==='bed.sheet'||c.actorId==='bed.sheet')).toBe(false)
  expect(s.responses.some(r=>r.targetId==='bed.sheet')).toBe(false)
 })
 it('15 confirmed sheet does not wrinkle from absent bed contact',()=>{
  const s=bedding({shotId:'mirror_wardrobe',posture:'standing',capture:'mirror'},
   {sheet:'confirmed',pillow:'reference',blanket:'reference'})
  expect(s.responses.filter(r=>r.targetId==='bed.sheet')).toEqual([])
 })
 it('16 a spread blanket stays on bed without unselected body drape',()=>{
  const s=bedding({}, {sheet:'reference',pillow:'reference',blanket:'spread_on_bed'})
  expect(s.contacts).toContainEqual(expect.objectContaining({actorId:'bed.blanket',targetId:'bed.mattress'}))
  expect(s.contacts.some(c=>c.targetId==='subject.body')).toBe(false)
 })
 it('17 selected body blanket contact derives only qualitative gravity folds',()=>{
  const s=bedding({}, {sheet:'reference',pillow:'reference',blanket:'touching_body'})
  expect(s.contacts).toContainEqual(expect.objectContaining({actorId:'bed.blanket',targetId:'subject.body',kind:'drape'}))
  expect(s.responses).toContainEqual(expect.objectContaining({targetId:'bed.blanket',effect:'folds'}))
 })
 it('18 blanket-dependent pose cannot assert absent blanket',()=>{
  const s=bedding({shotId:'blanket_cocoon'}, {sheet:'reference',pillow:'reference',blanket:'absent'})
  expect(s.status).toBe('INVALID')
  expect(errors(s)).toContain('BEDDING_BLANKET_ABSENT')
 })
 it('19 cocoon pose conflicts with blanket deliberately spread away from body',()=>{
  const s=bedding({shotId:'blanket_cocoon'}, {sheet:'reference',pillow:'reference',blanket:'spread_on_bed'})
  expect(errors(s)).toContain('BEDDING_COVERAGE_CONFLICT')
 })
 it('20 untouched reference blanket remains unknown rather than invented',()=>{
  const s=bedding()
  expect(s.unknowns).toContain('BLANKET_PRESENCE_AND_COVERAGE_UNKNOWN')
  expect(s.responses.filter(r=>r.targetId==='bed.blanket')).toEqual([])
 })
 it('21 hidden pillow or bedding does not become physically absent',()=>{
  const s=bedding({feetVisibility:'outside_crop',shotId:'cheek_pillow',posture:'side_lying_right'})
  expect(s.objects.find(o=>o.id==='bed.pillow')?.presence).toBe('confirmed')
  expect(s.objects.find(o=>o.id==='bed.pillow')?.visibility).toBe('unknown')
 })
 it('22 invalid V2.1 body state also invalidates V2.2 without losing contacts',()=>{
  const s=bedding({supportChoice:'none'})
  expect(s.status).toBe('INVALID')
  expect(s.contacts.some(c=>c.targetId==='bed.mattress')).toBe(true)
 })
 it('23 unknown body support stays NEEDS_INFORMATION, not a guessed new bed object',()=>{
  const s=bedding({supportChoice:'unknown'})
  expect(s.status).toBe('NEEDS_INFORMATION')
  expect(s.objects.length).toBe(5)
  expect(s.unknowns).toContain('BODY_SUPPORT_UNCERTAIN')
 })
 it('24 rejects malformed selections instead of silently normalizing them',()=>{
  expect(()=>evaluateBedding(body(),{sheet:'invented' as never,pillow:'reference',blanket:'reference'})).toThrow('BEDDING_INPUT_INVALID')
 })
 it('25 is fully deterministic and does not mutate body state or selection',()=>{
  const source=body(),sel={sheet:'confirmed',pillow:'reference',blanket:'touching_body'} as const
  const original=structuredClone(source)
  const one=evaluateBedding(source,sel),two=evaluateBedding(source,sel)
  expect(one).toEqual(two);expect(source).toEqual(original);expect(sel.sheet).toBe('confirmed')
 })
 it('26 derives no camera angle, light emitter, clothing or furniture relocation',()=>{
  const s=bedding()
  expect(JSON.stringify(s)).not.toMatch(/phone_rear_led|phone_display|ceiling_light|garment_color|relocate_furniture/)
 })
 it('27 new compiler bedding unit is stable and based on current scene',()=>{
  const a=compilePrompt(ctx),b=compilePrompt(ctx)
  expect(a.validation.isValid).toBe(true)
  expect(a.result.promptText).toBe(b.result.promptText)
  expect(a.result.sections.find(u=>u.id==='bedding_physics_v22')?.content).toBe(renderBedding(deriveBeddingScene(ctx)))
 })
 it('28 invalid blanket choice blocks local compilation',()=>{
  const c={...ctx,bedroomShotId:'blanket_cocoon',beddingSelection:{sheet:'reference',pillow:'reference',blanket:'absent'} as const}
  const result=compilePrompt(c)
  expect(result.validation.errors.some(x=>x.includes('BEDDING_BLANKET_ABSENT'))).toBe(true)
  expect(result.result.promptText).toBe('')
 })
 it('29 Gemini immutable scene includes the exact bedding graph and user choices',()=>{
  const compiled=compilePrompt(ctx)
  const spec=buildSceneSpecification(ctx,compiled.result,compiled.validation)
  expect(spec.beddingPhysics).toEqual(deriveBeddingScene(ctx))
  expect(spec.selections.beddingSelection).toEqual(DEFAULT_BEDDING_SELECTION)
  expect(spec.derivedUnits.find(u=>u.id==='bedding_physics_v22')?.text).toBe(renderBedding(spec.beddingPhysics))
 })
 it('30 strict V1 rear flash only remains unchanged by bedding derivation',()=>{
  const c={...ctx,bedroomShotId:'mirror_rear_flash',phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY' as const}
  deriveBeddingScene(c)
  expect(evaluatePhysicalReality(c).emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_rear_led'])
  expect(c.nightLightingId).toBe('ceiling_neutral')
 })
 it('32 confirmed bed-edge sheet receives local tension without any frame bending',()=>{
  const s=bedding({}, {sheet:'confirmed',pillow:'reference',blanket:'reference'})
  expect(s.responses).toContainEqual(expect.objectContaining({targetId:'bed.sheet',region:'edge_near_contact',effect:'tension'}))
  expect(s.responses.some(r=>r.targetId==='bed.frame')).toBe(false)
 })
 it('33 blanket spread is incompatible with any shot that requires body contact',()=>{
  for(const shot of ['blanket_half_face','duvet_draw_below_knees']){
   expect(errors(bedding({shotId:shot},{sheet:'reference',pillow:'reference',blanket:'spread_on_bed'}))).toContain('BEDDING_COVERAGE_CONFLICT')
  }
 })
 it('31 strict V1 screen-only remains unchanged by bedding derivation',()=>{
  const c={...ctx,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY' as const}
  deriveBeddingScene(c)
  expect(evaluatePhysicalReality(c).emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_display'])
 })
})
