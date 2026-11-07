// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import handler,{
 assembleConstrainedPrompt,PHYSICS_ONLY_SYSTEM,MAIN_PROMPT_SCHEMA,IMAGE_TARGET_GUIDANCE,validateSceneSpec,
 validatePhysicalPrompt,MAX_SCENE_BRIEF_CHARS as SERVER_SCENE_CHARS,
 MAX_SCENE_REQUEST_BYTES as SERVER_REQUEST_BYTES
} from '../../api/generate-main-prompt'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {buildHairCreativeBrief} from '../data/hair-creative'
import {hairVariants} from '../data/hair'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,sceneFingerprint,validateConstrainedEditorReply,composeApprovedPrompt} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'
import {MAX_SCENE_BRIEF_CHARS,MAX_SCENE_REQUEST_BYTES} from '../features/ai-prompt-enhancer/scene-request-limits'

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const endpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt'
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,bedroomShotId:'mirror_wardrobe',
 nightLightingId:'ceiling_neutral',poseId:'standing'
}
const getSpec=(ctx:CompilationContext=base)=>{
 const compiled=compilePrompt(ctx)
 expect(compiled.validation.errors).toEqual([])
 expect(compiled.result.errors).toEqual([])
 return buildSceneSpecification(ctx,compiled.result,compiled.validation)
}
const post=(data:unknown,headers:Record<string,string>={})=>new Request(endpoint,{
 method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)
})
const editorReply=(spec:ReturnType<typeof getSpec>,patch:Record<string,unknown>={})=>({
 orderedUnitIds:[...spec.mandatoryUnitIds],opening:spec.opening,editorStyle:'spaced',...patch
})
const provider=(spec:ReturnType<typeof getSpec>,patch:Record<string,unknown>={},status=200)=>new Response(JSON.stringify({
 candidates:[{content:{parts:[{text:JSON.stringify(editorReply(spec,patch))}]}}]
}),{status})

