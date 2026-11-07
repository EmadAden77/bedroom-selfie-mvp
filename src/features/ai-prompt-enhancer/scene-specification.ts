import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
import {buildNaturalSceneDirection} from './natural-scene-director'
import {MAX_SCENE_REQUEST_BYTES} from './scene-request-limits'

export type SceneCapture={mode:'front'|'mirror'|'rear'|'timer';shotId:string;posture:string;lighting:string;target:'gemini'|'chatgpt'|'flux'|'midjourney'}
export type SceneUnit={id:string;text:string;authority:'user_selection'|'reference_scope'|'local_physics';immutable:true}
export type SceneSpecification={
 version:1
 capture:SceneCapture
 selections:{
  hairstyleMode:string;hairVariantId:string;hairDirection:string;hairVolume:string;hairTexture:string
  expressionVariantId:string;gazeId:string;microExpressionId:string
  upperGarmentId:string;upperColor:string;upperMaterialId:string;upperFitId:string
  lowerGarmentId:string;lowerColor:string
  mirrorMovementId:string;mirrorPhoneHeightId:string;mirrorDistanceId:string;mirrorFramingId:string;mirrorGazeId:string
  roomPhysicalState:CompilationContext['roomPhysicalState']|null
 }
 references:{personDeclared:boolean;roomDeclared:boolean;pixelsAvailableToEditor:false;userConfirmedLayout:string[]}
 derivedUnits:SceneUnit[]
 mandatoryUnitIds:string[]
 unspecified:string[]
 conflicts:string[]
 opening:string
 integrity:string
}
export type ConstrainedEditorReply={
 prompt:string
 orderedUnitIds:string[]
 opening:string
 integrity:string
 source:'gemini-editor'
 editorStyle:'spaced'|'compact'
}
export const MAX_SCENE_SPEC_REQUEST_BYTES=MAX_SCENE_REQUEST_BYTES

/** FNV-1a is a deterministic consistency fingerprint, NOT an authentication signature. */
export function sceneFingerprint(spec:Omit<SceneSpecification,'integrity'>):string{
 const raw=JSON.stringify(spec)
 let hash=2166136261
 for(let i=0;i<raw.length;i++){
  hash^=raw.charCodeAt(i)
  hash=Math.imul(hash,16777619)
 }
 return (hash>>>0).toString(16).padStart(8,'0')
}

const unitAuthority=(id:string):SceneUnit['authority']=>{
 if(/^(hair_|hairstyle_|advanced_hairstyle|expression_|gaze_|upper_|lower_|bedroom_shot_|night_lighting_)/.test(id))return 'user_selection'
 if(/^(reference_identity|identity_fidelity|facial_identity_guard|hair_identity_guard|bedroom_environment_lock|background_continuity|clothing_output_guard)/.test(id))return 'reference_scope'
 return 'local_physics'
}
const code=(v:string|undefined)=>v||''
const garmentColor=(v:string)=>v||'as observed in reference'
export function buildSceneSpecification(ctx:CompilationContext,result:CompilationResult,validation:ValidationResult):SceneSpecification{
 const shot=bedroomShots.find(item=>item.id===ctx.bedroomShotId)
 const capture:SceneCapture={
  mode:shot?.mode||'front',shotId:shot?.id||'',
  posture:(shot?getShotPosture(shot.id):ctx.poseId)||'',
  lighting:ctx.nightLightingId||'phone_screen_only',
  target:ctx.promptTarget||'gemini'
 }
 const selections:SceneSpecification['selections']={
  hairstyleMode:ctx.hairstyleMode||'preserve',hairVariantId:ctx.hairVariantId,
  hairDirection:code(ctx.hairDirection),hairVolume:code(ctx.hairVolume),hairTexture:code(ctx.hairTexture),
  expressionVariantId:ctx.expressionVariantId,gazeId:code(ctx.gazeId),microExpressionId:code(ctx.microExpressionId),
  upperGarmentId:ctx.upperGarmentId,upperColor:garmentColor(ctx.color),
  upperMaterialId:ctx.materialId,upperFitId:ctx.fitId,
  lowerGarmentId:ctx.lowerGarmentId||'',lowerColor:ctx.lowerGarmentId?code(ctx.lowerColor):'',
  mirrorMovementId:code(ctx.mirrorMovementId),mirrorPhoneHeightId:code(ctx.mirrorPhoneHeightId),
  mirrorDistanceId:code(ctx.mirrorDistanceId),mirrorFramingId:code(ctx.mirrorFramingId),mirrorGazeId:code(ctx.mirrorGazeId),
  roomPhysicalState:ctx.roomPhysicalState?{...ctx.roomPhysicalState,zones:[...ctx.roomPhysicalState.zones]}:null
 }
 const derivedUnits:SceneUnit[]=result.sections.map(s=>({id:s.id,text:s.content,authority:unitAuthority(s.id),immutable:true}))
 // Natural Scene Director remains local: the model receives its exact decisions, not
 // an invitation to manufacture another action, camera angle, prop, or light source.
 const direction=buildNaturalSceneDirection(ctx)
 if(direction)derivedUnits.push({id:'natural_scene_director',text:direction,authority:'local_physics',immutable:true})
 const references:SceneSpecification['references']={
  personDeclared:!!ctx.referenceImagePresent,roomDeclared:!!ctx.roomReferencePresent,
  pixelsAvailableToEditor:false,
  userConfirmedLayout:capture.mode==='mirror'
   ?['Wardrobe recording mirror on the right wall','Bed on the left wall','Separate dresser mirror stays right of the wardrobe','Sofa is present only when confirmed and optically visible']
   :[]
 }
 const unspecified=[
  'No reference pixels are available to the text editor; do not assert visual inspection.',
  ...(!ctx.referenceImagePresent?['Face details are not verified by an uploaded reference.']:[]),
  ...(!ctx.roomReferencePresent?['Room photograph is not present; do not invent unseen architecture, damage or objects.']:[])
 ]
 const conflicts=[...validation.errors,...result.errors].filter((s,i,a)=>a.indexOf(s)===i)
 const opening=[
  'Everyday bedroom photograph.', 'Capture '+capture.mode+'.','Shot '+(capture.shotId||'unspecified')+'.',
  'Posture '+(capture.posture||'unspecified')+'.','Selected lighting '+capture.lighting+'.',
  'Hair '+selections.hairstyleMode+' '+selections.hairVariantId+'.',
  'Upper clothing '+selections.upperGarmentId+' color '+selections.upperColor+'.',
  selections.lowerGarmentId?'Lower clothing '+selections.lowerGarmentId+' color '+selections.lowerColor+'.':'',
  'The person reference defines identity and the room reference defines photographed architecture only when actually provided to the image generator.'
 ].filter(Boolean).join(' ')
 const unsigned:Omit<SceneSpecification,'integrity'>={
  version:1,capture,selections,references,derivedUnits,
  mandatoryUnitIds:derivedUnits.map(s=>s.id),unspecified,conflicts,opening
 }
 return {...unsigned,integrity:sceneFingerprint(unsigned)}
}

