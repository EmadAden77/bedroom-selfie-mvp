/**
 * Server-side final authority boundary, independent of advisory text endpoints.
 * No mutable server session and no promotion by client-reported labels/flags.
 * All candidate bytes must match the server-validated SceneSpecification.
 */
import {validateSceneSpec,MAX_SCENE_REQUEST_BYTES} from './generate-main-prompt.ts'
import {assertAuthoritative} from '../shared/authoritative-prompt.ts'
import {digestEditorialText} from '../shared/editorial-contract.ts'

const respond=(errorCode:string,error:string,status=400)=>new Response(JSON.stringify({errorCode,error}),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
})
const success=(data:Record<string,unknown>)=>new Response(JSON.stringify(data),{
 status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
})
export default {
 async fetch(request:Request):Promise<Response>{
  if(request.method!=='POST')return respond('POST_ONLY','POST only',405)
  const origin=request.headers.get('origin')
  if(origin&&origin!==new URL(request.url).origin)return respond('ORIGIN_REJECTED','Cross-site origin refused',403)
  const site=request.headers.get('sec-fetch-site')
  if(site&&!['same-origin','none'].includes(site))return respond('CROSS_SITE','Cross-site request refused',403)
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))
   return respond('JSON_REQUIRED','JSON only',415)
  if(Number(request.headers.get('content-length')||0)>MAX_SCENE_REQUEST_BYTES)
   return respond('TOO_LARGE','Scene payload too large',413)
  let raw:unknown
  try{
   const body=await request.text()
   if(new TextEncoder().encode(body).length>MAX_SCENE_REQUEST_BYTES)return respond('TOO_LARGE','Scene payload too large',413)
   raw=JSON.parse(body)
  }catch{return respond('BAD_JSON','Malformed authority request')}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return respond('FINAL_REQUEST_SCHEMA','Invalid authority request')
  const data=raw as Record<string,unknown>
  // React state cannot be posted into authority. Reject attempts explicitly.
  if(Object.hasOwn(data,'activeGeneratedPrompt'))return respond('FINAL_DIRECT_STATE_REJECTED','Untrusted activeGeneratedPrompt cannot be submitted')
  if(Object.keys(data).sort().join(',')!=='candidate,sceneSpecification')
   return respond('FINAL_REQUEST_SCHEMA','Expected exactly sceneSpecification and candidate')
  const candidate=data.candidate
  // Check sources before the spec to ensure advisory injection gets a clear code.
  if(candidate&&typeof candidate==='object'&&!Array.isArray(candidate)){
   const source=(candidate as Record<string,unknown>).source
   if(source!=='local'&&source!=='gemini-editor')
    return respond('ADVISORY_NOT_AUTHORITATIVE','Advisory drafts cannot be promoted to Final Prompt',403)
  }
  try{
   const spec=validateSceneSpec(data.sceneSpecification)
   const final=assertAuthoritative(spec,candidate)
   return success({...final,integrity:spec.integrity,promptDigest:await digestEditorialText(final.prompt)})
  }catch(error){
   const reason=error instanceof Error&&/^[A-Z_]+$/.test(error.message)?error.message:'FINAL_INVALID'
   return respond(reason,'Final Prompt authority denied: '+reason,reason==='ADVISORY_NOT_AUTHORITATIVE'?403:400)
  }
 }
}
