// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import geminiHandler, { PROMPT_HINTS as serverCatalog, eligibleHintIds as serverEligible } from '../../api/generate-prompt'
import { PROMPT_HINTS as clientCatalog, eligibleHintIds as clientEligible } from '../engine/ai-prompt-guard'

afterEach(()=>{ vi.unstubAllEnvs() })

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
})
