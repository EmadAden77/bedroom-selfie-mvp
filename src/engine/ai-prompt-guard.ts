/**
 * A bounded AI enhancement layer. Gemini may select only these reviewed
 * photographic details; it cannot rewrite identity, furniture, exposure,
 * clothing, anatomy or camera geometry in the canonical local prompt.
 */
export type CaptureMode = 'front' | 'mirror' | 'rear' | 'timer'

export const PROMPT_HINTS = {
  quiet_framing: 'Preserve the chosen crop and camera viewpoint with ordinary handheld framing imprecision, without forced symmetry. Never extend the real field of view to reveal additional room furniture.',
  consistent_sensor: 'Apply modest phone sensor texture, local sharpness and compression consistently across the person and the room, without separately retouching the face.',
  real_cloth: 'Keep micro-folds and textile tension tied to actual shoulder, elbow, waist and fabric-contact forces; preserve the chosen garment design.',
  natural_expression: 'Retain minor everyday facial-muscle asymmetry and ordinary eye focus without changing reference anatomy, age, expression selection or facial features.',
  real_white_balance: 'Use an everyday automatic white balance response to the already selected practical lighting, without creating any new source, bright wall glow or artificial fill.',
  mirror_optics: 'Check that the single visible rear-camera handset and its grip lie on the same real reflected ray path as the subject; respect natural glass-edge cropping and occlusion.',
  bed_pressure: 'Maintain the existing bedding count and arrangement; allow contact-driven local compression and wrinkles only where this body actually loads the mattress or pillows.',
  timer_stability: 'Keep the recording phone on its real stable timer support; allow hands to act freely without inventing a photographer or a handheld recording arm.'
} as const

export type PromptHintId = keyof typeof PROMPT_HINTS
const DEFAULT_IDS: PromptHintId[] = [
  'quiet_framing', 'consistent_sensor', 'real_cloth', 'natural_expression', 'real_white_balance'
]

export function eligibleHintIds(mode: CaptureMode, posture: string): PromptHintId[] {
  const allowed: PromptHintId[] = [...DEFAULT_IDS]
  if (mode === 'mirror') allowed.push('mirror_optics')
  if (mode === 'timer') allowed.push('timer_stability')
  if (['seated_bed','reclined_pillows','side_lying_right','side_lying_left','supine','prone'].includes(posture)) {
    allowed.push('bed_pressure')
  }
  return allowed
}

export function parseHintSelection(modelText: string, allowedIds: readonly PromptHintId[]): PromptHintId[] {
  let parsed: unknown
  try { parsed = JSON.parse(modelText.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '')) }
  catch { throw new Error('The AI model did not return valid structured output') }
  if (!parsed || typeof parsed !== 'object' || !('ids' in parsed) || !Array.isArray(parsed.ids)) {
    throw new Error('The AI model response did not contain a selection')
  }
  const allowed = new Set<string>(allowedIds)
  const selected: PromptHintId[] = []
  for (const id of parsed.ids as unknown[]) {
    if (typeof id === 'string' && allowed.has(id) && !selected.includes(id as PromptHintId)) {
      selected.push(id as PromptHintId)
    }
    if (selected.length === 3) break
  }
  if (selected.length === 0) throw new Error('The AI model selected no safe enhancements')
  return selected
}

export function buildEnhancedPrompt(basePrompt: string, selected: readonly PromptHintId[]): string {
  if (typeof basePrompt !== 'string' || !basePrompt.trim()) throw new Error('A valid local prompt is required')
  if (!selected.length || selected.some(id=>!(id in PROMPT_HINTS))) throw new Error('Enhancements must be selected from the approved catalog')
  return basePrompt.trim() + '\n\nPHOTOGRAPHIC NATURALNESS REFINEMENT (subject to all original identity, room, pose, camera and lighting constraints): ' +
    selected.map(id=>PROMPT_HINTS[id]).join(' ')
}
