// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import handler,{buildCorrectedPhotoPrompt,parseAudit} from '../../api/audit-photo'

const url='https://bedroom-selfie-mvp.vercel.app/api/audit-photo'
const image='data:image/jpeg;base64,'+'A'.repeat(240)
const originalPrompt='Reference identity anchored to reference image: preserve same person. BEDROOM ENVIRONMENT LOCK: Keep all furniture and reflected optics consistent. '+'Keep skin and hair and body anatomy fixed. '.repeat(8)
const body={consent:true,originalPrompt,outputImage:image,captureMode:'mirror',posture:'standing'}
const post=(value:unknown=body)=>new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)})
const criteria=['identity','hair','room','pose','hands','mirror','lighting','clothing','camera','skin']
const findings=criteria.map(criterion=>({criterion,status:criterion==='mirror'?'fail':'pass',confidence:'medium',evidenceAr:'تفاصيل ظاهرة تشير إلى اختلاف محتمل في المشهد.',repairEn:criterion==='mirror'?'Re-establish a single true optical reflection in the existing wardrobe mirror.':''}))
const fakeResponse={overviewAr:'هناك اختلاف محتمل في انعكاس المرآة ويحتاج للمراجعة.',findings}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})

describe('Gemini image auditing and targeted repair',()=>{
 it('refuses upload without explicit permission',async()=>{
  vi.stubEnv('GEMINI_API_KEY','testing-key')
  const result=await handler.fetch(post({...body,consent:false}))
  expect(result.status).toBe(403)
  expect((await result.json() as {errorCode:string}).errorCode).toBe('AUDIT_CONSENT')
 })
 it('blocks oversized and malformed image payloads',async()=>{
  vi.stubEnv('GEMINI_API_KEY','testing-key')
  const r=await handler.fetch(post({...body,outputImage:'https://somewhere/image.jpg'}))
  expect(r.status).toBe(400)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('AUDIT_VALIDATION')
 })
 it('does not assert facial matching without a subject reference',()=>{
  const parsed=parseAudit(JSON.stringify(fakeResponse),false,false)
  expect(parsed.findings.find(f=>f.criterion==='identity')?.status).toBe('uncertain')
  expect(parsed.findings.find(f=>f.criterion==='room')?.status).toBe('uncertain')
 })
 it('builds correction by appending to original unchanged and touching only failures',()=>{
  const parsed=parseAudit(JSON.stringify(fakeResponse),true,true)
  const repaired=buildCorrectedPhotoPrompt(originalPrompt,parsed)
  expect(repaired.startsWith(originalPrompt)).toBe(true)
  expect(repaired).toContain('existing sliding wardrobe')
  expect(repaired).not.toContain('new person')
  expect(repaired).toContain('Only correct the listed failures')
 })
 it('forwards only images explicitly selected by the user',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-no-real-secret')
  let outbound:any=null
  vi.stubGlobal('fetch',vi.fn(async(_url:string,config:{body:string})=>{
   outbound=JSON.parse(config.body)
   return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(fakeResponse)}]}}]}),{status:200})
  }))
  const response=await handler.fetch(post())
  expect(response.status).toBe(200)
  const sentParts=outbound.contents[0].parts
  expect(sentParts.filter((x:Record<string,unknown>)=>'inline_data' in x)).toHaveLength(1)
  expect(JSON.stringify(sentParts)).not.toContain('test-no-real-secret')
  const result=await response.json() as {correctedPrompt:string;audit:{findings:Array<{criterion:string;status:string}>}}
  expect(result.correctedPrompt).toContain(originalPrompt)
  expect(result.audit.findings.find(x=>x.criterion==='identity')?.status).toBe('uncertain')
 })
 it('compares identity only when user consented to send a subject reference',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-no-real-secret')
  let outbound:any=null
  vi.stubGlobal('fetch',vi.fn(async(_url:string,config:{body:string})=>{
   outbound=JSON.parse(config.body)
   return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(fakeResponse)}]}}]}),{status:200})
  }))
  const r=await handler.fetch(post({...body,subjectReference:image}))
  expect(r.status).toBe(200)
  expect(outbound.contents[0].parts.filter((x:Record<string,unknown>)=>'inline_data' in x)).toHaveLength(2)
  const result=await r.json() as {audit:{findings:Array<{criterion:string;status:string}>}}
  expect(result.audit.findings.find(x=>x.criterion==='identity')?.status).toBe('pass')
 })
 it('fails closed on invalid model JSON and does not rewrite original',()=>{
  expect(()=>parseAudit('garbage',true,true)).toThrow()
  expect(()=>parseAudit(JSON.stringify({overviewAr:'ok',findings:[]}),true,true)).toThrow()
 })
 it('rejects requests from another website',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-key')
  const r=await handler.fetch(new Request(url,{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify(body)}))
  expect(r.status).toBe(403)
 })
})
