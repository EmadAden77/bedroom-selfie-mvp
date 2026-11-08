/**
 * PR7b: pure, deterministic room-geometry predicates.
 * Existing measurements come ONLY from shared/room-measurements.ts;
 * preset sizes are explicitly user-approved PR7b options, not inferred.
 * Test: src/tests/room-geometry-pr7b.test.ts.
 */
import {
 BED_LENGTH_CM,BED_WIDTH_CM,MIRROR_WIDTH_CM,POSE_FOOTPRINTS_CM2,
 IMPLICIT_DISTANCES,type PoseId
} from './room-measurements.ts'

export type RuleResult =
 | {status:'valid'}
 | {status:'invalid';reason:string}
 | {status:'unknown';reason:string}

export type RoomSizePreset='small_bedroom'|'medium_bedroom'|'large_bedroom'|'custom'
export type RoomDimensions={widthMeters:number;depthMeters:number;heightMeters:number}
export type RoomOptions={
 roomSizePreset?:RoomSizePreset
 roomSizeConfirmed?:boolean
 roomCustomWidthMeters?:number|null
 roomCustomDepthMeters?:number|null
 roomCustomHeightMeters?:number|null
}
export type RoomGeometry=RoomDimensions&{
 presetId:RoomSizePreset
 userConfirmed:boolean
 bedFitValid:RuleResult
 mirrorFitValid:RuleResult
 lightingFitValid:RuleResult
}

/** User-authorized exact preset dimensions; 2.0–12.0m bounds apply to custom. */
export const ROOM_SIZE_PRESETS:Record<Exclude<RoomSizePreset,'custom'>,RoomDimensions>={
 small_bedroom:{widthMeters:3.0,depthMeters:3.5,heightMeters:2.4},
 medium_bedroom:{widthMeters:4.0,depthMeters:4.5,heightMeters:2.6},
 large_bedroom:{widthMeters:5.0,depthMeters:5.5,heightMeters:2.8}
}
const validDimension=(n:unknown):n is number=>
 typeof n==='number'&&Number.isFinite(n)&&n>=2&&n<=12
const validRoom=(room:RoomDimensions):boolean=>
 [room.widthMeters,room.depthMeters,room.heightMeters].every(validDimension)

/** PR7b input bounds; never invent numbers for a missing custom input. */
export function roomInputStatus(options:RoomOptions):RuleResult{
 const id=options.roomSizePreset||'medium_bedroom'
 if(!['small_bedroom','medium_bedroom','large_bedroom','custom'].includes(id))
  return {status:'invalid',reason:'roomSizePreset is not an approved option'}
 if(id!=='custom')return {status:'valid'}
 if(!validDimension(options.roomCustomWidthMeters))return {status:'invalid',reason:'custom room width must be 2.0–12.0m'}
 if(!validDimension(options.roomCustomDepthMeters))return {status:'invalid',reason:'custom room depth must be 2.0–12.0m'}
 if(!validDimension(options.roomCustomHeightMeters))return {status:'invalid',reason:'custom room height must be 2.0–12.0m'}
 return {status:'valid'}
}
export function resolvedRoomDimensions(options:RoomOptions):RoomDimensions|null{
 if(roomInputStatus(options).status==='invalid')return null
 const id=options.roomSizePreset||'medium_bedroom'
 if(id!=='custom')return {...ROOM_SIZE_PRESETS[id]}
 return {
  widthMeters:options.roomCustomWidthMeters as number,
  depthMeters:options.roomCustomDepthMeters as number,
  heightMeters:options.roomCustomHeightMeters as number
 }
}
export type BedDimensions={widthCm:number|null;lengthCm:number|null}
export type PoseExtents={widthCm:number|null;lengthCm:number|null}
export type MirrorPlacement={wall:'left'|'right'|'front'|'back';widthCm:number|null}

/**
 * RG-1: reject demonstrably impossible bed clearance before unknown checks.
 * Unknown pose footprint (PR7a null) never becomes valid; for standing mirror
 * shots the ~3m/~5m cues also remain unresolved when depth cannot hold them.
 * Test: src/tests/room-geometry-pr7b.test.ts (RG-1 positive/negative/unknown).
 */
