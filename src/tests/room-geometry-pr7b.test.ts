// @vitest-environment node
import {describe,expect,it,vi,afterEach} from 'vitest'
import {
 ROOM_SIZE_PRESETS,roomInputStatus,resolvedRoomDimensions,
 fitWithinRoom,mirrorReachability,lightingReachability,deriveRoomGeometry,
 roomGeometryIssues,renderRoomGeometry
} from '../../shared/room-geometry-rules'
import {BED_WIDTH_CM,BED_LENGTH_CM,MIRROR_WIDTH_CM,POSE_FOOTPRINTS_CM2} from '../../shared/room-measurements'
import type {CompilationContext} from '../domain/types'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,sceneFingerprint} from '../features/ai-prompt-enhancer/scene-specification'
import {assertAuthoritative} from '../../shared/authoritative-prompt'
import {assembleEditorialPrompt} from '../../shared/editorial-contract'
import handler,{validateSceneSpec} from '../../api/generate-main-prompt'
import auth from '../../api/authorize-final-prompt'

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,
 roomReferencePresent:true,bedroomShotId:'mirror_wardrobe',poseId:'standing',
 nightLightingId:'ceiling_neutral'
}
const scene=(change:Partial<CompilationContext>={})=>{
 const options={...ctx,...change}
 const compiled=compilePrompt(options)
 expect(compiled.validation.isValid).toBe(true)
 const spec=buildSceneSpecification(options,compiled.result,compiled.validation)
 return {options,compiled,spec}
}
const editorEndpoint='https://bedroom-selfie-mvp.vercel.app/api/generate-main-prompt'
const authorityEndpoint='https://bedroom-selfie-mvp.vercel.app/api/authorize-final-prompt'
const post=(url:string,data:unknown)=>new Request(url,{
 method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'room-pr7b-acceptance'},
 body:JSON.stringify(data)
})

