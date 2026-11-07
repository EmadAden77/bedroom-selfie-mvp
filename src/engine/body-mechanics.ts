import type {CompilationContext} from '../domain/types'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {evaluateBodyMechanics,renderBodyMechanics,type BodyMechanicalInput} from '../../shared/body-mechanics'
export {evaluateBodyMechanics,renderBodyMechanics}
export type {BodyMechanicalState,BodyStatus,BodyIssue,ContactRelation} from '../../shared/body-mechanics'

/** Adapt existing user controls to the shared, authoritative normalized body contract. */
export function normalizeBodyInput(ctx:CompilationContext):BodyMechanicalInput{
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 return {
  shotId:shot?.id||'',posture:shot?(getShotPosture(shot.id)||''):ctx.poseId||'',
  capture:shot?.mode||'front',
  holdingHand:ctx.bodyHoldingHand||'auto',
  supportChoice:ctx.bodySupportChoice||'auto',
  freeHandTask:ctx.bodyFreeHandTask||'auto',
  feetVisibility:ctx.bodyFeetVisibility||'unknown'
 }
}
export function deriveBodyScene(ctx:CompilationContext){
 return evaluateBodyMechanics(normalizeBodyInput(ctx))
}
export function renderValidatedBodyScene(ctx:CompilationContext):string{
 return renderBodyMechanics(deriveBodyScene(ctx))
}
