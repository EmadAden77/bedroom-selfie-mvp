// @vitest-environment node
import {describe,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'

const repoRoot=resolve(import.meta.dirname,'../..')
const manifest=JSON.parse(readFileSync(resolve(repoRoot,'vercel.json'),'utf8')) as {
 functions:Record<string,{includeFiles:string}>
}
const api=readFileSync(resolve(repoRoot,'api/generate-main-prompt.ts'),'utf8')

describe('Vercel Gemini serverless shared-module packaging regression',()=>{
 it('declares all shared TS dependencies as runtime function assets',()=>{
  expect(manifest.functions['api/generate-main-prompt.ts']?.includeFiles).toBe('shared/*.ts')
  const imports=[...api.matchAll(/from\s+['"]\.\.\/shared\/([^'"]+)['"]/g)].map(x=>x[1])
  expect(imports).toEqual(expect.arrayContaining(['body-mechanics.ts','body-shot-postures.ts','bedding-physics.ts']))
  for(const name of imports)expect(existsSync(resolve(repoRoot,'shared',name))).toBe(true)
 })
 it('Node 24 native ESM module resolution loads the real server route without stubbing imports',()=>{
  expect(()=>{
   const out=execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',
    "const {default:route}=await import('./api/generate-main-prompt.ts'); const res=await route.fetch(new Request('https://example.com/api/generate-main-prompt')); if(res.status!==405||!(res.headers.get('content-type')||'').includes('application/json'))process.exit(2); console.log(res.status)"
   ],{cwd:repoRoot,encoding:'utf8',timeout:10000})
   expect(out.trim()).toBe('405')
  }).not.toThrow()
 })
})
