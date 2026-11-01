// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import handler,{parseReply,SYSTEM as GHALYON_SYSTEM,SCHEMA} from '../../api/optimize-prompt'
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const endpoint='https://bedroom-selfie-mvp.vercel.app/api/optimize-prompt'
const idea='Generate a careful realistic bedroom selfie prompt for an adult person.'
const payload={idea,target:'gemini',mode:'auto',answers:[]}
const req=(body:unknown=payload,ip='ghalyon-test')=>new Request(endpoint,{
 method:'POST',headers:{'content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)
})
const complete={status:'complete',questions:[],optimizedPrompt:'Write a realistic bedroom selfie prompt with one reachable camera, consistent light sources and natural anatomy.',improvements:['ضبط المنظور','تحديد القيود'],proTip:'أرفق صورة مرجعية عند الحاجة.'}
const questions={status:'questions',questions:['ما النموذج المستهدف لإخراج الصورة؟','هل يوجد مرجع للهوية؟'],optimizedPrompt:'',improvements:[],proTip:''}
const provider=(reply:unknown)=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}]}),{status:200})

describe('Ghalyon prompt optimizer',()=>{
 it('returns no-store POST-only responses, with no provider key exposed',async()=>{
  const get=await handler.fetch(new Request(endpoint))
  expect(get.status).toBe(405)
  expect(get.headers.get('cache-control')).toBe('no-store')
  vi.stubEnv('GEMINI_API_KEY','')
  const response=await handler.fetch(req(payload,'ghalyon-key'))
  expect(response.status).toBe(503)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('GEMINI_NOT_CONFIGURED')
 })
 it('rejects invalid model or mode and excessive clarification answers',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  expect((await handler.fetch(req({...payload,target:'unknown'},'ghalyon-target'))).status).toBe(400)
  expect((await handler.fetch(req({...payload,mode:'unknown'},'ghalyon-mode'))).status).toBe(400)
  expect((await handler.fetch(req({...payload,answers:new Array(4).fill({question:'Question?',answer:'Yes'})},'ghalyon-answers'))).status).toBe(400)
 })
 it('rejects cross-origin requests',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const r=await handler.fetch(new Request(endpoint,{method:'POST',
   headers:{'content-type':'application/json',origin:'https://other.example'},body:JSON.stringify(payload)}))
  expect(r.status).toBe(403)
 })
 it('AUTO asks no more than three questions and BASIC cannot ask questions',()=>{
  expect(parseReply(JSON.stringify(questions),'auto',false)).toEqual(questions)
  expect(()=>parseReply(JSON.stringify(questions),'basic',false)).toThrow()
  expect(()=>parseReply(JSON.stringify(questions),'detail',true)).toThrow()
  expect(()=>parseReply(JSON.stringify({...questions,questions:['q?','q?','q?','q?']}),'detail',false)).toThrow()
 })
 it('returns complete optimized prompt with improvements and tip',()=>{
  expect(parseReply(JSON.stringify(complete),'basic',false)).toEqual(complete)
  expect(()=>parseReply(JSON.stringify({...complete,questions:['Unexpected?']}),'auto',false)).toThrow()
  expect(()=>parseReply(JSON.stringify({...complete,optimizedPrompt:'too short'}),'auto',false)).toThrow()
 })
 it('includes strategic rules, selected target and user answers in a single Gemini request',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  let outgoing:any
  vi.stubGlobal('fetch',vi.fn(async(_url:string,opts:{body:string})=>{outgoing=JSON.parse(opts.body);return provider(complete)}))
  const answers=[{question:'ما الجمهور المستهدف؟',answer:'طلاب الجامعة'}]
  const r=await handler.fetch(req({...payload,target:'claude',mode:'detail',answers},'ghalyon-complete'))
  expect(r.status).toBe(200)
  expect((await r.json() as {optimizedPrompt:string}).optimizedPrompt).toBe(complete.optimizedPrompt)
  expect(outgoing.systemInstruction.parts[0].text).toContain(GHALYON_SYSTEM)
  expect(outgoing.systemInstruction.parts[0].text).toContain('long-context')
  expect(outgoing.generationConfig.responseFormat.text.schema).toEqual(SCHEMA)
  expect(outgoing.contents[0].parts[0].text).toContain('طلاب الجامعة')
 })
 it('returns questions from Gemini on DETAIL when information is essential',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  vi.stubGlobal('fetch',vi.fn(async()=>provider(questions)))
  const r=await handler.fetch(req({...payload,mode:'detail'},'ghalyon-clarify'))
  expect(r.status).toBe(200)
  expect((await r.json() as {status:string}).status).toBe('questions')
 })
})
