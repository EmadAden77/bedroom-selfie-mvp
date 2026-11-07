import React from 'react'
import {act,fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {GhalyonPromptOptimizer} from '../features/ai-prompt-enhancer/GhalyonPromptOptimizer'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext,CompilationResult,ValidationResult} from '../domain/types'

afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const optimized='A careful realistic bedroom selfie, photographed with a physically reachable phone, authentic room lighting and plausible human proportions.'
const reply={status:'complete',questions:[],optimizedPrompt:optimized,improvements:['تحسين التفاصيل'],proTip:'راجع المنظور'}
const photo='A naturally illuminated mirror selfie in a real bedroom showing consistent weight, correct hand-held smartphone perspective, credible fabric tension and room geometry throughout the photograph.'

describe('Cancelled Gemini requests never overwrite newer UI state',()=>{
 it('ignores an old Ghalyon response after the user edits the idea',async()=>{
  let release:(response:Response)=>void=()=>{}
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{release=resolve})))
  const ready=vi.fn()
  render(<GhalyonPromptOptimizer sourcePrompt="" onAdvisoryReady={ready}/>)
  const input=screen.getByPlaceholderText('اكتب فكرة أو الصق برومبت...')
  fireEvent.change(input,{target:{value:'Create a realistic selfie in a bedroom.'}})
  fireEvent.click(screen.getByRole('button',{name:'تحسين البرومبت'}))
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1))
  fireEvent.change(input,{target:{value:'Create a realistic mirror selfie with another pose.'}})
  await act(async()=>{release(new Response(JSON.stringify(reply),{status:200,headers:{'content-type':'application/json'}}));await Promise.resolve()})
  expect(screen.queryByText('الأمر المحسّن')).toBeNull()
  expect(screen.queryByText(optimized)).toBeNull()
  expect(ready).not.toHaveBeenCalled()
 })
 it('keeps the local fallback even if a cancelled Gemini response arrives late',async()=>{
  let release:(response:Response)=>void=()=>{}
  const ready=vi.fn()
  const ctx:CompilationContext={
   hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
   upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
   materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
   color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',referenceImagePresent:false,
   bedroomShotId:'',nightLightingId:'phone_screen_only'
  }
  const {result,validation}=compilePrompt(ctx)
  expect(validation.isValid).toBe(true)
  const local=result.promptText
  const spec=buildSceneSpecification(ctx,result,validation)
  vi.stubGlobal('fetch',vi.fn((url:string)=>url==='/api/authorize-final-prompt'
   ?Promise.resolve(new Response(JSON.stringify({source:'local',prompt:local,
     validated:true,integrity:spec.integrity}),{status:200,headers:{'content-type':'application/json'}}))
   :new Promise<Response>(resolve=>{release=resolve})))
  render(<AiPromptEnhancer ctx={ctx} result={result} validation={validation} onReset={vi.fn()} onPromptReady={ready} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1))
  // PR7b Category 1: the old local FINAL promotion is now display-only
  // because the default room is unconfirmed and RG-1/2 measurements unknown.
  // Retain the race test: an older Gemini response must NOT overwrite this draft.
  fireEvent.click(screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'}))
  await waitFor(()=>expect(screen.getByText('البرومبت المحلي — للعرض فقط، غير معتمد')).toBeTruthy())
  expect(ready).not.toHaveBeenCalledWith(local)
  expect(ready).toHaveBeenCalledWith('')
  await act(async()=>{release(new Response(JSON.stringify({prompt:photo}),{status:200,headers:{'content-type':'application/json'}}));await Promise.resolve()})
  expect(screen.getByText('البرومبت المحلي — للعرض فقط، غير معتمد')).toBeTruthy()
  expect(screen.queryByText(photo)).toBeNull()
  expect(ready).not.toHaveBeenCalledWith(local)
 })
})
