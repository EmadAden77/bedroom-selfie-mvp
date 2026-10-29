// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import handler,{assembleMainPrompt} from '../../api/generate-main-prompt'

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const prompt='Reference identity anchored to reference image: preserve same person, no identity drift. BEDROOM ENVIRONMENT LOCK: Maintain one room and natural physics. '+('Keep camera, lighting, clothing and human geometry fixed. '.repeat(9))
const endpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt'
const payload={basePrompt:prompt,mode:'mirror',posture:'standing',shotId:'mirror_45',lighting:'ceiling_neutral',target:'gemini'}
const post=(data:unknown=payload,headers:Record<string,string>={})=>new Request(endpoint,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)})
const modelResponse=JSON.stringify({scene:'A person stands diagonally beside the real mirrored wardrobe, holding their actual smartphone steadily and naturally, while weight rests on the rear leg.',camera:'The phone rear camera records the correct reflection with physically consistent glass rays and the true hand supporting its weight.',naturalism:'Ordinary room ceiling illumination casts believable shadows; restrained phone noise and modest imperfect framing preserve a candid daily feeling.'})

describe('Gemini as main passwordless prompt writer',()=>{
 it('does not require a password for the main endpoint',async()=>{
  expect((await handler.fetch(new Request(endpoint))).status).toBe(405)
  vi.stubEnv('GEMINI_API_KEY','')
  const unavailable=await handler.fetch(post())
  expect(unavailable.status).toBe(503)
  expect((await unavailable.json() as {errorCode:string}).errorCode).toBe('GEMINI_NOT_CONFIGURED')
 })
 it('rejects other websites and invalid media types without a key disclosure',async()=>{
  expect((await handler.fetch(post(payload,{origin:'https://other.example'}))).status).toBe(403)
  const result=await handler.fetch(new Request(endpoint,{method:'POST',headers:{'content-type':'text/plain'},body:'test'}))
  expect(result.status).toBe(415)
 })
 it('rejects unstructured or unlocked local prompts',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-test-key')
  let response=await handler.fetch(post({...payload,basePrompt:'make a portrait'}))
  expect(response.status).toBe(400)
 })
 it('has Gemini author the main narrative while preserving exact original reference locks',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-test-key')
  let sent=''
  vi.stubGlobal('fetch',vi.fn(async(_url:string,opts:{body:string})=>{
    sent=opts.body
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:modelResponse}]}}]}),{status:200})
  }))
  const result=await handler.fetch(post())
  expect(result.status).toBe(200)
  const body=await result.json() as {prompt:string;source:string}
  expect(body.source).toBe('gemini')
  expect(body.prompt).toContain('GEMINI-GENERATED PRIMARY IMAGE PROMPT')
  expect(body.prompt).toContain(prompt.trim())
  expect(body.prompt).toContain('stands diagonally')
  expect(sent).toContain('mirror_45')
  expect(sent).not.toContain('data:image')
 })
 it('rejects malformed Gemini text rather than publishing altered identity',()=>{
  expect(()=>assembleMainPrompt('not-json',prompt)).toThrow()
  expect(()=>assembleMainPrompt(JSON.stringify({scene:'x',camera:'y',naturalism:'z'}),prompt)).toThrow()
 })
 it('reports Google quota response safely without showing secrets',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-test-key')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('provider private error',{status:429})))
  const result=await handler.fetch(post())
  expect(result.status).toBe(429)
  const body=await result.json() as {error:string;errorCode:string}
  expect(body.errorCode).toBe('GEMINI_QUOTA')
  expect(body.error).not.toContain('provider private')
 })
})
