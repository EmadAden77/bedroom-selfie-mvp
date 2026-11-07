export function captureLightingIssuesCore(shotId:string,mode:string,lighting:string):string[]
export type SharedScene={
 mode:string;shotId:string;nightLightingId:string;windowUncovered?:boolean;
 upperGarmentId:string;materialId:string;fitId:string;stateId:string;color:string;surface:string;
 lowerGarmentId?:string;lowerMaterialId?:string;lowerSurface?:string;
 mirrorMovementId?:string;mirrorPhoneHeightId?:string;mirrorDistanceId?:string;
 mirrorFramingId?:string;mirrorGazeId?:string;
 roomPhysicalState?:{order:string;surface:string;zones:string[];sessionLocked:boolean}|null
}
export type SharedFinding={id:string;status:'CONFLICT';category:'lighting'|'geometry'|'biomechanics'|'clothing'|'room';
 fields:string[];reason:string;repair:string}
export function inspectSharedScene(s:SharedScene):SharedFinding[]
export const MIRROR_FIXED_ACTION_SHOTS:readonly string[]
export const MIRROR_FIXED_HEIGHT:Readonly<Record<string,string>>
export const MIRROR_FIXED_DISTANCE:Readonly<Record<string,string>>
export const MIRROR_FIXED_GAZE:Readonly<Record<string,string>>
export const MIRROR_ENUMS:Readonly<Record<string,readonly string[]>>
export const REFERENCE_UPPER_LOCK:Readonly<Record<string,string>>
