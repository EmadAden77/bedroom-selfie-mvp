/**
 * PR7b-1: an explicit, scene-bound acknowledgement of unmeasured geometry.
 * Acknowledgement changes AUTHORITY STATUS, never physical rule results.
 * No unmeasured number is inferred; the existing RG predicates are untouched.
 * Tests: src/tests/room-provisional-pr7b1.test.ts(x).
 */
import type {RoomGeometry} from './room-geometry-rules.ts'
import {POSE_FOOTPRINTS_CM2,MIRROR_WIDTH_CM,type PoseId} from './room-measurements.ts'

export type RoomAcknowledgement={
 accepted:true
 sceneIntegrity:string
 measurements:string[]
}
export type RoomAuditEntry={
 event:'ROOM_MEASUREMENTS_ACKNOWLEDGED'
 confirmedAt:string
 actor:'interactive_user_unverified'
 actorVerified:false
 sceneIntegrity:string
 unverifiedMeasurements:string[]
}

/**
 * Naming is independent of RG-1 priority: implicit-distance uncertainty
 * must NEVER hide the missing pose footprint. RG-2 owns mirror width.
 */
export function unverifiedRoomMeasurements(room:RoomGeometry,posture:string):string[]{
 const gaps:string[]=[]
 if(!room.userConfirmed)gaps.push('Room size: preset not user-confirmed')
 const pose=POSE_FOOTPRINTS_CM2[posture as PoseId]
 if(!pose||pose.lengthCm===null||pose.widthCm===null)
  gaps.push('Pose footprint: unmeasured')
 if(MIRROR_WIDTH_CM===null)
  gaps.push('Mirror width: unmeasured')
 if(room.bedFitValid.status==='unknown'&&room.bedFitValid.reason.includes('implicit distances'))
  gaps.push('Implicit distances: pending PR8')
 for(const [name,result] of [
  ['RG-1',room.bedFitValid],['RG-2',room.mirrorFitValid],['RG-3',room.lightingFitValid]
 ] as const){
  if(result.status==='unknown'&&!(
   (name==='RG-1'&&(result.reason.includes('pose footprint')||result.reason.includes('implicit distances')))||
   (name==='RG-2'&&result.reason.includes('mirror width'))
  ))gaps.push(name+': '+result.reason)
 }
 return gaps
}

/** Only a full, explicitly accepted, non-stale inventory can grant promotion. */
export function validateRoomAcknowledgement(
 input:unknown,sceneIntegrity:string,expectedGaps:readonly string[]
):void{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('ROOM_UNVERIFIED')
 const ack=input as Record<string,unknown>
 if(Object.keys(ack).sort().join(',')!=='accepted,measurements,sceneIntegrity'||
    ack.accepted!==true||ack.sceneIntegrity!==sceneIntegrity||
    !Array.isArray(ack.measurements)||
    ack.measurements.length!==expectedGaps.length||
    ack.measurements.some((v,i)=>v!==expectedGaps[i]))
  throw Error('ROOM_ACK_INVALID')
}

/** Produced exclusively on a successful server-side authorization. */
export function makeRoomAuditEntry(
 sceneIntegrity:string,unverifiedMeasurements:readonly string[],confirmedAt:string
):RoomAuditEntry{
 return {
  event:'ROOM_MEASUREMENTS_ACKNOWLEDGED',confirmedAt,
  // No login identity system exists. NEVER imply an authenticated real person.
  actor:'interactive_user_unverified',actorVerified:false,
  sceneIntegrity,unverifiedMeasurements:[...unverifiedMeasurements]
 }
}
