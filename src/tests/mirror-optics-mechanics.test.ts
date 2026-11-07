import {describe,it,expect} from 'vitest'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {buildMirrorOpticsMechanics} from '../data/mirror-optics-mechanics'
import {renderLightGeometry} from '../data/light-geometry'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {renderMirrorComposition} from '../data/mirror-controls'
import {compilePrompt} from '../compiler'
import {PHYSICS_ONLY_SYSTEM,validatePhysicalPrompt} from '../../api/generate-main-prompt'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',poseId:'seated_bed',nightLightingId:'ceiling_neutral'
}
const mirrors=bedroomShots.filter(s=>s.mode==='mirror')
describe('Extreme physical mirror capture consistency',()=>{
 it('has 15 canonical and completely local + Gemini mirrored camera contracts',()=>{
  expect(mirrors).toHaveLength(15)
  for(const shot of mirrors){
   const ctx={...base,bedroomShotId:shot.id,nightLightingId:shot.id==='mirror_rear_flash'?'rear_flash':'ceiling_neutral'}
   const local=compilePrompt(ctx)
   expect(local.validation.errors,shot.id).toEqual([])
   expect(local.result.errors,shot.id).toEqual([])
   const contract=local.result.sections.find(s=>s.id==='mirror_composition')?.content||''
   expect(contract,shot.id).toContain('MIRROR OPTICS AND BIOMECHANICS CONTRACT:')
   expect(contract).toContain('virtual subject')
   expect(contract).toContain('Xiaomi 15 Ultra')
   expect(contract).toContain('glass')
   expect(contract).not.toContain('front-facing camera')
   const brief=buildCreativeSceneBrief(ctx)
   expect(brief).toContain('MIRROR OPTICS AND BIOMECHANICS CONTRACT:')
   expect(brief).toContain('rear-camera')
   expect(brief).toContain('generic front-selfie gaze is not authoritative')
   expect(brief.length).toBeLessThan(12000)
  }
  expect(PHYSICS_ONLY_SYSTEM).toContain('CONSTRAINED PROMPT EDITOR')
 })
 it('resolves pose illumination from the selected shot, never a stale general pose',()=>{
  for(const shot of mirrors){
   const ctx={...base,bedroomShotId:shot.id,poseId:'supine'}
   const text=renderLightGeometry(ctx)
   const posture=getShotPosture(shot.id)
   if(posture==='standing')expect(text,shot.id).toContain('Standing near the bed')
   if(posture==='seated_floor')expect(text).toContain('hips supported by floor')
   if(posture==='seated_bed')expect(text).toContain('Seated on the bed')
   expect(text).not.toContain('Lying on the back')
  }
 })
 it('resolves bed-edge and floor mirror support without commanding standing',()=>{
  for(const [shotId,contact] of [
   ['mirror_floor','Seated on the photographed floor/rug'],
   ['mirror_bed_reflection','Seated on the actual left-wall mattress edge']
  ]){
   const ctx={...base,bedroomShotId:shotId,mirrorDistanceId:'comfortable'}
   const local=renderMirrorComposition(ctx)
   expect(local).toContain(contact)
   expect(local).not.toContain('Stand in the clear walking area')
   expect(local).toContain('Keep the selected seated/standing posture with real body support')
   expect(buildMirrorOpticsMechanics(ctx,true)).toMatch(/Hips|Pelvis/)
  }
 })
 it('shapes real light and flash exclusively from selected sources',()=>{
  const without=buildMirrorOpticsMechanics(base)
  const withFlash=buildMirrorOpticsMechanics({...base,nightLightingId:'rear_flash'})
  expect(without).toContain('rear LED is OFF')
  expect(without).not.toContain('FLASH: only the real rear LED fires')
  expect(withFlash).toContain('FLASH: only the real rear LED fires')
  expect(withFlash).toContain('Flash highlight')
  expect(withFlash).not.toContain('front camera')
 })
 it('keeps posture mechanics independent of image crop and furniture wish-list',()=>{
  const ctx={...base,bedroomShotId:'mirror_wardrobe',mirrorFramingId:'full_body',mirrorDistanceId:'close'}
  const text=renderMirrorComposition(ctx)
  expect(text).toContain('valid sightline')
  expect(text).toContain('omit it rather than breaking optics')
  expect(text).toContain('ceramic grid')
  expect(text).toContain('Original separate vanity mirror')
 })
 it('rejects explicit front-camera mirror hallucinations but accepts real rear-camera optics',()=>{
  expect(()=>validatePhysicalPrompt('A mirror selfie captured with the front camera and wardrobe reflected.',{mode:'mirror',lighting:'ceiling_neutral'})).toThrow('mirror_front_camera_conflict')
  expect(()=>validatePhysicalPrompt('A front-camera mirror selfie shows the phone in a mirror.',{mode:'mirror',lighting:'ceiling_neutral'})).toThrow('mirror_front_camera_conflict')
  expect(()=>validatePhysicalPrompt('Real rear-camera Xiaomi 15 Ultra mirror selfie, the phone screen faces the holder and the wardrobe glass reflects the scene.',{mode:'mirror',lighting:'ceiling_neutral'})).not.toThrow()
 })
 it('excludes mirror-only physics from ordinary front selfies',()=>{
  const ctx={...base,bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'ceiling_neutral'}
  expect(buildMirrorOpticsMechanics(ctx)).toBe('')
  expect(buildCreativeSceneBrief(ctx)).not.toContain('MIRROR OPTICS AND BIOMECHANICS CONTRACT:')
  expect(compilePrompt(ctx).result.sections.some(s=>s.id==='mirror_composition')).toBe(false)
 })
})
