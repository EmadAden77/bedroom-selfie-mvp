import React from 'react'
import {act,fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {GhalyonPromptOptimizer} from '../features/ai-prompt-enhancer/GhalyonPromptOptimizer'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import {compilePrompt} from '../compiler'
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
  render(<GhalyonPromptOptimizer sourcePrompt="" onPromptReady={ready}/>)
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
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{release=resolve})))
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
  render(<AiPromptEnhancer ctx={ctx} result={result} validation={validation} onReset={vi.fn()} onPromptReady={ready}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button',{name:'اعتماد البرومبت المحلي'}))
  expect(screen.getAllByText(local).length).toBeGreaterThan(0)
  await act(async()=>{release(new Response(JSON.stringify({prompt:photo}),{status:200,headers:{'content-type':'application/json'}}));await Promise.resolve()})
  expect(screen.getAllByText(local).length).toBeGreaterThan(0)
  expect(screen.queryByText(photo)).toBeNull()
  expect(ready).toHaveBeenCalledWith(local)
 })
})