describe('Vercel standalone constrained editor',()=>{
 it('is self-contained and agrees with browser request limits',()=>{
  const source=readFileSync(new URL('../../api/generate-main-prompt.ts',import.meta.url),'utf8')
  expect(source).not.toMatch(/from\s*['"]\.\.\/src\//)
  expect(SERVER_SCENE_CHARS).toBe(MAX_SCENE_BRIEF_CHARS)
  expect(SERVER_REQUEST_BYTES).toBe(MAX_SCENE_REQUEST_BYTES)
 })
 it('returns method, origin, content-type and local-spec errors without querying Gemini',async()=>{
  expect((await handler.fetch(new Request(endpoint))).status).toBe(405)
  expect((await handler.fetch(post({sceneSpecification:{}},{origin:'https://evil.example'}))).status).toBe(403)
  expect((await handler.fetch(new Request(endpoint,{method:'POST',body:'not-json'}))).status).toBe(415)
  const r=await handler.fetch(post({sceneBrief:'freely generated scene from the old contract'}))
  expect(r.status).toBe(400)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('STRUCTURED_SPEC_REQUIRED')
 })
 it('uses local compiler sections as the only authority and prevents Gemini from introducing prose',async()=>{
  const spec=getSpec()
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  let outgoing:any
  vi.stubGlobal('fetch',vi.fn(async(_url:string,o:{body:string})=>{outgoing=JSON.parse(o.body);return provider(spec)}))
  const response=await handler.fetch(post({sceneSpecification:spec},{'x-forwarded-for':'scene-editor-success'}))
  expect(response.status).toBe(200)
  const body=await response.json() as {prompt:string;source:string;validated:boolean;integrity:string;orderedUnitIds:string[];opening:string;editorStyle:'spaced'}
  expect(body.source).toBe('gemini-editor')
  expect(body.validated).toBe(true)
  expect(body.integrity).toBe(spec.integrity)
  expect(body.orderedUnitIds).toEqual(spec.mandatoryUnitIds)
  expect(body.prompt).toContain('MIRROR OPTICS AND BIOMECHANICS CONTRACT:')
  expect(body.prompt).toContain('Xiaomi 15 Ultra')
  expect(body.prompt).toContain('natural')
  expect(body.prompt).toContain('The person reference defines identity')
  expect(body.prompt).toContain(spec.derivedUnits.find(x=>x.id==='bedroom_environment_lock')!.text)
  expect(body.prompt).toBe(composeApprovedPrompt(spec,body.orderedUnitIds,body.opening,'spaced'))
  expect(validateConstrainedEditorReply(spec,body).prompt).toBe(body.prompt)
  const data=JSON.parse(outgoing.contents[0].parts[0].text)
  expect(data.sceneSpecification.derivedUnits).toEqual(spec.derivedUnits)
  expect(data.sceneSpecification.references.pixelsAvailableToEditor).toBe(false)
  expect(outgoing.generationConfig.temperature).toBeLessThan(0.2)
  expect(outgoing.generationConfig.responseFormat.text.schema).toEqual(MAIN_PROMPT_SCHEMA)
  expect(outgoing.systemInstruction.parts[0].text).toContain(PHYSICS_ONLY_SYSTEM)
  expect(JSON.stringify(outgoing)).not.toContain('inlineData')
 })
 it('checks phone-only capture and emitter contract on the server before calling Gemini',async()=>{
  const ctx={...base,bedroomShotId:'mirror_rear_flash',phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY' as const}
  const spec=getSpec(ctx)
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const providerCall=vi.fn(async()=>provider(spec))
  vi.stubGlobal('fetch',providerCall)
  const valid=await handler.fetch(post({sceneSpecification:spec},{'x-forwarded-for':'physical-valid'}))
  expect(valid.status).toBe(200)
  expect(providerCall).toHaveBeenCalledTimes(1)
  for(const tamper of [
   {...spec,selections:{...spec.selections,phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'}},
   {...spec,capture:{...spec.capture,lighting:'phone_screen_only'}},
   {...spec,derivedUnits:spec.derivedUnits.filter(u=>u.id!=='physical_reality')}
  ]){
   const unsigned=(({integrity,...rest})=>rest)(tamper)
   const modified={...tamper,integrity:sceneFingerprint(unsigned as typeof spec)}
   const response=await handler.fetch(post({sceneSpecification:modified},{'x-forwarded-for':'physical-reject'}))
   expect(response.status).toBe(400)
  }
  expect(providerCall).toHaveBeenCalledTimes(1)
 })
 it('accepts a front-only screen scene and rejects cross-mode client tampering before Gemini',async()=>{
  const ctx:CompilationContext={...base,bedroomShotId:'bed_edge',nightLightingId:'bedside_warm',
   phoneOnlyIlluminationMode:'DARK_ROOM_FRONT_SCREEN_ONLY'}
  const spec=getSpec(ctx)
  expect(spec.capture.mode).toBe('front')
  expect(spec.capture.lighting).toBe('phone_screen_only')
  vi.stubEnv('GEMINI_API_KEY','test-key')
  const outbound=vi.fn(async()=>provider(spec))
  vi.stubGlobal('fetch',outbound)
  const response=await handler.fetch(post({sceneSpecification:spec},{'x-forwarded-for':'front-screen-valid'}))
  expect(response.status).toBe(200)
  const tampered=[
   {...spec,capture:{...spec.capture,mode:'mirror' as const}},
   {...spec,capture:{...spec.capture,lighting:'rear_flash'}},
   {...spec,selections:{...spec.selections,phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY'}}
  ]
  for(const item of tampered){
   const {integrity,...rest}=item
   const candidate={...rest,integrity:sceneFingerprint(rest as Omit<typeof spec,'integrity'>)}
   const invalid=await handler.fetch(post({sceneSpecification:candidate},{'x-forwarded-for':'front-screen-invalid'}))
   expect(invalid.status).toBe(400)
  }
  expect(outbound).toHaveBeenCalledTimes(1)
 })
 it('recomputes identical client and server body contacts for VALID and NEEDS_INFORMATION scenes',()=>{
  for(const ctx of [base,{...base,bodySupportChoice:'unknown' as const}]){
   const spec=getSpec(ctx)
   const checked=validateSceneSpec(spec)
   expect(checked.bodyMechanics).toEqual(spec.bodyMechanics)
   expect(checked.bodyMechanics.status).toBe(ctx.bodySupportChoice==='unknown'?'NEEDS_INFORMATION':'VALID')
   expect(checked.derivedUnits.find(u=>u.id==='body_mechanics_v21')?.text).toContain('BODY MECHANICS V2.1 CONTRACT:')
  }
 })
 it('rejects modified status, contacts and physical prompt after re-fingerprinting',async()=>{
  const spec=getSpec()
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const variants=[
   {...spec,bodyMechanics:{...spec.bodyMechanics,status:'NEEDS_INFORMATION' as const}},
   {...spec,bodyMechanics:{...spec.bodyMechanics,contacts:[]}},
   {...spec,derivedUnits:spec.derivedUnits.map(u=>u.id==='body_mechanics_v21'?{...u,text:'BODY MECHANICS V2.1 CONTRACT: Extra floating hand and a new seat.'}:u)}
  ]
  for(const variant of variants){
   const {integrity,...unsigned}=variant
   const modified={...unsigned,integrity:sceneFingerprint(unsigned as Omit<typeof spec,'integrity'>)}
   const response=await handler.fetch(post({sceneSpecification:modified},{'x-forwarded-for':'body-tamper-'+variants.indexOf(variant)}))
   expect(response.status).toBe(400)
   const data=await response.json() as {errorCode:string}
   expect(data.errorCode).toMatch(/^SPEC_BODY_/)
  }
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects a definite support or camera-hand contradiction even with a recomputed fingerprint',async()=>{
  const spec=getSpec()
  const invalidSupport={...spec,bodyMechanics:{...spec.bodyMechanics,input:{...spec.bodyMechanics.input,supportChoice:'none' as const}},selections:{...spec.selections,bodySupportChoice:'none'}}
  const invalidHand={...spec,bodyMechanics:{...spec.bodyMechanics,input:{...spec.bodyMechanics.input,holdingHand:'none' as const}},selections:{...spec.selections,bodyHoldingHand:'none'}}
  for(const item of [invalidSupport,invalidHand]){
   const {integrity,...unsigned}=item
   const modified={...unsigned,integrity:sceneFingerprint(unsigned as Omit<typeof spec,'integrity'>)}
   expect(()=>validateSceneSpec(modified)).toThrow('SPEC_BODY_CONFLICT')
  }
 })
 it('rejects a falsified capture posture even with matching altered body units',()=>{
  const spec=getSpec()
  const mutated={...spec,capture:{...spec.capture,posture:'seated_floor'},bodyMechanics:{...spec.bodyMechanics,input:{...spec.bodyMechanics.input,posture:'seated_floor'}}}
  const {integrity,...unsigned}=mutated
  const candidate={...unsigned,integrity:sceneFingerprint(unsigned as Omit<typeof spec,'integrity'>)}
  expect(()=>validateSceneSpec(candidate)).toThrow('SPEC_BODY_POSTURE')
 })
 it('does not send an invalid mechanical scene to the Gemini provider',async()=>{
  const spec=getSpec()
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const modified={...spec,bodyMechanics:{...spec.bodyMechanics,issues:[{code:'BODY_SUPPORT_CONFLICT',messageAr:'تعارض',controls:['bodySupportChoice']}],status:'INVALID' as const}}
  const {integrity,...unsigned}=modified
  const tampered={...unsigned,integrity:sceneFingerprint(unsigned as Omit<typeof spec,'integrity'>)}
  const result=await handler.fetch(post({sceneSpecification:tampered}))
  expect(result.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
 })
 it('validates V2.2 bedding contacts independently and preserves valid unknown textiles',()=>{
  for(const beddingSelection of [
   {sheet:'reference',pillow:'reference',blanket:'reference'},
   {sheet:'confirmed',pillow:'confirmed',blanket:'spread_on_bed'}
  ] as const){
   const spec=getSpec({...base,bedroomShotId:'bed_edge',beddingSelection})
   const checked=validateSceneSpec(spec)
   expect(checked.beddingPhysics).toEqual(spec.beddingPhysics)
   expect(checked.derivedUnits.find(u=>u.id==='bedding_physics_v22')?.text).toContain('BEDDING PHYSICS V2.2 CONTRACT:')
  }
 })
 it('rejects forged V2.2 pillow, mattress and fabric responses with recomputed fingerprint',async()=>{
  const spec=getSpec({...base,bedroomShotId:'bed_edge'})
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const variants=[
   {...spec,beddingPhysics:{...spec.beddingPhysics,responses:[]}},
   {...spec,beddingPhysics:{...spec.beddingPhysics,status:'NEEDS_INFORMATION' as const}},
   {...spec,beddingPhysics:{...spec.beddingPhysics,objects:[]}},
   {...spec,derivedUnits:spec.derivedUnits.map(u=>u.id==='bedding_physics_v22'?{...u,text:'BEDDING PHYSICS V2.2 CONTRACT: A floating blanket magically covers the bed.'}:u)}
  ]
  for(const [n,v] of variants.entries()){
   const {integrity,...unsigned}=v
   const altered={...unsigned,integrity:sceneFingerprint(unsigned as Omit<typeof spec,'integrity'>)}
   const response=await handler.fetch(post({sceneSpecification:altered},{'x-forwarded-for':'bedding-tamper-'+n}))
   expect(response.status).toBe(400)
   const data=await response.json() as {errorCode:string}
   expect(data.errorCode).toMatch(/^SPEC_BEDDING_/)
  }
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects conflicting blanket/pillow selections before contacting Gemini',async()=>{
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  for(const [shot,selection] of [
   ['blanket_cocoon',{sheet:'reference',pillow:'reference',blanket:'absent'}],
   ['cheek_pillow',{sheet:'reference',pillow:'absent',blanket:'reference'}]
  ] as const){
   const spec=getSpec({...base,bedroomShotId:'bed_edge'})
   const variant={...spec,
    capture:{...spec.capture,shotId:shot,posture:shot==='blanket_cocoon'?'seated_bed':'side_lying_right'},
    selections:{...spec.selections,beddingSelection:selection},
    beddingPhysics:{...spec.beddingPhysics,selection}
   }
   const {integrity,...unsigned}=variant
   const altered={...unsigned,integrity:sceneFingerprint(unsigned as Omit<typeof spec,'integrity'>)}
   const response=await handler.fetch(post({sceneSpecification:altered},{'x-forwarded-for':'bedding-invalid-'+shot}))
   expect(response.status).toBe(400)
  }
  expect(upstream).not.toHaveBeenCalled()
 })
 it('rejects missing, duplicated or fabricated immutable units',async()=>{
  const spec=getSpec()
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  for(const [name,patch] of [
   ['missing',{orderedUnitIds:spec.mandatoryUnitIds.slice(1)}],
   ['duplicate',{orderedUnitIds:[...spec.mandatoryUnitIds.slice(0,-1),spec.mandatoryUnitIds[0]]}],
   ['invented',{orderedUnitIds:[...spec.mandatoryUnitIds.slice(0,-1),'new_studio_light']}],
   ['wrong-first',{orderedUnitIds:[spec.mandatoryUnitIds[1],spec.mandatoryUnitIds[0],...spec.mandatoryUnitIds.slice(2)]}],
   ['invented light',{opening:spec.opening+' Add a new lamp'}],
   ['garment swap',{opening:spec.opening.replace('charcoal','yellow')}]
  ] as const){
   vi.stubGlobal('fetch',vi.fn(async()=>provider(spec,patch)))
   const r=await handler.fetch(post({sceneSpecification:spec},{'x-forwarded-for':'reject-'+name}))
   expect(r.status,name).toBe(422)
   expect((await r.json() as {errorCode:string}).errorCode).toBe('GEMINI_EDITOR_REJECTED')
  }
 })
 it('rejects client tampering, unsupported light and room-state conflicts before provider call',async()=>{
  const spec=getSpec()
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  for(const input of [
   {...spec,integrity:'broken'},
   {...spec,conflicts:['Invalid posture']},
   {...spec,capture:{...spec.capture,lighting:'rear_flash'}},
   {...spec,derivedUnits:spec.derivedUnits.filter(u=>u.id!=='mirror_composition')},
   {...spec,selections:{...spec.selections,upperColor:'neon magenta'}}
  ]){
   const r=await handler.fetch(post({sceneSpecification:input}))
   expect(r.status).toBe(400)
  }
  expect(upstream).not.toHaveBeenCalled()
 })
 it('returns an explicit rate, provider and malformed-output failure without exposing secrets',async()=>{
  const spec=getSpec()
  vi.stubEnv('GEMINI_API_KEY','')
  let r=await handler.fetch(post({sceneSpecification:spec}))
  expect(r.status).toBe(503)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('GEMINI_NOT_CONFIGURED')
  vi.stubEnv('GEMINI_API_KEY','test-key')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('private upstream secret',{status:429})))
  r=await handler.fetch(post({sceneSpecification:spec},{'x-forwarded-for':'constrained-quota'}))
  expect(r.status).toBe(429)
  expect(JSON.stringify(await r.json())).not.toContain('private upstream')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'not json'}]}}]}),{status:200})))
  r=await handler.fetch(post({sceneSpecification:spec},{'x-forwarded-for':'constrained-bad-json'}))
  expect(r.status).toBe(422)
 })
 it('accepts an unchanged compliant opening and rejects modified negation scope',()=>{
  const spec=getSpec()
  expect(assembleConstrainedPrompt(JSON.stringify(editorReply(spec)),spec).prompt).toContain('MIRROR CAPTURE:')
  expect(()=>assembleConstrainedPrompt(JSON.stringify(editorReply(spec,{opening:spec.opening+' New window'})),spec)).toThrow('EDITOR_UNSAFE_EDIT')
  expect(sceneFingerprint((({integrity,...rest})=>rest)(spec))).toBe(spec.integrity)
 })
 it('maintains immutable shot posture and furniture anchors between mirror views',()=>{
  const mirror=getSpec()
  const floor=getSpec({...base,bedroomShotId:'mirror_floor'})
  expect(mirror.capture.posture).toBe('standing')
  expect(floor.capture.posture).toBe('seated_floor')
  expect(floor.derivedUnits.find(u=>u.id==='mirror_composition')?.text).toContain('Seated on the photographed floor/rug')
  expect(floor.derivedUnits.find(u=>u.id==='bedroom_environment_lock')?.text).toBe(mirror.derivedUnits.find(u=>u.id==='bedroom_environment_lock')?.text)
  expect(floor.references.userConfirmedLayout).toEqual(mirror.references.userConfirmedLayout)
 })
 it('retains screen-only light, clothing selections and locked room objects unchanged',()=>{
  const ctx:CompilationContext={...base,bedroomShotId:'bed_edge',nightLightingId:'phone_screen_only'}
  const s=getSpec(ctx)
  expect(s.derivedUnits.find(u=>u.id==='night_lighting_phone_screen_only')?.text).toContain('sole active light source')
  expect(s.selections.upperColor).toBe('apparent dark charcoal-gray as observed')
  expect(s.derivedUnits.find(u=>u.id==='upper_reference_garment_preserved')?.text).toContain('charcoal')
  const locked={...base,roomPhysicalState:{order:'clear' as const,surface:'dust' as const,zones:['bed','floor','dresser','nightstand'] as ('bed'|'floor'|'dresser'|'nightstand')[],sessionLocked:true}}
  const spec=getSpec(locked)
  expect(spec.selections.roomPhysicalState?.sessionLocked).toBe(true)
  expect(spec.derivedUnits.find(u=>u.id==='physical_room_state')?.text).toContain('SESSION CONTINUITY:')
 })
 it('rejects oversized body even without content-length and never uses standalone creative prompt',async()=>{
  const spec=getSpec()
  const r=await handler.fetch(new Request(endpoint,{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({sceneSpecification:spec,extra:'x'.repeat(MAX_SCENE_REQUEST_BYTES+1)})
  }))
  expect(r.status).toBe(413)
  expect(MAIN_PROMPT_SCHEMA.required).toEqual(['orderedUnitIds','opening','editorStyle'])
  expect(PHYSICS_ONLY_SYSTEM).toContain('CONSTRAINED PROMPT EDITOR')
  expect(PHYSICS_ONLY_SYSTEM).not.toContain('creative freedom over composition')
 })
 it('keeps physical contradiction checks for explicit mirror and screen lighting errors',()=>{
  expect(()=>validatePhysicalPrompt('Floating camera beside the person with the wardrobe mirror visible.',{mode:'mirror',lighting:'ceiling_neutral'})).toThrow('mechanically_impossible')
  expect(()=>validatePhysicalPrompt('A handheld selfie with the recording phone.',{mode:'timer',lighting:'ceiling_neutral'})).toThrow('timer_grip_conflict')
  expect(()=>validatePhysicalPrompt('Daylight fills the whole room.',{mode:'front',lighting:'phone_screen_only'})).toThrow('screen_light_conflict')
 })
})

