import type {CompilationContext} from '../domain/types'
import {hairVariants} from './hair'
import {hairDirections,hairVolumes,hairTextures} from './hair-advanced'

/** Gemini receives the selected styling intent, never the local fallback prompt. */
export function buildHairCreativeBrief(ctx:CompilationContext):string{
 const applying=ctx.hairstyleMode==='apply' && ctx.hairVariantId!=='reference_natural_dry'
 const style=hairVariants.find(x=>x.id===ctx.hairVariantId)
 if(!applying||!style){
  return 'Hair styling: PRESERVE the hairstyle visible in the subject reference, including its current strand arrangement, natural hairline and volume. No new styling is requested.'
 }
 const effects:Record<string,string>={
  natural_slightly_tousled:'Rearrange small existing strand groups into a subtly but visibly less ordered silhouette, with genuine irregular spacing and a few loose flyaways.',
  neatly_combed:'Align the actual top strands into a distinctly tidy, coherent combed flow and organized parting that differs visibly from the reference arrangement.',
  slightly_damp:'Make existing strands appear lightly damp with modest natural grouping, reduced lift and restrained surface shine; keep the true curl pattern.',
  wind_blown_natural:'Give existing strands a modest directional ruffled arrangement consistent with recent movement; no perpetual indoor wind or invented airflow source.',
  just_woke_up_messy:'Show believable sleep-displaced strands: localized flattened areas and irregular modest crown lift, using only available hair.',
  low_volume_natural:'Lay existing top strands closer to the scalp, reducing the apparent silhouette height without removing hair or exposing invented scalp.'
 }
 const direction=hairDirections.find(x=>x.id===(ctx.hairDirection||'auto'))?.text
 const volume=hairVolumes.find(x=>x.id===(ctx.hairVolume||'auto'))?.text
 const texture=hairTextures.find(x=>x.id===(ctx.hairTexture||'auto'))?.text
 const controls=[direction,volume,texture].filter(Boolean)
 return [
  'Hair styling: APPLY the selected hairstyle as an observable change to the reference strand arrangement.',
  'Selected style: '+style.observableConfig+'.',
  effects[style.id]||'Reposition the existing strands into the chosen style.',
  ...controls,
  'Appearance priority: depict the new strand direction, grouping and silhouette clearly rather than copying the reference hairstyle unchanged.',
  'Identity priority: preserve the exact original hairline, temple recession, density map, available length, natural curl/fiber texture, color, head geometry and facial identity. Move existing strands only; do not grow, thicken, transplant or hide sparse regions.',
  ctx.promptTarget==='chatgpt'
   ? 'ChatGPT / GPT Image: the reference photo fixes the PERSON, not the prior strand arrangement. Explicitly show this selected restyling in the final rendered image while keeping its real hair limits.'
   : 'The hairstyle choice must remain visible in the image despite use of the identity reference.'
 ].join(' ')
}
