// @vitest-environment node
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {describe,expect,it,vi} from 'vitest'

const workerSource=readFileSync(new URL('../../sw.js',import.meta.url),'utf8')

function simulateWorker(network:(request:Request)=>Promise<Response>){
 const handlers=new Map<string,(event:any)=>void>()
 const cache=new Map<string,Response>([['https://bedroom-selfie-mvp.vercel.app/',new Response('OLD APP HTML')]])
 const store={
  add:async(_url:string)=>{},
  put:async(req:Request,value:Response)=>{cache.set(req.url,value.clone())}
 }
 const caches={
  open:async(_name:string)=>store,
  match:async(req:Request|string)=>{
   const key=typeof req==='string'?new URL(req,'https://bedroom-selfie-mvp.vercel.app').href:req.url
   const found=cache.get(key)
   return found?.clone()
  },
  keys:async()=>['bedroom-selfie-builder-v2'],
  delete:async(_key:string)=>true
 }
 const self={
  location:{origin:'https://bedroom-selfie-mvp.vercel.app'},
  addEventListener:(name:string,handler:(event:any)=>void)=>handlers.set(name,handler),
  skipWaiting:()=>{},clients:{claim:()=>{}}
 }
 runInNewContext(workerSource,{self,caches,fetch:network,URL,Promise})
 function request(path:string,method='GET'){
  let served:Promise<Response>|undefined
  const waitUntil=vi.fn()
  const respondWith=(p:Promise<Response>)=>{served=p}
  const req=new Request('https://bedroom-selfie-mvp.vercel.app'+path,{method})
  handlers.get('fetch')?.({request:req,waitUntil,respondWith})
  return {served,waitUntil}
 }
 return {request}
}

describe('PWA updates and Ghalyon availability',()=>{
 it('serves newest app HTML online instead of the stale cached version',async()=>{
  const network=vi.fn(async()=>new Response('NEW APP HTML',{status:200}))
  const worker=simulateWorker(network)
  const outcome=worker.request('/')
  expect(outcome.served).toBeDefined()
  expect(await outcome.served?.then(r=>r.text())).toBe('NEW APP HTML')
  expect(network).toHaveBeenCalledTimes(1)
 })
 it('keeps cached app shell working without network access',async()=>{
  const worker=simulateWorker(async()=>{throw Error('offline')})
  const outcome=worker.request('/')
  expect(await outcome.served?.then(r=>r.text())).toBe('OLD APP HTML')
 })
 it('does not intercept Gemini API fetch calls or POST requests',()=>{
  const worker=simulateWorker(async()=>new Response('unused'))
  expect(worker.request('/api/optimize-prompt','POST').served).toBeUndefined()
  expect(worker.request('/api/optimize-prompt').served).toBeUndefined()
 })
})
