import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'
import {captureLightingIssuesCore} from '../../shared/physical-reality-core.mjs'

/** Shared capture/light invariants for local compiler and Vercel, same runtime rules. */
export function captureLightingIssues(ctx:Pick<CompilationContext,'bedroomShotId'|'nightLightingId'>):string[]{
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 return captureLightingIssuesCore(shot?.id||ctx.bedroomShotId||'',shot?.mode||'front',ctx.nightLightingId||'phone_screen_only')
}

/** Preserve explicit user lighting choices, except incompatible flash-pose lock. */
export function reconcileCaptureSelection(previous:CompilationContext,patch:Partial<CompilationContext>):CompilationContext{
 const next={...previous,...patch}
 if('nightLightingId' in patch&&previous.bedroomShotId==='mirror_rear_flash'&&next.nightLightingId!=='rear_flash'&&!('bedroomShotId' in patch)){
  next.bedroomShotId='mirror_wardrobe'
  next.poseId='standing'
 }
 return next
}
