/** Physical Reality Engine: deterministic, reference-aware constraints over the existing compiler context.
 * This is a consistency checker, not a ray tracer or image-quality guarantee.
 * Existing rule authors remain in their domain modules; the graph owns invocation and diagnostics.
 */
import type {CompilationContext} from '../domain/types'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {captureLightingIssues} from '../data/scene-consistency'
import {validateMirrorControls} from '../data/mirror-controls'
import {validateRoomPhysicalState} from '../data/room-physical-state'
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
type Rule={id:string;fields:readonly Field[];run:(ctx:CompilationContext)=>RealityFinding[]}
const finding=(id:string,status:RealityFinding['status'],category:RealityCategory,fields:Field[],reason:string,repair:string):RealityFinding=>({id,status,category,fields,reason,repair})
const rules:readonly Rule[]=[
 {id:'capture-light',fields:['bedroomShotId','nightLightingId'],run:ctx=>
  captureLightingIssues(ctx)
   .map((reason,i)=>finding('capture-light-'+i,'CONFLICT','lighting',['bedroomShotId','nightLightingId'],reason,
    'اختر وضع إضاءة يطابق نوع الكاميرا واللقطة، أو غيّر اللقطة صراحةً.'))},
 {id:'mirror-controls',fields:['bedroomShotId','mirrorMovementId','mirrorPhoneHeightId','mirrorDistanceId','mirrorFramingId','mirrorGazeId'],
  run:ctx=>validateMirrorControls(ctx).map((reason,i)=>finding('mirror-controls-'+i,'CONFLICT','geometry',
   ['bedroomShotId','mirrorMovementId','mirrorPhoneHeightId','mirrorDistanceId','mirrorFramingId','mirrorGazeId'],reason,
   'أعد الضبط المتعارض إلى «كما تقتضي الوضعية» مع الإبقاء على اللقطة المختارة.'))},
 {id:'room-state',fields:['roomPhysicalState'],run:ctx=>ctx.roomPhysicalState
  ?validateRoomPhysicalState(ctx.roomPhysicalState).map((reason,i)=>finding('room-state-'+i,'CONFLICT','room',['roomPhysicalState'],reason,
   'راجع القيم المسموحة ومناطق الغرفة المحددة، دون تغيير مواقع الأثاث.')):[]},
 {id:'shot-posture',fields:['bedroomShotId','poseId'],run:ctx=>{
   if(!ctx.bedroomShotId)return []
   const matched=getShotPosture(ctx.bedroomShotId)
   if(!matched||!ctx.poseId||matched===ctx.poseId)return []
   // Existing compilePrompt synchronizes posture from the selected shot; report before that normalization.
   return [finding('shot-posture','WARNING','biomechanics',['bedroomShotId','poseId'],
    'الوضعية العامة تختلف عن وضعية اللقطة؛ المترجم الحالي يعتمد وضعية اللقطة صراحةً.',
    'وحّد اختيار الوضعية مع وضعية اللقطة، أو ألغِ اختيار اللقطة.')]
  }},
 {id:'spatial-evidence',fields:['bedroomShotId','roomReferencePresent','mirrorFramingId','mirrorDistanceId'],run:ctx=>{
   if(!ctx.bedroomShotId?.startsWith('mirror_'))return []
   return ctx.roomReferencePresent?[
    finding('mirror-measurements','UNKNOWN','geometry',['mirrorDistanceId','mirrorFramingId'],
     'لا توجد قياسات معايرة للمرآة أو المسافات أو مجال رؤية الكاميرا؛ لا يمكن إثبات خلو مسار الانعكاس من الحجب.',
     'استخدم وصفًا نسبيًا واحفظ مواقع الأثاث. يمكن إدخال قياسات موثوقة لاحقًا.')
   ]:[
    finding('mirror-reference','UNKNOWN','reference',['roomReferencePresent','bedroomShotId'],
     'صورة الغرفة غير متاحة؛ هندسة المرآة المحددة نصيًا لا تثبت أبعادها أو ما يظهر داخل الانعكاس.',
     'أضف صورة مرجعية للغرفة إذا كانت متاحة، وإلا تجنب ادعاء أبعاد دقيقة.')
   ]
  }},
 {id:'identity-evidence',fields:['referenceImagePresent','hairVariantId','upperGarmentId'],run:ctx=>
  ctx.referenceImagePresent?[]:[finding('person-reference','UNKNOWN','reference',['referenceImagePresent'],
   'لم تُرفق صورة هوية؛ لا يمكن التحقق من تفاصيل الوجه أو خط الشعر أو الملابس المرجعية.',
   'أرفق صورة الهوية إن أردت مطابقة الملامح، دون اختراع تفاصيل مفقودة.')]},
 {id:'material-contact',fields:['bedroomShotId','poseId','roomPhysicalState'],run:ctx=>
  ctx.bedroomShotId||ctx.poseId?[
   finding('unmeasured-contact','UNKNOWN','biomechanics',['bedroomShotId','poseId'],
    'التلامس والضغط ومركز الثقل مقيّدون وصفيًا، لكن لا توجد بيانات مفاصل أو كتل أو أسطح ثلاثية الأبعاد لإثباتهم عدديًا.',
    'استخدم أوصاف دعم الوزن والتلامس الحالية؛ لا تستنتج قياسات أو قوى رقمية.')
  ]:[]}
]
export function evaluatePhysicalReality(ctx:CompilationContext,changed?:readonly Field[]):{status:RealityStatus;findings:RealityFinding[];evaluatedRules:string[]}{
 const affected=changed?affectedFields(changed):null
 const selected=rules.filter(rule=>!affected||rule.fields.some(field=>affected.includes(field)))
 const findings=selected.flatMap(rule=>rule.run(ctx))
 const status:RealityStatus=findings.some(x=>x.status==='CONFLICT')?'CONFLICT'
  :findings.some(x=>x.status==='WARNING')?'WARNING'
  :findings.some(x=>x.status==='UNKNOWN')?'UNKNOWN':'VALID'
 return {status,findings,evaluatedRules:selected.map(x=>x.id)}
}
/** Verify registry completeness against the actual context of the running app. */
export function missingRegistrations(ctx:CompilationContext):string[]{
 return Object.keys(ctx).filter(key=>!(key in OPTION_REGISTRY))
}
