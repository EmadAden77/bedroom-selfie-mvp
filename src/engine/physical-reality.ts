/** Physical Reality Engine: deterministic, reference-aware constraints over the existing compiler context.
 * This is a consistency checker, not a ray tracer or image-quality guarantee.
 * Existing rule authors remain in their domain modules; the graph owns invocation and diagnostics.
 */
import type {CompilationContext,ValidationResult} from '../domain/types'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {ROOM_ZONES} from '../data/room-physical-state'
import {inspectSharedScene} from '../../shared/physical-reality-core.mjs'
import type {RoomPhysicalState} from '../data/room-physical-state'
import {nightLightingPresets} from '../data/night-lighting'
import {hairVariants} from '../data/hair'
import {expressionVariants} from '../data/expressions'
import {garmentRecords,materialProfiles,fitProfiles,garmentStates,clothingColors,garmentSurfaceChoices} from '../data/clothing'
import {poseOptions,faceOptions,lampSideOptions} from '../data/light-geometry'
import {mirrorMovements,mirrorPhoneHeights,mirrorDistances,mirrorFramings,mirrorGazes} from '../data/mirror-controls'
import {hairDirections,hairVolumes,hairTextures} from '../data/hair-advanced'
import {gazeChoices,microChoices} from '../data/gaze-micro'
import {realismPresets} from '../data/realism-intensity'

export type RealityStatus='VALID'|'CONFLICT'|'WARNING'|'UNKNOWN'
export type RealityCategory='capture'|'geometry'|'biomechanics'|'lighting'|'clothing'|'room'|'reference'
export type RealityFinding={
 id:string;status:Exclude<RealityStatus,'VALID'>;category:RealityCategory;
 fields:(keyof CompilationContext)[];reason:string;repair:string
}
type Field=keyof CompilationContext
export type OptionRegistration={id:Field;dependsOn:readonly Field[];values:readonly string[]|null;supportsCustom?:boolean;independentReason?:string}
/** All fields in CompilationContext must have a declaration. Null values mean free text,
 * structured objects, booleans or reference metadata (not an unchecked enum).
 */
