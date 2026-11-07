import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,canonicalSceneOrder,scenePromptFromOrder} from '../compiler/scene-specification'
import type {CompilationContext} from '../domain/types'

vi.mock('../features/ai-prompt-enhancer/GhalyonPromptOptimizer',()=>({
 GhalyonPromptOptimizer:()=>null
}))
vi.mock('../features/ai-prompt-enhancer/ImagePromptAuditorV8',()=>({
 ImagePromptAuditorV8:()=>null
}))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',hairstyleMode:'preserve',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral'
}
const compiled=compilePrompt(ctx)
const spec=buildSceneSpecification(ctx,compiled.result,compiled.validation)
const order=canonicalSceneOrder(spec)
const approved=scenePromptFromOrder(spec,order)
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})
const renderPage=(context:CompilationContext=ctx)=>{
 const local=compilePrompt(context)
 const onPromptReady=vi.fn()
 render(<AiPromptEnhancer ctx={context} result={local.result} validation={local.validation} onReset={vi.fn()} onPromptReady={onPromptReady}/>)
 return {onPromptReady,local}
}

describe('Gemini constrained editor UI and local fallback',()=>{
 it('shows approved local prompt before Gemini and sends full structured scene, never loose creative scene brief',async()=>{
  const fetcher=vi.fn(async()=>json({prompt:approved,order,layout:'paragraphs',source:'gemini_editor',validated:true}))
  vi.stubGlobal('fetch',fetcher)
  const {onPromptReady}=renderPage()
  expect(screen.getByText(/عرض البرومبت المحلي المعتمد قبل Gemini/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(screen.getByText(/تحرير Gemini معتمد بعد المطابقة/)).toBeTruthy())
  const [,config]=fetcher.mock.calls[0] as unknown as [string,{body:string}]
  const sent=JSON.parse(config.body)
  expect(sent).toHaveProperty('sceneSpecification')
  expect(sent.sceneSpecification.source).toBe('validated_local_compiler')
  expect(sent.sceneSpecification.derived.mirrorSurface).toBe('wardrobe_plane')
  expect(sent).not.toHaveProperty('sceneBrief')
  expect(onPromptReady).toHaveBeenCalledWith(approved)
 })
 it('falls back automatically when Gemini returns a new scene with a forged approval flag',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>json({
   prompt:approved+'\nNew ring light and pink sofa.',order,layout:'paragraphs',source:'gemini_editor',validated:true
  })))
  const {onPromptReady,local}=renderPage()
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('لم يُعتمد تحرير Gemini'))
  expect(screen.getByText(/البرومبت المحلي المعتمد \(Gemini لم يُعتمد/)).toBeTruthy()
  expect(onPromptReady).toHaveBeenCalledWith(local.result.promptText)
  expect(onPromptReady).not.toHaveBeenCalledWith(approved+'\nNew ring light and pink sofa.')
 })
 it('uses the local prompt if provider cannot be reached',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('network unavailable')}))
  const {onPromptReady,local}=renderPage()
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('استُخدم البرومبت المحلي'))
  expect(onPromptReady).toHaveBeenCalledWith(local.result.promptText)
 })
 it('the local compilation still works without Gemini and offers a copyable fallback',()=>{
  const {onPromptReady,local}=renderPage()
  fireEvent.click(screen.getByRole('button',{name:'النسخة المحلية الاحتياطية'}))
  expect(local.result.promptText).toContain('MIRROR OPTICS AND BIOMECHANICS CONTRACT')
  expect(screen.getByText(/البرومبت المحلي المعتمد/)).toBeTruthy()
  expect(onPromptReady).toHaveBeenCalledWith(local.result.promptText)
 })
 it('blocks editor and local export for a contradictory selected flash and camera setup',()=>{
  const contradictory={...ctx,bedroomShotId:'mirror_rear_flash',nightLightingId:'ceiling_neutral'}
  renderPage(contradictory)
  expect((screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button',{name:'النسخة المحلية الاحتياطية'}) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText(/مواصفات المشهد غير معتمدة/)).toBeTruthy()
 })
})
