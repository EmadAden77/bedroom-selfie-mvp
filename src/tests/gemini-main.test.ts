// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import handler,{
 approvedPromptFromPlan,validateSceneSpecification,
 PHYSICS_ONLY_SYSTEM,PROMPT_EDITOR_SYSTEM,MAIN_PROMPT_SCHEMA,IMAGE_TARGET_GUIDANCE,
 MAX_SCENE_REQUEST_BYTES,validatePhysicalPrompt
} from '../../api/generate-main-prompt'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,canonicalSceneOrder,scenePromptFromOrder} from '../compiler/scene-specification'
import {MAX_SCENE_REQUEST_BYTES as CLIENT_MAX_BYTES} from '../features/ai-prompt-enhancer/scene-request-limits'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {DEFAULT_ROOM_PHYSICAL_STATE,selectedRoomObjects} from '../data/room-physical-state'
import type {CompilationContext} from '../domain/types'

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
const endpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt'
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',hairstyleMode:'preserve',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,ownPortrait:true,
 bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral',
 roomPhysicalState:{...DEFAULT_ROOM_PHYSICAL_STATE,zones:[...DEFAULT_ROOM_PHYSICAL_STATE.zones]}
}
function specFor(ctx:CompilationContext=base){
 const compiled=compilePrompt(ctx)
 expect(compiled.validation.errors).toEqual([])
 expect(compiled.result.errors).toEqual([])
 return buildSceneSpecification(ctx,compiled.result,compiled.validation)
}
const request=(data:unknown,headers:Record<string,string>={})=>new Request(endpoint,{
 method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)
})
const provider=(ids:string[],layout:'paragraphs'|'compact'='paragraphs')=>
 new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({orderedConstraintIds:ids,layout})}]}}]}),{status:200})

