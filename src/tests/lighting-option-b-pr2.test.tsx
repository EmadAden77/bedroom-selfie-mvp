import {describe,it,expect,vi,afterEach} from 'vitest'
import {render,screen} from '@testing-library/react'
import React from 'react'
import type {CompilationContext} from '../domain/types'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,sceneFingerprint} from '../features/ai-prompt-enhancer/scene-specification'
import {naturalSceneSelectionIssues} from '../features/ai-prompt-enhancer/natural-scene-director'
import {NightLightingSelector} from '../features/night-lighting/NightLightingSelector'
import {nightLightingPresets} from '../data/night-lighting'
import {evaluatePhysicalReality} from '../engine/physical-reality'
import {LIGHTING_PRESET_IDS,deriveLightingDecision,validateLightingDecision} from '../../shared/lighting-decision'
import handler,{validateSceneSpec} from '../../api/generate-main-prompt'

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'phone_screen_only'
}
const mirror=(lighting:string):CompilationContext=>({
 ...base,bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:lighting,
 phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY'
})
const front=(lighting:string):CompilationContext=>({
 ...base,bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:lighting,
 phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'
})
const getSpec=(ctx:CompilationContext)=>{
 const {validation,result}=compilePrompt(ctx)
 expect(validation.errors).toEqual([])
 expect(validation.isValid).toBe(true)
 expect(result.errors).toEqual([])
 const spec=buildSceneSpecification(ctx,result,validation)
 expect(validateSceneSpec(spec)).toEqual(spec)
 return {spec,result}
}
const crossProducts=[
 ...LIGHTING_PRESET_IDS.filter(id=>id!=='rear_flash').map(id=>['rear flash',id] as const),
 ...LIGHTING_PRESET_IDS.filter(id=>id!=='phone_screen_only').map(id=>['front screen',id] as const)
]

