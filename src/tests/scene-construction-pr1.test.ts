/** Pre-PR1 compiler orchestration copied from main@32a2d6abefaa0bd0a5e376958d2dfc5ab775fef5.
 * Freeze this reference independently of the refactored engine to prove exact behavior parity.
 */
import {describe,it,expect} from 'vitest'
import {compilePrompt} from '../compiler'
import {constructScene} from '../engine/scene-construction'

import { CompilationContext, CompilationResult, ValidationResult } from '../domain/types'
import {effectivePhysicalContext} from '../engine/physical-reality'
import { validateContext } from '../compiler/validate'
import { resolveContext } from '../compiler/resolve'
import { renderSections } from '../compiler/render'
import { stripInternalMetadata } from '../compiler/strip'
import { compressSections } from '../compiler/compress'
import { assemblePrompt } from '../compiler/assemble'
import { validateFinalRealism } from '../compiler/final-realism'


function compileBeforePr1(ctx: CompilationContext): { validation: ValidationResult, result: CompilationResult } {
  // select is implicit in validate/resolve
  const synchronized=effectivePhysicalContext(ctx)
  const validation = validateContext(synchronized)
  // Invalid selections are never silently rewritten into a plausible prompt.
  if (!validation.isValid) {
    return { validation, result: { promptText: '', sections: [], completedModules: [], pendingModules: [], errors: [...validation.errors], warnings: [...validation.warnings] } }
  }
  const resolved = resolveContext(synchronized)
  const rendered = renderSections(resolved)
  const stripped = stripInternalMetadata(rendered)
  const compressed = compressSections(stripped)
  const result = assemblePrompt(compressed)
  const finalCheck = validateFinalRealism(synchronized, compressed)
  validation.errors.push(...finalCheck.errors)
  validation.warnings.push(...finalCheck.warnings)
  validation.isValid = validation.errors.length === 0

  // Merge validation errors into result errors
  result.errors = [...validation.errors, ...result.errors]
  result.warnings = [...validation.warnings, ...result.warnings]
  if (result.errors.length > 0) {
    validation.isValid = false
    result.promptText = ''
  }

  return { validation, result }
}

const baseline:CompilationContext={
 hairVariantId:'reference_natural_dry', expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 poseId:'seated_bed',bedroomShotId:'bed_edge',nightLightingId:'phone_screen_only'
}
const cases:[string,Partial<CompilationContext>][]=[
 ['front camera + phone-screen-only lighting',{bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'phone_screen_only',phoneOnlyIlluminationMode:'OFF'}],
 ['exclusive mirror rear flash + saved ceiling preference',{bedroomShotId:'mirror_rear_flash',poseId:'standing',nightLightingId:'ceiling_neutral',phoneOnlyIlluminationMode:'DARK_ROOM_REAR_FLASH_ONLY'}],
 ['regular wardrobe mirror + neutral ceiling lighting',{bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral',phoneOnlyIlluminationMode:'OFF'}],
 ['laptop typing with timer + laptop screen light',{bedroomShotId:'laptop_edge_typing_timer',poseId:'seated_bed',nightLightingId:'laptop_screen_only',phoneOnlyIlluminationMode:'OFF'}]
]
describe('PR1 local scene-construction boundary — exact baseline behavior',()=>{
 it.each(cases)('%s: byte-identical output and repeat determinism',(name,patch)=>{
  const input:CompilationContext={...baseline,...patch}
  const originalInput=structuredClone(input)
  const before=compileBeforePr1(input)
  const after=compilePrompt(input)
  const direct=constructScene(input)
  expect(before.validation.isValid).toBe(true)
  expect(before.result.promptText.length).toBeGreaterThan(100)
  expect(after.result.promptText).toBe(before.result.promptText)
  expect(after.result.sections).toEqual(before.result.sections)
  expect(after.result.warnings).toEqual(before.result.warnings)
  expect(after.result.errors).toEqual(before.result.errors)
  expect(after.validation.warnings).toEqual(before.validation.warnings)
  expect(after.validation.errors).toEqual(before.validation.errors)
  expect(JSON.stringify(after)).toBe(JSON.stringify(before))
  expect(JSON.stringify(direct)).toBe(JSON.stringify(before))
  const repeat=compilePrompt(structuredClone(input))
  expect(JSON.stringify(repeat)).toBe(JSON.stringify(after))
  expect(input).toEqual(originalInput)
 })
})
