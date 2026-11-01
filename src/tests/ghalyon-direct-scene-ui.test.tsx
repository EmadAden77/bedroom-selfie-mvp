import React from 'react'
import {act,fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {GhalyonPromptOptimizer} from '../features/ai-prompt-enhancer/GhalyonPromptOptimizer'

afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const scene='The person stands naturally before the wardrobe mirror, the bed stays behind the subject, the vanity mirror is to the wardrobe right; exactly one real phone with correctly reflected rear cameras.'
const complete={status:'complete',questions:[],optimizedPrompt:'A physically natural mirror selfie in the reference bedroom showing a single phone and correct mirror reflections without inventing furniture.',improvements:['ضبط المنظور'],proTip:'راجع الغرفة'}
const data=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}})

describe('Ghalyon direct scene controls',()=>{
 it('can optimize the selected selfie scene without generating another prompt or filling the textbox',async()=>{
  const fetcher=vi.fn(async()=>data(complete))
  vi.stubGlobal('fetch',fetcher)
  render(<GhalyonPromptOptimizer sourcePrompt="" scenePrompt={scene} initialTarget="chatgpt" onPromptReady={vi.fn()}/>)
  expect(screen.getByRole('button',{name:'تحسين البرومبت'}).hasAttribute('disabled')).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:/تحسين مشهد السيلفي الحالي مباشرةً/}))
  await waitFor(()=>expect(screen.getByText(complete.optimizedPrompt)).toBeTruthy())
  const [_url,opts]=fetcher.mock.calls[0] as unknown as [string,{body:string}]
  const sent=JSON.parse(opts.body)
  expect(sent.idea).toBe(scene)
  expect(sent.target).toBe('chatgpt')
  expect(sent.mode).toBe('auto')
 })
 it('primary optimize button uses scene context automatically if the user left idea blank',async()=>{
  const fetcher=vi.fn(async()=>data(complete))
  vi.stubGlobal('fetch',fetcher)
  render(<GhalyonPromptOptimizer sourcePrompt="" scenePrompt={scene} onPromptReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحسين البرومبت'}))
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1))
  const [,opts]=fetcher.mock.calls[0] as unknown as [string,{body:string}]
  expect(JSON.parse(opts.body).idea).toBe(scene)
 })
 it('keeps the scene as the source across DETAIL clarifications',async()=>{
  const questions={status:'questions',questions:['كيف تريد تأطير المشهد؟'],optimizedPrompt:'',improvements:[],proTip:''}
  const fetcher=vi.fn()
   .mockResolvedValueOnce(data(questions))
   .mockResolvedValueOnce(data(complete))
  vi.stubGlobal('fetch',fetcher)
  render(<GhalyonPromptOptimizer sourcePrompt="" scenePrompt={scene} onPromptReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:/تحسين مشهد السيلفي الحالي مباشرةً/}))
  await waitFor(()=>expect(screen.getByText(/كيف تريد تأطير المشهد/)).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:'توليد البرومبت بالإجابات'}))
  await waitFor(()=>expect(screen.getByText(complete.optimizedPrompt)).toBeTruthy())
  const sent=JSON.parse((fetcher.mock.calls[1][1] as {body:string}).body)
  expect(sent.idea).toBe(scene)
  expect(sent.answers[0].question).toContain('تأطير')
 })
 it('explains a non-JSON server crash rather than silently failing',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('<html>server failure</html>',{status:500,headers:{'content-type':'text/html'}})))
  render(<GhalyonPromptOptimizer sourcePrompt="" scenePrompt={scene} onPromptReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحسين البرومبت'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('GHALYON_NON_JSON'))
 })
 it('exposes the provider error code safely for troubleshooting',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>data({error:'نموذج Gemini غير متاح',errorCode:'GEMINI_MODEL'},502)))
  render(<GhalyonPromptOptimizer sourcePrompt="" scenePrompt={scene} onPromptReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'تحسين البرومبت'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('GEMINI_MODEL'))
 })
})
