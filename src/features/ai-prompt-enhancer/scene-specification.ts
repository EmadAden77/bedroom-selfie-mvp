import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
import {buildNaturalSceneDirection} from './natural-scene-director'
import {MAX_SCENE_REQUEST_BYTES} from './scene-request-limits'
import {evaluatePhysicalReality} from '../../engine/physical-reality'
import {deriveLightingDecision,isLightingPresetId,type LightingDecision} from '../../../shared/lighting-decision'
import {deriveBodyScene} from '../../engine/body-mechanics'
import type {BodyMechanicalState} from '../../../shared/body-mechanics'
import {deriveBeddingScene} from '../../engine/bedding-physics'
import {DEFAULT_BEDDING_SELECTION,type BeddingState,type BeddingSelection} from '../../../shared/bedding-physics'
import {digestEditorialText,validateEditorialProposal,type OpeningLineSelection} from '../../../shared/editorial-contract'
import {deriveRoomGeometry,renderRoomGeometry,type RoomGeometry,type RoomSizePreset} from '../../../shared/room-geometry-rules'

export type SceneCapture={mode:'front'|'mirror'|'rear'|'timer';shotId:string;posture:string;lighting:string;target:'gemini'|'chatgpt'|'flux'|'midjourney'}
export type SceneUnit={id:string;text:string;authority:'user_selection'|'reference_scope'|'local_physics';immutable:true}
export type SceneSpecification={
 version:1
 capture:SceneCapture
 lighting:LightingDecision
 selections:{
  hairstyleMode:string;hairVariantId:string;hairDirection:string;hairVolume:string;hairTexture:string
  expressionVariantId:string;gazeId:string;microExpressionId:string
  upperGarmentId:string;upperColor:string;upperMaterialId:string;upperFitId:string
  lowerGarmentId:string;lowerColor:string
  mirrorMovementId:string;mirrorPhoneHeightId:string;mirrorDistanceId:string;mirrorFramingId:string;mirrorGazeId:string
  phoneOnlyIlluminationMode:string
  bodyHoldingHand:string;bodySupportChoice:string;bodyFreeHandTask:string;bodyFeetVisibility:string
  roomPhysicalState:CompilationContext['roomPhysicalState']|null
  beddingSelection:BeddingSelection
  roomSizePreset:RoomSizePreset;roomSizeConfirmed:boolean
  roomCustomWidthMeters:number|null;roomCustomDepthMeters:number|null;roomCustomHeightMeters:number|null
 }
 references:{personDeclared:boolean;roomDeclared:boolean;pixelsAvailableToEditor:false;userConfirmedLayout:string[]}
 bodyMechanics:BodyMechanicalState
 beddingPhysics:BeddingState
 roomGeometry:RoomGeometry
 derivedUnits:SceneUnit[]
 mandatoryUnitIds:string[]
 unspecified:string[]
 conflicts:string[]
 opening:string
 integrity:string
}
export type ConstrainedEditorReply={
 prompt:string
 promptDigest:string
 sectionCount:number
 protectedUnitDigests:{id:string;digest:string}[]
 sectionOrder:string[]
 openingLineSelection:OpeningLineSelection
 integrity:string
 source:'gemini-editor'
 validated:true
 model?:string
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
 // Invalid saved IDs already block compilation. Keep the UI stable while reporting
 // those errors; only validated scenes can carry an authoritative lighting block.
 const savedForInvalidScene=ctx.nightLightingId&&!isLightingPresetId(ctx.nightLightingId)?undefined:ctx.nightLightingId
 const lighting=deriveLightingDecision(savedForInvalidScene)
 const shot=bedroomShots.find(item=>item.id===ctx.bedroomShotId)
 const capture:SceneCapture={
  mode:shot?.mode||'front',shotId:shot?.id||'',
  posture:(shot?getShotPosture(shot.id):ctx.poseId)||'',
  lighting:evaluatePhysicalReality(ctx).effectiveLightingId,
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
  phoneOnlyIlluminationMode:ctx.phoneOnlyIlluminationMode||'OFF',
  bodyHoldingHand:ctx.bodyHoldingHand||'auto',bodySupportChoice:ctx.bodySupportChoice||'auto',
  bodyFreeHandTask:ctx.bodyFreeHandTask||'auto',bodyFeetVisibility:ctx.bodyFeetVisibility||'unknown',
  roomPhysicalState:ctx.roomPhysicalState?{...ctx.roomPhysicalState,zones:[...ctx.roomPhysicalState.zones]}:null,
  beddingSelection:{...(ctx.beddingSelection||DEFAULT_BEDDING_SELECTION)},
  roomSizePreset:ctx.roomSizePreset||'medium_bedroom',roomSizeConfirmed:ctx.roomSizeConfirmed===true,
  roomCustomWidthMeters:ctx.roomCustomWidthMeters??null,
  roomCustomDepthMeters:ctx.roomCustomDepthMeters??null,
  roomCustomHeightMeters:ctx.roomCustomHeightMeters??null
 }
 const roomGeometry=deriveRoomGeometry(selections,capture.posture,capture.lighting,
  capture.mode==='mirror'&&capture.posture==='standing')
 // An incomplete/out-of-bounds custom room has no valid structured dimensions.
 // Never substitute a fictitious number just to construct SceneSpecification.
 if(!roomGeometry)throw Error('ROOM_DIMENSIONS_INVALID')
 const derivedUnits:SceneUnit[]=result.sections.map(s=>({id:s.id,text:s.content,authority:unitAuthority(s.id),immutable:true}))
 // Natural Scene Director remains local: the model receives its exact decisions, not
 // an invitation to manufacture another action, camera angle, prop, or light source.
 const direction=buildNaturalSceneDirection(ctx)
 if(direction)derivedUnits.push({id:'natural_scene_director',text:direction,authority:'local_physics',immutable:true})
 derivedUnits.push({id:'room_geometry',text:renderRoomGeometry(roomGeometry),authority:'user_selection',immutable:true})
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
  version:1,capture,lighting,selections,references,bodyMechanics:deriveBodyScene(ctx),beddingPhysics:deriveBeddingScene(ctx),roomGeometry,derivedUnits,
  mandatoryUnitIds:derivedUnits.map(s=>s.id),unspecified,conflicts,opening
 }
 return {...unsigned,integrity:sceneFingerprint(unsigned)}
}

