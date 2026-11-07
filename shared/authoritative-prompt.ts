/**
 * Final-prompt authority gate — PR4.
 * Exactly one policy function, shared by every server route that grants final status.
 * Advisory text is never a final prompt, even when it is well-formed or persuasive.
 */
import {assembleEditorialPrompt,type EditableSceneSpec,type EditorialProposal} from './editorial-contract.ts'

export type FinalPromptSource='local'|'gemini-editor'
export type AuthoritativeCandidate={
 source:string
 prompt:string
 sectionOrder?:string[]
 openingLineSelection?:string
}
export type FinalAuthorization={source:FinalPromptSource;prompt:string;validated:true}

export function assertAuthoritative(spec:EditableSceneSpec,candidate:unknown):FinalAuthorization{
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
   .filter(u=>u.id!=='natural_scene_director')
   .map(u=>u.text).join('\n\n')
  if(c.prompt!==original)throw Error('FINAL_LOCAL_MISMATCH')
  return {source:'local',prompt:c.prompt,validated:true}
 }
 if(Object.keys(c).sort().join(',')!=='openingLineSelection,prompt,sectionOrder,source')
  throw Error('FINAL_UNEXPECTED_FIELDS')
 const editorial=assembleEditorialPrompt(spec,{
  sectionOrder:c.sectionOrder,
  openingLineSelection:c.openingLineSelection
 } as EditorialProposal)
 if(c.prompt!==editorial.prompt)throw Error('FINAL_EDITOR_MISMATCH')
 return {source:'gemini-editor',prompt:c.prompt,validated:true}
}
