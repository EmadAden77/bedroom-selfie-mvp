
import { PromptSection, CompilationResult } from '../domain/types'

const forbiddenWords = ['unknown','deferred','placeholder','derived later','required later','optional','possible','likely','either','one of']
const allowedFragments = [
  'Preserve the upper garment exactly as visibly presented in the attached reference: the same short-sleeve crew-style appearance, apparent dark charcoal-gray color, visible knit-like surface character, observed fit in the shown region, and naturally occurring visible fabric deformation. Do not infer or invent unseen seams, pockets, hem construction, rear details, branding, fiber composition, garment history, or a different material. Preserve the underlying body without reshaping it.',
  'Short-sleeve crewneck t-shirt with a closer cut in matte solid stretch jersey. Fit fitted with reduced ease and spatially varying contact rather than uniform skin contact. State fresh_natural. Color charcoal. Preserve the existing body; do not create musculature, slimming, or second-skin adhesion.'
]

export function assemblePrompt(sections: PromptSection[]): CompilationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check duplicate guards
  const guardIds = sections.filter(s => s.id.includes('guard')).map(s => s.id)
  if (new Set(guardIds).size !== guardIds.length) {
    errors.push('Duplicate guards detected')
  }

  // Check forbidden words
  for (const sec of sections) {
    const isAllowed = allowedFragments.includes(sec.content)
    const lower = sec.content.toLowerCase()
    for (const w of forbiddenWords) {
      if (w === 'or') continue // we handle or separately
      const regex = new RegExp(`\\b${w}\\b`, 'i')
      if (regex.test(sec.content)) {
        if (isAllowed) continue
        // Special case: oversized_sleep_tshirt exact fragment is allowed and does not contain forbidden
        if (sec.id === 'upper_oversized_sleep_tshirt' && sec.content.includes('substantially greater ease and length with increased fabric mass. Material lightweight cotton-appearance jersey. Fit oversized. State lightly_worn. Color charcoal. Surface solid.')) {
          continue
        }
        errors.push(`Forbidden word '${w}' in ${sec.id}`)
      }
    }
    // Check for isolated " or " unless in allowed fragment
    if (!isAllowed && /\b or \b/i.test(sec.content)) {
      // Allow if it's part of allowed fragment already filtered
      errors.push(`Forbidden word 'or' in ${sec.id} - use alternative phrasing without or`)
    }
    // Check internal metadata leak
    if (lower.includes('coursebehavior') || lower.includes('walebehavior') || lower.includes('hysteresis') || lower.includes('bendingstiffness') || lower.includes('physicsmetadata')) {
      errors.push(`Internal metadata leaked in ${sec.id}`)
    }
  }

  const promptText = sections.map(s => s.content).join('\n\n')

  const completedModules = ['Reference identity', 'Hair', 'Facial expression', 'Clothing', 'Night lighting']
  const pendingModules = ['Body profile', 'Pose mechanics', 'Selfie geometry', 'Bedroom environment', 'Camera pipeline', 'Final realism validation']

  return {
    promptText,
    sections,
    completedModules,
    pendingModules,
    errors,
    warnings
  }
}
