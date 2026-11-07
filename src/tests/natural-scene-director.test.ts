// @vitest-environment node
import {describe,expect,it,vi,afterEach} from 'vitest'
import {buildNaturalSceneDirection,naturalSceneSelectionIssues} from '../features/ai-prompt-enhancer/natural-scene-director'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {compilePrompt} from '../compiler'
import mainHandler,{PHYSICS_ONLY_SYSTEM,validatePhysicalPrompt} from '../../api/generate-main-prompt'
import {SYSTEM as GHALYON_SYSTEM} from '../../api/optimize-prompt'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',
 lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',
 fitId:'regular',
 stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:true,
 roomReferencePresent:true,
 bedroomShotId:'bed_edge',
 nightLightingId:'phone_screen_only'
}

describe('Natural Scene Director integration',()=>{
 it('adds activity-driven body contact without inventing objects or a face',()=>{
  const brief=buildCreativeSceneBrief(base)
  expect(brief).toContain('Natural scene direction:')
  expect(brief).toContain('selected bedroom selfie action')
  expect(brief).toContain('bedding and pillow compression')
  expect(brief).toContain('existing visible bedroom architecture')
  expect(brief).toContain('Do not introduce makeup, jewelry, sweat, freckles')
  expect(brief).toContain('Gemini does not receive or see it')
  expect(brief.length).toBeLessThan(6500)
 })
 it('uses a real supported laptop and occupied hand only in selected laptop shots',()=>{
  const brief=buildCreativeSceneBrief({...base,bedroomShotId:'laptop_cross_legs_trackpad',nightLightingId:'laptop_screen_only'})
  expect(brief).toContain('one supported, hinged laptop')
  expect(brief).toContain('only the actually available hand')
  expect(brief).toContain('LAPTOP')
  expect(brief).not.toContain('a second mirror')
 })
 it('uses timer support rather than a handheld phone',()=>{
  const line=buildNaturalSceneDirection({...base,bedroomShotId:'cross_legged_timer'})
  expect(line).toContain('stable support')
  expect(line).toContain('Do not turn this into a handheld capture')
 })
 it('uses correct mirror text optics and does not force a smile',()=>{
  const line=buildNaturalSceneDirection({...base,bedroomShotId:'mirror_dresser',nightLightingId:'ceiling_neutral'})
  expect(line).toContain('mirror-selfie action')
  expect(line).toContain('reverse printed lettering')
  expect(line).toContain('smile that was not selected')
  expect(line).not.toContain('Use the selected real smartphone viewpoint; mirror-text rules')
 })
 it('never invents loose clutter when not selected',()=>{
  const minimal=buildNaturalSceneDirection(base)
  const messy=buildNaturalSceneDirection({...base,bedroomClutterId:'lived_in_messy'})
  expect(minimal).toContain('do not invent generic clutter')
  expect(messy).toContain('already selected rumpled bedding')
  expect(messy).toContain('physically supported small loose items')
 })
 it('stops contradictory flash and laptop lighting selections',()=>{
  expect(naturalSceneSelectionIssues({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'ceiling_neutral'})).toHaveLength(1)
  expect(naturalSceneSelectionIssues({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'rear_flash'})).toEqual([])
  expect(naturalSceneSelectionIssues({...base,bedroomShotId:'bed_edge',nightLightingId:'laptop_screen_only'})).toHaveLength(1)
  expect(naturalSceneSelectionIssues({...base,bedroomShotId:'laptop_cross_legs_trackpad',nightLightingId:'laptop_screen_only'})).toEqual([])
 })
 it('the local spec fixes natural actions while Gemini edits language and Ghalyon stays independent',()=>{
  const local=compilePrompt(base)
  expect(local.validation.isValid).toBe(true)
  const spec=buildSceneSpecification(base,local.result,local.validation)
  expect(spec.derivedUnits.find(x=>x.id==='natural_scene_director')?.text).toBe(buildNaturalSceneDirection(base))
  expect(spec.derivedUnits.find(x=>x.id==='natural_scene_director')?.text).toContain('selected bedroom selfie action')
  expect(PHYSICS_ONLY_SYSTEM).toContain('CONSTRAINED PROMPT EDITOR')
  expect(GHALYON_SYSTEM).toContain('For photographic tasks only')
 })
})

describe('Natural photo-output consistency checks',()=>{
 it('rejects explicitly unreversed lettering in an ordinary mirror',()=>{
  expect(()=>validatePhysicalPrompt('The mirror shows unreversed text across the shirt.',{mode:'mirror',lighting:'ceiling_neutral'})).toThrow('mirror_text_conflict')
  expect(()=>validatePhysicalPrompt('The mirror logo is forward-facing and legible.',{mode:'mirror',lighting:'ceiling_neutral'})).toThrow('mirror_text_conflict')
  expect(()=>validatePhysicalPrompt('The wardrobe mirror shows naturally reversed lettering.',{mode:'mirror',lighting:'ceiling_neutral'})).not.toThrow()
 })
 it('rejects invented source illumination in screen-only scenes',()=>{
  const text='Window light fills the face and softens the shadows.'
  expect(()=>validatePhysicalPrompt(text,{mode:'front',lighting:'phone_screen_only'})).toThrow('screen_light_conflict')
  expect(()=>validatePhysicalPrompt(text,{mode:'front',lighting:'laptop_screen_only'})).toThrow('screen_light_conflict')
  expect(()=>validatePhysicalPrompt(text,{mode:'front',lighting:'ceiling_neutral'})).not.toThrow()
 })
})

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})

describe('Server-side natural activity preflight',()=>{
 it('rejects mirror-flash without rear flash or a nonexistent laptop screen source',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const endpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt'
  for(const selection of [
   {shotId:'mirror_rear_flash',mode:'mirror',lighting:'ceiling_neutral'},
   {shotId:'bed_edge',mode:'front',lighting:'laptop_screen_only'}
  ]){
   const ctx={...base,...selection}
   const compiled=compilePrompt(ctx)
   expect(compiled.validation.isValid).toBe(false)
   const spec=buildSceneSpecification(ctx,compiled.result,compiled.validation)
   expect(spec.conflicts.length).toBeGreaterThan(0)
   const response=await mainHandler.fetch(new Request(endpoint,{method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({sceneSpecification:spec})
   }))
   expect(response.status).toBe(400)
   expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_CONFLICT')
  }
  expect(upstream).not.toHaveBeenCalled()
 })
})