const relationships:Record<Field,readonly Field[]>={
 hairVariantId:['hairstyleMode','hairDirection','hairVolume','hairTexture','referenceImagePresent'],
 hairstyleMode:['hairVariantId','referenceImagePresent'],
 hairDirection:['hairVariantId','hairstyleMode'],hairVolume:['hairVariantId','hairstyleMode'],hairTexture:['hairVariantId','hairstyleMode'],
 promptTarget:[],realismIntensity:[],expressionVariantId:['referenceImagePresent'],
 gazeId:['bedroomShotId','mirrorGazeId'],microExpressionId:['expressionVariantId'],
 upperGarmentId:['materialId','fitId','stateId','color','surface','mirrorMovementId','referenceImagePresent'],
 lowerGarmentId:['lowerMaterialId','lowerFitId','lowerStateId','lowerColor','lowerSurface','mirrorMovementId'],
 materialId:['upperGarmentId','surface'],fitId:['upperGarmentId'],stateId:['upperGarmentId'],color:['upperGarmentId'],surface:['upperGarmentId','materialId'],
 referenceImagePresent:['hairVariantId','expressionVariantId','upperGarmentId'],
 roomReferencePresent:['roomPhysicalState','bedroomShotId','mirrorDistanceId','mirrorFramingId'],
 bedroomClutterId:['roomPhysicalState'],roomPhysicalState:['roomReferencePresent','bedroomShotId'],
 nightLightingId:['bedroomShotId','windowUncovered','faceDirectionId','lampSideId'],
 windowUncovered:['nightLightingId','bedroomShotId'],
 poseId:['bedroomShotId','faceDirectionId'],faceDirectionId:['poseId','nightLightingId'],
 lampSideId:['nightLightingId','faceDirectionId'],
 bedroomShotId:['poseId','nightLightingId','windowUncovered','mirrorMovementId','mirrorPhoneHeightId','mirrorDistanceId','mirrorFramingId','mirrorGazeId','roomPhysicalState'],
 mirrorMovementId:['bedroomShotId','upperGarmentId','lowerGarmentId'],
 mirrorPhoneHeightId:['bedroomShotId','mirrorFramingId'],mirrorDistanceId:['bedroomShotId','roomReferencePresent','mirrorFramingId'],
 mirrorFramingId:['bedroomShotId','mirrorDistanceId','mirrorPhoneHeightId','roomReferencePresent'],
 mirrorGazeId:['bedroomShotId','gazeId'],
 lowerMaterialId:['lowerGarmentId','lowerSurface'],lowerFitId:['lowerGarmentId'],
 lowerStateId:['lowerGarmentId'],lowerColor:['lowerGarmentId'],lowerSurface:['lowerGarmentId','lowerMaterialId']
}
const ids=(list:readonly {id:string}[]):string[]=>list.map(x=>x.id)
const values:Partial<Record<Field,readonly string[]>>={
 hairVariantId:ids(hairVariants),hairstyleMode:['preserve','apply'],
 hairDirection:ids(hairDirections),hairVolume:ids(hairVolumes),hairTexture:ids(hairTextures),
 promptTarget:['gemini','chatgpt','flux','midjourney'],realismIntensity:ids(realismPresets),
 expressionVariantId:ids(expressionVariants),gazeId:ids(gazeChoices),microExpressionId:ids(microChoices),
 upperGarmentId:ids(garmentRecords.filter(x=>x.category==='upper')),
 lowerGarmentId:['',...ids(garmentRecords.filter(x=>x.category==='lower'))],
 materialId:ids(materialProfiles),fitId:ids(fitProfiles),stateId:ids(garmentStates),
 color:ids(clothingColors),lowerColor:ids(clothingColors),surface:ids(garmentSurfaceChoices),lowerSurface:ids(garmentSurfaceChoices),
 bedroomClutterId:['reference','lived_in_messy'],nightLightingId:ids(nightLightingPresets),
 referenceImagePresent:['true','false'],roomReferencePresent:['true','false'],windowUncovered:['true','false'],
 poseId:ids(poseOptions),faceDirectionId:ids(faceOptions),lampSideId:ids(lampSideOptions),
 bedroomShotId:['',...ids(bedroomShots)],
 mirrorMovementId:ids(mirrorMovements),mirrorPhoneHeightId:ids(mirrorPhoneHeights),
 mirrorDistanceId:ids(mirrorDistances),mirrorFramingId:ids(mirrorFramings),mirrorGazeId:ids(mirrorGazes),
 lowerMaterialId:ids(materialProfiles),lowerFitId:ids(fitProfiles),lowerStateId:ids(garmentStates)
}
const fields=Object.keys(relationships) as Field[]
export const OPTION_REGISTRY:Readonly<Record<Field,OptionRegistration>>=Object.freeze(
 Object.fromEntries(fields.map(id=>[id,{
  id,dependsOn:relationships[id],values:values[id]||null,
  ...(id==='color'||id==='lowerColor'?{supportsCustom:true}:{}),
  ...(relationships[id].length===0?{independentReason:'Output presentation preference; no additional scene-physics dependency.'}:{})
 }])) as Record<Field,OptionRegistration>
)
/** Nested editable room controls are registered independently of the parent context key. */
export const ROOM_OPTION_REGISTRY:Readonly<Record<keyof RoomPhysicalState,{
 id:keyof RoomPhysicalState;values:readonly string[];dependsOn:readonly Field[];meaning:string
}>>={
 order:{id:'order',values:['reference','light','medium','clear'],dependsOn:['roomPhysicalState','roomReferencePresent'],meaning:'Movable object additions, never fixed furniture'},
 surface:{id:'surface',values:['reference','touch','dust'],dependsOn:['roomPhysicalState','roomReferencePresent','nightLightingId'],meaning:'Only reference-supported or temporary surface marks'},
 zones:{id:'zones',values:[...ROOM_ZONES],dependsOn:['roomPhysicalState','roomReferencePresent'],meaning:'Editable zones, all furniture stays anchored'},
 sessionLocked:{id:'sessionLocked',values:['true','false'],dependsOn:['roomPhysicalState','bedroomShotId'],meaning:'Scene-to-scene movable-object continuity'}
}
export function affectedFields(changed:readonly Field[]):Field[]{
 const affected=new Set<Field>(changed),queue=[...changed]
 for(let i=0;i<queue.length;i++){
  const field=queue[i]
  for(const candidate of fields){
   if(relationships[candidate].includes(field)&&!affected.has(candidate)){
    affected.add(candidate);queue.push(candidate)
   }
  }
 }
 return [...affected]
}
/** The same normalized scene payload is used by the constrained Gemini server preflight. */
export function toSharedScene(ctx:CompilationContext){
 const shot=bedroomShots.find(x=>x.id===ctx.bedroomShotId)
 const lower=garmentRecords.find(x=>x.id===ctx.lowerGarmentId)
 return {
  mode:shot?.mode||'front',shotId:ctx.bedroomShotId||'',
  hairVariantId:ctx.hairVariantId,hairstyleMode:ctx.hairstyleMode||'preserve',
  hairDirection:ctx.hairDirection||'auto',hairVolume:ctx.hairVolume||'auto',hairTexture:ctx.hairTexture||'auto',
  promptTarget:ctx.promptTarget||'gemini',realismIntensity:ctx.realismIntensity||'natural',
  expressionVariantId:ctx.expressionVariantId,gazeId:ctx.gazeId||'auto',
  microExpressionId:ctx.microExpressionId||'none',
  bedroomClutterId:ctx.bedroomClutterId||'reference',
  faceDirectionId:ctx.faceDirectionId||'toward_camera',lampSideId:ctx.lampSideId||'left',
  lowerFitId:ctx.lowerFitId||'',lowerStateId:ctx.lowerStateId||'',
  poseId:ctx.poseId||'',shotPosture:(shot?getShotPosture(shot.id):ctx.poseId)||'',
  referenceImagePresent:!!ctx.referenceImagePresent,roomReferencePresent:!!ctx.roomReferencePresent,
  nightLightingId:ctx.nightLightingId||'phone_screen_only',windowUncovered:!!ctx.windowUncovered,
  upperGarmentId:ctx.upperGarmentId,materialId:ctx.materialId,fitId:ctx.fitId,
  stateId:ctx.stateId,color:ctx.color,surface:ctx.surface,
  lowerGarmentId:ctx.lowerGarmentId||'',lowerMaterialId:ctx.lowerMaterialId||lower?.defaultMaterial||'',
  lowerSurface:ctx.lowerSurface||lower?.defaultSurface||'',
  mirrorMovementId:ctx.mirrorMovementId||'',mirrorPhoneHeightId:ctx.mirrorPhoneHeightId||'',
  mirrorDistanceId:ctx.mirrorDistanceId||'',mirrorFramingId:ctx.mirrorFramingId||'',
  mirrorGazeId:ctx.mirrorGazeId||'',roomPhysicalState:ctx.roomPhysicalState||null
 }
}
type Rule={id:string;fields:readonly Field[];run:(ctx:CompilationContext)=>RealityFinding[]}
const finding=(id:string,status:RealityFinding['status'],category:RealityCategory,fields:Field[],reason:string,repair:string):RealityFinding=>({id,status,category,fields,reason,repair})
const presentationFields:Field[]=['promptTarget','realismIntensity']
const physicalFields=fields.filter(field=>!presentationFields.includes(field))
const rules:readonly Rule[]=[
 {id:'shared-physical-constraints',fields:physicalFields,
  run:ctx=>inspectSharedScene(toSharedScene(ctx),'physical') as RealityFinding[]},
 {id:'presentation-choices',fields:presentationFields,
  run:ctx=>inspectSharedScene(toSharedScene(ctx),'presentation') as RealityFinding[]}
]
export type RealityReport={status:RealityStatus;findings:RealityFinding[];evaluatedRules:string[];findingsByRule:Record<string,RealityFinding[]>;recomputedRules?:string[]}
const summarize=(findings:RealityFinding[]):RealityStatus=>
 findings.some(x=>x.status==='CONFLICT')?'CONFLICT':
 findings.some(x=>x.status==='WARNING')?'WARNING':
 findings.some(x=>x.status==='UNKNOWN')?'UNKNOWN':'VALID'
