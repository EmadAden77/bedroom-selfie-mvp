// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import handler,{parseReply,SYSTEM as GHALYON_SYSTEM,SCHEMA,MAX_GHALYON_IDEA_CHARS,MAX_GHALYON_REQUEST_BYTES} from '../../api/optimize-prompt'
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


describe('Verified Gemini API error handling',()=>{
 it.each([
  [400,'GEMINI_REQUEST',502],
  [401,'GEMINI_ACCESS',502],
  [403,'GEMINI_ACCESS',502],
  [404,'GEMINI_MODEL',502],
  [429,'GEMINI_QUOTA',429],
  [503,'GEMINI_UPSTREAM',502]
 ] as const)('maps upstream %d to safe %s',async(status,code,expectedStatus)=>{
  vi.stubEnv('GEMINI_API_KEY','test-key')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('secret error body',{status})))
  const result=await handler.fetch(req(payload,'ghalyon-status-'+status))
  expect(result.status).toBe(expectedStatus)
  const data=await result.json() as {errorCode:string;error:string}
  expect(data.errorCode).toBe(code)
  expect(data.error).not.toContain('secret error')
 })
 it('distinguishes timeout from network failure',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-key')
  for(const [name,code,status] of [['TimeoutError','GEMINI_TIMEOUT',504],['TypeError','GEMINI_NETWORK',502]] as const){
   const err=new Error('secret')
   err.name=name
   vi.stubGlobal('fetch',vi.fn(async()=>{throw err}))
   const result=await handler.fetch(req(payload,'ghalyon-'+name))
   expect(result.status).toBe(status)
   expect((await result.json() as {errorCode:string}).errorCode).toBe(code)
  }
 })
 it('rejects oversized JSON even if content-length is omitted',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-key')
  const r=new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   ...payload,irrelevant:'x'.repeat(MAX_GHALYON_REQUEST_BYTES+5)
  })})
  expect((await handler.fetch(r)).status).toBe(413)
 })
})

describe('Direct selfie-scene Ghalyon request handling',()=>{
 it('accepts a full existing mirror-scene brief and forwards it without truncation',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const longIdea='Mirror selfie with physically correct rear camera, wardrobe, bed, dresser and true reflection. '.repeat(100)
  expect(longIdea.length).toBeGreaterThan(7000)
  expect(longIdea.length).toBeLessThan(MAX_GHALYON_IDEA_CHARS)
  let outbound:any
  vi.stubGlobal('fetch',vi.fn(async(_url:string,opts:{body:string})=>{outbound=JSON.parse(opts.body);return provider(complete)}))
  const result=await handler.fetch(req({...payload,idea:longIdea},'ghalyon-full-room'))
  expect(result.status).toBe(200)
  const input=JSON.parse(outbound.contents[0].parts[0].text)
  expect(input.idea).toBe(longIdea)
 })
 it('rejects excessive input size and omitted content-length safely',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const tooMany='x'.repeat(MAX_GHALYON_IDEA_CHARS+1)
  const response=await handler.fetch(req({...payload,idea:tooMany},'ghalyon-length'))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('INVALID_INPUT')
  const huge=await handler.fetch(new Request(endpoint,{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({...payload,extra:'x'.repeat(MAX_GHALYON_REQUEST_BYTES+5)})}))
  expect(huge.status).toBe(413)
 })
 it('returns actionable JSON error when Gemini sends no candidate',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({candidates:[]}),{status:200})))
  const result=await handler.fetch(req(payload,'ghalyon-empty-provider'))
  expect(result.status).toBe(422)
  expect((await result.json() as {errorCode:string}).errorCode).toBe('GEMINI_EMPTY_RESPONSE')
 })
})
