
import { CompilationContext, CompilationResult, ValidationResult } from '../domain/types'
import {effectivePhysicalContext} from './physical-reality'
import { validateContext } from '../compiler/validate'
import { resolveContext } from '../compiler/resolve'
import { renderSections } from '../compiler/render'
import { stripInternalMetadata } from '../compiler/strip'
import { compressSections } from '../compiler/compress'
import { assemblePrompt } from '../compiler/assemble'
import { validateFinalRealism } from '../compiler/final-realism'

/** Local scene construction orchestrator. Rules and rendering stay in their existing modules. */
export function constructScene(ctx: CompilationContext): { validation: ValidationResult, result: CompilationResult } {
  // select is implicit in validate/resolve
  const synchronized=effectivePhysicalContext(ctx)
  const validation = validateContext(synchronized)
  // Invalid selections are never silently rewritten into a plausible prompt.
  if (!validation.isValid) {
    return { validation, result: { promptText: '', sections: [], completedModules: [], pendingModules: [], errors: [...validation.errors], warnings: [...validation.warnings] } }
  }
  const resolved = resolveContext(synchronized)
  const rendered = renderSections(resolved)
  const stripped = stripInternalMetadata(rendered)
  const compressed = compressSections(stripped)
  const result = assemblePrompt(compressed)
  const finalCheck = validateFinalRealism(synchronized, compressed)
  validation.errors.push(...finalCheck.errors)
  validation.warnings.push(...finalCheck.warnings)
  validation.isValid = validation.errors.length === 0

  // Merge validation errors into result errors
  result.errors = [...validation.errors, ...result.errors]
  result.warnings = [...validation.warnings, ...result.warnings]
  if (result.errors.length > 0) {
    validation.isValid = false
    result.promptText = ''
  }

  return { validation, result }
}
