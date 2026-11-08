import {describe,it,expect,vi,afterEach} from 'vitest'
import {render,screen} from '@testing-library/react'
import React from 'react'
import type {CompilationContext} from '../domain/types'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,sceneFingerprint} from '../features/ai-prompt-enhancer/scene-specification'
import {NightLightingSelector} from '../features/night-lighting/NightLightingSelector'
import {nightLightingPresets} from '../data/night-lighting'
import {evaluatePhysicalReality} from '../engine/physical-reality'
import {LIGHTING_PRESET_IDS,deriveLightingDecision,validateLightingDecision,lightingSectionText,physicalRealityText} from '../../shared/lighting-decision'
import handler,{validateSceneSpec} from '../../api/generate-main-prompt'

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'phone_screen'
}
const cases=[
 ['led_spotlight','bed_edge','ceiling'],
 ['camera_flash','mirror_rear_flash','phone_rear_led'],
 ['phone_screen','bed_edge','phone_display'],
 ['laptop_screen','laptop_cross_legs_trackpad','laptop']
] as const
const getSpec=(ctx:CompilationContext)=>{
 const {validation,result}=compilePrompt(ctx)
 expect(validation.errors).toEqual([])
 expect(result.errors).toEqual([])
 const spec=buildSceneSpecification(ctx,result,validation)
 expect(validateSceneSpec(spec)).toEqual(spec)
 return {spec,result}
}
const forge=(spec:ReturnType<typeof getSpec>['spec'],change:Partial<ReturnType<typeof getSpec>['spec']>)=>{
 const modified={...spec,...change}
 const {integrity:_integrity,...unsigned}=modified
 return {...unsigned,integrity:sceneFingerprint(unsigned)}
}
describe('Four-source blackout contract replacing legacy Option B',()=>{
 it('has exactly four selectors and a strict shared typed catalog',()=>{
  expect(LIGHTING_PRESET_IDS).toEqual(['led_spotlight','camera_flash','phone_screen','laptop_screen'])
  expect(nightLightingPresets.map(x=>x.id)).toEqual([...LIGHTING_PRESET_IDS])
  expect(new Set(nightLightingPresets.map(x=>x.id)).size).toBe(4)
 })
 it.each(cases)('%s is deterministic, single emitter and server authoritative', (lighting,shotId,emitter)=>{
  const ctx={...base,nightLightingId:lighting,bedroomShotId:shotId}
  const {spec,result}=getSpec(ctx)
  const copy=getSpec(structuredClone(ctx)).spec
  expect(JSON.stringify(copy)).toEqual(JSON.stringify(spec))
  expect(evaluatePhysicalReality(ctx).emitters.filter(e=>e.enabled).map(e=>e.id)).toEqual([emitter])
  expect(spec.capture.lighting).toBe(lighting)
  expect(spec.lighting).toEqual({activeLightSource:lighting,savedLightingPreference:lighting,savedLightingPreferenceActive:true})
  expect(result.sections.filter(x=>x.id.startsWith('night_lighting_')))
    .toEqual([{id:'night_lighting_'+lighting,content:lightingSectionText(lighting)}])
  expect(result.sections.find(x=>x.id==='physical_reality')?.content).toBe(physicalRealityText(lighting))
  expect(result.promptText).toContain('PITCH-BLACK BEDROOM:')
  expect(result.promptText).toContain('NO ambient light, NO window light and NO daylight')
 })
 it('does not silently override the selected light when shot changes',()=>{
  expect(deriveLightingDecision('led_spotlight')).toEqual({
   activeLightSource:'led_spotlight',savedLightingPreference:'led_spotlight',savedLightingPreferenceActive:true
  })
  expect(compilePrompt({...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'led_spotlight'}).validation.isValid).toBe(false)
 })
 it.each(['rear_flash','phone_screen_only','ceiling_neutral','laptop_screen_only','bedside_warm','window_streetlight','near_darkness'])('rejects deprecated preset %s',old=>{
  const compiled=compilePrompt({...base,nightLightingId:old})
  expect(compiled.validation.isValid).toBe(false)
  expect(compiled.result.promptText).toBe('')
 })
 it('rejects legacy phone override rather than silently replacing the selected source',()=>{
  const compiled=compilePrompt({...base,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'})
  expect(compiled.validation.isValid).toBe(false)
  expect(compiled.validation.errors.some(x=>x.includes('أُلغيت أوضاع'))).toBe(true)
 })
 it('rejects an uncovered window and forbidden ambient-dependent shots',()=>{
  expect(compilePrompt({...base,windowUncovered:true}).validation.isValid).toBe(false)
  for(const shot of ['curtain_shadows','door_light_strip','silhouette','half_light'])
   expect(compilePrompt({...base,nightLightingId:'led_spotlight',bedroomShotId:shot}).validation.isValid).toBe(false)
 })
 it('rejects forged source mismatch before any Gemini request',async()=>{
  const {spec}=getSpec(base)
  const forged=forge(spec,{lighting:{...spec.lighting,activeLightSource:'led_spotlight'}})
  expect(()=>validateLightingDecision(forged.lighting,'OFF',forged.capture.lighting)).toThrow('SPEC_LIGHTING_CONFLICT')
  expect(()=>validateSceneSpec(forged)).toThrow('SPEC_LIGHTING_CONFLICT')
  vi.stubEnv('GEMINI_API_KEY','test-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const response=await handler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt',{
   method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'blackout-forged-light'},
   body:JSON.stringify({sceneSpecification:forged})
  }))
  expect(response.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects forged physical narrative before Gemini even when fingerprint is updated',()=>{
  const {spec}=getSpec(base)
  const forged=forge(spec,{derivedUnits:spec.derivedUnits.map(u=>u.id==='physical_reality'?{
   ...u,text:u.text.replace('NO ambient light','with ambient light')
  }:u)})
  expect(()=>validateSceneSpec(forged)).toThrow('SPEC_PHYSICAL_REALITY')
 })
 it('provides four visible choices and disables incompatible capture modes',()=>{
  render(<NightLightingSelector shotId="bed_edge" selectedId="phone_screen" onSelect={vi.fn()}/>)
  expect(screen.getAllByRole('button')).toHaveLength(4)
  expect(screen.getByRole('button',{name:/فلاش الكاميرا الخلفية/})).toBeDisabled()
  expect(screen.getByRole('button',{name:/شاشة اللابتوب/})).toBeDisabled()
  expect(screen.getByRole('button',{name:/شاشة الهاتف/})).toHaveAttribute('aria-pressed','true')
 })
})