export function fitWithinRoom(
 bed:BedDimensions,pose:PoseExtents,room:RoomDimensions,checkImplicitDistances=false
):RuleResult{
 if(!validRoom(room))return {status:'invalid',reason:'room dimensions must be within 2.0–12.0m'}
 if(bed.widthCm===null||bed.lengthCm===null)
  return {status:'unknown',reason:'bed width or length not defined; RG-1 cannot verify fit'}
 if(!Number.isFinite(bed.widthCm)||!Number.isFinite(bed.lengthCm)||bed.widthCm<=0||bed.lengthCm<=0)
  return {status:'invalid',reason:'bed dimensions must be positive'}
 // 0.5m free space around each tested footprint, without relocating furniture.
 const minWidth=bed.widthCm/100+1
 const minDepth=bed.lengthCm/100+1
 if(minWidth>room.widthMeters||minDepth>room.depthMeters)
  return {status:'invalid',reason:`bed does not fit in ${room.widthMeters.toFixed(1)}m × ${room.depthMeters.toFixed(1)}m room`}
 // The 3m and optional 5m cues lack a shared measured origin and direction.
 // Even if the depth exceeds either cue, simultaneous fit cannot be proven;
 // do not treat their approximate positions as measured coordinates.
 if(checkImplicitDistances&&IMPLICIT_DISTANCES.personToBedCm>0&&IMPLICIT_DISTANCES.optionalCouchCm>0)
  return {status:'unknown',reason:'implicit distances pending PR8'}
 if(pose.widthCm===null||pose.lengthCm===null)
  return {status:'unknown',reason:'pose footprint width or length not defined; RG-1 cannot verify fit'}
 if(!Number.isFinite(pose.widthCm)||!Number.isFinite(pose.lengthCm)||pose.widthCm<=0||pose.lengthCm<=0)
  return {status:'invalid',reason:'pose footprint dimensions must be positive'}
 // Conservative adjacent placement on the anchored bed side, or at its foot.
 const sideWidth=bed.widthCm/100+pose.widthCm/100+1
 const sideDepth=Math.max(bed.lengthCm,pose.lengthCm)/100+1
 const footWidth=Math.max(bed.widthCm,pose.widthCm)/100+1
 const footDepth=bed.lengthCm/100+pose.lengthCm/100+1
 if((sideWidth<=room.widthMeters&&sideDepth<=room.depthMeters)||
    (footWidth<=room.widthMeters&&footDepth<=room.depthMeters))return {status:'valid'}
 return {status:'invalid',reason:`bed and pose do not fit in ${room.widthMeters.toFixed(1)}m × ${room.depthMeters.toFixed(1)}m room`}
}

/**
 * RG-2: a right-wall wardrobe mirror must fit its real wall length.
 * A missing width from PR7a cannot be guessed. 'invalid' wins for a
 * known oversized width.
 * Test: src/tests/room-geometry-pr7b.test.ts (RG-2 positive/negative/unknown).
 */
export function mirrorReachability(room:RoomDimensions,mirror:MirrorPlacement):RuleResult{
 if(!validRoom(room))return {status:'invalid',reason:'room dimensions must be within 2.0–12.0m'}
 if(mirror.widthCm===null)
  return {status:'unknown',reason:'mirror width not defined; RG-2 cannot verify fit'}
 if(!Number.isFinite(mirror.widthCm)||mirror.widthCm<=0)
  return {status:'invalid',reason:'mirror width must be positive'}
 const wallLengthMeters=mirror.wall==='left'||mirror.wall==='right'?room.depthMeters:room.widthMeters
 if(mirror.widthCm/100>wallLengthMeters)
  return {status:'invalid',reason:'mirror wider than available '+mirror.wall+' wall'}
 return {status:'valid'}
}

/**
 * RG-3: real ceiling fixtures need at least 2.2m of room height.
 * This does not modify or choose PR2 light sources or judge aesthetics.
 * Test: src/tests/room-geometry-pr7b.test.ts (RG-3 positive/negative).
 */
export function lightingReachability(room:RoomDimensions,lightingPreset:string):RuleResult{
 if(!validRoom(room))return {status:'invalid',reason:'room dimensions must be within 2.0–12.0m'}
 const ceiling=lightingPreset==='led_spotlight'
 if(ceiling&&room.heightMeters<2.2)
  return {status:'invalid',reason:'ceiling light requires room height at least 2.2m'}
 return {status:'valid'}
}

/** Deterministic local decision only; no invalid custom dimensions are filled in. */
export function deriveRoomGeometry(
 options:RoomOptions,poseId:string,activeLighting:string,standingMirror=false
):RoomGeometry|null{
 const room=resolvedRoomDimensions(options)
 if(!room)return null
 const presetId=options.roomSizePreset||'medium_bedroom'
 const pose=POSE_FOOTPRINTS_CM2[poseId as PoseId]
 const geometry:RoomGeometry={
  ...room,presetId,
  userConfirmed:presetId==='custom'?true:options.roomSizeConfirmed===true,
  bedFitValid:fitWithinRoom(
   {widthCm:BED_WIDTH_CM,lengthCm:BED_LENGTH_CM},
   pose?{widthCm:pose.widthCm,lengthCm:pose.lengthCm}:{widthCm:null,lengthCm:null},
   room,standingMirror
  ),
  mirrorFitValid:mirrorReachability(room,{wall:'right',widthCm:MIRROR_WIDTH_CM}),
  lightingFitValid:lightingReachability(room,activeLighting)
 }
 return geometry
}
export type RoomIssue=Extract<RuleResult,{status:'unknown'|'invalid'}>
export function roomGeometryIssues(geometry:RoomGeometry):RoomIssue[]{
 return [geometry.bedFitValid,geometry.mirrorFitValid,geometry.lightingFitValid]
  .filter((x):x is RoomIssue=>x.status!=='valid')
}
/**
 * New immutable metadata section only. Existing source prompt sections and
 * local compiler output remain untouched; editorial assembly uses these bytes.
 */
export function renderRoomGeometry(geometry:RoomGeometry):string{
 const dims=`${geometry.widthMeters.toFixed(1)}m × ${geometry.depthMeters.toFixed(1)}m × ${geometry.heightMeters.toFixed(1)}m`
 return 'ROOM GEOMETRY (LOCAL USER OPTIONS): '+geometry.presetId+'; dimensions '+dims+
  '; room size '+(geometry.userConfirmed?'user-confirmed':'assumed, awaiting confirmation')+
  '. Preserve these exact local room dimensions. No model-inferred measurements.'
}
