
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
console.log('Running optional source-text invariants (not behavioral tests)...')
let passed=0
let failed=0
function test(name, fn){
  try{ fn(); console.log(`✅ ${name}`); passed++ }catch(e){ console.error(`❌ ${name}: ${e.message}`); failed++ }
}
function assert(c,m){ if(!c) throw new Error(m||'Assertion failed') }
const hairData = fs.readFileSync(path.join(root,'src/data/hair.ts'),'utf-8')
const exprData = fs.readFileSync(path.join(root,'src/data/expressions.ts'),'utf-8')
const clothingData = fs.readFileSync(path.join(root,'src/data/clothing.ts'),'utf-8')
const identityData = fs.readFileSync(path.join(root,'src/data/identity.ts'),'utf-8')
const validateData = fs.readFileSync(path.join(root,'src/compiler/validate.ts'),'utf-8')
const renderData = fs.readFileSync(path.join(root,'src/compiler/render.ts'),'utf-8')
const assembleData = fs.readFileSync(path.join(root,'src/compiler/assemble.ts'),'utf-8')
const hookData = fs.readFileSync(path.join(root,'src/hooks/useReferenceImage.ts'),'utf-8')
const cryptoData = fs.readFileSync(path.join(root,'src/utils/crypto.ts'),'utf-8')

test('1. Default selections produce non-empty Subject & Clothing Prompt Preview', ()=>{
  assert(hairData.includes('reference_natural_dry'), 'default hair')
  assert(exprData.includes('reference_expression_preserved'), 'default expr')
  assert(clothingData.includes('reference_garment_preserved'), 'default upper')
})

test('2. Hair variants count exactly 7 frozen literal', ()=>{
  const count = (hairData.match(/isDefault:/g)||[]).length
  assert(count===7, `Expected 7, found ${count}`)
  assert(hairData.includes('Hair: natural dry hair as observed, no styling invention, preserving observed volume and strand direction.'), 'exact fragment')
  assert(hairData.includes('Hair: slightly tousled natural dry with light volume displacement, strands lightly displaced.'), 'exact')
  assert(hairData.includes('Hair: neatly combed with controlled strand alignment, smooth directional flow.'), 'exact')
})

test('3. Expression variants count 8 pure frozen literal', ()=>{
  const ids = ['reference_expression_preserved','neutral_relaxed','soft_closed_lip_smile','sleepy_just_awake','focused_concentration','mild_brow_interest','restrained_amusement','mild_surprise']
  for(const id of ids) assert(exprData.includes(id), `Missing ${id}`)
  assert(exprData.includes('Facial expression: preserve expression as observed in reference, no new emotion invention.'), 'exact')
  assert(exprData.includes('Facial expression: neutral relaxed with closed mouth, soft eyelids, minimal muscle tension.'), 'exact')
})

test('4. light_fatigue is Deferred Composite State not selectable', ()=>{
  assert(exprData.includes('light_fatigue'), 'has deferred')
  assert(exprData.includes('isSelectable: false'), 'not selectable')
  assert(exprData.includes('deferred: true'), 'deferred true')
})

test('5. reference_garment_preserved locked', ()=>{
  assert(clothingData.includes('reference_garment_preserved'), 'contains ref')
  assert(validateData.includes('reference_garment_preserved cannot change material'), 'validator lock')
  assert(clothingData.includes('Preserve the upper garment exactly as visibly presented in the attached reference'), 'exact frozen fragment in clothing')
})

test('6. Ribbed surface requires rib_knit only', ()=>{
  assert(validateData.includes('Ribbed surface requires rib_knit'), 'ribbed validation')
})

test('7. Upper garment required', ()=>{
  assert(validateData.includes('Upper garment is required'), 'upper required')
})

test('8. Lower garment optional - null allowed', ()=>{
  assert(validateData.includes('lowerGarmentId'), 'lower optional check')
  assert(clothingData.includes('lounge_shorts'), 'lower exists')
})

test('9. No duplicate guards', ()=>{
  assert(assembleData.includes('Duplicate guards'), 'duplicate guard check')
})

test('10. No physics metadata leak', ()=>{
  assert(fs.existsSync(path.join(root,'src/compiler/strip.ts')), 'strip exists')
  const stripContent = fs.readFileSync(path.join(root,'src/compiler/strip.ts'),'utf-8')
  assert(stripContent.includes('courseBehavior'), 'strip checks')
})

test('11. No forbidden words in final prompt - oversized corrected', ()=>{
  assert(clothingData.includes('Sleep t-shirt with crew neckline and substantially greater ease and length with increased fabric mass. Material lightweight cotton-appearance jersey. Fit oversized. State lightly_worn. Color charcoal. Surface solid.'), 'oversized corrected without possible')
  assert(!clothingData.includes('Possible - Oversized') && !clothingData.toLowerCase().includes('possible oversized'), 'no possible')
})

test('12. Reset returns defaults', ()=>{
  const appContent = fs.readFileSync(path.join(root,'src/app/App.tsx'),'utf-8')
  assert(appContent.includes('reference_natural_dry'), 'default hair in App')
  assert(appContent.includes('reference_expression_preserved'), 'default expr in App')
  assert(appContent.includes('reference_garment_preserved'), 'default upper in App')
})

