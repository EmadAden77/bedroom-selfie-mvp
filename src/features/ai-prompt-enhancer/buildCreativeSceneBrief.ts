/**
 * User choice summary for Gemini creative writing. Do not hand the model the
 * compiled local fallback: it contains long repetitive rule sets by design.
 * No private reference image files are transferred by this helper.
 */
import type {CompilationContext} from '../../domain/types'
import {buildHairCreativeBrief} from '../../data/hair-creative'
import {expressionVariants} from '../../data/expressions'
import {garmentRecords,materialProfiles,fitProfiles,garmentStates} from '../../data/clothing'
import {nightLightingPresets} from '../../data/night-lighting'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
import {realismPresets} from '../../data/realism-intensity'
import {buildMirrorGeminiBrief} from '../../data/mirror-controls'
import {buildMirrorFlashGeminiBrief} from '../../data/mirror-flash-physics'
import {buildBedroomClutterGeminiBrief} from '../../data/bedroom-clutter'
import {buildLaptopGeminiBrief} from '../../data/laptop-selfie-physics'
import {buildNaturalSceneDirection} from './natural-scene-director'

const isSelectedLaptop=(id:string)=>id.startsWith('laptop_')&&id!=='laptop_reflection'
const selected=<T extends {id:string}>(items:readonly T[],id:string|undefined)=>items.find(x=>x.id===id)
const plain=(id:string|undefined)=>id?.replace(/_/g,' ')||''

export function buildCreativeSceneBrief(ctx:CompilationContext):string{
 const shot=selected(bedroomShots,ctx.bedroomShotId)
 const face=selected(expressionVariants,ctx.expressionVariantId)
 const upper=selected(garmentRecords,ctx.upperGarmentId)
 const lower=selected(garmentRecords,ctx.lowerGarmentId||undefined)
 const light=selected(nightLightingPresets,ctx.nightLightingId)
 const mood=selected(realismPresets,ctx.realismIntensity)
 const material=selected(materialProfiles,ctx.materialId)
 const lowerMaterial=selected(materialProfiles,ctx.lowerMaterialId)
 const fit=selected(fitProfiles,ctx.fitId)
 const lowerFit=selected(fitProfiles,ctx.lowerFitId)
 const garmentState=selected(garmentStates,ctx.stateId)
 const lowerState=selected(garmentStates,ctx.lowerStateId)
 const upperDescription=upper?.isReferencePreservation
   ? 'upper garment as shown in the subject reference, if one is supplied to the image generator'
   : upper ? upper.englishName.replace(/_/g,' ') : 'casual everyday shirt'
 const lowerDescription=lower?.isReferencePreservation
   ? 'lower garment as shown in the subject reference, if visible'
   : lower ? lower.englishName.replace(/_/g,' ') : 'natural everyday lower clothing'

 const details=[
  'Photograph concept: a real adult person taking an authentic everyday bedroom selfie.',
  'Capture method: '+(shot?.mode==='mirror'?'Xiaomi 15 Ultra rear-camera mirror selfie; the real phone screen faces its holder':shot?.mode==='rear'?'Xiaomi 15 Ultra handheld rear-camera photograph':shot?.mode==='timer'?'Xiaomi 15 Ultra on stable timer support, facing the subject':'Xiaomi 15 Ultra front-camera handheld selfie')+'. No invented device, exact focal length or floating viewpoint.',
  'Scene choice: '+(shot?.description||plain(ctx.poseId)||'a plausible natural bedroom pose')+'.',
  'Body posture: '+plain(shot?getShotPosture(shot.id):ctx.poseId)+'.',
  buildNaturalSceneDirection(ctx),
  'Expression: '+(face?.observableFacialConfiguration||'natural relaxed expression')+'.',
  buildHairCreativeBrief(ctx),
  'Upper clothing: '+upperDescription+
    '; '+(material?.englishName||'')+'; '+(fit?.englishName||'')+
    '; '+(garmentState?.englishName?.replace(/_/g,' ')||'')+
    '; color '+(ctx.color||'as selected')+'; fabric '+(ctx.surface||'natural')+'.',
  'Lower clothing: '+lowerDescription+
    (lower?'; '+(lowerMaterial?.englishName||'')+'; '+(lowerFit?.englishName||'')+
      '; '+(lowerState?.englishName?.replace(/_/g,' ')||'')+
      '; color '+(ctx.lowerColor||'as selected')+'; fabric '+(ctx.lowerSurface||'natural'):'')+'.',
  'Real-world illumination choice: '+(light?.id||'natural')+
    '. '+(light?.description||'Only plausible real room light sources.')+'.',
  'Gaze '+plain(ctx.gazeId)+'; face direction '+plain(ctx.faceDirectionId)+
    '; subtle expression '+plain(ctx.microExpressionId)+'.',
  'Photographic mood '+(mood?.id||'natural')+'.',
  ...(ctx.roomPhysicalState||ctx.bedroomClutterId==='lived_in_messy'?[buildBedroomClutterGeminiBrief(ctx)]:[]),
  ...(shot&&isSelectedLaptop(shot.id)?[buildLaptopGeminiBrief(ctx)]:[]),
  'Subject image reference: '+(ctx.referenceImagePresent?'provided separately to the final image generator; Gemini does not receive or see it':'not supplied')+'.',
  'Bedroom image reference: '+(ctx.roomReferencePresent?'provided separately to the final image generator; Gemini does not receive or see it':'not supplied')+'.',
  ...(shot?.mode==='mirror'?[buildMirrorGeminiBrief(ctx)]:[]),
  ...(shot?.mode==='mirror'&&ctx.nightLightingId==='rear_flash'?[buildMirrorFlashGeminiBrief(ctx)]:[]),
  'Treat these selections as scene guidance, not literal text to paste. Express the selected candid moment naturally; only improvise details that do not add new identifiable objects, furniture, lighting or facial anatomy. Subject and room references outrank generic scene defaults, and real physics constrains all visible actions.'
 ]
 return details.join('\n')
}
