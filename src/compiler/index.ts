import type {CompilationContext,CompilationResult,ValidationResult} from '../domain/types'
import {constructScene} from '../engine/scene-construction'

/** Legacy API boundary kept stable for every existing caller. No scene decisions here. */
export function compilePrompt(ctx:CompilationContext):{validation:ValidationResult,result:CompilationResult}{
 return constructScene(ctx)
}
