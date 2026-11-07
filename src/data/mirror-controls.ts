import type {CompilationContext} from '../domain/types'
import {MIRROR_FIXED_ACTION_SHOTS,MIRROR_FIXED_HEIGHT,MIRROR_FIXED_DISTANCE,MIRROR_FIXED_GAZE,inspectSharedScene} from '../../shared/physical-reality-core.mjs'
import {buildMirrorRoomReferenceGeometry} from './mirror-room-geometry'
import {buildMirrorOpticsMechanics} from './mirror-optics-mechanics'

/** Physical settings for the EXISTING right-wall wardrobe mirror, not a new prop. */
type MirrorOption={id:string;label:string;description:string}

export const mirrorMovements:readonly MirrorOption[]=[
 {id:'relaxed',label:'حركة الوضعية الأصلية',description:'Keep the free hand naturally relaxed unless the chosen shot already assigns it a physical task.'},
 {id:'hand_hip',label:'اليد على الخصر',description:'Place the free hand on the near hip, elbow angled naturally, without twisting the wrist.'},
 {id:'touch_hair',label:'لمس الشعر',description:'Free fingertips lightly touch the real hair already present, preserving the actual hairline and density.'},
 {id:'adjust_neckline',label:'تعديل ياقة القميص',description:'Free fingers briefly pinch the actual garment neckline and create localized fabric tension.'},
 {id:'adjust_hem',label:'تعديل طرف القميص',description:'Free fingers straighten the actual shirt hem near the hip, causing small natural folds.'},
 {id:'hand_pocket',label:'اليد عند الجيب',description:'Free fingers rest against the trousers at the pocket area, without assuming an unseen pocket.'},
 {id:'peace',label:'إشارة السلام',description:'The free hand forms a relaxed two-finger peace sign beside the shoulder.'},
 {id:'touch_chin',label:'لمس الذقن',description:'The free fingertips touch the chin with slight realistic skin compression.'},
 {id:'hand_chest',label:'اليد على الصدر',description:'The free palm rests loosely over the garment at the upper chest, with small fabric contact folds.'},
 {id:'wave',label:'تحية خفيفة',description:'Free hand makes a small relaxed wave, while the phone hand and camera aim stay steady.'},
 {id:'rest_thigh',label:'اليد على الفخذ',description:'Free palm rests gently on the near thigh, with a relaxed shoulder and elbow.'}
]
export const mirrorPhoneHeights:readonly MirrorOption[]=[
 {id:'shot',label:'كما تقتضي الوضعية',description:'Keep the camera height implied by the selected shot.'},
 {id:'face',label:'الهاتف بمحاذاة الوجه',description:'Phone held near face level within realistic elbow and shoulder reach.'},
 {id:'chest',label:'الهاتف أمام الصدر',description:'Phone at upper chest level, rear lenses aimed into the mirror.'},
 {id:'waist',label:'الهاتف عند الخصر',description:'Phone at waist level with modest upward camera pitch and natural body perspective.'}
]
export const mirrorDistances:readonly MirrorOption[]=[
 {id:'shot',label:'المسافة الأصلية',description:'Keep the subject distance implied by the selected shot.'},
 {id:'close',label:'قريب من المرآة',description:'Position the body with comfortable clearance from the vertical glass, without touching it with the phone.'},
 {id:'comfortable',label:'مسافة طبيعية',description:'Keep the selected seated/standing posture with real body support while staying within the existing free clearance between wardrobe and bed.'},
 {id:'far',label:'أبعد ضمن الغرفة',description:'Use only the existing clear floor space; stay on the room side of the glass without crossing the bed.'}
]
export const mirrorFramings:readonly MirrorOption[]=[
 {id:'shot',label:'كادر الوضعية',description:'Preserve the natural crop implied by the chosen shot.'},
 {id:'upper_body',label:'الوجه والجزء العلوي',description:'Frame face and upper torso within the actual reflective glass boundary.'},
 {id:'three_quarter',label:'حتى الساقين',description:'Frame torso and upper legs using a physically achievable reflection path.'},
 {id:'full_body',label:'الجسم كاملًا',description:'Show the whole person only through a valid sightline inside the existing mirror panel; preserve true proportions and the real room clearance.'}
]
export const mirrorGazes:readonly MirrorOption[]=[
 {id:'shot',label:'نظرة الوضعية',description:'Keep the eye direction already specified by the selected shot.'},
 {id:'reflection',label:'نحو العدسات المنعكسة',description:'Look toward the reflection of the real rear-camera module in the mirror.'},
 {id:'screen',label:'نحو شاشة الهاتف',description:'Look down to the real phone screen facing the subject, while its rear lenses still aim at the mirror.'},
 {id:'side',label:'نظرة جانبية عفوية',description:'Look slightly aside within normal neck range without moving the camera viewpoint.'}
]

/** Fixed actions and sightlines take precedence over a second conflicting command. */
export const fixedMirrorMovementShots=new Set(MIRROR_FIXED_ACTION_SHOTS)
export const fixedMirrorHeight:Record<string,string>=MIRROR_FIXED_HEIGHT
export const fixedMirrorDistance:Record<string,string>=MIRROR_FIXED_DISTANCE
export const fixedMirrorGaze:Record<string,string>=MIRROR_FIXED_GAZE

