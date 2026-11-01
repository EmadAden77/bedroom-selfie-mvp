import React from 'react'
import {act,fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {GhalyonPromptOptimizer} from '../features/ai-prompt-enhancer/GhalyonPromptOptimizer'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
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
   color:'charcoal',surface:'natural',referenceImagePresent:false,
   bedroomShotId:'',nightLightingId:'phone_screen_only'
  }
  const local='A self-taken camera photo in a familiar bedroom with plausible camera geometry, natural body balance, and consistent practical lighting only. Clothing follows gravity and contact.'
  const result:CompilationResult={promptText:local,sections:[],completedModules:[],pendingModules:[],errors:[],warnings:[]}
  const validation:ValidationResult={isValid:true,errors:[],warnings:[]}
  render(<AiPromptEnhancer ctx={ctx} result={result} validation={validation} onReset={vi.fn()} onPromptReady={ready}/>)
  fireEvent.click(screen.getByRole('button',{name:'توليد البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button',{name:'النسخة المحلية الاحتياطية'}))
  expect(screen.getByText(local)).toBeTruthy()
  await act(async()=>{release(new Response(JSON.stringify({prompt:photo}),{status:200,headers:{'content-type':'application/json'}}));await Promise.resolve()})
  expect(screen.getByText(local)).toBeTruthy()
  expect(screen.queryByText(photo)).toBeNull()
  expect(ready).toHaveBeenCalledWith(local)
 })
})