describe('Concise creative scene selection',()=>{
 const ctx:CompilationContext={
  hairVariantId:'natural_slightly_tousled',
  hairstyleMode:'apply',
  expressionVariantId:'neutral_relaxed',
  upperGarmentId:'regular_crewneck_tshirt',
  lowerGarmentId:'relaxed_sweatpants',
  materialId:'lightweight_cotton_appearance_jersey',
  fitId:'regular',
  stateId:'lightly_worn',
  color:'white',surface:'solid',
  referenceImagePresent:true,roomReferencePresent:true,
  bedroomShotId:'dresser_mirror',
  nightLightingId:'ceiling_neutral',
  realismIntensity:'natural'
 }
 it('uses selected clothing and hair, not the huge assembled local prompt',()=>{
  const brief=buildCreativeSceneBrief(ctx)
  expect(brief).toContain('slightly tousled')
  expect(brief).toContain('white')
  expect(brief).toContain('ceiling_neutral')
  expect(brief).not.toContain('IDENTITY FIDELITY ENGINE')
  expect(brief).not.toContain('BEDROOM ENVIRONMENT LOCK')
  expect(brief.length).toBeLessThan(4500)
 })
 it('never implies Gemini saw a user photo',()=>{
  const brief=buildCreativeSceneBrief(ctx)
  expect(brief).toContain('Gemini does not receive or see it')
 })
})

