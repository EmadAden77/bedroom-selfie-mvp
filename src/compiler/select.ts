
import { CompilationContext } from '../domain/types'
import { hairVariants } from '../data/hair'
import { expressionVariants } from '../data/expressions'
import { garmentRecords } from '../data/clothing'

export function selectVariants(ctx: CompilationContext) {
  const hair = hairVariants.find(h => h.id === ctx.hairVariantId)
  const expression = expressionVariants.find(e => e.id === ctx.expressionVariantId)
  const upper = garmentRecords.find(g => g.id === ctx.upperGarmentId && g.category === 'upper')
  const lower = ctx.lowerGarmentId ? garmentRecords.find(g => g.id === ctx.lowerGarmentId && g.category === 'lower') : null
  return { hair, expression, upper, lower }
}