export function mirrorChoice<T extends MirrorOption>(items:readonly T[],id:string|undefined):T{
 return items.find(item=>item.id===id)||items[0]
}

const mirrorGeometryBase='The primary recording reflection uses the fixed vertical sliding wardrobe mirror on the RIGHT wall. The queen bed stays along the LEFT wall, and the separate dresser and its original vanity mirror stay on the RIGHT toward the front. The walking gap remains real. The subject and one recording phone stay on the room-facing side of the glass. Its rear camera points toward the mirror; its screen faces the subject. Equal-angle reflection determines the single camera ray, visible background, true reflected scale and glass-edge occlusion. The grip has continuous fingers, wrist, elbow and shoulder. The free hand performs at most one independent action. Light and flash reflections come from the selected real sources; no new mirror, displaced furniture, floating viewpoint and duplicated limbs.'

export function isMirrorShotId(id:string|undefined):boolean{
 return !!id&&id.startsWith('mirror_')
}

export function renderMirrorComposition(ctx:CompilationContext):string{
 if(!isMirrorShotId(ctx.bedroomShotId))return ''
 const motion=fixedMirrorMovementShots.has(ctx.bedroomShotId||'')?mirrorMovements[0]:mirrorChoice(mirrorMovements,ctx.mirrorMovementId)
 const height=fixedMirrorHeight[ctx.bedroomShotId||'']?mirrorPhoneHeights[0]:mirrorChoice(mirrorPhoneHeights,ctx.mirrorPhoneHeightId)
 const distance=fixedMirrorDistance[ctx.bedroomShotId||'']?mirrorDistances[0]:mirrorChoice(mirrorDistances,ctx.mirrorDistanceId)
 const gaze=fixedMirrorGaze[ctx.bedroomShotId||'']?mirrorGazes[0]:mirrorChoice(mirrorGazes,ctx.mirrorGazeId)
 const framing=mirrorChoice(mirrorFramings,ctx.mirrorFramingId)
 return 'MIRROR COMPOSITION: '+mirrorGeometryBase+' '+buildMirrorRoomReferenceGeometry(ctx)+' '+buildMirrorOpticsMechanics(ctx)+' Free-hand movement: '+motion.description+' Camera height: '+height.description+' Mirror distance: '+distance.description+' Reflection crop: '+framing.description+' Eye direction: '+gaze.description
}

export function buildMirrorGeminiBrief(ctx:CompilationContext):string{
 if(!isMirrorShotId(ctx.bedroomShotId))return ''
 const motion=fixedMirrorMovementShots.has(ctx.bedroomShotId||'')?mirrorMovements[0]:mirrorChoice(mirrorMovements,ctx.mirrorMovementId)
 const height=fixedMirrorHeight[ctx.bedroomShotId||'']?mirrorPhoneHeights[0]:mirrorChoice(mirrorPhoneHeights,ctx.mirrorPhoneHeightId)
 const distance=fixedMirrorDistance[ctx.bedroomShotId||'']?mirrorDistances[0]:mirrorChoice(mirrorDistances,ctx.mirrorDistanceId)
 const gaze=fixedMirrorGaze[ctx.bedroomShotId||'']?mirrorGazes[0]:mirrorChoice(mirrorGazes,ctx.mirrorGazeId)
 const framing=mirrorChoice(mirrorFramings,ctx.mirrorFramingId)
 return [
  'Mirror scene geometry: existing fixed sliding wardrobe mirror on RIGHT wall, bed on LEFT, original dresser and vanity mirror to its right near the doorway. Preserve the architecture, real walking gap and furniture order.',
  buildMirrorRoomReferenceGeometry(ctx),
  buildMirrorOpticsMechanics(ctx,true),
  'Mirror capture is a real handheld REAR-camera photograph. Exactly one physical phone and ONE PRIMARY recording mirror (the wardrobe); the separate existing vanity mirror remains in its actual position, not a second recording surface. Screen toward subject, rear lenses toward wardrobe glass, geometrically correct optical path and occlusion. Never use a front-facing camera perspective.',
  'Mirror movement: '+motion.description,
  'Phone position: '+height.description,
  'Distance to glass: '+distance.description,
  'Reflection framing: '+framing.description,
  'Gaze: '+gaze.description,
  'Keep natural gravity, reachable arm joints, body contact, real light-source shadows, glass reflection and sensor exposure consistent with the selected shot.'
 ].join('\n')
}

/** Compatibility wrapper: the portable physics engine owns mirror selection constraints. */
export function validateMirrorControls(ctx:CompilationContext):string[]{
 if(!isMirrorShotId(ctx.bedroomShotId))return []
 return inspectSharedScene({
  mode:'mirror',shotId:ctx.bedroomShotId||'',nightLightingId:ctx.nightLightingId||'phone_screen_only',
  upperGarmentId:ctx.upperGarmentId,materialId:ctx.materialId,fitId:ctx.fitId,
  stateId:ctx.stateId,color:ctx.color,surface:ctx.surface,windowUncovered:!!ctx.windowUncovered,
  mirrorMovementId:ctx.mirrorMovementId,mirrorPhoneHeightId:ctx.mirrorPhoneHeightId,
  mirrorDistanceId:ctx.mirrorDistanceId,mirrorFramingId:ctx.mirrorFramingId,mirrorGazeId:ctx.mirrorGazeId
 }).filter(x=>x.id.startsWith('mirror-')).map(x=>x.reason)
}