describe('Local scene source of truth, reference flags and semantics',()=>{
 it('compiles a full scene specification from validated local rules; no photo pixels are claimed as seen',()=>{
  const spec=specFor()
  expect(spec.source).toBe('validated_local_compiler')
  expect(spec.references.subject).toBe('reference_declared_unseen')
  expect(spec.references.room).toBe('reference_declared_unseen')
  expect(spec.unspecified.join(' ')).toContain('has not seen')
  expect(spec.conflicts).toEqual([])
  expect(spec.derived.recordingCamera).toBe('rear')
  expect(spec.derived.mirrorSurface).toBe('wardrobe_plane')
  expect(spec.derived.bodySupport).toBe('floor')
  expect(spec.derived.actualLightSource).toBe('ceiling_neutral')
  expect(spec.constraints.some(x=>x.id==='local_natural_scene_director')).toBe(true)
  expect(spec.constraints.some(x=>x.id==='mirror_composition')).toBe(true)
  expect(spec.constraints.some(x=>x.id==='physical_room_state')).toBe(true)
  expect(spec.mandatoryConstraintIds).toEqual(spec.constraints.map(x=>x.id))
  expect(validateSceneSpecification(spec)).toEqual(spec)
 })
 it('changing a mirror camera angle cannot relocate furniture or shuffle session-locked objects',()=>{
  const a=specFor(base)
  const b=specFor({...base,bedroomShotId:'mirror_floor',poseId:'supine'})
  expect(b.selections.posture).toBe('seated_floor')
  expect(b.derived.bodySupport).toBe('floor')
  expect(a.constraints.find(x=>x.id==='bedroom_environment_lock')?.content)
   .toBe(b.constraints.find(x=>x.id==='bedroom_environment_lock')?.content)
  expect(a.constraints.find(x=>x.id==='physical_room_state')?.content)
   .toBe(b.constraints.find(x=>x.id==='physical_room_state')?.content)
  expect(selectedRoomObjects(base.roomPhysicalState!)).toHaveLength(8)
 })
 it('bed-edge mirror remains seated instead of being rewritten as standing',()=>{
  const spec=specFor({...base,bedroomShotId:'mirror_bed_reflection',poseId:'standing'})
  expect(spec.selections.posture).toBe('seated_bed')
  expect(spec.derived.bodySupport).toBe('bed')
  expect(spec.constraints.find(x=>x.id==='body_pose_physics')?.content).toContain('Hips and thighs bear weight')
  expect(spec.constraints.find(x=>x.id==='mirror_composition')?.content).toContain('Seated on the actual left-wall mattress edge')
 })
 it('screen-only light stays screen-only without invented lamp or daylight',()=>{
  const spec=specFor({...base,bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'phone_screen_only'})
  expect(spec.derived.actualLightSource).toBe('phone_screen_only')
  expect(spec.derived.recordingCamera).toBe('front')
  expect(spec.constraints.some(x=>x.id==='night_lighting_phone_screen_only')).toBe(true)
  expect(spec.constraints.some(x=>x.id==='night_lighting_ceiling_neutral')).toBe(false)
  expect(approvedPromptFromPlan(spec,{orderedConstraintIds:canonicalSceneOrder(spec),layout:'paragraphs'}).prompt)
   .toContain('sole active light source')
 })
 it('all mirror poses preserve actual rear camera and correct reflected physical constraints',()=>{
  for(const shot of bedroomShots.filter(s=>s.mode==='mirror')){
   const spec=specFor({...base,bedroomShotId:shot.id,nightLightingId:shot.id==='mirror_rear_flash'?'rear_flash':'ceiling_neutral'})
   expect(spec.derived.recordingCamera,shot.id).toBe('rear')
   expect(spec.derived.mirrorSurface,shot.id).toBe('wardrobe_plane')
   expect(spec.selections.posture,shot.id).toBe(getShotPosture(shot.id))
   expect(spec.constraints.find(x=>x.id==='mirror_composition')?.content).toContain('MIRROR OPTICS AND BIOMECHANICS CONTRACT')
  }
  expect(PHYSICS_ONLY_SYSTEM).toContain('MIRROR MECHANICS HARD CONSTRAINT')
 })
 it('explicit garment choices and colors survive without Gemini deciding variants',()=>{
  const ctx={...base,upperGarmentId:'regular_crewneck_tshirt',materialId:'lightweight_cotton_appearance_jersey',
   fitId:'regular',stateId:'lightly_worn',color:'white',surface:'solid'}
  const spec=specFor(ctx)
  expect(spec.selections.upperGarmentId).toBe('regular_crewneck_tshirt')
  expect(spec.selections.upperColor).toBe('white')
  const edited=approvedPromptFromPlan(spec,{orderedConstraintIds:canonicalSceneOrder(spec),layout:'compact'}).prompt
  expect(edited).toContain('Color white.')
  expect(edited).toContain('crewneck t-shirt')
 })
 it('never transfers the default body measurements to a different portrait',()=>{
  const spec=specFor({...base,ownPortrait:false,referenceImagePresent:false})
  expect(spec.selections.ownPortrait).toBe(false)
  expect(spec.constraints.find(x=>x.id==='body_pose_physics')?.content).not.toContain('193 cm')
  expect(spec.constraints.find(x=>x.id==='body_pose_physics')?.content).not.toContain('83 kg')
  expect(spec.references.subject).toBe('not_provided')
  expect(validateSceneSpecification(spec)).toEqual(spec)
 })
 it('requires fixed room-state anchors when sessionLocked is on',()=>{
  const spec=specFor()
  const altered=structuredClone(spec)
  altered.constraints=altered.constraints.filter(x=>x.id!=='physical_room_state')
  altered.mandatoryConstraintIds=altered.mandatoryConstraintIds.filter(id=>id!=='physical_room_state')
  expect(()=>validateSceneSpecification(altered)).toThrow('session_continuity_missing')
 })
 it('rejects local physics drift in camera, posture, illumination or personal scope',()=>{
  const spec=specFor()
  for(const patch of [{derived:{...spec.derived,recordingCamera:'front'}},
    {derived:{...spec.derived,bodySupport:'bed'}},
    {derived:{...spec.derived,actualLightSource:'window_streetlight'}}]){
   expect(()=>validateSceneSpecification({...spec,...patch})).toThrow('SCENE_PHYSICS_CONFLICT')
  }
  const other=specFor({...base,ownPortrait:false})
  const tampered=structuredClone(other)
  tampered.constraints.find(x=>x.id==='body_pose_physics')!.content+=' Height 193 cm, 83 kg.'
  expect(()=>validateSceneSpecification(tampered)).toThrow('personal_body_profile_transfer')
 })
 it('refuses an invalid local compilation rather than delegating physics decisions to Gemini',()=>{
  const ctx={...base,bedroomShotId:'mirror_rear_flash',nightLightingId:'ceiling_neutral'}
  const compiled=compilePrompt(ctx)
  expect(compiled.validation.isValid).toBe(false)
  expect(()=>buildSceneSpecification(ctx,compiled.result,compiled.validation)).toThrow('LOCAL_SCENE_INVALID')
 })
})
describe('Proof-preserving Gemini edit approval',()=>{
 const spec=specFor()
 const order=canonicalSceneOrder(spec)
 it('the final prompt is a lossless arrangement of ONLY canonical local source blocks',()=>{
  const approved=approvedPromptFromPlan(spec,{orderedConstraintIds:order,layout:'paragraphs'})
  expect(approved.prompt).toBe(scenePromptFromOrder(spec,order))
  expect(approved.order).toEqual(order)
  for(const section of spec.constraints)expect(approved.prompt).toContain(section.content.trim())
  expect(approved.prompt.split('\n\n')).toHaveLength(spec.constraints.length)
  expect(approved.prompt).not.toContain('Gemini invented')
 })
 it('does not permit deleted, extra, duplicated, rewritten, or reordered-priority scene facts',()=>{
  for(const ids of [order.slice(1),[...order,'ring_light'],[...order.slice(0,-1),order[0]]])
   expect(()=>approvedPromptFromPlan(spec,{orderedConstraintIds:ids,layout:'paragraphs'})).toThrow()
  const changed=[...order]
  const identityIndex=changed.findIndex(id=>id==='identity_fidelity')
  const last=changed.length-1
  ;[changed[identityIndex],changed[last]]=[changed[last],changed[identityIndex]]
  expect(()=>approvedPromptFromPlan(spec,{orderedConstraintIds:changed,layout:'compact'})).toThrow('EDITOR_PRIORITY_CONFLICT')
  expect(()=>approvedPromptFromPlan(spec,{orderedConstraintIds:order,layout:'paragraphs',editedPrompt:'Add ring light and new chair'})).toThrow('EDITOR_SCHEMA')
  expect(()=>approvedPromptFromPlan(spec,{prompt:'new face and furniture'})).toThrow('EDITOR_SCHEMA')
 })
 it('keeps the serverless module independent of src runtime imports and old creative freewriting',()=>{
  const source=readFileSync(new URL('../../api/generate-main-prompt.ts',import.meta.url),'utf8')
  expect(source).not.toMatch(/from\s*['"]\.\.\/src\//)
  expect(PROMPT_EDITOR_SYSTEM).toContain('CONSTRAINED PROMPT EDITOR')
  expect(PROMPT_EDITOR_SYSTEM).toContain('DO NOT produce creative prose')
  expect(PROMPT_EDITOR_SYSTEM).not.toContain('creative freedom over composition')
  expect(MAIN_PROMPT_SCHEMA.required).toEqual(['orderedConstraintIds','layout'])
  expect(MAIN_PROMPT_SCHEMA.additionalProperties).toBe(false)
  expect(IMAGE_TARGET_GUIDANCE.chatgpt).toContain('without altering')
  expect(MAX_SCENE_REQUEST_BYTES).toBe(CLIENT_MAX_BYTES)
  expect(()=>validatePhysicalPrompt('A front-camera mirror selfie.',{mode:'mirror',lighting:'ceiling_neutral'})).toThrow()
 })
})
describe('Gemini constrained editor Vercel endpoint',()=>{
 const spec=specFor()
 const order=canonicalSceneOrder(spec)
 const payload={sceneSpecification:spec,target:'chatgpt'}
 it('rejects GET, cross-origin input and absent local spec before provider use',async()=>{
  expect((await handler.fetch(new Request(endpoint))).status).toBe(405)
  expect((await handler.fetch(request(payload,{origin:'https://evil.invalid'}))).status).toBe(403)
  expect((await handler.fetch(request({sceneBrief:'Describe whatever you want',target:'gemini'}))).status).toBe(400)
 })
 it('does not call Gemini when the local scene is contradictory',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only')
  const outbound=vi.fn()
  vi.stubGlobal('fetch',outbound)
  const tampered=structuredClone(spec)
  tampered.derived.recordingCamera='front'
  const r=await handler.fetch(request({sceneSpecification:tampered,target:'gemini'}))
  expect(r.status).toBe(422)
  expect((await r.json() as {errorCode:string}).errorCode).toBe('SCENE_SPEC_CONFLICT')
  expect(outbound).not.toHaveBeenCalled()
 })
 it('forwards exact deterministic constraints, never image pixels, and returns validated source content only',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only')
  let outbound:any
  vi.stubGlobal('fetch',vi.fn(async(_url:string,options:{body:string})=>{
   outbound=JSON.parse(options.body);return provider(order)
  }))
  const r=await handler.fetch(request(payload,{'x-forwarded-for':'editor-normal-test'}))
  expect(r.status).toBe(200)
  const data=await r.json() as {prompt:string;source:string;validated:boolean}
  expect(data.source).toBe('gemini_editor')
  expect(data.validated).toBe(true)
  expect(data.prompt).toBe(scenePromptFromOrder(spec,order))
  const sent=JSON.parse(outbound.contents[0].parts[0].text)
  expect(sent.validatedSceneSpecification.selections.captureMode).toBe('mirror')
  expect(sent.validatedSceneSpecification.derived.recordingCamera).toBe('rear')
  expect(sent.validatedSceneSpecification.constraints).toEqual(spec.constraints)
  expect(JSON.stringify(outbound)).not.toMatch(/data:image|base64|fileUri|inlineData/)
  expect(outbound.generationConfig.temperature).toBe(0)
 })
 it('refuses any Gemini plan that adds an object, omits constraints or rewrites a fact',async()=>{
  vi.stubEnv('GEMINI_API_KEY','test-only')
  for(const [i,response] of [
   {orderedConstraintIds:order.slice(1),layout:'paragraphs'},
   {orderedConstraintIds:[...order,'new_lamp'],layout:'paragraphs'},
   {orderedConstraintIds:order,layout:'paragraphs',prompt:'invented new furniture'}
  ].entries()){
   vi.stubGlobal('fetch',vi.fn(async()=>provider(order)))
   vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(response)}]}}]}),{status:200}))))
   const r=await handler.fetch(request(payload,{'x-forwarded-for':'editor-bad-'+i}))
   expect(r.status).toBe(422)
   expect((await r.json() as {errorCode:string}).errorCode).toBe('GEMINI_CONSTRAINT_VIOLATION')
  }
 })
 it('handles network failures, quotas and missing keys with actionable JSON',async()=>{
  vi.stubEnv('GEMINI_API_KEY','')
  expect((await handler.fetch(request(payload))).status).toBe(503)
  vi.stubEnv('GEMINI_API_KEY','test-only')
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('quota',{status:429})))
  const quota=await handler.fetch(request(payload,{'x-forwarded-for':'editor-quota'}))
  expect(quota.status).toBe(429)
  expect((await quota.json() as {errorCode:string}).errorCode).toBe('GEMINI_QUOTA')
 })
 it('enforces actual UTF-8 byte limits even if content-length is absent',async()=>{
  const huge='ا'.repeat(MAX_SCENE_REQUEST_BYTES+100)
  const r=await handler.fetch(new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({payload:huge})}))
  expect(r.status).toBe(413)
 })
})
