import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'
import {captureLightingIssuesCore} from '../../shared/physical-reality-core.mjs'

/** Shared capture/light invariants for local compiler and Vercel, same runtime rules. */
export function captureLightingIssues(ctx:Pick<CompilationContext,'bedroomShotId'|'nightLightingId'>):string[]{
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 return captureLightingIssuesCore(shot?.id||ctx.bedroomShotId||'',shot?.mode||'front',ctx.nightLightingId||'phone_screen_only')
}

/** Selection changes are explicit: report conflicts, never silently switch a shot or light. */
export function reconcileCaptureSelection(previous:CompilationContext,patch:Partial<CompilationContext>):CompilationContext{
 return {...previous,...patch}
}