/** Full check by default; filtered mode returns only the selected affected rules. */
export function evaluatePhysicalReality(ctx:CompilationContext,changed?:readonly Field[]):RealityReport{
 const affected=changed?affectedFields(changed):null
 const selected=rules.filter(rule=>!affected||rule.fields.some(field=>affected.includes(field)))
 const findingsByRule=Object.fromEntries(selected.map(rule=>[rule.id,rule.run(ctx)])) as Record<string,RealityFinding[]>
 const findings=selected.flatMap(rule=>findingsByRule[rule.id])
 return {status:summarize(findings),findings,evaluatedRules:selected.map(x=>x.id),findingsByRule}
}
/** Recalculate only rules depending on a changed field, preserving all unaffected findings.
 * Safe use requires previous to be a full report for the matching previous selections.
 */
export function updatePhysicalReality(previous:RealityReport,next:CompilationContext,changed:readonly Field[]):RealityReport{
 if(previous.evaluatedRules.length!==rules.length||rules.some(rule=>!Object.prototype.hasOwnProperty.call(previous.findingsByRule,rule.id)))
  return evaluatePhysicalReality(next)
 const affected=affectedFields(changed)
 const touched=rules.filter(rule=>rule.fields.some(field=>affected.includes(field)))
 const findingsByRule={...previous.findingsByRule}
 for(const rule of touched)findingsByRule[rule.id]=rule.run(next)
 const findings=rules.flatMap(rule=>findingsByRule[rule.id])
 return {status:summarize(findings),findings,findingsByRule,evaluatedRules:rules.map(rule=>rule.id),recomputedRules:touched.map(rule=>rule.id)}
}
/** Verify registry completeness against the actual context of the running app. */
export function missingRegistrations(ctx:CompilationContext):string[]{
 return Object.keys(ctx).filter(key=>!(key in OPTION_REGISTRY))
}