const functionWords=new Set([
 'a','an','the','of','on','in','at','by','to','from','with','while','and','as','is','are','be',
 'this','that','these','those','its','their','for','then','also','therefore','clearly','each',
 'one','every','under','through','about','using','via','has','have','where','when','into'
])
const keywords=(s:string)=>(s.toLowerCase().match(/[a-z0-9]+/g)||[])
 .filter(t=>!functionWords.has(t))
/** Semantic guard for a limited editorial opening. Immutable scene sections are never rewritten. */
export function editorialOpeningIsSafe(approved:string,edited:string):boolean{
 if(!edited||edited.length>approved.length+240||edited.length>1800)return false
 const a=keywords(approved),b=keywords(edited)
 if(a.length!==b.length||a.some((t,i)=>t!==b[i]))return false
 const numbers=(s:string)=>(s.match(/\b\d+(?:\.\d+)?\b/g)||[]).sort().join(',')
 if(numbers(approved)!==numbers(edited))return false
 if(/\b(?:extra|additional|unknown|imaginary|new|second)\s+(?:person|window|lamp|camera|mirror|bed|sofa)\b/i.test(edited))return false
 return true
}
/** Structural validation plus fail-closed local reconstruction; never trust model-authored final prose. */
export function validateConstrainedEditorReply(spec:SceneSpecification,reply:unknown):ConstrainedEditorReply{
 if(!reply||typeof reply!=='object'||Array.isArray(reply))throw Error('EDITOR_SCHEMA')
 const data=reply as Record<string,unknown>
 if(data.source!=='gemini-editor'||data.integrity!==spec.integrity)throw Error('EDITOR_INTEGRITY')
 if(data.editorStyle!=='spaced'&&data.editorStyle!=='compact')throw Error('EDITOR_STYLE')
 if(!Array.isArray(data.orderedUnitIds)||data.orderedUnitIds.length!==spec.derivedUnits.length||
  data.orderedUnitIds.some(id=>typeof id!=='string')||
  new Set(data.orderedUnitIds).size!==spec.derivedUnits.length||
  data.orderedUnitIds.some(id=>!spec.mandatoryUnitIds.includes(id)))throw Error('EDITOR_MISSING_UNITS')
 if(data.orderedUnitIds[0]!=='reference_identity'&&spec.derivedUnits[0]?.id==='reference_identity')
  throw Error('EDITOR_IDENTITY_PRIORITY')
 if(typeof data.opening!=='string'||!editorialOpeningIsSafe(spec.opening,data.opening))
  throw Error('EDITOR_UNSAFE_EDIT')
 if(typeof data.prompt!=='string')throw Error('EDITOR_SCHEMA')
 const canonical=composeApprovedPrompt(spec,data.orderedUnitIds,data.opening,data.editorStyle as 'spaced'|'compact')
 if(data.prompt!==canonical)throw Error('EDITOR_PROMPT_TAMPERED')
 return data as ConstrainedEditorReply
}
export function composeApprovedPrompt(spec:SceneSpecification,order:string[],opening:string,style:'spaced'|'compact'):string{
 const units=new Map(spec.derivedUnits.map(u=>[u.id,u.text]))
 return [opening.trim(),...order.map(id=>units.get(id)||'')].filter(Boolean).join(style==='compact'?'\n':'\n\n')
}
