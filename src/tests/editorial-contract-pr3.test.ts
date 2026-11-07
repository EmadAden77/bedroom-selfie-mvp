import {describe,it,expect} from 'vitest'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification,validateConstrainedEditorReply} from '../features/ai-prompt-enhancer/scene-specification'
import type {CompilationContext} from '../domain/types'
import {
 EDITORIAL_INSTRUCTIONS,OPENING_LINE_IDS,approvedOpeningLine,
 assembleEditorialPrompt,validateEditorialProposal,digestEditorialText
} from '../../shared/editorial-contract'
import {assembleConstrainedPrompt,MAIN_PROMPT_SCHEMA} from '../../api/generate-main-prompt'

const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:'ceiling_neutral',
 phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY'
}
const spec=()=>{
 const compiled=compilePrompt(ctx)
 expect(compiled.validation.isValid).toBe(true)
 return buildSceneSpecification(ctx,compiled.result,compiled.validation)
}
const proposal=(s:ReturnType<typeof spec>)=>({
 sectionOrder:[...s.mandatoryUnitIds],
 openingLineSelection:'canonical' as const
})
describe('PR3 strict editorial-only contract',()=>{
 it('golden: same specification and editorial instructions reassemble to exactly the same prompt',()=>{
  const s=spec(),p=proposal(s)
  const a=assembleEditorialPrompt(s,p)
  const b=assembleEditorialPrompt(structuredClone(s),structuredClone(p))
  expect(a.prompt).toBe(b.prompt)
  expect(a.prompt).toBe([s.opening,...s.derivedUnits.map(u=>u.text)].join('\n\n'))
  expect(EDITORIAL_INSTRUCTIONS).toContain('sectionOrder and openingLineSelection')
  expect(Object.keys(MAIN_PROMPT_SCHEMA.properties).sort()).toEqual(['openingLineSelection','sectionOrder'])
  expect(MAIN_PROMPT_SCHEMA.required).toEqual(['sectionOrder','openingLineSelection'])
 })
 it('reorders only approved IDs and retains every protected section text byte-for-byte',()=>{
  const s=spec(),p=proposal(s)
  ;[p.sectionOrder[2],p.sectionOrder[3]]=[p.sectionOrder[3],p.sectionOrder[2]]
  const composed=assembleEditorialPrompt(s,p)
  const expected=[s.opening,...p.sectionOrder.map(id=>s.derivedUnits.find(u=>u.id===id)!.text)].join('\n\n')
  expect(composed.prompt).toBe(expected)
  expect(composed.sectionOrder).toEqual(p.sectionOrder)
  for(const id of p.sectionOrder)expect(composed.prompt).toContain(s.derivedUnits.find(u=>u.id===id)!.text)
 })
 it('rejects model-authored replacement body, even when it preserves all section IDs',()=>{
  const s=spec()
  const injected={...proposal(s),sectionBody:'The ceiling lights illuminate the room.'}
  expect(()=>assembleConstrainedPrompt(JSON.stringify(injected),s)).toThrow('EDITOR_EXTRA_FIELDS')
  expect(()=>validateEditorialProposal(s,injected)).toThrow('EDITOR_EXTRA_FIELDS')
 })
 it('rejects unknown section IDs',()=>{
  const s=spec(),p=proposal(s)
  p.sectionOrder[2]='added_unapproved_scene_unit'
  expect(()=>assembleConstrainedPrompt(JSON.stringify(p),s)).toThrow('EDITOR_UNKNOWN_SECTION')
 })
 it('rejects a model-authored or unapproved opening line',()=>{
  const s=spec(),p=proposal(s)
  expect(()=>assembleConstrainedPrompt(JSON.stringify({...p,openingLineSelection:'fresh_opening'}),s))
   .toThrow('EDITOR_OPENING_UNAPPROVED')
  expect(()=>assembleConstrainedPrompt(JSON.stringify({...p,opening:s.opening+' Newly invented sunlight.'}),s))
   .toThrow('EDITOR_EXTRA_FIELDS')
 })
 it('accepts only preapproved local opening templates',()=>{
  const s=spec()
  expect(OPENING_LINE_IDS).toEqual(['canonical','concise'])
  const full=assembleEditorialPrompt(s,{...proposal(s),openingLineSelection:'canonical'})
  const short=assembleEditorialPrompt(s,{...proposal(s),openingLineSelection:'concise'})
  expect(full.prompt.startsWith(s.opening)).toBe(true)
  expect(short.prompt.startsWith(approvedOpeningLine(s,'concise'))).toBe(true)
  expect(short.prompt).toContain(s.derivedUnits.find(u=>u.id==='physical_reality')!.text)
 })
 it('rejects duplicate/missing IDs and moving a fixed opening section',()=>{
  const s=spec(),p=proposal(s)
  expect(()=>assembleEditorialPrompt(s,{...p,sectionOrder:p.sectionOrder.slice(1)}))
   .toThrow('EDITOR_MISSING_OR_DUPLICATE_SECTION')
  expect(()=>assembleEditorialPrompt(s,{...p,sectionOrder:[...p.sectionOrder.slice(0,-1),p.sectionOrder[0]]}))
   .toThrow('EDITOR_MISSING_OR_DUPLICATE_SECTION')
  const swapped=[...p.sectionOrder]
  ;[swapped[0],swapped[1]]=[swapped[1],swapped[0]]
  expect(()=>assembleEditorialPrompt(s,{...p,sectionOrder:swapped})).toThrow('EDITOR_ORDER_LOCK')
 })
 it('rejects any formerly protected section presented as mutable',()=>{
  const s=structuredClone(spec())
  s.derivedUnits[1].immutable=false as true
  expect(()=>assembleEditorialPrompt(s,proposal(s))).toThrow('EDITOR_SPEC_UNPROTECTED')
 })
 it('verifies server digests without client-side reassembly and rejects tampering',async()=>{
  const s=spec(),p=proposal(s),server=assembleConstrainedPrompt(JSON.stringify(p),s)
  const valid={...server,validated:true,
   promptDigest:await digestEditorialText(server.prompt),
   sectionCount:s.derivedUnits.length,
   protectedUnitDigests:await Promise.all(s.derivedUnits.map(async u=>({
    id:u.id,digest:await digestEditorialText(u.text)
   })))
  }
  expect((await validateConstrainedEditorReply(s,valid)).prompt).toBe(server.prompt)
  await expect(validateConstrainedEditorReply(s,{...valid,prompt:server.prompt+'\nAn additional light.'}))
   .rejects.toThrow('EDITOR_PROMPT_TAMPERED')
  await expect(validateConstrainedEditorReply(s,{...valid,sectionCount:1}))
   .rejects.toThrow('EDITOR_SECTION_COUNT')
  await expect(validateConstrainedEditorReply(s,{...valid,protectedUnitDigests:valid.protectedUnitDigests.slice(1)}))
   .rejects.toThrow('EDITOR_SECTION_DIGESTS')
  await expect(validateConstrainedEditorReply(s,{...valid,protectedUnitDigests:valid.protectedUnitDigests.map((x,i)=>
   i===0?{...x,digest:'0'.repeat(64)}:x)}))
   .rejects.toThrow('EDITOR_SECTION_INTEGRITY')
 })
})
