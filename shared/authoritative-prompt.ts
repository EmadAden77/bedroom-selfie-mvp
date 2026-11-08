/**
 * Final-prompt authority gate — PR4.
 * Exactly one policy function, shared by every server route that grants final status.
 * Advisory text is never a final prompt, even when it is well-formed or persuasive.
 */
import {assembleEditorialPrompt,type EditableSceneSpec,type EditorialProposal} from './editorial-contract.ts'
import {roomGeometryIssues,type RoomGeometry} from './room-geometry-rules.ts'

/**
 * Only these SPEC-ONLY units are absent from compilePrompt's local output.
 * src/features/ai-prompt-enhancer/scene-specification.ts appends them AFTER
 * result.sections has already been assembled by src/compiler/assemble.ts.
 * They are provided as immutable context for the Gemini editor, not as
 * local prompt paragraphs. Their text MUST NEVER appear in a final local prompt,
 * even as a substring of another otherwise-approved section.
 */
export const ALLOWED_LOCAL_EXCLUSIONS = ['natural_scene_director','room_geometry'] as const

export type FinalPromptSource='local'|'gemini-editor'
export type AuthoritativeCandidate={
 source:string
 prompt:string
 sectionOrder?:string[]
 openingLineSelection?:string
}
export type FinalAuthorization={source:FinalPromptSource;prompt:string;validated:true}

/**
 * PR7b extends (does not replace) the PR4 final authority policy.
 * Preserve the original provenance/exact-byte tests, then deny promotion
 * until the room is explicitly confirmed and all RG rules are valid.
 */
function assertRoomAuthority(room:RoomGeometry|undefined):void{
 if(!room)throw Error('FINAL_ROOM_MISSING')
 if(!room.userConfirmed)throw Error('FINAL_ROOM_UNCONFIRMED')
 const issues=roomGeometryIssues(room)
 if(issues.some(x=>x.status==='invalid'))throw Error('FINAL_ROOM_INVALID')
 if(issues.some(x=>x.status==='unknown'))throw Error('FINAL_ROOM_UNVERIFIED')
}
export function assertAuthoritative(
 spec:EditableSceneSpec&{roomGeometry?:RoomGeometry},candidate:unknown
):FinalAuthorization{
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
  throw Error('FINAL_CANDIDATE_REQUIRED')
 const c=candidate as Record<string,unknown>
 // Ghalyon, Auditor v8 and unknown creators cannot grant themselves authority.
 if(c.source!=='local'&&c.source!=='gemini-editor')
  throw Error('ADVISORY_NOT_AUTHORITATIVE')
 if(typeof c.prompt!=='string'||!c.prompt.trim())throw Error('FINAL_PROMPT_REQUIRED')
 if(c.source==='local'){
  if(Object.keys(c).sort().join(',')!=='prompt,source')
   throw Error('FINAL_UNEXPECTED_FIELDS')
  // Local compiler's exact approved (not editor-added) section sequence.
  const excluded=spec.derivedUnits.filter(u=>ALLOWED_LOCAL_EXCLUSIONS.some(id=>id===u.id))
  const original=spec.derivedUnits
   .filter(u=>!ALLOWED_LOCAL_EXCLUSIONS.some(id=>id===u.id))
   .map(u=>u.text).join('\n\n')
  if(c.prompt!==original)throw Error('FINAL_LOCAL_MISMATCH')
  // Defense in depth: equality alone does not prove that excluded-unit text
  // is absent from an included unit. Deny any full-text overlap as a leak.
  if(excluded.some(u=>u.text.length>0&&c.prompt.includes(u.text)))
   throw Error('FINAL_LOCAL_MISMATCH')
  assertRoomAuthority(spec.roomGeometry)
  return {source:'local',prompt:c.prompt,validated:true}
 }
 if(Object.keys(c).sort().join(',')!=='openingLineSelection,prompt,sectionOrder,source')
  throw Error('FINAL_UNEXPECTED_FIELDS')
 const editorial=assembleEditorialPrompt(spec,{
  sectionOrder:c.sectionOrder,
  openingLineSelection:c.openingLineSelection
 } as EditorialProposal)
 if(c.prompt!==editorial.prompt)throw Error('FINAL_EDITOR_MISMATCH')
 assertRoomAuthority(spec.roomGeometry)
 return {source:'gemini-editor',prompt:c.prompt,validated:true}
}
