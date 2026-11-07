import type {CompilationContext} from '../domain/types'
import {deriveBodyScene} from './body-mechanics'
import {DEFAULT_BEDDING_SELECTION,evaluateBedding,renderBedding} from '../../shared/bedding-physics'
export {DEFAULT_BEDDING_SELECTION,evaluateBedding,renderBedding}
export type {BeddingState,BeddingSelection,BeddingIssue} from '../../shared/bedding-physics'
export function deriveBeddingScene(ctx:CompilationContext){
 return evaluateBedding(deriveBodyScene(ctx),ctx.beddingSelection||DEFAULT_BEDDING_SELECTION)
}
export function renderValidatedBedding(ctx:CompilationContext):string{
 return renderBedding(deriveBeddingScene(ctx))
}