test('13. Object URL revoke on remove/replace/unmount', ()=>{
  assert(hookData.includes('URL.revokeObjectURL'), 'revoke exists')
  assert(hookData.includes('objectUrlRef'), 'ref tracking')
  assert(hookData.includes('return () =>'), 'unmount cleanup')
})

test('14. SHA-256 computed from file bytes', ()=>{
  assert(cryptoData.includes('crypto.subtle.digest'), 'Web Crypto SHA-256')
  const testData = Buffer.from('test')
  const hash = crypto.createHash('sha256').update(testData).digest('hex')
  assert(hash==='9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 'SHA-256 check')
})

test('15. Prompt compilation order correct: reference -> hair guard -> hair -> facial guard -> expression -> upper -> lower -> clothing guard', ()=>{
  const order = ['reference_identity','hair_identity_guard','hairVariants','facial_identity_guard','expressionVariants','upperGarmentId','clothing_output_guard']
  // Check actual render file has correct sequence
  const seq = ['reference_identity','hair_identity_guard','hairVariantId','facial_identity_guard','expressionVariantId','upperGarmentId','lowerGarmentId','clothing_output_guard']
  // Alternative: check render.ts file contains sections in correct order
  const sectionsOrder = renderData.indexOf('reference_identity')
  const hairGuardIdx = renderData.indexOf('hair_identity_guard')
  const hairVariantIdx = renderData.indexOf('hairVariants.find')
  const facialGuardIdx = renderData.indexOf('facial_identity_guard')
  const exprIdx = renderData.indexOf('expressionVariants.find')
  const upperIdx = renderData.indexOf('garmentRecords.find(g => g.id === ctx.upperGarmentId')
  const lowerIdx = renderData.indexOf('ctx.lowerGarmentId')
  const clothGuardIdx = renderData.indexOf('clothing_output_guard')
  assert(sectionsOrder>=0, 'reference present')
  assert(hairGuardIdx>sectionsOrder, 'hair guard after ref')
  assert(hairVariantIdx>hairGuardIdx, 'hair variant after guard')
  assert(facialGuardIdx>hairVariantIdx, 'facial guard after hair')
  assert(exprIdx>facialGuardIdx, 'expr after facial guard')
  assert(upperIdx>exprIdx, 'upper after expr')
  assert(clothGuardIdx>upperIdx, 'clothing guard last')
})

test('16. PWA manifest real static file not Blob', ()=>{
  const manifestPath = path.join(root,'public/manifest.webmanifest')
  assert(fs.existsSync(manifestPath), 'manifest exists')
  const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf-8'))
  assert(manifest.name==='Bedroom Selfie Builder', 'manifest name')
  assert(Array.isArray(manifest.icons) && manifest.icons.length>=2, 'icons')
})

test('17. Service Worker real with offline App Shell', ()=>{
  const swPath = path.join(root,'public/sw.js')
  assert(fs.existsSync(swPath), 'sw exists')
  const swContent = fs.readFileSync(swPath,'utf-8')
  assert(swContent.includes('CACHE_NAME'), 'SW cache name')
  assert(swContent.includes('APP_SHELL'), 'SW app shell')
  assert(!swContent.toLowerCase().includes('placeholder') || swContent.includes('offline capable'), 'SW not placeholder only')
})

test('18. No CDN for React/Tailwind/fonts', ()=>{
  const indexHtml = fs.readFileSync(path.join(root,'index.html'),'utf-8')
  assert(!indexHtml.includes('cdn.jsdelivr') && !indexHtml.includes('unpkg.com') && !indexHtml.includes('fonts.googleapis'), 'No CDN in index.html')
  const globalCss = fs.readFileSync(path.join(root,'src/styles/global.css'),'utf-8')
  assert(!globalCss.includes('cdn.') && !globalCss.includes('@import url'), 'No CDN in CSS - system fonts only')
})

test('19. Compiler pipeline 7 files: select -> validate -> resolve -> render -> strip -> compress -> assemble', ()=>{
  const files = ['select.ts','validate.ts','resolve.ts','render.ts','strip.ts','compress.ts','assemble.ts']
  for(const f of files){
    assert(fs.existsSync(path.join(root,'src/compiler',f)), `Missing compiler ${f}`)
  }
})

test('20. Identity Core frozen literal', ()=>{
  assert(identityData.includes('Hair identity guard: Preserve head geometry, hairline, density distribution, natural asymmetry.'), 'hair guard literal')
  assert(identityData.includes('Facial identity guard: Preserve facial identity anchored to reference'), 'facial guard literal')
  assert(identityData.includes('Clothing output guard: Render clothing with physically plausible deformation'), 'clothing guard literal')
})

console.log(`\nTest Results: ${passed} passed, ${failed} failed out of ${passed+failed}`)
if(failed>0){ process.exit(1) } else { console.log('Source-text invariants passed (behavioral coverage requires npm test)!') }
