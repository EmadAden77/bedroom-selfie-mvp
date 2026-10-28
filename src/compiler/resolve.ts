
import { CompilationContext } from '../domain/types'
import { garmentRecords } from '../data/clothing'

export function resolveContext(ctx: CompilationContext): CompilationContext {
  const upper = garmentRecords.find(g => g.id === ctx.upperGarmentId)
  if (!upper) return ctx

  let resolved = { ...ctx }

  // If reference preservation, lock to observed values
  if (upper.isReferencePreservation) {
    resolved = {
      ...resolved,
      materialId: upper.defaultMaterial,
      fitId: upper.defaultFit,
      stateId: upper.defaultState,
      color: upper.defaultColor,
      surface: upper.defaultSurface
    }
  }

  // Resolve lower if present
  if (resolved.lowerGarmentId) {
    const lower = garmentRecords.find(g => g.id === resolved.lowerGarmentId)
    if (lower) {
      if (!resolved.lowerMaterialId) resolved.lowerMaterialId = lower.defaultMaterial
      if (!resolved.lowerFitId) resolved.lowerFitId = lower.defaultFit
      if (!resolved.lowerStateId) resolved.lowerStateId = lower.defaultState
      if (!resolved.lowerColor) resolved.lowerColor = lower.defaultColor
      if (!resolved.lowerSurface) resolved.lowerSurface = lower.defaultSurface
    }
  }

  return resolved
}
