import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {assembleEditorialPrompt,digestEditorialText} from '../../shared/editorial-contract'
import type {CompilationContext} from '../domain/types'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral'
}
const build=(ctx:CompilationContext=base)=>{
 const compiled=compilePrompt(ctx)
 expect(compiled.validation.isValid).toBe(true)
 const spec=buildSceneSpecification(ctx,compiled.result,compiled.validation)
 return {spec,...compiled}
}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})
const localAuthorization=(spec:ReturnType<typeof build>['spec'],prompt:string)=>json({
 source:'local',prompt,validated:true,integrity:spec.integrity
})

const approved=async(spec:ReturnType<typeof build>['spec'])=>{
 const sectionOrder=[...spec.mandatoryUnitIds]
 const openingLineSelection='canonical' as const
 const prompt=assembleEditorialPrompt(spec,{sectionOrder,openingLineSelection}).prompt
 const promptDigest=await digestEditorialText(prompt)
 const protectedUnitDigests=await Promise.all(spec.derivedUnits.map(async unit=>({
  id:unit.id,digest:await digestEditorialText(unit.text)
 })))
 return {prompt,sectionOrder,openingLineSelection,integrity:spec.integrity,
  promptDigest,sectionCount:spec.derivedUnits.length,protectedUnitDigests,
  source:'gemini-editor',validated:true,authoritative:false}
}

describe('Main Gemini constrained prompt editor interface',()=>{
 it('sends the approved structured local specification and never just a creative scene brief',async()=>{
  const {spec,result,validation}=build()
  const accepted=await approved(spec)
  const fetcher=vi.fn(async()=>json(accepted))
  const onPromptReady=vi.fn()
  vi.stubGlobal('fetch',fetcher)
  render(<AiPromptEnhancer ctx={base} result={result} validation={validation} onReset={vi.fn()} onPromptReady={onPromptReady} onAdvisoryReady={vi.fn()}/>)
  expect(screen.getByText(/عرض البرومبت المحلي المعتمد/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  // PR7b Category 1: valid editorial text is still visible; default medium
  // room has userConfirmed=false, so it MUST NOT promote to Final Prompt.
  await waitFor(()=>expect(screen.getByText(/نتيجة Gemini المحررة — غير معتمدة نهائيًا/)).toBeTruthy())
  const [endpoint,options]=fetcher.mock.calls[0] as unknown as [string,{body:string}]
  expect(endpoint).toBe('/api/generate-main-prompt')
  const body=JSON.parse(options.body)
  expect(body.sceneSpecification).toEqual(spec)
  expect(body).not.toHaveProperty('sceneBrief')
  expect(body.sceneSpecification.references.pixelsAvailableToEditor).toBe(false)
  expect(onPromptReady).not.toHaveBeenCalledWith(accepted.prompt)
  expect(onPromptReady).toHaveBeenCalledWith('')
  expect(screen.getByText(/تحرير Gemini صحيح نصيًا لكنه غير معتمد نهائيًا/)).toBeTruthy()
 })
 it('falls back automatically when Gemini returns a plausible-looking prompt missing physical constraints',async()=>{
  const {spec,result,validation}=build()
  const onPromptReady=vi.fn()
  const accepted=await approved(spec)
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>url==='/api/authorize-final-prompt'
   ?localAuthorization(spec,result.promptText)
   :json({...accepted,prompt:'A stylish studio photo with a different model and an invented window.'})))
  render(<AiPromptEnhancer ctx={base} result={result} validation={validation} onReset={vi.fn()} onPromptReady={onPromptReady} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  // PR7b Category 1: fallback still displays the exact compiled local bytes
  // but RG-1/2 unknown and userConfirmed=false forbid final promotion.
  await waitFor(()=>expect(screen.getByText(/البرومبت المحلي — للعرض فقط، غير معتمد/)).toBeTruthy())
  expect(screen.getAllByRole('alert').some(x=>x.textContent?.includes('لم يُعتمد تعديل Gemini'))).toBe(true)
  expect(onPromptReady).not.toHaveBeenCalledWith(result.promptText)
  expect(onPromptReady).toHaveBeenCalledWith('')
  expect(screen.queryByText('A stylish studio photo with a different model and an invented window.')).toBeNull()
 })
 it('falls back to local prompt on provider failure without changing user choices',async()=>{
  const {spec,result,validation}=build()
  const onPromptReady=vi.fn()
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>url==='/api/authorize-final-prompt'
   ?localAuthorization(spec,result.promptText)
   :json({errorCode:'GEMINI_EDITOR_REJECTED',error:'مخرجات غير معتمدة'},422)))
  render(<AiPromptEnhancer ctx={base} result={result} validation={validation} onReset={vi.fn()} onPromptReady={onPromptReady} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  // PR7b Category 1: fallback still displays the exact compiled local bytes
  // but RG-1/2 unknown and userConfirmed=false forbid final promotion.
  await waitFor(()=>expect(screen.getByText(/البرومبت المحلي — للعرض فقط، غير معتمد/)).toBeTruthy())
  expect(onPromptReady).not.toHaveBeenCalledWith(result.promptText)
  expect(onPromptReady).toHaveBeenCalledWith('')
  expect(screen.getAllByRole('alert').some(x=>x.textContent?.includes('GEMINI_EDITOR_REJECTED'))).toBe(true)
 })
 it('reports serverless HTML 500 as a server failure and preserves the local validated prompt',async()=>{
  const {spec,result,validation}=build()
  const onPromptReady=vi.fn()
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>url==='/api/authorize-final-prompt'
   ?localAuthorization(spec,result.promptText)
   :new Response('<html>FUNCTION_INVOCATION_FAILED</html>',{
    status:500,headers:{'content-type':'text/html; charset=utf-8'}
   })))
  render(<AiPromptEnhancer ctx={base} result={result} validation={validation} onReset={vi.fn()} onPromptReady={onPromptReady} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  // PR7b Category 1: fallback still displays the exact compiled local bytes
  // but RG-1/2 unknown and userConfirmed=false forbid final promotion.
  await waitFor(()=>expect(screen.getByText(/البرومبت المحلي — للعرض فقط، غير معتمد/)).toBeTruthy())
  expect(screen.getAllByRole('alert').some(x=>x.textContent?.includes('HTTP 500'))).toBe(true)
  expect(onPromptReady).not.toHaveBeenCalledWith(result.promptText)
  expect(onPromptReady).toHaveBeenCalledWith('')
  expect(onPromptReady).not.toHaveBeenCalledWith(expect.stringContaining('FUNCTION_INVOCATION_FAILED'))
 })
 it('blocks Gemini entirely when local physics is invalid, but preserves independent tools',()=>{
  const {result,validation}=build()
  const invalid={...validation,isValid:false,errors:['Impossible camera and lighting']}
  render(<AiPromptEnhancer ctx={base} result={result} validation={invalid} onReset={vi.fn()} onPromptReady={vi.fn()} onAdvisoryReady={vi.fn()}/>)
  expect(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText(/لا يمكن تشغيل محرر Gemini قبل اجتياز/)).toBeTruthy()
  expect(screen.getAllByText(/غَليون — مهندس تحسين الأوامر/).length).toBeGreaterThan(0)
  expect(screen.getByText(/IMAGE PROMPT AUDITOR — v8/)).toBeTruthy()
 })
})
