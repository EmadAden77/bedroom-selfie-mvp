import {describe,it,expect} from 'vitest'
import {PHYSICAL_OPTION_IDS,PHYSICAL_SHOT_MODES,PHYSICAL_SHOT_POSTURES,PHYSICAL_GARMENTS,DEFERRED_EXPRESSION_IDS} from '../../shared/physical-choice-catalog.mjs'
import {hairVariants} from '../data/hair'
import {expressionVariants,deferredCompositeStates} from '../data/expressions'
import {garmentRecords,garmentStates,materialProfiles,fitProfiles,garmentSurfaceChoices} from '../data/clothing'
import {hairDirections,hairVolumes,hairTextures} from '../data/hair-advanced'
import {gazeChoices,microChoices} from '../data/gaze-micro'
import {poseOptions,faceOptions,lampSideOptions} from '../data/light-geometry'
import {realismPresets} from '../data/realism-intensity'
import {nightLightingPresets} from '../data/night-lighting'
import {bedroomShots,shotPostures} from '../data/bedroom-shots'
import {mirrorMovements,mirrorPhoneHeights,mirrorDistances,mirrorFramings,mirrorGazes} from '../data/mirror-controls'
import {OPTION_REGISTRY} from '../engine/physical-reality'
const ids=(items:readonly {id:string}[])=>items.map(x=>x.id)
describe('Browser and Vercel trusted option catalogue drift guard',()=>{
 it('requires all existing dropdown choices to match the portable runtime exactly',()=>{
  const expected={
   hairVariantId:ids(hairVariants),hairstyleMode:['preserve','apply'],
   hairDirection:ids(hairDirections),hairVolume:ids(hairVolumes),hairTexture:ids(hairTextures),
   promptTarget:['gemini','chatgpt','flux','midjourney'],realismIntensity:ids(realismPresets),
   expressionVariantId:ids(expressionVariants),gazeId:ids(gazeChoices),microExpressionId:ids(microChoices),
   upperGarmentId:ids(garmentRecords.filter(x=>x.category==='upper')),
   lowerGarmentId:['',...ids(garmentRecords.filter(x=>x.category==='lower'))],
   materialId:ids(materialProfiles),fitId:ids(fitProfiles),stateId:ids(garmentStates),
   surface:ids(garmentSurfaceChoices),lowerSurface:ids(garmentSurfaceChoices),
   nightLightingId:ids(nightLightingPresets),poseId:ids(poseOptions),
   faceDirectionId:ids(faceOptions),lampSideId:ids(lampSideOptions),
   bedroomShotId:['',...ids(bedroomShots)],mirrorMovementId:ids(mirrorMovements),
   mirrorPhoneHeightId:ids(mirrorPhoneHeights),mirrorDistanceId:ids(mirrorDistances),
   mirrorFramingId:ids(mirrorFramings),mirrorGazeId:ids(mirrorGazes),
   lowerMaterialId:ids(materialProfiles),lowerFitId:ids(fitProfiles),lowerStateId:ids(garmentStates),
   bedroomClutterId:['reference','lived_in_messy']
  }
  expect(PHYSICAL_OPTION_IDS).toEqual(expected)
  for(const [field,values] of Object.entries(PHYSICAL_OPTION_IDS)){
   expect(OPTION_REGISTRY[field as keyof typeof OPTION_REGISTRY].values).toEqual(values)
  }
  expect(DEFERRED_EXPRESSION_IDS).toEqual(ids(deferredCompositeStates))
 })
 it('checks every shot camera mode and required posture without silently inventing a new capture type',()=>{
  const modes=Object.fromEntries(bedroomShots.map(x=>[x.id,x.mode]))
  expect(PHYSICAL_SHOT_MODES).toEqual(modes)
  expect(PHYSICAL_SHOT_POSTURES).toEqual(shotPostures)
  expect(Object.keys(PHYSICAL_SHOT_POSTURES)).toHaveLength(bedroomShots.length)
 })
 it('requires source garment categories, default profiles and material constraints to match',()=>{
  const garments=Object.fromEntries(garmentRecords.map(x=>[x.id,{
   category:x.category,defaultMaterial:x.defaultMaterial,defaultFit:x.defaultFit,
   allowedMaterials:x.allowedMaterials
  }]))
  expect(PHYSICAL_GARMENTS).toEqual(garments)
 })
})
