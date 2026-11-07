import React from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {ImagePromptAuditorV8} from '../features/ai-prompt-enhancer/ImagePromptAuditorV8'
import type {CompilationContext} from '../domain/types'

afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'dark gray',surface:'knit',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral'
}
const brief='Selected wardrobe mirror selfie with the Xiaomi rear camera, natural grip, physical bedroom layout and the real light sources.'
const final='A natural reference-preserving mirror selfie made with the rear cameras of one Xiaomi phone, held against a steady right-wall wardrobe mirror. Real floor tile joints converge correctly, shadows come only from the true ceiling fixtures, and the person remains physically balanced. No added facial marks, fake sources, improbable limbs or invented furniture.'
const response={repairNotes:['تناقض: موضع الكاميرا؛ الإصلاح: توجيه العدسات الخلفية إلى المرآة.'],sceneCameraSurfaceDetails:'سيلفي مرآة خلفية، مواد الغرفة ثابتة وغبار خافت إذا ظهر فعليًا.',finalImagePrompt:final}
const ok=(data:unknown=response,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})

describe('v8 text-only auditor UI',()=>{
 it('runs with current scene selections without needing an earlier Gemini prompt',async()=>{
  const fetcher=vi.fn(async()=>ok())
  vi.stubGlobal('fetch',fetcher)
  render(<ImagePromptAuditorV8 ctx={base} sourcePrompt="" sceneBrief={brief} onAdvisoryReady={vi.fn()}/>)
  expect(screen.getByText(/اختيارات التصوير في التطبيق/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByText(final)).toBeTruthy())
  const [destination,config]=fetcher.mock.calls[0] as unknown as [string,{body:string}]
  const data=JSON.parse(config.body)
  expect(destination).toBe('/api/audit-image-prompt')
  expect(data.prompt).toBe(brief)
  expect(data.captureMode).toBe('mirror')
  expect(data.subjectReferencePresent).toBe(true)
  expect(data.roomReferencePresent).toBe(true)
  expect(data.ownPortrait).toBe(true)
  expect(data).not.toHaveProperty('image')
  expect(screen.getByRole('heading',{name:/A — ملاحظات الإصلاح/})).toBeTruthy()
  expect(screen.getByText(/مسودة البرومبت الإنجليزية/)).toBeTruthy()
 })
 it('shows only section C when prompt-only is selected',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>ok()))
  render(<ImagePromptAuditorV8 ctx={base} sourcePrompt="" sceneBrief={brief} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('checkbox',{name:/البرومبت فقط/}))
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByText(final)).toBeTruthy())
  expect(screen.queryByRole('heading',{name:/ملاحظات الإصلاح/})).toBeNull()
  expect(screen.queryByRole('heading',{name:/المشهد والكاميرا والأسطح/})).toBeNull()
  expect(screen.getByRole('heading',{name:/C — مسودة البرومبت الإنجليزية/})).toBeTruthy()
 })
 it('uses current generated prompt until user explicitly pastes an override',async()=>{
  const fetcher=vi.fn(async()=>ok())
  vi.stubGlobal('fetch',fetcher)
  const source='A user-supplied portrait in an existing bedroom with true daylight and honest camera perspective.'
  render(<ImagePromptAuditorV8 ctx={base} sourcePrompt={source} sceneBrief={brief} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1))
  expect(JSON.parse(((fetcher.mock.calls[0] as unknown as [string,{body:string}])[1]).body).prompt).toBe(source)
  fireEvent.change(screen.getByLabelText(/برومبت للتدقيق/),{target:{value:'Photograph a different scene explicitly requested by the user, preserving identity.'}})
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2))
  expect(JSON.parse(((fetcher.mock.calls[1] as unknown as [string,{body:string}])[1]).body).prompt).toContain('different scene')
 })
 it('can audit another person without transferring user body measurements',async()=>{
  const fetcher=vi.fn(async()=>ok({...response,repairNotes:[]}))
  vi.stubGlobal('fetch',fetcher)
  render(<ImagePromptAuditorV8 ctx={base} sourcePrompt="" sceneBrief={brief} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('checkbox',{name:/الصورة تخصني/}))
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByText(/لم يرصد المدقق تناقضًا نصيًا/)).toBeTruthy())
  expect(JSON.parse(((fetcher.mock.calls[0] as unknown as [string,{body:string}])[1]).body).ownPortrait).toBe(false)
 })
 it('hands advisory text to the existing image-result review without final authority',async()=>{
  const accept=vi.fn()
  vi.stubGlobal('fetch',vi.fn(async()=>ok()))
  render(<ImagePromptAuditorV8 ctx={base} sourcePrompt="" sceneBrief={brief} onAdvisoryReady={accept}/>)
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByText(final)).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:'إرسال المسودة لمراجعة الصورة (استشاري)'}))
  expect(accept).toHaveBeenCalledWith(final)
 })
 it('displays clear JSON and provider errors rather than pretending audit succeeded',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('<html>server failure</html>',{status:500,headers:{'content-type':'text/html'}})))
  render(<ImagePromptAuditorV8 ctx={base} sourcePrompt="" sceneBrief={brief} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('AUDITOR_NON_JSON'))
 })
 it('ignores stale responses when the selected shot changes',async()=>{
  let finish:((value:Response)=>void)|undefined
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve})))
  const {rerender}=render(<ImagePromptAuditorV8 ctx={base} sourcePrompt="" sceneBrief={brief} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تدقيق وإصلاح البرومبت — v8'}))
  rerender(<ImagePromptAuditorV8 ctx={{...base,bedroomShotId:'bed_edge'}} sourcePrompt="" sceneBrief="A direct selfie at the bed edge." onAdvisoryReady={vi.fn()}/>)
  await act(async()=>{finish?.(ok())})
  expect(screen.queryByText(final)).toBeNull()
 })
})
