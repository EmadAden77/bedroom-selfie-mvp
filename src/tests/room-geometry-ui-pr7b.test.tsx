import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {RoomSizeSelector} from '../features/room-geometry/RoomSizeSelector'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import type {CompilationContext} from '../domain/types'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {assembleEditorialPrompt,digestEditorialText} from '../../shared/editorial-contract'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral'
}
const scene=()=>{
 const {validation,result}=compilePrompt(ctx)
 expect(validation.isValid).toBe(true)
 return {validation,result,spec:buildSceneSpecification(ctx,result,validation)}
}
const ui=(ready=vi.fn())=>{
 const {validation,result}=scene()
 render(<AiPromptEnhancer ctx={ctx} validation={validation} result={result} onReset={vi.fn()}
  onPromptReady={ready} onAdvisoryReady={vi.fn()}/>)
 return {ready,prompt:result.promptText}
}
describe('PR7b: room selector warning and non-authoritative draft display',()=>{
 it('shows exact unconfirmed medium banner and measurement-specific RG-1/RG-2 warnings',()=>{
  render(<RoomSizeSelector ctx={ctx} posture="standing" activeLighting="ceiling_neutral"
   onChange={vi.fn()}/>)
  expect(screen.getByText('Room size assumed as medium. Confirm for accuracy.')).toBeTruthy()
  expect(screen.getByText(/implicit distances pending PR8/)).toBeTruthy()
  expect(screen.getByText(/mirror width not defined; RG-2 cannot verify fit/)).toBeTruthy()
  expect(screen.getByRole('button',{name:'تأكيد أبعاد الغرفة المختارة'})).toBeTruthy()
 })
 it('custom has blank inputs, requests numeric input without a fabricated default',()=>{
  const change=vi.fn()
  render(<RoomSizeSelector ctx={{...ctx,roomSizePreset:'custom'}} posture="standing"
   activeLighting="phone_screen_only" onChange={change}/>)
  for(const name of ['العرض (متر)','العمق (متر)','الارتفاع (متر)']){
   expect((screen.getByRole('spinbutton',{name}) as HTMLInputElement).value).toBe('')
  }
  expect(screen.getByText(/custom room width must be 2.0/)).toBeTruthy()
  fireEvent.change(screen.getByRole('spinbutton',{name:'العرض (متر)'}),{target:{value:'1.5'}})
  expect(change).toHaveBeenCalledWith({roomCustomWidthMeters:1.5})
 })
 it('new positive A: local compilation is DISPLAYED, with unconfirmed room, and never promoted',async()=>{
  const fetcher=vi.fn()
  vi.stubGlobal('fetch',fetcher)
  const {ready,prompt}=ui()
  await waitFor(()=>expect(screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'})).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'}))
  expect(screen.getByText('البرومبت المحلي — للعرض فقط، غير معتمد')).toBeTruthy()
  expect(screen.getByText(/أبعاد الغرفة غير مؤكدة أو قياسات الهندسة غير مكتملة/)).toBeTruthy()
  expect(screen.getByRole('button',{name:'نسخ المسودة غير المعتمدة'})).toBeTruthy()
  expect(ready).not.toHaveBeenCalledWith(prompt)
  expect(fetcher).not.toHaveBeenCalled()
 })
 it('new positive B: a verified Gemini draft is DISPLAYED with warning but never becomes active Final Prompt',async()=>{
  const {spec}=scene()
  const proposal={sectionOrder:[...spec.mandatoryUnitIds],openingLineSelection:'canonical' as const}
  const output=assembleEditorialPrompt(spec,proposal)
  const payload={
   ...output,source:'gemini-editor',validated:true,authoritative:false,
   integrity:spec.integrity,promptDigest:await digestEditorialText(output.prompt),
   sectionCount:spec.derivedUnits.length,
   protectedUnitDigests:await Promise.all(spec.derivedUnits.map(async unit=>({
    id:unit.id,digest:await digestEditorialText(unit.text)
   })))
  }
  const fetcher=vi.fn(async()=>new Response(JSON.stringify(payload),{
   status:200,headers:{'content-type':'application/json'}
  }))
  vi.stubGlobal('fetch',fetcher)
  const ready=vi.fn()
  ui(ready)
  fireEvent.click(screen.getByRole('button',{name:'تحرير البرومبت بواسطة Gemini'}))
  await waitFor(()=>expect(screen.getByText(/نتيجة Gemini المحررة — غير معتمدة نهائيًا/)).toBeTruthy())
  expect(screen.getByText(/تحرير Gemini صحيح نصيًا لكنه غير معتمد نهائيًا/)).toBeTruthy()
  expect(screen.getByRole('button',{name:'نسخ المسودة غير المعتمدة'})).toBeTruthy()
  expect(ready).not.toHaveBeenCalledWith(payload.prompt)
  expect(fetcher).toHaveBeenCalledTimes(1)
 })
})
