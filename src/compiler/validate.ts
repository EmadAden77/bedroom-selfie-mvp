
import { CompilationContext, ValidationResult } from '../domain/types'
import { hairVariants } from '../data/hair'
import { realismPresets } from '../data/realism-intensity'
import { hairDirections,hairVolumes,hairTextures } from '../data/hair-advanced'
import { expressionVariants, deferredCompositeStates } from '../data/expressions'
import { gazeChoices, microChoices } from '../data/gaze-micro'
import { poseOptions, faceOptions, lampSideOptions } from '../data/light-geometry'
import { bedroomShots } from '../data/bedroom-shots'
import {evaluatePhysicalReality} from '../engine/physical-reality'
import { nightLightingPresets } from '../data/night-lighting'
import { garmentRecords, garmentStates, fitProfiles } from '../data/clothing'

export function validateContext(ctx: CompilationContext): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (ctx.realismIntensity && !realismPresets.some(p=>p.id===ctx.realismIntensity)) errors.push('Invalid realism intensity')
  if (ctx.bedroomClutterId && !['reference','lived_in_messy'].includes(ctx.bedroomClutterId)) errors.push('Invalid bedroom clutter appearance')
  if (ctx.promptTarget && !['gemini','chatgpt','flux','midjourney'].includes(ctx.promptTarget)) errors.push('Invalid image prompt target')
  if (ctx.hairstyleMode && !['preserve','apply'].includes(ctx.hairstyleMode)) errors.push('Invalid hairstyle mode')
  if (ctx.hairDirection && !hairDirections.some(x=>x.id===ctx.hairDirection)) errors.push('Invalid hair direction')
  if (ctx.hairVolume && !hairVolumes.some(x=>x.id===ctx.hairVolume)) errors.push('Invalid hair volume')
  if (ctx.hairTexture && !hairTextures.some(x=>x.id===ctx.hairTexture)) errors.push('Invalid hair texture')
  // Hair single selection
  if (!ctx.hairVariantId) {
    errors.push('Hair variant required')
  } else if (!hairVariants.some(h => h.id === ctx.hairVariantId)) {
    errors.push(`Hair variant invalid: ${ctx.hairVariantId}`)
  }

  if(ctx.gazeId && !gazeChoices.some(v=>v.id===ctx.gazeId)) errors.push('Invalid gaze selection')
  if(ctx.microExpressionId && !microChoices.some(v=>v.id===ctx.microExpressionId)) errors.push('Invalid micro-expression selection')
  // Expression single selection
  if (!ctx.expressionVariantId) {
    errors.push('Expression variant required')
  } else if (deferredCompositeStates.some(d => d.id === ctx.expressionVariantId)) {
    errors.push(`Expression ${ctx.expressionVariantId} is Deferred Composite State and not selectable - light_fatigue is not available in pure expressions`)
  } else if (!expressionVariants.some(e => e.id === ctx.expressionVariantId)) {
    errors.push(`Expression variant invalid: ${ctx.expressionVariantId}`)
  }

  // Upper required
  if (!ctx.upperGarmentId) {
    errors.push('القطعة العلوية مطلوبة - Upper garment is required')
  } else {
    const upper = garmentRecords.find(g => g.id === ctx.upperGarmentId && g.category === 'upper')
    if (!upper) {
      errors.push(`Upper garment invalid: ${ctx.upperGarmentId}`)
    } else {
      // reference_garment_preserved locked
      if (upper.id === 'reference_garment_preserved') {
        if (ctx.materialId !== upper.defaultMaterial) {
          errors.push('reference_garment_preserved cannot change material - locked to observed material')
        }
        if (ctx.fitId !== upper.defaultFit) {
          errors.push('reference_garment_preserved cannot change fit - locked to observed fit')
        }
        if (ctx.color !== upper.defaultColor) {
          errors.push('reference_garment_preserved cannot change color - locked to observed color')
        }
        if (ctx.stateId !== upper.defaultState) {
          errors.push('reference_garment_preserved must be observed_natural_state')
        }
        if (ctx.surface !== upper.defaultSurface) {
          errors.push('reference_garment_preserved cannot change surface - locked')
        }
      }

      // Ribbed requires rib_knit
      if (ctx.surface === 'ribbed' && ctx.materialId !== 'rib_knit') {
        errors.push('Ribbed surface requires rib_knit material')
      }
      if (ctx.lowerGarmentId && ctx.lowerSurface === 'ribbed' && (ctx.lowerMaterialId || garmentRecords.find(g => g.id === ctx.lowerGarmentId)?.defaultMaterial) !== 'rib_knit') {
        errors.push('Ribbed lower surface requires rib_knit material')
      }

      // Fitted and oversized not in same garment
      if ((upper.id === 'oversized_sleep_tshirt' && ctx.fitId === 'fitted') ||
          (upper.id === 'fitted_stretch_tshirt' && ctx.fitId === 'oversized') ||
          (upper.defaultFit === 'oversized' && ctx.fitId === 'fitted') ||
          (upper.defaultFit === 'fitted' && ctx.fitId === 'oversized')) {
        errors.push('Fitted و Oversized لا يجتمعان في قطعة واحدة')
      }

      // Compatibility of material with garment
      if (upper.allowedMaterials && !upper.allowedMaterials.includes(ctx.materialId) && upper.id !== 'reference_garment_preserved') {
        warnings.push(`Material ${ctx.materialId} may not be compatible with ${upper.id}`)
      }
    }
  }

  // Lower optional
  if (ctx.lowerGarmentId) {
    const lower = garmentRecords.find(g => g.id === ctx.lowerGarmentId && g.category === 'lower')
    if (!lower) {
      errors.push(`Lower garment must be category lower: ${ctx.lowerGarmentId}`)
    }
  }

  // State checks
  const state = garmentStates.find(s => s.id === ctx.stateId)
  if (!state) {
    errors.push(`State invalid: ${ctx.stateId}`)
  } else {
    if (state.id === 'slept_in') {
      warnings.push('حالة slept_in تتطلب سياق نوم صريح')
    }
    if (state.id === 'lightly_damp') {
      warnings.push('حالة lightly_damp تتطلب طلب صريح')
    }
  }

  // Fit exists
  if (!fitProfiles.some(f => f.id === ctx.fitId)) {
    errors.push(`Fit invalid: ${ctx.fitId}`)
  }

  const lighting = nightLightingPresets.find(p => p.id === (ctx.nightLightingId || 'phone_screen_only'))
  if (!lighting) errors.push('Night lighting preset invalid')
  if (lighting?.requiresOpenWindow && !ctx.windowUncovered) errors.push('Streetlight requires an uncovered window and open curtains')

  if (!poseOptions.some(p=>p.id===(ctx.poseId || 'seated_bed'))) errors.push('Invalid pose geometry')
  if (!faceOptions.some(p=>p.id===(ctx.faceDirectionId || 'toward_camera'))) errors.push('Invalid face direction')
  if (!lampSideOptions.some(p=>p.id===(ctx.lampSideId || 'left'))) errors.push('Invalid lamp side')

  if (ctx.bedroomShotId) {
    const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
    if (!shot) errors.push('Unknown bedroom shot')
    if (shot?.requires==='openCurtains' && !ctx.windowUncovered) errors.push('Curtain shadow shot requires uncovered window')
    if (shot?.requires==='sideLight' && !['bedside_warm','lamp_and_screen','hallway_spill','window_streetlight'].includes(ctx.nightLightingId||'phone_screen_only')) errors.push('Half-lit face requires an actual off-axis source')
    if (shot?.id==='mirror_rear_flash' && ctx.nightLightingId!=='rear_flash') errors.push('Rear flash mirror shot requires rear_flash lighting')
    if (shot?.id==='silhouette' && !['bedside_warm','television_screen','sunset_projector'].includes(ctx.nightLightingId||'phone_screen_only')) errors.push('Silhouette needs an actual brighter source behind the subject')
    if (shot?.mode==='mirror' && ctx.nightLightingId==='phone_screen_only') warnings.push('Mirror selfie may be severely underexposed with phone screen only')
  }

  const reality=evaluatePhysicalReality(ctx)
  errors.push(...reality.findings.filter(item=>item.status==='CONFLICT').map(item=>item.reason))
  warnings.push(...reality.findings.filter(item=>item.status==='WARNING').map(item=>item.reason))
  return { isValid: errors.length === 0, errors, warnings }
}
