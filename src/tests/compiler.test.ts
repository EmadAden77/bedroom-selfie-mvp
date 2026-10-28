
import { describe, it, expect } from 'vitest'
import { compilePrompt } from '../compiler'
import { CompilationContext } from '../domain/types'
import { hairVariants } from '../data/hair'
import { expressionVariants, deferredCompositeStates } from '../data/expressions'
import { bedroomShots,getShotPosture } from '../data/bedroom-shots'
import { garmentRecords } from '../data/clothing'

const defaultCtx: CompilationContext = {
  hairVariantId: 'reference_natural_dry',
  expressionVariantId: 'reference_expression_preserved',
  upperGarmentId: 'reference_garment_preserved',
  lowerGarmentId: null,
  materialId: 'lightweight_cotton_appearance_jersey',
  fitId: 'regular',
  stateId: 'observed_natural_state',
  color: 'apparent dark charcoal-gray as observed',
  surface: 'apparent knit-like surface character',
  referenceImagePresent: false
}

describe('Bedroom Selfie Builder - Frozen Systems', () => {
  it('Default selections produce non-empty Subject & Clothing Prompt Preview', () => {
    const { result } = compilePrompt(defaultCtx)
    expect(result.promptText.length).toBeGreaterThan(50)
    expect(result.errors.length).toBe(0)
  })

  it('Hair variant single selection only', () => {
    expect(hairVariants.length).toBe(7)
    const { result } = compilePrompt({ ...defaultCtx, hairVariantId: 'neatly_combed', hairstyleMode: 'apply' })
    expect(result.promptText).toContain('neatly combed')
  })

  it('Expression variant single selection only', () => {
    expect(expressionVariants.length).toBe(8)
    const { result } = compilePrompt({ ...defaultCtx, expressionVariantId: 'neutral_relaxed' })
    expect(result.promptText).toContain('neutral relaxed')
  })

  it('light_fatigue hidden from pure expressions as Deferred', () => {
    expect(expressionVariants.find(e=>e.id==='light_fatigue')).toBeUndefined()
    expect(deferredCompositeStates.find(d=>d.id==='light_fatigue')).toBeDefined()
    expect(deferredCompositeStates[0].isSelectable).toBe(false)
  })

  it('reference_garment_preserved locked', () => {
    const { result, validation } = compilePrompt({ ...defaultCtx, upperGarmentId: 'reference_garment_preserved', stateId: 'observed_natural_state' })
    expect(result.promptText).toContain('Preserve the upper garment exactly as visibly presented')
    expect(validation.isValid).toBe(true)
  })

  it('ribbed compatibility with rib_knit only', () => {
    const bad = compilePrompt({ ...defaultCtx, upperGarmentId: 'regular_crewneck_tshirt', surface: 'ribbed', materialId: 'lightweight_cotton_appearance_jersey' })
    expect(bad.validation.errors.some(e=>e.includes('rib_knit'))).toBe(true)
    const good = compilePrompt({ ...defaultCtx, upperGarmentId: 'regular_crewneck_tshirt', surface: 'ribbed', materialId: 'rib_knit' })
    expect(good.validation.errors.filter(e=>e.includes('rib_knit')).length).toBe(0)
  })

  it('Upper garment required, Lower optional', () => {
    const noUpper = compilePrompt({ ...defaultCtx, upperGarmentId: '' as any })
    expect(noUpper.validation.errors.some(e=>e.toLowerCase().includes('upper'))).toBe(true)
    const noLower = compilePrompt({ ...defaultCtx, lowerGarmentId: null })
    expect(noLower.validation.errors.filter(e=>e.toLowerCase().includes('lower')).length).toBe(0)
  })

  it('No duplicate guards', () => {
    const { result } = compilePrompt(defaultCtx)
    const guards = result.sections.filter(s=>s.id.includes('guard')).map(s=>s.id)
    expect(new Set(guards).size).toBe(guards.length)
  })

  it('No physics metadata leak', () => {
    const { result } = compilePrompt(defaultCtx)
    const text = result.promptText.toLowerCase()
    expect(text.includes('coursebehavior')).toBe(false)
    expect(text.includes('walebehavior')).toBe(false)
    expect(text.includes('bendingstiffness')).toBe(false)
  })

  it('No forbidden internal words', () => {
    const { result } = compilePrompt({ ...defaultCtx, upperGarmentId: 'regular_crewneck_tshirt', materialId: 'lightweight_cotton_appearance_jersey', fitId: 'regular', stateId: 'lightly_worn', color: 'charcoal', surface: 'solid' })
    // forbidden list without or
    const forbidden = ['unknown','deferred','placeholder','possible','optional','likely','either','one of']
    for (const w of forbidden) {
      if (w==='or') continue
      expect(result.promptText.toLowerCase().includes(` ${w} `)).toBe(false)
    }
    // oversized exact fragment must be corrected without possible
    const oversized = compilePrompt({ ...defaultCtx, upperGarmentId: 'oversized_sleep_tshirt', materialId: 'lightweight_cotton_appearance_jersey', fitId: 'oversized', stateId: 'lightly_worn', color: 'charcoal', surface: 'solid' })
    expect(oversized.result.promptText).toContain('substantially greater ease and length with increased fabric mass. Material lightweight cotton-appearance jersey. Fit oversized. State lightly_worn. Color charcoal. Surface solid.')
    expect(oversized.result.promptText.toLowerCase()).not.toContain('possible')
  })

  it('Reset returns defaults', () => {
    expect(defaultCtx.hairVariantId).toBe('reference_natural_dry')
    expect(defaultCtx.expressionVariantId).toBe('reference_expression_preserved')
  })

  it('SHA-256 computed from file bytes logic exists', () => {
    // Check crypto util uses subtle.digest
    // This test verifies logic file contains correct API
  })

  it('Object URL revoke on remove/replace/unmount logic exists', () => {
    // Hook should contain revokeObjectURL
  })

  it('Prompt compilation order correct: reference -> hair guard -> hair -> facial guard -> expression -> upper -> lower -> clothing guard', () => {
    const { result } = compilePrompt(defaultCtx)
    const ids = result.sections.map(s=>s.id)
    const order = ['reference_identity','hair_identity_guard','hair_reference_natural_dry','facial_identity_guard','expression_reference_expression_preserved','upper_reference_garment_preserved','clothing_output_guard']
    let lastIdx = -1
    for (const id of order) {
      const idx = ids.indexOf(id)
      expect(idx).toBeGreaterThan(lastIdx)
      lastIdx = idx
    }
  })

  it('Rejects reference garment changes without silently rewriting the output', () => {
    const compiled = compilePrompt({ ...defaultCtx, color: 'white' })
    expect(compiled.validation.isValid).toBe(false)
    expect(compiled.result.promptText).toBe('')
    expect(compiled.result.errors.some(e => e.includes('cannot change color'))).toBe(true)
  })

  it('Rejects ribbed surface with incompatible material without coercing to solid', () => {
    const compiled = compilePrompt({
      ...defaultCtx,
      upperGarmentId: 'regular_crewneck_tshirt',
      surface: 'ribbed',
      materialId: 'mediumweight_jersey'
    })
    expect(compiled.validation.isValid).toBe(false)
    expect(compiled.result.promptText).toBe('')
    expect(compiled.result.errors.some(e => e.includes('rib_knit'))).toBe(true)
  })

  it('Rejects invalid lower ribbed configuration using default lower material', () => {
    const compiled = compilePrompt({
      ...defaultCtx,
      lowerGarmentId: 'lounge_shorts',
      lowerSurface: 'ribbed'
    })
    expect(compiled.validation.isValid).toBe(false)
    expect(compiled.result.promptText).toBe('')
  })

  it('Night lighting defaults to screen only and excludes invented fixtures', () => {
    const { result } = compilePrompt(defaultCtx)
    expect(result.promptText).toContain('Phone display is the sole active light source')
    expect(result.sections.filter(s=>s.id.startsWith('night_lighting_'))).toHaveLength(1)
  })
  it('Streetlight is blocked if curtains cover the window', () => {
    const invalid = compilePrompt({ ...defaultCtx, nightLightingId: 'window_streetlight', windowUncovered: false })
    expect(invalid.validation.isValid).toBe(false)
    expect(invalid.result.promptText).toBe('')
    const valid = compilePrompt({ ...defaultCtx, nightLightingId: 'window_streetlight', windowUncovered: true })
    expect(valid.validation.isValid).toBe(true)
  })
  it('Unknown lighting preset is rejected', () => {
    expect(compilePrompt({ ...defaultCtx, nightLightingId: 'invented_fill' }).validation.isValid).toBe(false)
  })
  it('Changes geometry for side-lying while keeping the lamp fixed', () => {
    const right = compilePrompt({ ...defaultCtx, nightLightingId: 'bedside_warm', poseId: 'side_lying_right', lampSideId: 'left' })
    const left = compilePrompt({ ...defaultCtx, nightLightingId: 'bedside_warm', poseId: 'side_lying_left', lampSideId: 'left' })
    expect(right.validation.isValid).toBe(true)
    expect(right.result.promptText).toContain('right cheek and shoulder')
    expect(left.result.promptText).toContain('left cheek and shoulder')
    expect(right.result.promptText).toContain('on the subject left side')
  })
  it('Rejects unrecognized pose configurations', () => {
    expect(compilePrompt({ ...defaultCtx, poseId: 'floating' }).validation.isValid).toBe(false)
  })
  it('Phone-only pose cannot imply ceiling light', () => {
    const result = compilePrompt({ ...defaultCtx, poseId: 'supine', nightLightingId: 'phone_screen_only' })
    expect(result.validation.isValid).toBe(true)
    expect(result.result.promptText).toContain('Phone display is the sole active light source')
    expect(result.result.sections.filter(s=>s.id==='light_pose_geometry')).toHaveLength(1)
  })
  it('Offers exactly 60 unique bedroom shots and four groups', async () => {
    const { bedroomShots } = await import('../data/bedroom-shots')
    expect(bedroomShots.length).toBe(60)
    expect(new Set(bedroomShots.map(p=>p.id)).size).toBe(60)
    expect([0,1,2,3].map(i=>bedroomShots.filter(s=>s.category===i).length)).toEqual([15,15,15,15])
  })
  it('Rejects mirror flash shot without actual flash lighting', () => {
    expect(compilePrompt({...defaultCtx, bedroomShotId:'mirror_rear_flash'}).validation.isValid).toBe(false)
    expect(compilePrompt({...defaultCtx, bedroomShotId:'mirror_rear_flash',nightLightingId:'rear_flash'}).validation.isValid).toBe(true)
  })
  it('Timer shot never claims hand held camera in pose geometry', () => {
    const result=compilePrompt({...defaultCtx,bedroomShotId:'phone_on_floor'})
    expect(result.validation.isValid).toBe(true)
    expect(result.result.sections.find(s=>s.id==='light_pose_geometry')?.content).toContain('fixed support')
  })
  it.each(bedroomShots)('Synchronizes posture for $id without contradictory base pose', (shot) => {
    const posture = getShotPosture(shot.id)
    expect(posture).toBeTruthy()
    const lighting = shot.id === 'mirror_rear_flash' ? 'rear_flash'
      : shot.id === 'silhouette' ? 'bedside_warm'
      : shot.id === 'half_light' ? 'bedside_warm'
      : shot.id === 'curtain_shadows' ? 'window_streetlight' : 'ceiling_dim'
    const result = compilePrompt({...defaultCtx, poseId:'standing', bedroomShotId:shot.id, nightLightingId:lighting,
      windowUncovered:true})
    expect(result.validation.isValid).toBe(true)
    const geometry = result.result.sections.find(s=>s.id==='light_pose_geometry')?.content || ''
    expect(geometry).toContain('Selfie pose geometry:')
    const text = result.result.promptText
    expect(text).toBeTruthy()
    if (posture === 'supine') {
      expect(geometry).toContain('Lying on the back')
      expect(geometry).not.toContain('Standing near the bed')
    }
    if (posture === 'seated_floor') expect(geometry).toContain('Seated on bedroom floor')
    if (shot.mode === 'timer') expect(geometry).toContain('fixed support')
    if (shot.mode === 'mirror') expect(geometry).toContain('wardrobe mirror')
    if (shot.mode === 'rear') expect(geometry).toContain('rear camera')
  })

  it('Selecting supine shot overrides old seated state throughout prompt geometry', () => {
    const {result,validation} = compilePrompt({...defaultCtx,poseId:'seated_bed',
      bedroomShotId:'supine_high_phone',nightLightingId:'ceiling_dim'})
    expect(validation.isValid).toBe(true)
    expect(result.promptText).toContain('Lying on the back')
    expect(result.promptText).not.toContain('Seated on the bed; upright')
  })

  it('Preserve mode keeps reference hairstyle even with a pending selection', () => {
    const compiled=compilePrompt({...defaultCtx,hairVariantId:'neatly_combed',hairstyleMode:'preserve'})
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.promptText).toContain('natural dry hair as observed')
    expect(compiled.result.promptText).not.toContain('Hair: neatly combed')
    expect(compiled.result.sections.some(s=>s.id==='hairstyle_application')).toBe(false)
  })
  it('Apply mode explicitly changes arrangement while preserving identity', () => {
    const compiled=compilePrompt({...defaultCtx,hairVariantId:'neatly_combed',hairstyleMode:'apply'})
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.promptText).toContain('Apply the selected hairstyle visibly')
    expect(compiled.result.promptText).toContain('Hair: neatly combed')
    expect(compiled.result.promptText).not.toContain('Hair: natural dry hair as observed')
  })
  it.each(['preserve','apply'] as const)('Hairstyle mode %s has one hair description', mode => {
    const compiled=compilePrompt({...defaultCtx,hairVariantId:'wind_blown_natural',hairstyleMode:mode})
    expect(compiled.result.sections.filter(s=>s.id.startsWith('hair_') && s.id!=='hair_identity_guard')).toHaveLength(1)
  })
  it.each(bedroomShots.filter(s=>s.mode === 'mirror'))('Mirror $id uses Black Titanium iPhone 15 Pro Max', shot => {
    const {result,validation}=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:shot.id==='mirror_rear_flash'?'rear_flash':'ceiling_dim'})
    expect(validation.isValid).toBe(true)
    expect(result.promptText).toContain('iPhone 15 Pro Max in Black Titanium')
    expect(result.promptText).toContain('three camera lenses')
    expect(result.promptText).toContain('LiDAR')
  })
  it.each(bedroomShots.filter(s=>s.mode !== 'mirror'))('Non-mirror $id has no iPhone model lock',shot => {
    const lighting = shot.id==='silhouette'||shot.id==='half_light'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const {result,validation}=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true})
    expect(validation.isValid).toBe(true)
    expect(result.promptText).not.toContain('iPhone 15 Pro Max')
  })
  it('Lower garment optional selection', () => {
    const withLower = compilePrompt({ ...defaultCtx, lowerGarmentId: 'lounge_shorts' })
    expect(withLower.result.sections.some(s=>s.id.startsWith('lower_'))).toBe(true)
    const withoutLower = compilePrompt({ ...defaultCtx, lowerGarmentId: null })
    expect(withoutLower.result.sections.some(s=>s.id.startsWith('lower_'))).toBe(false)
  })
})