describe('PR7b: explicit dimensions and strict tri-state room authority',()=>{
 it('a: all three predefined choices produce exact deterministic roomGeometry and immutable room unit',()=>{
  for(const [id,dimensions] of Object.entries(ROOM_SIZE_PRESETS)){
   const {spec}=scene({roomSizePreset:id as CompilationContext['roomSizePreset'],roomSizeConfirmed:true})
   expect({widthMeters:spec.roomGeometry.widthMeters,depthMeters:spec.roomGeometry.depthMeters,
    heightMeters:spec.roomGeometry.heightMeters}).toEqual(dimensions)
   expect(spec.roomGeometry.presetId).toBe(id)
   expect(spec.roomGeometry.userConfirmed).toBe(true)
   expect(spec.derivedUnits.find(u=>u.id==='room_geometry')).toEqual({
    id:'room_geometry',authority:'user_selection',immutable:true,
    text:renderRoomGeometry(spec.roomGeometry)
   })
   expect(validateSceneSpec(spec)).toEqual(spec)
  }
 })
 it('b: custom values have NO numeric defaults; <2.0, >12.0 and missing inputs reject',()=>{
  expect(roomInputStatus({roomSizePreset:'custom'}).status).toBe('invalid')
  expect(resolvedRoomDimensions({roomSizePreset:'custom'})).toBeNull()
  for(const key of ['roomCustomWidthMeters','roomCustomDepthMeters','roomCustomHeightMeters'] as const){
   for(const n of [1.9,12.1]){
    const invalid={roomSizePreset:'custom' as const,roomCustomWidthMeters:4,
     roomCustomDepthMeters:4,roomCustomHeightMeters:2.6,[key]:n}
    expect(roomInputStatus(invalid)).toMatchObject({status:'invalid'})
    expect(resolvedRoomDimensions(invalid)).toBeNull()
    expect(()=>scene(invalid)).toThrow('ROOM_DIMENSIONS_INVALID')
   }
  }
  const {spec}=scene({roomSizePreset:'custom',roomCustomWidthMeters:3.2,
   roomCustomDepthMeters:4.4,roomCustomHeightMeters:2.6})
  expect(spec.roomGeometry.userConfirmed).toBe(true)
  expect(spec.roomGeometry.presetId).toBe('custom')
 })
 it('c: RG-1 rejects a documented/synthetic oversized bed with a precise reason',()=>{
  const room=ROOM_SIZE_PRESETS.small_bedroom
  expect(fitWithinRoom({widthCm:340,lengthCm:340},{widthCm:60,lengthCm:90},room))
   .toEqual({status:'invalid',reason:'bed does not fit in 3.0m × 3.5m room'})
 })
 it('d: RG-2 rejects a mirror wider than its available wall',()=>{
  expect(mirrorReachability(ROOM_SIZE_PRESETS.small_bedroom,{wall:'right',widthCm:400}))
   .toEqual({status:'invalid',reason:'mirror wider than available right wall'})
 })
 it('e: RG-3 rejects a ceiling light when custom room height is 2.1m',()=>{
  expect(lightingReachability({widthMeters:4,depthMeters:4,heightMeters:2.1},'ceiling_neutral'))
   .toEqual({status:'invalid',reason:'ceiling light requires room height at least 2.2m'})
  expect(lightingReachability({widthMeters:4,depthMeters:4,heightMeters:2.1},'phone_screen_only'))
   .toEqual({status:'valid'})
 })
 it('f: RG-1 unknown is caused by the actual unmeasured POSE footprint, NEVER mirror width',()=>{
  expect(POSE_FOOTPRINTS_CM2.standing.widthCm).toBeNull()
  const state=fitWithinRoom({widthCm:BED_WIDTH_CM,lengthCm:BED_LENGTH_CM},
   POSE_FOOTPRINTS_CM2.standing,ROOM_SIZE_PRESETS.large_bedroom)
  expect(state).toEqual({status:'unknown',reason:'pose footprint width or length not defined; RG-1 cannot verify fit'})
  expect(fitWithinRoom({widthCm:160,lengthCm:200},{widthCm:70,lengthCm:180},
   ROOM_SIZE_PRESETS.large_bedroom)).toEqual({status:'valid'})
 })
 it('f-correction: RG-2 alone owns null MIRROR_WIDTH_CM, not RG-1',()=>{
  expect(MIRROR_WIDTH_CM).toBeNull()
  expect(mirrorReachability(ROOM_SIZE_PRESETS.medium_bedroom,{wall:'right',widthCm:MIRROR_WIDTH_CM}))
   .toEqual({status:'unknown',reason:'mirror width not defined; RG-2 cannot verify fit'})
  expect(mirrorReachability(ROOM_SIZE_PRESETS.medium_bedroom,{wall:'right',widthCm:100}))
   .toEqual({status:'valid'})
 })
 it('PR8 deferral: implicit depth cues remain untouched and small/medium mirror room is unknown, NOT rejected',()=>{
  const small=deriveRoomGeometry({roomSizePreset:'small_bedroom',roomSizeConfirmed:true},'standing','rear_flash',true)!
  const medium=deriveRoomGeometry({roomSizePreset:'medium_bedroom',roomSizeConfirmed:true},'standing','rear_flash',true)!
  expect(small.bedFitValid).toEqual({status:'unknown',reason:'implicit distances pending PR8'})
  expect(medium.bedFitValid).toEqual({status:'unknown',reason:'implicit distances pending PR8'})
  // Even 5.5m cannot establish the simultaneous 3m/5m cue geometry:
  // positions are approximate, with no shared measured coordinate system.
  const large=deriveRoomGeometry({roomSizePreset:'large_bedroom',roomSizeConfirmed:true},
   'standing','rear_flash',true)!
  expect(large.bedFitValid).toEqual({status:'unknown',reason:'implicit distances pending PR8'})
  expect(small.mirrorFitValid.status).toBe('unknown')
 })
 it('g: unknown still compiles protected content but cannot be promoted, even after room confirmation',async()=>{
  const {compiled,spec}=scene({roomSizePreset:'large_bedroom',roomSizeConfirmed:true})
  expect(compiled.result.promptText.length).toBeGreaterThan(100)
  expect(spec.roomGeometry.bedFitValid.status).toBe('unknown')
  expect(spec.roomGeometry.mirrorFitValid.status).toBe('unknown')
  expect(roomGeometryIssues(spec.roomGeometry)).toHaveLength(2)
  expect(()=>assertAuthoritative(spec,{source:'local',prompt:compiled.result.promptText}))
   .toThrow('FINAL_ROOM_UNVERIFIED')
  const response=await auth.fetch(post(authorityEndpoint,{
   sceneSpecification:spec,candidate:{source:'local',prompt:compiled.result.promptText}
  }))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('FINAL_ROOM_UNVERIFIED')
 })
 it('h: RG-3 invalid is rejected by server before Gemini fetch is invoked',async()=>{
  const {spec}=scene({roomSizePreset:'custom',roomCustomWidthMeters:4,
   roomCustomDepthMeters:4,roomCustomHeightMeters:2.1,nightLightingId:'ceiling_neutral'})
  expect(spec.roomGeometry.lightingFitValid.status).toBe('invalid')
  vi.stubEnv('GEMINI_API_KEY','test-only')
  const upstream=vi.fn()
  vi.stubGlobal('fetch',upstream)
  const response=await handler.fetch(post(editorEndpoint,{sceneSpecification:spec}))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_ROOM_INVALID')
  expect(upstream).not.toHaveBeenCalled()
 })
 it('i: same options, cloned options and repeated builds yield byte-identical roomGeometry',()=>{
  const a=scene({roomSizePreset:'medium_bedroom'}).spec.roomGeometry
  const b=scene(structuredClone({roomSizePreset:'medium_bedroom'})).spec.roomGeometry
  expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  expect(a.userConfirmed).toBe(false)
  expect(a.bedFitValid.status).toBe('unknown')
 })
 it('l / positive A: unconfirmed default room compiles a local prompt but is never authoritative',async()=>{
  const {compiled,spec}=scene()
  expect(compiled.result.promptText).toContain('MIRROR')
  expect(spec.roomGeometry.presetId).toBe('medium_bedroom')
  expect(spec.roomGeometry.userConfirmed).toBe(false)
  expect(()=>assertAuthoritative(spec,{source:'local',prompt:compiled.result.promptText}))
   .toThrow('FINAL_ROOM_UNCONFIRMED')
  const response=await auth.fetch(post(authorityEndpoint,{
   sceneSpecification:spec,candidate:{source:'local',prompt:compiled.result.promptText}
  }))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('FINAL_ROOM_UNCONFIRMED')
 })
 it('m / positive B: Gemini editorial verification can succeed, but unconfirmed geometry forbids final authority',async()=>{
  const {spec}=scene()
  const reply={sectionOrder:[...spec.mandatoryUnitIds],openingLineSelection:'canonical' as const}
  const locallyVerified=assembleEditorialPrompt(spec,reply)
  vi.stubEnv('GEMINI_API_KEY','fake-key')
  const upstream=vi.fn(async()=>new Response(JSON.stringify({
   candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(reply)}]}}]
  }),{status:200}))
  vi.stubGlobal('fetch',upstream)
  const response=await handler.fetch(post(editorEndpoint,{sceneSpecification:spec}))
  expect(response.status).toBe(200)
  const data=await response.json() as {prompt:string;validated:boolean;authoritative:boolean}
  expect(data.validated).toBe(true)
  expect(data.authoritative).toBe(false)
  expect(data.prompt).toBe(locallyVerified.prompt)
  expect(data.prompt).toContain(spec.derivedUnits.find(u=>u.id==='room_geometry')!.text)
  expect(upstream).toHaveBeenCalledTimes(1)
  expect(()=>assertAuthoritative(spec,{source:'gemini-editor',prompt:data.prompt,...reply}))
   .toThrow('FINAL_ROOM_UNCONFIRMED')
 })
 it('tampered room dimensions fail canonical server validation even if client recomputes integrity',()=>{
  const {spec}=scene({roomSizePreset:'medium_bedroom',roomSizeConfirmed:true})
  const forged=structuredClone(spec)
  forged.roomGeometry.widthMeters=9.9
  const {integrity:unused,...unsigned}=forged
  forged.integrity=sceneFingerprint(unsigned)
  expect(()=>validateSceneSpec(forged)).toThrow('SPEC_ROOM_GEOMETRY')
 })
})
