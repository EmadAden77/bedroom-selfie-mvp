/** Shared capture/light invariants. Do not alter a user-selected emitter. */
export const mirrorRearFlashNeedsSource=(shotId:string|undefined,lighting:string):boolean=>
 shotId==='mirror_rear_flash'&&lighting!=='camera_flash'
export const captureAllowsRearFlash=(mode:string|undefined):boolean=>
 mode==='rear'||mode==='mirror'
export const rearCaptureScreenOnlyConflict=(mode:string|undefined,lighting:string):boolean=>
 lighting==='phone_screen'&&mode==='rear'
