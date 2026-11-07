import type {CompilationContext,CompilationResult,ValidationResult} from '../domain/types'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {buildNaturalSceneDirection} from '../features/ai-prompt-enhancer/natural-scene-director'

/** Locally resolved scene contract, not an additional source of user preferences.
 * The immutable English constraints come directly from the validated local compiler.
 */
export type SceneCategory='identity'|'hair'|'expression'|'clothing'|'action'|'room'|'mirror'|'lighting'|'camera'|'materials'
export type SceneFact={id:string;category:SceneCategory;content:string}
export type SceneSpecification={
 version:1
 source:'validated_local_compiler'
 selections:{
  shotId:string;captureMode:'front'|'mirror'|'rear'|'timer';posture:string;lightingId:string
  hairVariantId:string;hairstyleMode:string;expressionVariantId:string
  upperGarmentId:string;lowerGarmentId:string|null;upperColor:string;lowerColor:string|null
  faceDirection:string;mirrorMovement:string;mirrorGaze:string
  roomState:{order:string;surface:string;zones:string[];sessionLocked:boolean}|null
 }
 references:{
  subject:'reference_declared_unseen'|'not_provided'
  room:'reference_declared_unseen'|'not_provided'
 }
 derived:{
  recordingCamera:'front'|'rear'|'supported'
  mirrorSurface:'wardrobe_plane'|'none'
  bodySupport:'floor'|'bed'|'selected_pose'
  actualLightSource:string
  naturalSceneDirection:string
 }
 constraints:SceneFact[]
 mandatoryConstraintIds:string[]
 unspecified:string[]
 conflicts:string[]
}

/** Display-order ranks only: factual choices are resolved by renderSections already. */
export const SCENE_CATEGORIES:readonly SceneCategory[]=[
 'identity','hair','expression','clothing','action','room','mirror','lighting','camera','materials'
]
export function sceneCategory(id:string):SceneCategory{
 if(id.includes('identity')||id==='reference_identity')return 'identity'
 if(id.includes('hair'))return 'hair'
 if(id.includes('expression')||id.includes('gaze'))return 'expression'
 if(id.startsWith('upper_')||id.startsWith('lower_')||id.includes('clothing'))return 'clothing'
 if(id.includes('shot_')||id.includes('body_pose')||id==='pose_interaction'||id.includes('laptop_selfie'))return 'action'
 if(id.includes('bedroom_environment')||id.includes('background_continuity')||id.includes('room_state')||id.includes('clutter'))return 'room'
 if(id.includes('mirror'))return 'mirror'
 if(id.includes('light'))return 'lighting'
 if(id.includes('camera'))return 'camera'
 return 'materials'
}
export function canonicalSceneOrder(spec:SceneSpecification):string[]{
 return [...spec.constraints]
  .sort((a,b)=>SCENE_CATEGORIES.indexOf(a.category)-SCENE_CATEGORIES.indexOf(b.category))
  .map(x=>x.id)
}
export function scenePromptFromOrder(spec:SceneSpecification,order:readonly string[],layout:'paragraphs'|'compact'='paragraphs'):string{
 const map=new Map(spec.constraints.map(b=>[b.id,b.content]))
 if(order.length!==map.size||new Set(order).size!==order.length||order.some(id=>!map.has(id)))
  throw Error('SCENE_BLOCK_MISMATCH')
 let rank=-1
 for(const id of order){
  const block=spec.constraints.find(item=>item.id===id)!
  const next=SCENE_CATEGORIES.indexOf(block.category)
  if(next<rank)throw Error('SCENE_PRIORITY_VIOLATION')
  rank=next
 }
 // No free-form model prose can enter the returned prompt. Each authorized
 // invariant survives byte-for-byte, irrespective of model-proposed order.
 return order.map(id=>map.get(id)!.trim()).join(layout==='compact'?'\n':'\n\n')
}
export function buildSceneSpecification(ctx:CompilationContext,result:CompilationResult,validation:ValidationResult):SceneSpecification{
 const shot=bedroomShots.find(x=>x.id===ctx.bedroomShotId)
 const mode=shot?.mode||'front'
 const posture=shot?getShotPosture(shot.id)||ctx.poseId||'seated_bed':ctx.poseId||'seated_bed'
 const conflicts=[...new Set([...validation.errors,...result.errors])]
 if(!validation.isValid||conflicts.length||!result.sections.length||!result.promptText)
  throw Error('LOCAL_SCENE_INVALID')
 const blocks:SceneFact[]=result.sections.map(sec=>({id:sec.id,category:sceneCategory(sec.id),content:sec.content}))
 // Natural Scene Director already decides activity locally. It is included as
 // a derived immutable block, rather than allowing Gemini to invent an action.
 const naturalSceneDirection=buildNaturalSceneDirection(ctx)
 blocks.push({id:'local_natural_scene_director',category:'action',content:naturalSceneDirection})
 if(new Set(blocks.map(x=>x.id)).size!==blocks.length)throw Error('SCENE_DUPLICATE_ID')
 const room=ctx.roomPhysicalState
 const spec:SceneSpecification={
  version:1,source:'validated_local_compiler',
  selections:{
   shotId:shot?.id||'',captureMode:mode,posture,lightingId:ctx.nightLightingId||'phone_screen_only',
   hairVariantId:ctx.hairVariantId,hairstyleMode:ctx.hairstyleMode||'preserve',
   expressionVariantId:ctx.expressionVariantId,upperGarmentId:ctx.upperGarmentId,
   lowerGarmentId:ctx.lowerGarmentId,upperColor:ctx.color,lowerColor:ctx.lowerColor||null,
   faceDirection:ctx.faceDirectionId||'toward_camera',mirrorMovement:ctx.mirrorMovementId||'shot',
   mirrorGaze:ctx.mirrorGazeId||'shot',
   roomState:room?{order:room.order,surface:room.surface,zones:[...room.zones],sessionLocked:room.sessionLocked}:null
  },
  references:{
   subject:ctx.referenceImagePresent?'reference_declared_unseen':'not_provided',
   room:ctx.roomReferencePresent?'reference_declared_unseen':'not_provided'
  },
  derived:{
   recordingCamera:mode==='timer'?'supported':mode==='front'?'front':'rear',
   mirrorSurface:mode==='mirror'?'wardrobe_plane':'none',
   bodySupport:posture==='seated_bed'?'bed':posture==='seated_floor'||posture==='standing'?'floor':'selected_pose',
   actualLightSource:ctx.nightLightingId||'phone_screen_only',
   naturalSceneDirection
  },
  constraints:blocks,mandatoryConstraintIds:blocks.map(x=>x.id),
  unspecified:[
   'The text editor has not seen person or room photo pixels and cannot assert their visual details.',
   ...(ctx.referenceImagePresent?[]:['Exact subject identity is not visually confirmed.']),
   ...(ctx.roomReferencePresent?[]:['Exact unseen furniture, wall details and room measurements are not known.'])
  ],
  conflicts:[]
 }
 // Independent structural reconstruction, with no provider participation.
 scenePromptFromOrder(spec,canonicalSceneOrder(spec))
 return spec
}