/**
 * Client-side verification only: never reassemble or rewrite the final prompt here.
 * Check the server's structured order claim, section count, and SHA-256 digests
 * against the client's already-validated immutable source units.
 * Digests detect accidental or transport corruption; they are not signatures.
 */
export async function validateConstrainedEditorReply(spec:SceneSpecification,reply:unknown):Promise<ConstrainedEditorReply>{
 if(!reply||typeof reply!=='object'||Array.isArray(reply))throw Error('EDITOR_SCHEMA')
 const data=reply as Record<string,unknown>
 if(data.source!=='gemini-editor'||data.integrity!==spec.integrity)throw Error('EDITOR_INTEGRITY')
 if(data.validated!==true)throw Error('EDITOR_NOT_VALIDATED')
 validateEditorialProposal(spec,{
  sectionOrder:data.sectionOrder,
  openingLineSelection:data.openingLineSelection
 })
 if(typeof data.prompt!=='string'||typeof data.promptDigest!=='string'||!(/^[a-f0-9]{64}$/).test(data.promptDigest))
  throw Error('EDITOR_DIGEST_SCHEMA')
 if(data.sectionCount!==spec.derivedUnits.length)throw Error('EDITOR_SECTION_COUNT')
 if(!Array.isArray(data.protectedUnitDigests)||data.protectedUnitDigests.length!==spec.derivedUnits.length)
  throw Error('EDITOR_SECTION_DIGESTS')
 const digests=await Promise.all([
  digestEditorialText(data.prompt),
  ...spec.derivedUnits.map(unit=>digestEditorialText(unit.text))
 ])
 if(digests[0]!==data.promptDigest)throw Error('EDITOR_PROMPT_TAMPERED')
 for(let i=0;i<spec.derivedUnits.length;i++){
  const received=data.protectedUnitDigests[i] as {id?:unknown;digest?:unknown}|null
  if(!received||received.id!==spec.derivedUnits[i].id||received.digest!==digests[i+1])
   throw Error('EDITOR_SECTION_INTEGRITY')
 }
 return data as ConstrainedEditorReply
}
