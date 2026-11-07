import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {GhalyonPromptOptimizer} from '../features/ai-prompt-enhancer/GhalyonPromptOptimizer'
import {ImagePromptAuditorV8} from '../features/ai-prompt-enhancer/ImagePromptAuditorV8'
import type {CompilationContext} from '../domain/types'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const json=(x:unknown)=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}})
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,bedroomShotId:'bed_edge',nightLightingId:'ceiling_neutral',
 phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'
}
const scene='A direct close-range bedroom selfie illuminated only by the phone screen. The background remains dark and the recording camera is front facing.'
describe('Freeform auxiliary AI prompt safety in strict phone-only mode',()=>{
 it('rejects Ghalyon output that explicitly turns on a room lamp',async()=>{
  const generated='A direct bedroom selfie with a single phone display. A warm bedside lamp illuminates the face and room. The background is bright.'
  vi.stubGlobal('fetch',vi.fn(async()=>json({status:'complete',questions:[],optimizedPrompt:generated,improvements:['تنظيم'],proTip:'اختبار'})))
  const onPromptReady=vi.fn()
  render(<GhalyonPromptOptimizer sourcePrompt="" scenePrompt={scene} phoneOnlyMode="DARK_ROOM_FRONT_SCREEN_ONLY" onPromptReady={onPromptReady}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحسين البرومبت'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('إضاءة غير مصرّح بها'))
  expect(screen.queryByText(generated)).toBeNull()
  expect(onPromptReady).not.toHaveBeenCalled()
 })
 it('rejects V8 output that explicitly turns on ceiling illumination while passing effective phone-only light',async()=>{
  const bad='A close front selfie lit by ceiling lights. A phone screen is also present. The bedroom is brightly illuminated by the installed room fixtures.'
  const fetcher=vi.fn(async()=>json({repairNotes:[],sceneCameraSurfaceDetails:'اختبار',finalImagePrompt:bad}))
  vi.stubGlobal('fetch',fetcher)
  const onPromptReady=vi.fn()
  render(<ImagePromptAuditorV8 ctx={ctx} sourcePrompt="" sceneBrief={scene} onPromptReady={onPromptReady}/>)
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('إضاءة غير مصرّح بها'))
  const body=JSON.parse((fetcher.mock.calls[0] as unknown as [string,{body:string}])[1].body)
  expect(body.lighting).toBe('phone_screen_only')
  expect(body.captureMode).toBe('front')
  expect(screen.queryByText(bad)).toBeNull()
  expect(onPromptReady).not.toHaveBeenCalled()
 })
})
