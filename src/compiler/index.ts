
import { CompilationContext, CompilationResult, ValidationResult } from '../domain/types'
import { validateContext } from './validate'
import { resolveContext } from './resolve'
import { renderSections } from './render'
import { stripInternalMetadata } from './strip'
import { compressSections } from './compress'
import { assemblePrompt } from './assemble'

export function compilePrompt(ctx: CompilationContext): { validation: ValidationResult, result: CompilationResult } {
  // select is implicit in validate/resolve
  const validation = validateContext(ctx)
  // Invalid selections are never silently rewritten into a plausible prompt.
  if (!validation.isValid) {
    return { validation, result: { promptText: '', sections: [], completedModules: [], pendingModules: [], errors: [...validation.errors], warnings: [...validation.warnings] } }
  }
  const resolved = resolveContext(ctx)
  const rendered = renderSections(resolved)
  const stripped = stripInternalMetadata(rendered)
  const compressed = compressSections(stripped)
  const result = assemblePrompt(compressed)

  // Merge validation errors into result errors
  result.errors = [...validation.errors, ...result.errors]
  result.warnings = [...validation.warnings, ...result.warnings]

  return { validation, result }
}