/** Migration adapter: compiler-only legacy validators remain authoritative until converted
 * to typed graph rules. Never present a compiler-rejected scene as VALID or UNKNOWN.
 */
export function includeCompilerFindings(
 reality:ReturnType<typeof evaluatePhysicalReality>,validation:Pick<ValidationResult,'errors'|'warnings'>
):ReturnType<typeof evaluatePhysicalReality>{
 const findings=[...reality.findings]
 const existing=new Set(findings.map(x=>x.reason))
 const infer=(reason:string):{category:RealityCategory;fields:Field[];repair:string}=>{
  const s=reason.toLowerCase()
  if(/garment|material|fit|rib|color|state|surface|clothing|قطعة|ملابس/.test(s))
   return {category:'clothing',fields:['upperGarmentId','materialId','fitId','stateId','color','surface','lowerGarmentId'],repair:'راجع توافق نوع القطعة والخامة والقصّة والسطح واللون، أو اختر القيم الافتراضية للقطعة.'}
  if(/light|flash|lamp|window|curtain|إضاءة|فلاش|نافذة/.test(s))
   return {category:'lighting',fields:['nightLightingId','windowUncovered','bedroomShotId'],repair:'غيّر مصدر الضوء أو اللقطة صراحةً حتى يتوافقا، دون إضافة مصدر ضوء غير موجود.'}
  if(/mirror|reflection|مرآة/.test(s))
   return {category:'geometry',fields:['bedroomShotId','mirrorDistanceId','mirrorPhoneHeightId','mirrorMovementId'],repair:'راجع إعداد المرآة أو اختر الوضع الافتراضي الخاص باللقطة.'}
  if(/hair|hairstyle|شعر/.test(s))
   return {category:'reference',fields:['hairVariantId','hairstyleMode'],repair:'اختر تسريحة مسموحة واحفظ خصائص الشعر الأصلية.'}
  if(/expression|gaze|micro/.test(s))
   return {category:'biomechanics',fields:['expressionVariantId','gazeId','microExpressionId'],repair:'اختر تعبيرًا أو اتجاه نظر متوافقًا.'}
  if(/pose|shot|posture|face direction/.test(s))
   return {category:'biomechanics',fields:['poseId','bedroomShotId','faceDirectionId'],repair:'راجع وضعية الجسم ونوع اللقطة، دون افتراض دعم أو طرف إضافي.'}
  return {category:'reference',fields:[],repair:'راجع الاختيار المذكور والمرجع المتاح؛ لا تعتمد هذا المشهد قبل حل الخطأ.'}
 }
 for(const [status,messages] of [['CONFLICT',validation.errors],['WARNING',validation.warnings]] as const)
  for(const [i,reason] of messages.entries()){
   if(existing.has(reason))continue
   existing.add(reason)
   const mapped=infer(reason)
   findings.push(finding('legacy-'+status+'-'+i,status,mapped.category,mapped.fields,
    'فحص المترجم الحالي: '+reason,mapped.repair))
  }
 const status=summarize(findings)
 return {...reality,status,findings}
}
