/**
 * Final-prompt authority gate — PR4.
 * Exactly one policy function, shared by every server route that grants final status.
 * Advisory text is never a final prompt, even when it is well-formed or persuasive.
 */
import {assembleEditorialPrompt,type EditableSceneSpec,type EditorialProposal} from './editorial-contract.ts'
import {roomGeometryIssues,type RoomGeometry} from './room-geometry-rules.ts'
import {unverifiedRoomMeasurements,validateRoomAcknowledgement} from './room-acknowledgement.ts'

export type FinalPromptSource='local'|'gemini-editor'
export type AuthoritativeCandidate={
 source:string
 prompt:string
 sectionOrder?:string[]
 openingLineSelection?:string
}
export type FinalAuthorization={source:FinalPromptSource;prompt:string;validated:true;acknowledgedMeasurements?:string[]}

/**
 * PR7b-1 extends PR4's exact-byte and source checks without weakening them:
 * 'invalid' is NEVER overridable; only provisional unknown/unconfirmed
 * measurements can be explicitly acknowledged for final status.
 */
function assertRoomAuthority(
 room:RoomGeometry|undefined,posture:string|undefined,integrity:string|undefined,
 acknowledgement:unknown
):string[]{
 if(!room||!posture||!integrity)throw Error('FINAL_ROOM_MISSING')
 const issues=roomGeometryIssues(room)
 if(issues.some(x=>x.status==='invalid'))throw Error('FINAL_ROOM_INVALID')
 const gaps=unverifiedRoomMeasurements(room,posture)
 if(gaps.length)validateRoomAcknowledgement(acknowledgement,integrity,gaps)
 return gaps
}
export function assertAuthoritative(
 spec:EditableSceneSpec&{roomGeometry?:RoomGeometry;capture?:{posture:string};integrity?:string},
 candidate:unknown,roomAcknowledgement?:unknown
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
  // 'natural_scene_director' is spec-only metadata not included by compilePrompt.
  const original=spec.derivedUnits
   .filter(u=>u.id!=='natural_scene_director'&&u.id!=='room_geometry')
   .map(u=>u.text).join('\n\n')
  if(c.prompt!==original)throw Error('FINAL_LOCAL_MISMATCH')
  const acknowledgedMeasurements=assertRoomAuthority(spec.roomGeometry,spec.capture?.posture,spec.integrity,roomAcknowledgement)
  return {source:'local',prompt:c.prompt,validated:true,...(acknowledgedMeasurements.length?{acknowledgedMeasurements}:{})}
 }
 if(Object.keys(c).sort().join(',')!=='openingLineSelection,prompt,sectionOrder,source')
  throw Error('FINAL_UNEXPECTED_FIELDS')
 const editorial=assembleEditorialPrompt(spec,{
  sectionOrder:c.sectionOrder,
  openingLineSelection:c.openingLineSelection
 } as EditorialProposal)
 if(c.prompt!==editorial.prompt)throw Error('FINAL_EDITOR_MISMATCH')
 const acknowledgedMeasurements=assertRoomAuthority(spec.roomGeometry,spec.capture?.posture,spec.integrity,roomAcknowledgement)
 return {source:'gemini-editor',prompt:c.prompt,validated:true,...(acknowledgedMeasurements.length?{acknowledgedMeasurements}:{})}
}
