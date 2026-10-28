
import { CompilationContext, CompilationResult, ValidationResult } from '../domain/types'
import { getShotPosture } from '../data/bedroom-shots'
import { validateContext } from './validate'
import { resolveContext } from './resolve'
import { renderSections } from './render'
import { stripInternalMetadata } from './strip'
import { compressSections } from './compress'
import { assemblePrompt } from './assemble'
import { validateFinalRealism } from './final-realism'

export function compilePrompt(ctx: CompilationContext): { validation: ValidationResult, result: CompilationResult } {
  // select is implicit in validate/resolve
  const matchedPosture = ctx.bedroomShotId ? getShotPosture(ctx.bedroomShotId) : undefined
  // One authority: a selected shot determines the anatomical posture.
  const synchronized = matchedPosture ? { ...ctx, poseId: matchedPosture } : ctx
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
