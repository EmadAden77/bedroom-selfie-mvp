import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import {PhotoResultAudit} from '../features/photo-result-audit/PhotoResultAudit'
import {compilePrompt} from '../compiler'
import type {CompilationContext} from '../domain/types'

vi.mock('../features/photo-result-audit/AiPhotoAudit',()=>({
 AiPhotoAudit:({originalPrompt}:{originalPrompt:string})=><div data-testid="photo-audit-trusted-source">{originalPrompt}</div>
}))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()})
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral'
}
const json=(v:unknown)=>new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}})
const ui=(finalReady:ReturnType<typeof vi.fn>,advisoryReady:ReturnType<typeof vi.fn>)=>{
 const {validation,result}=compilePrompt(ctx)
 expect(validation.isValid).toBe(true)
 render(<AiPromptEnhancer ctx={ctx} result={result} validation={validation}
  onReset={vi.fn()} onPromptReady={finalReady} onAdvisoryReady={advisoryReady}/>)
 finalReady.mockClear()
 advisoryReady.mockClear()
}
describe('PR4 Ghalyon/Auditor advisory output has no final-prompt authority',()=>{
 it('Ghalyon retains generation, copy and review handoff but cannot call authoritative prompt callback',async()=>{
  const draft='A realistic standing mirror selfie in a bedroom with a single ordinary light and physically supported arm.'
  const fetcher=vi.fn(async()=>json({
   status:'complete',questions:[],optimizedPrompt:draft,
   improvements:['اتساق الإضاءة'],proTip:'استخدم الصور المرجعية'
  }))
  vi.stubGlobal('fetch',fetcher)
  const final=vi.fn(),advisory=vi.fn()
  ui(final,advisory)
  expect(screen.getAllByText('Advisory Output — Non-Authoritative').length).toBe(2)
  fireEvent.click(screen.getByRole('button',{name:/تحسين مشهد السيلفي الحالي مباشرةً/}))
  await waitFor(()=>expect(screen.getByText('الأمر المحسّن — مسودة استشارية')).toBeTruthy())
  expect(screen.getByRole('button',{name:'نسخ الاقتراح الاستشاري'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'إرسال الاقتراح لمراجعة الصورة (استشاري)'}))
  expect(advisory).toHaveBeenCalledWith(draft)
  expect(final).not.toHaveBeenCalledWith(draft)
  expect(final).not.toHaveBeenCalled()
  expect(fetcher).toHaveBeenCalledTimes(1)
 })
 it('Auditor v8 retains review and copy while routing its free-text proposal only to advisory channel',async()=>{
  const draft='A verified-looking but non-authoritative draft description of the same bedroom selfie, with no authority to override the local scene.'
  vi.stubGlobal('fetch',vi.fn(async()=>json({
   repairNotes:[],sceneCameraSurfaceDetails:'مراجعة وصف الكاميرا والسطح، دون اعتماد النص.',
   finalImagePrompt:draft
  })))
  const final=vi.fn(),advisory=vi.fn()
  ui(final,advisory)
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByText('C — مسودة البرومبت الإنجليزية (استشارية وليست نهائية)')).toBeTruthy())
  expect(screen.getByRole('button',{name:'نسخ المسودة الاستشارية'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'إرسال المسودة لمراجعة الصورة (استشاري)'}))
  expect(advisory).toHaveBeenCalledWith(draft)
  expect(final).not.toHaveBeenCalledWith(draft)
  expect(final).not.toHaveBeenCalled()
 })
 it('photo image audit receives the validated original prompt, not the separate advisory draft',async()=>{
  const original='TRUSTED FINAL PROMPT FROM LOCAL COMPILER'
  const draft='ADVISORY DRAFT THAT MUST NOT OVERRIDE'
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=>'blob:example')})
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()})
  render(<PhotoResultAudit ctx={ctx} originalPrompt={original} advisoryReviewPrompt={draft}/>)
  expect(screen.getByText('Advisory Output — Non-Authoritative')).toBeTruthy()
  expect(screen.getByText(draft)).toBeTruthy()
  const file=new File(['png'], 'selfie.png',{type:'image/png'})
  fireEvent.change(screen.getByLabelText(/الصورة الناتجة \(JPG/),{target:{files:[file]}})
  await waitFor(()=>expect(screen.getByTestId('photo-audit-trusted-source').textContent).toBe(original))
  expect(screen.getByTestId('photo-audit-trusted-source').textContent).not.toContain(draft)
 })
})
