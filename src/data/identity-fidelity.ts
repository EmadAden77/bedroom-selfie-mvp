import type { CompilationContext } from '../domain/types'

/** Reference authority is isolated from pose, lighting, styling and room changes. */
export function renderIdentityFidelity(ctx: CompilationContext): string {
 const applying=(ctx.hairstyleMode || 'preserve')==='apply' && ctx.hairVariantId!=='reference_natural_dry'
 const hairRule=applying
   ? 'The selected styling may move existing strands visibly. Preserve the original hairline contour, natural temple recession, density map, hair color and underlying texture; a changed strand arrangement is not a changed identity.'
   : 'Keep the reference hairstyle and its strand arrangement natural, with no new cut, invented hairline, added density, or altered hair color.'
 const expressionRule=ctx.expressionVariantId==='reference_expression_preserved'
   ? 'Keep the expression seen in the identity reference.'
   : 'Only the selected transient facial expression may move eyelids, brows, cheeks and lips through realistic muscle action; permanent facial anatomy stays fixed.'
 const target=(ctx.promptTarget || 'gemini')==='chatgpt'
   ? 'ChatGPT reference priority: Treat the attached subject photo as the source of facial anatomy. Style instructions must never overwrite the face. Reconstruct unchanged distinctive features even when hair styling, viewpoint and lighting change.'
   : 'Gemini reference priority: Keep recognizable facial anatomy and age continuity with the attached subject reference while allowing the selected styling and expression.'
 return [
   'IDENTITY FIDELITY ENGINE: The subject reference photo defines the same adult individual across every shot. Preserve skull proportions, forehead, brow ridge, eye size and spacing, eyelid folds, nose bridge tip and nostril shape, lip contours, cheekbones, jaw, chin, ears, skin tone, apparent age, beard and mustache pattern, and natural left-right asymmetry.',
   'Retain natural skin texture, facial pores, fine creases and unretouched detail. Avoid face beautification, artificial symmetry, youth alteration, reshaped nose, enlarged eyes, changed jawline, synthetic beard edges and skin smoothing.',
   hairRule,
   expressionRule,
   'Different camera angles, illumination and pillow pressure alter the appearance of surfaces and temporary soft-tissue contact only. Never reconstruct a different person. The room reference is authoritative for surroundings, never the subject face.',
   target
 ].join(' ')
}
