
import { CompilationContext, PromptSection } from '../domain/types'
import { hairIdentityGuard, facialIdentityGuard, clothingOutputGuard, referenceIdentityFragment } from '../data/identity'
import { hairVariants } from '../data/hair'
import { expressionVariants } from '../data/expressions'
import { renderCameraPhysics } from '../data/camera-physics'
import { renderBedroomEnvironment } from '../data/bedroom-environment'
import { renderLightGeometry } from '../data/light-geometry'
import { bedroomShots,renderBedroomShot } from '../data/bedroom-shots'
import { nightLightingPresets } from '../data/night-lighting'
import { garmentRecords, materialProfiles, fitProfiles, garmentStates } from '../data/clothing'

export function renderSections(ctx: CompilationContext): PromptSection[] {
  const sections: PromptSection[] = []

  // 1. Reference identity - must be first
  sections.push({ id: 'reference_identity', content: referenceIdentityFragment })

  // 2. Hair identity guard
  sections.push({ id: 'hair_identity_guard', content: hairIdentityGuard.fragment })

  // 3. Hair variant
  const applyHair = (ctx.hairstyleMode || 'preserve') === 'apply'
  const hair = hairVariants.find(h => h.id === (applyHair ? ctx.hairVariantId : 'reference_natural_dry'))
  if (hair) {
    if (applyHair && hair.id !== 'reference_natural_dry') {
      sections.push({ id: 'hairstyle_application', content: 'Apply the selected hairstyle visibly. Preserve the original hairline, total density, natural hair color, underlying texture, skull shape and facial identity. Redirect existing hair strands with realistic gravity and volume. The reference strand arrangement is not locked when applying the chosen style.' })
    }
    sections.push({ id: `hair_${hair.id}`, content: hair.renderableFragment })
  }

  // 4. Facial identity guard
  sections.push({ id: 'facial_identity_guard', content: facialIdentityGuard.fragment })

  // 5. Expression variant
  const expr = expressionVariants.find(e => e.id === ctx.expressionVariantId)
  if (expr) {
    sections.push({ id: `expression_${expr.id}`, content: expr.renderableFragment })
  }

  // 6. Upper garment
  const upper = garmentRecords.find(g => g.id === ctx.upperGarmentId && g.category === 'upper')
  if (upper) {
    let fragment = ''
    if (upper.renderableFragmentExact) {
      fragment = upper.renderableFragmentExact
    } else {
      const mat = materialProfiles.find(m => m.id === ctx.materialId)?.englishName || ctx.materialId.replace(/_/g, ' ')
      const fit = fitProfiles.find(f => f.id === ctx.fitId)?.englishName || ctx.fitId
      const state = garmentStates.find(s => s.id === ctx.stateId)?.englishName || ctx.stateId
      const color = ctx.color
      const surface = ctx.surface

      // Build based on garment type without using "or" word
      const templates: Record<string,string> = {
        regular_crewneck_tshirt: `Short-sleeve crewneck t-shirt with crew neckline and moderate ease. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        relaxed_crewneck_tshirt: `Short-sleeve crewneck t-shirt with greater ease. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        lightweight_long_sleeve_lounge_top: `Long-sleeve lounge top with crew neckline. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        relaxed_sleep_tshirt: `Sleep t-shirt with crew neckline and greater ease. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        oversized_sleep_tshirt: `Sleep t-shirt with crew neckline and substantially greater ease and length with increased fabric mass. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        lightweight_hoodie: `Long-sleeve hooded sweatshirt with attached two-layer hood with real thickness and stitching and drawstrings present, long sleeves with ribbed cuffs, ribbed hem, kangaroo pocket present. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        knit_pajama_top: `Knit pajama top with relaxed drape. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        woven_button_front_pajama_top: `Woven button-front pajama top with front buttons. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
      }
      fragment = templates[upper.id] || `Upper garment ${upper.englishName}. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`
    }
    sections.push({ id: `upper_${upper.id}`, content: fragment })
  }

  // 7. Lower garment optional
  if (ctx.lowerGarmentId) {
    const lower = garmentRecords.find(g => g.id === ctx.lowerGarmentId && g.category === 'lower')
    if (lower) {
      const mat = materialProfiles.find(m => m.id === (ctx.lowerMaterialId || lower.defaultMaterial))?.englishName || (ctx.lowerMaterialId || lower.defaultMaterial).replace(/_/g,' ')
      const fit = fitProfiles.find(f => f.id === (ctx.lowerFitId || lower.defaultFit))?.englishName || (ctx.lowerFitId || lower.defaultFit)
      const state = garmentStates.find(s => s.id === (ctx.lowerStateId || lower.defaultState))?.englishName || (ctx.lowerStateId || lower.defaultState)
      const color = ctx.lowerColor || lower.defaultColor
      const surface = ctx.lowerSurface || lower.defaultSurface
      const lowerTemplates: Record<string,string> = {
        lounge_shorts: `Lounge shorts with relaxed ease. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        lightweight_sweatpants: `Lightweight sweatpants with relaxed ease. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
        simple_pajama_trousers: `Simple pajama trousers with relaxed drape. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`,
      }
      const lf = lowerTemplates[lower.id] || `Lower garment ${lower.englishName}. Material ${mat}. Fit ${fit}. State ${state}. Color ${color}. Surface ${surface}.`
      sections.push({ id: `lower_${lower.id}`, content: lf })
    }
  }

  // 8. Clothing output guard - must be last
  sections.push({ id: 'clothing_output_guard', content: clothingOutputGuard.fragment })

  const lighting = nightLightingPresets.find(p => p.id === (ctx.nightLightingId || 'phone_screen_only'))
  if (lighting) sections.push({ id: `night_lighting_${lighting.id}`, content: 'Night bedroom lighting: ' + lighting.renderableFragment })

  sections.push({ id: 'bedroom_environment_lock', content: renderBedroomEnvironment(ctx) })
  sections.push({ id: 'light_pose_geometry', content: renderLightGeometry(ctx) })
  sections.push({ id: 'camera_physics', content: renderCameraPhysics(ctx) })

  if (ctx.bedroomShotId) {
    const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
    if (shot) sections.push({id:'bedroom_shot_'+shot.id,content:renderBedroomShot(shot)})
  }
  if ((ctx.promptTarget || 'gemini') === 'chatgpt' && (ctx.hairstyleMode || 'preserve') === 'apply' && ctx.hairVariantId !== 'reference_natural_dry') {
    sections.push({ id: 'chatgpt_hairstyle_priority', content: 'ChatGPT hairstyle priority: The selected hairstyle must visibly change the direction, arrangement and silhouette of existing strands compared with the reference hairstyle. The selected style takes precedence over the reference strand arrangement only. Keep the facial identity, skull, hairline, hair density, hair color and original strand texture unchanged. Do not simply reproduce the original hairstyle.' })
  }
  return sections
}