describe('PR2 Option B: authoritative active source and inactive saved preference',()=>{
 it('shares every catalog ID with the existing lighting selector',()=>{
  expect([...LIGHTING_PRESET_IDS].sort()).toEqual(nightLightingPresets.map(x=>x.id).sort())
 })
 it('C1/C3a: default saved screen + mirror rear flash activates one LED only',()=>{
  const ctx=mirror('phone_screen_only')
  const {spec,result}=getSpec(ctx)
  expect(spec.lighting).toEqual({
   activeLightSource:'rear_flash',
   savedLightingPreference:'phone_screen_only',
   savedLightingPreferenceActive:false
  })
  expect(spec.capture.lighting).toBe(spec.lighting.activeLightSource)
  expect(evaluatePhysicalReality(ctx).emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual(['phone_rear_led'])
  expect(result.sections.filter(x=>x.id.startsWith('night_lighting_')).map(x=>x.id)).toEqual(['night_lighting_rear_flash'])
  expect(result.promptText).toContain('Active physical emitters: phone_rear_led at ')
  expect(result.promptText).not.toContain('Active physical emitters: phone_display at ')
  expect(naturalSceneSelectionIssues(ctx)).toEqual([])
 })
 it('C1: normal mode uses the selected preference as the active source',()=>{
  const {spec}=getSpec(base)
  expect(spec.lighting).toEqual({
   activeLightSource:'phone_screen_only',
   savedLightingPreference:'phone_screen_only',
   savedLightingPreferenceActive:true
  })
 })
 it('C3b: disable exclusive mode and restore the preserved saved preference',()=>{
  const ctx=front('ceiling_neutral')
  const exclusive=getSpec(ctx).spec
  expect(exclusive.lighting).toEqual({
   activeLightSource:'phone_screen_only',
   savedLightingPreference:'ceiling_neutral',
   savedLightingPreferenceActive:false
  })
  const off=getSpec({...ctx,phoneOnlyIlluminationMode:'OFF'}).spec
  expect(off.lighting).toEqual({
   activeLightSource:'ceiling_neutral',
   savedLightingPreference:'ceiling_neutral',
   savedLightingPreferenceActive:true
  })
  expect(ctx.nightLightingId).toBe('ceiling_neutral')
 })
 it('C3c: an explicit request to activate the saved source alongside flash fails before Gemini',async()=>{
  const {spec}=getSpec(mirror('ceiling_neutral'))
  const tampered={...spec,lighting:{...spec.lighting,savedLightingPreferenceActive:true}}
  const {integrity:discarded,...unsigned}=tampered
  const forged={...tampered,integrity:sceneFingerprint(unsigned)}
  expect(()=>validateLightingDecision(forged.lighting,forged.selections.phoneOnlyIlluminationMode,forged.capture.lighting))
   .toThrow('SPEC_SECOND_ACTIVE_LIGHT')
  expect(()=>validateSceneSpec(forged)).toThrow('SPEC_SECOND_ACTIVE_LIGHT')
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const response=await handler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt',{
   method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'option-b-two-lights'},
   body:JSON.stringify({sceneSpecification:forged})
  }))
  expect(response.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects a forged different active source in an exclusive scene',()=>{
  const {spec}=getSpec(front('bedside_warm'))
  expect(()=>validateLightingDecision({...spec.lighting,activeLightSource:'bedside_warm'},
   spec.selections.phoneOnlyIlluminationMode,spec.capture.lighting)).toThrow('SPEC_LIGHTING_CONFLICT')
 })
 it('rejects unknown saved IDs instead of silently overwriting them',()=>{
  const bad=compilePrompt(mirror('imaginary_ceiling_laser'))
  expect(bad.validation.isValid).toBe(false)
  expect(bad.result.promptText).toBe('')
  expect(bad.validation.errors.some(x=>x.includes('Night lighting preset invalid'))).toBe(true)
 })
 it('treats empty saved value as the default and preserves window warning',()=>{
  expect(getSpec(mirror('')).spec.lighting).toEqual({
   activeLightSource:'rear_flash',savedLightingPreference:'phone_screen_only',savedLightingPreferenceActive:false
  })
  const opened=compilePrompt({...mirror('ceiling_neutral'),windowUncovered:true})
  expect(opened.validation.isValid).toBe(true)
  expect(opened.validation.warnings.some(x=>x.includes('النافذة مكشوفة'))).toBe(true)
 })
 it.each(crossProducts)('%s + saved %s: accepted with inactive preference; deterministic', (kind,saved)=>{
  const ctx=kind==='rear flash'?mirror(saved):front(saved)
  const first=getSpec(ctx).spec
  const second=getSpec(structuredClone(ctx)).spec
  const active=kind==='rear flash'?'rear_flash':'phone_screen_only'
  expect(first.lighting).toEqual({
   activeLightSource:active,
   savedLightingPreference:saved,
   savedLightingPreferenceActive:false
  })
  expect(first.capture.lighting).toBe(active)
  expect(naturalSceneSelectionIssues(ctx)).toEqual([])
  expect(JSON.stringify(second.lighting)).toBe(JSON.stringify(first.lighting))
  expect(JSON.stringify(second)).toBe(JSON.stringify(first))
 })
 it('C2: labels inactive preference visibly without mutating selected preset',()=>{
  const common={shotId:'mirror_rear_flash',selectedId:'phone_screen_only',
   windowUncovered:false,onSelect:vi.fn(),onWindowChange:vi.fn()}
  const r=render(<NightLightingSelector {...common} exclusiveMode="DARK_ROOM_REAR_FLASH_ONLY"/>)
  expect(screen.getByRole('status')).toHaveTextContent('inactive: mirror flash mode')
  const saved=screen.getByRole('button',{name:/شاشة الهاتف فقط/})
  expect(saved.getAttribute('aria-pressed')).toBe('true')
  r.rerender(<NightLightingSelector {...common} exclusiveMode="OFF"/>)
  expect(screen.queryByText(/inactive: mirror flash mode/)).toBeNull()
 })
})
