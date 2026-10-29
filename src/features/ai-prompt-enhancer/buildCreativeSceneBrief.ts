/**
 * User choice summary for Gemini creative writing. Do not hand the model the
 * compiled local fallback: it contains long repetitive rule sets by design.
 * No private reference image files are transferred by this helper.
 */
import type {CompilationContext} from '../../domain/types'
import {hairVariants} from '../../data/hair'
import {expressionVariants} from '../../data/expressions'
import {garmentRecords,materialProfiles,fitProfiles,garmentStates} from '../../data/clothing'
import {nightLightingPresets} from '../../data/night-lighting'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
import {realismPresets} from '../../data/realism-intensity'

const selected=<T extends {id:string}>(items:readonly T[],id:string|undefined)=>items.find(x=>x.id===id)
const plain=(id:string|undefined)=>id?.replace(/_/g,' ')||''

export function buildCreativeSceneBrief(ctx:CompilationContext):string{
 const shot=selected(bedroomShots,ctx.bedroomShotId)
 const hair=selected(hairVariants,ctx.hairVariantId)
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
  'Capture method: '+(shot?.mode||'front')+' smartphone camera.',
  'Scene choice: '+(shot?.description||plain(ctx.poseId)||'a plausible natural bedroom pose')+'.',
  'Body posture: '+plain(shot?getShotPosture(shot.id):ctx.poseId)+'.',
  'Expression: '+(face?.observableFacialConfiguration||'natural relaxed expression')+'.',
  'Hair: '+(hair?.observableConfig||'real hair texture')+
    '; style '+plain(ctx.hairstyleMode)+'; direction '+plain(ctx.hairDirection)+
    '; volume '+plain(ctx.hairVolume)+'; strand texture '+plain(ctx.hairTexture)+'.',
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
  'Subject image reference: '+(ctx.referenceImagePresent?'provided separately to the final image generator; Gemini does not receive or see it':'not supplied')+'.',
  'Bedroom image reference: '+(ctx.roomReferencePresent?'provided separately to the final image generator; Gemini does not receive or see it':'not supplied')+'.',
  'Treat these selections as scene guidance, not as literal wording or an instruction to append legacy locks. Freely invent believable everyday photographic details while staying within real physics.'
 ]
 return details.join('\n')
}
