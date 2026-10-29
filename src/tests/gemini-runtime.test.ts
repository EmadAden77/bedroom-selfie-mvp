// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import geminiHandler, { PROMPT_HINTS as serverCatalog, eligibleHintIds as serverEligible } from '../../api/generate-prompt'
import { PROMPT_HINTS as clientCatalog, eligibleHintIds as clientEligible } from '../engine/ai-prompt-guard'

afterEach(()=>{ vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Production Vercel Gemini function regression',()=>{
  it('has no runtime dependency on src/engine and keeps the approved catalog identical',()=>{
    expect(serverCatalog).toEqual(clientCatalog)
    expect(serverEligible('mirror','standing')).toEqual(clientEligible('mirror','standing'))
    expect(serverEligible('front','seated_bed')).toEqual(clientEligible('front','seated_bed'))
  })
  it('responds to GET with a valid JSON 405 instead of crashing on load', async ()=>{
    const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt'))
    expect(response.status).toBe(405)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({error:'POST only'})
  })
  it('reports missing environment without leaking its values',async ()=>{
    vi.stubEnv('GEMINI_API_KEY','')
    vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','')
    const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt',{method:'POST'}))
    expect(response.status).toBe(503)
    const payload=await response.json() as {error:string}
    expect(payload.error).toContain('GEMINI_API_KEY')
  })
  it('rejects wrong access codes as JSON before calling the model',async ()=>{
    vi.stubEnv('GEMINI_API_KEY','test-key-not-real')
    vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','test-access-code-not-real')
    const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt',{
      method:'POST',headers:{'Content-Type':'application/json','x-prompt-engine-access':'wrong-code'},
      body:JSON.stringify({prompt:'local '.repeat(100),mode:'mirror',posture:'standing'})
    }))
    expect(response.status).toBe(401)
    expect(response.headers.get('content-type')).toContain('application/json')
    const payload=await response.json() as {error:string}
    expect(payload.error).toContain('غير صحيح')
  })
  it('rejects unknown shooting geometry without contacting the model',async ()=>{
    vi.stubEnv('GEMINI_API_KEY','test-key-not-real')
    vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','test-access-code-not-real')
    const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt',{
      method:'POST',headers:{'Content-Type':'application/json','x-prompt-engine-access':'test-access-code-not-real'},
      body:JSON.stringify({prompt:'local '.repeat(100),mode:'floating-camera',posture:'standing'})
    }))
    expect(response.status).toBe(400)
    expect((await response.json() as {error:string}).error).toBeTruthy()
  })
  it('sends only scene metadata to Google, never the long reference prompt',async ()=>{
    vi.stubEnv('GEMINI_API_KEY','test-key-not-real')
    vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','test-access-code-not-real')
    vi.stubEnv('GEMINI_MODEL','')
    let outboundBody=''
    let outboundUrl=''
    vi.stubGlobal('fetch',vi.fn(async (url:string, opts:{body:string})=>{
      outboundUrl=url
      outboundBody=opts.body
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({ids:['mirror_optics','real_cloth']})}]}}]}),{status:200,headers:{'content-type':'application/json'}})
    }))
    const confidential='Private reference anatomy, facial features and exact bedroom geometry; do not share.'
    const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt',{
      method:'POST',headers:{'x-prompt-engine-access':'test-access-code-not-real','content-type':'application/json'},
      body:JSON.stringify({prompt:confidential.repeat(7),mode:'mirror',posture:'standing',lighting:'ceiling_neutral'})
    }))
    expect(response.status).toBe(200)
    expect(outboundUrl).toContain('gemini-3.5-flash-lite')
    expect(outboundBody).toContain('ceiling_neutral')
    expect(outboundBody).not.toContain(confidential)
    const result=await response.json() as { enhancedPrompt:string }
    expect(result.enhancedPrompt.startsWith(confidential)).toBe(true)
  })
  it('reports provider timeout and outbound network errors with distinct safe error codes',async ()=>{
    vi.stubEnv('GEMINI_API_KEY','test-key-not-real')
    vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','test-access-code-not-real')
    const payload=JSON.stringify({prompt:'test '.repeat(100),mode:'front',posture:'standing'})
    for(const [name,code,status] of [['TimeoutError','GEMINI_TIMEOUT',504],['TypeError','GEMINI_NETWORK',502]] as const){
      const error=new Error('The private provider connection failed')
      error.name=name
      vi.stubGlobal('fetch',vi.fn(async()=>{throw error}))
      const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt',{
        method:'POST',headers:{'x-prompt-engine-access':'test-access-code-not-real'},body:payload
      }))
      expect(response.status).toBe(status)
      const body=await response.json() as {errorCode:string;error:string}
      expect(body.errorCode).toBe(code)
      expect(body.error).not.toContain('private provider')
    }
  })
  it('distinguishes rejected provider key and quota from network exceptions',async ()=>{
    vi.stubEnv('GEMINI_API_KEY','test-key-not-real')
    vi.stubEnv('PROMPT_ENGINE_ACCESS_TOKEN','test-access-code-not-real')
    for(const [status,code] of [[403,'GEMINI_ACCESS'],[429,'GEMINI_QUOTA'],[404,'GEMINI_MODEL']] as const){
      vi.stubGlobal('fetch',vi.fn(async()=>new Response('remote details hidden',{status})))
      const response=await geminiHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app/api/generate-prompt',{
        method:'POST',headers:{'x-prompt-engine-access':'test-access-code-not-real'},
        body:JSON.stringify({prompt:'test '.repeat(100),mode:'mirror',posture:'standing'})
      }))
      expect((await response.json() as {errorCode:string}).errorCode).toBe(code)
    }
  })

})
