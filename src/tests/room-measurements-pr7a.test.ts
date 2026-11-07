import {describe,expect,it} from 'vitest'
import {poseOptions} from '../data/light-geometry'
import {shotPostures} from '../../shared/body-shot-postures'
import {compilePrompt} from '../compiler'
import type {CompilationContext} from '../domain/types'
import {
 BED_LENGTH_CM,BED_WIDTH_CM,MIRROR_WIDTH_CM,POSE_FOOTPRINTS_CM2,
 IMPLICIT_DISTANCES,MEASUREMENT_SOURCES
} from '../../shared/room-measurements'

describe('PR7a: sourced measurement inventory (no new geometry validation)',()=>{
 it('preserves exact documented bed dimensions with a nonempty provenance string',()=>{
  expect(BED_WIDTH_CM).toBe(160)
  expect(BED_LENGTH_CM).toBe(200)
  expect(MEASUREMENT_SOURCES.bedWidthCm).toContain('src/data/bedroom-shots.ts')
  expect(MEASUREMENT_SOURCES.bedLengthCm).toContain('src/data/bedroom-shots.ts')
  for(const src of [MEASUREMENT_SOURCES.bedWidthCm,MEASUREMENT_SOURCES.bedLengthCm]){
   expect(src.trim().length).toBeGreaterThan(0)
   expect(src).toContain('160 by 200 cm')
  }
 })
 it('does not invent a wardrobe mirror width from unmeasured geometry',()=>{
  expect(MIRROR_WIDTH_CM).toBeNull()
  expect(MEASUREMENT_SOURCES.mirrorWidthCm).toBe('unmeasured')
 })
 it('covers EVERY existing PoseId and canonical shot posture, with explicitly unknown footprints',()=>{
  const ids=poseOptions.map(p=>p.id).sort()
  const registered=Object.keys(POSE_FOOTPRINTS_CM2).sort()
  expect(registered).toEqual(ids)
  for(const posture of Object.values(shotPostures)){
   expect(registered).toContain(posture)
  }
  for(const [id,footprint] of Object.entries(POSE_FOOTPRINTS_CM2)){
   expect(id.length).toBeGreaterThan(0)
   expect(footprint.source.trim().length).toBeGreaterThan(0)
   expect(footprint.source).toBe('unmeasured')
   expect(footprint.lengthCm).toBeNull()
   expect(footprint.widthCm).toBeNull()
  }
  expect(MEASUREMENT_SOURCES.poseFootprints).toBe('unmeasured')
 })
 it('documents the unchanged approximate depth cues and source for every scalar constant',()=>{
  expect(IMPLICIT_DISTANCES).toEqual({personToBedCm:300,optionalCouchCm:500})
  expect(MEASUREMENT_SOURCES.personToBedCm).toContain('src/data/mirror-room-geometry.ts')
  expect(MEASUREMENT_SOURCES.optionalCouchCm).toContain('src/data/mirror-room-geometry.ts')
  for(const [name,source] of Object.entries(MEASUREMENT_SOURCES)){
   expect(name.length).toBeGreaterThan(0)
   expect(source.trim().length).toBeGreaterThan(0)
   expect(source==='unmeasured'||source.includes('src/data/')).toBe(true)
  }
 })
 it('regression: existing compiled MIRROR PROMPT STILL CONTAINS the 3m and optional 5m cues',()=>{
  const ctx:CompilationContext={
   hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
   upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
   materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
   stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
   surface:'apparent knit-like surface character',referenceImagePresent:true,
   roomReferencePresent:true,bedroomShotId:'mirror_rear_flash',
   poseId:'standing',nightLightingId:'ceiling_neutral',
   phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY'
  }
  const {result,validation}=compilePrompt(ctx)
  expect(validation.isValid).toBe(true)
  expect(result.errors).toEqual([])
  expect(result.promptText.length).toBeGreaterThan(100)
  expect(result.promptText).toContain('roughly 3-metre')
  expect(result.promptText).toContain('5-metre depth landmark')
  // The couch remains explicitly conditional, not invented as furniture.
  expect(result.promptText).toContain('only if physically confirmed')
 })
})
