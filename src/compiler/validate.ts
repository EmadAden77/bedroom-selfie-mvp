import type {CompilationContext,ValidationResult} from '../domain/types'
import {evaluatePhysicalReality} from '../engine/physical-reality'

/** All deterministic selection conflicts use the same portable physics/catalog rules
 * in the browser and the constrained Gemini server. Missing evidence is non-blocking.
 * The separate final-realism compiler audit still validates rendered scene sections.
 */
export function validateContext(ctx:CompilationContext):ValidationResult{
 const report=evaluatePhysicalReality(ctx)
 const errors=report.findings.filter(item=>item.status==='CONFLICT').map(item=>item.reason)
 const warnings=report.findings.filter(item=>item.status==='WARNING').map(item=>item.reason)
 return {isValid:errors.length===0,errors,warnings}
}