describe('Selected hairstyle genuinely reaches ChatGPT via Gemini',()=>{
 const base:CompilationContext={
  hairVariantId:'neatly_combed',hairstyleMode:'apply',promptTarget:'chatgpt',
  hairDirection:'left',hairVolume:'lifted',hairTexture:'tidy',
  expressionVariantId:'reference_expression_preserved',
  upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
  materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
  stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
  surface:'apparent knit-like surface character',referenceImagePresent:true,
  nightLightingId:'ceiling_neutral'
 }
 it('puts clear apply instructions and every advanced control into the concise Gemini brief',()=>{
  const brief=buildCreativeSceneBrief(base)
  expect(brief).toContain('Hair styling: APPLY')
  expect(brief).toContain('neatly combed')
  expect(brief).toContain('subject left')
  expect(brief).toContain('Lift the existing top strands modestly')
  expect(brief).toContain('Align existing strands with realistic small flyaways')
  expect(brief).toContain('reference photo fixes the PERSON, not the prior strand arrangement')
  expect(brief).toContain('preserve the exact original hairline')
  expect(brief).not.toContain('Hair styling: PRESERVE')
  expect(brief.length).toBeLessThan(6500)
 })
 it('preserve mode ignores any dormant selected style or advanced styling controls',()=>{
  const brief=buildCreativeSceneBrief({...base,hairstyleMode:'preserve'})
  expect(brief).toContain('Hair styling: PRESERVE')
  expect(brief).not.toContain('Hair styling: APPLY')
  expect(brief).not.toContain('subject left')
  expect(brief).not.toContain('neatly combed')
  expect(brief).not.toContain('Lift the existing top strands modestly')
 })
 it('requires a non-reference hairstyle before the apply instruction activates',()=>{
  const brief=buildHairCreativeBrief({...base,hairVariantId:'reference_natural_dry'})
  expect(brief).toContain('PRESERVE')
  expect(brief).not.toContain('APPLY')
 })
 it.each(hairVariants.filter(h=>!h.isDefault))('$id has an observable restyle without changing reference density',style=>{
  const brief=buildHairCreativeBrief({...base,hairVariantId:style.id})
  expect(brief).toContain(style.observableConfig)
  expect(brief).toContain('Appearance priority:')
  expect(brief).toContain('density map')
  expect(brief).toContain('Move existing strands only')
 })
 it('the local ChatGPT fallback never contradicts a selected new hairstyle',()=>{
  const compiled=compilePrompt(base)
  expect(compiled.validation.isValid).toBe(true)
  expect(compiled.result.promptText).toContain('do not revert to the reference hairstyle')
  expect(compiled.result.promptText).toContain('ChatGPT hairstyle priority')
  expect(compiled.result.promptText).not.toContain('Never alter facial identity, hairstyle')
 })
 it('the Gemini system and ChatGPT target rules explicitly prioritize visible styling',()=>{
  expect(PHYSICS_ONLY_SYSTEM).toContain('APPLY means deliberately restyle')
  expect(IMAGE_TARGET_GUIDANCE.chatgpt).toContain('visibly different from the reference hairstyle')
  expect(IMAGE_TARGET_GUIDANCE.chatgpt).toContain('When PRESERVE is selected')
 })
 it('keeps the same optional restyling with the original geometry in a mirror selfie',()=>{
  const brief=buildCreativeSceneBrief({...base,bedroomShotId:'mirror_wardrobe'})
  expect(brief).toContain('Hair styling: APPLY')
  expect(brief).toContain('Mirror scene geometry:')
  expect(brief).toContain('RIGHT wall')
 })
})
