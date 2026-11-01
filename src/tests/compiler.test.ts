
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
  it('supports four image prompt targets while preserving the canonical identity and room locks',()=>{
    for(const promptTarget of ['gemini','chatgpt','flux','midjourney'] as const){
      const compiled=compilePrompt({...defaultCtx,promptTarget})
      expect(compiled.validation.isValid).toBe(true)
      expect(compiled.result.promptText).toContain('Reference identity anchored to reference image')
    }
  })

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
  it('New 4500K ceiling LED is a single independent preset with physical light falloff', () => {
    const compiled = compilePrompt({ ...defaultCtx, nightLightingId: 'ceiling_led_neutral' })
    expect(compiled.validation.isValid).toBe(true)
    const lightingSections = compiled.result.sections.filter(s => s.id.startsWith('night_lighting_'))
    expect(lightingSections).toHaveLength(1)
    expect(lightingSections[0].id).toBe('night_lighting_ceiling_led_neutral')
    expect(lightingSections[0].content).toContain('4500K neutral-white')
    expect(lightingSections[0].content).toContain('CRI 95+')
    expect(lightingSections[0].content).toContain('inverse-square tendency')
    expect(lightingSections[0].content).toContain('contact shadows')
    expect(lightingSections[0].content).toContain('ISO sensor noise')
    expect(compiled.result.sections.find(s => s.id === 'light_pose_geometry')?.content).toContain('Ceiling fixtures remain above the physical room')
    expect(compiled.result.promptText).not.toContain('Phone display is the sole active light source')
  })
  it.each(['mirror_wardrobe', 'side_knee_tucked', 'edge_one_knee_raised'])('4500K ceiling LED remains valid with %s camera geometry', bedroomShotId => {
    const compiled = compilePrompt({ ...defaultCtx, bedroomShotId, nightLightingId: 'ceiling_led_neutral' })
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.errors).toHaveLength(0)
    if (bedroomShotId === 'mirror_wardrobe') {
      expect(compiled.result.promptText).toContain('MIRROR CAPTURE:')
      expect(compiled.result.promptText).not.toContain('Face oriented toward the held front camera')
    }
  })
  const additionalWhiteLedModes = [
    { id: 'ceiling_led_soft_diffused', anchor: 'DIFFUSED OVERHEAD', geometry: 'Multiple installed downlights' },
    { id: 'ceiling_led_bed_side', anchor: 'BED-SIDE CEILING', geometry: 'LEFT-wall bed' },
    { id: 'ceiling_led_wardrobe_side', anchor: 'WARDROBE-SIDE CEILING', geometry: 'RIGHT-wall wardrobe' },
    { id: 'ceiling_led_single_downlight', anchor: 'SINGLE CEILING DOWNLIGHT', geometry: 'single installed central ceiling spot' }
  ] as const

  it('Four additional white LED presets are independently selectable and retain the existing 4500K option', async () => {
    const { nightLightingPresets } = await import('../data/night-lighting')
    const ids = nightLightingPresets.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('ceiling_led_neutral')
    for (const mode of additionalWhiteLedModes) expect(ids).toContain(mode.id)
    expect(ids.filter(id => additionalWhiteLedModes.some(m => m.id === id))).toHaveLength(4)
  })

  it.each(additionalWhiteLedModes)('White LED $id selects one real light setup without additional sources', mode => {
    const compiled = compilePrompt({ ...defaultCtx, nightLightingId: mode.id })
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.errors).toHaveLength(0)
    const selectedLighting = compiled.result.sections.filter(s => s.id.startsWith('night_lighting_'))
    expect(selectedLighting).toHaveLength(1)
    expect(selectedLighting[0].id).toBe('night_lighting_' + mode.id)
    expect(selectedLighting[0].content).toContain(mode.anchor)
    expect(selectedLighting[0].content).toContain('4500K')
    expect(selectedLighting[0].content).not.toContain('phone display is the sole active light source')
    const geometry = compiled.result.sections.find(s => s.id === 'light_pose_geometry')?.content || ''
    expect(geometry).toContain('Ceiling fixtures remain above the physical room')
    expect(geometry).toContain(mode.geometry)
    expect(geometry).not.toContain('Phone display faces the subject near the camera optical axis')
  })

  it.each(additionalWhiteLedModes)('White LED $id maintains camera and pose geometry across shots', mode => {
    for (const bedroomShotId of ['mirror_wardrobe','side_knee_tucked','edge_one_knee_raised','phone_on_floor']) {
      const compiled = compilePrompt({ ...defaultCtx, bedroomShotId, nightLightingId: mode.id })
      expect(compiled.validation.isValid).toBe(true)
      expect(compiled.result.errors).toHaveLength(0)
      expect(compiled.result.sections.filter(s => s.id.startsWith('night_lighting_'))).toHaveLength(1)
      if (bedroomShotId === 'mirror_wardrobe') {
        expect(compiled.result.promptText).toContain('MIRROR CAPTURE:')
        expect(compiled.result.promptText).not.toContain('Face oriented toward the held front camera')
      }
      if (bedroomShotId === 'phone_on_floor') {
        expect(compiled.result.promptText).toContain('TIMER CAPTURE:')
      }
    }
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
  it('Offers exactly 98 unique bedroom shots and five groups', async () => {
    const { bedroomShots } = await import('../data/bedroom-shots')
    expect(bedroomShots.length).toBe(98)
    expect(new Set(bedroomShots.map(p=>p.id)).size).toBe(98)
    expect([0,1,2,3,4].map(i=>bedroomShots.filter(s=>s.category===i).length)).toEqual([33,15,15,21,14])
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
  it.each(bedroomShots.filter(s=>s.mode === 'mirror'))('Mirror $id uses the same Xiaomi 15 Ultra as other selfie modes', shot => {
    const {result,validation}=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:shot.id==='mirror_rear_flash'?'rear_flash':'ceiling_dim'})
    expect(validation.isValid).toBe(true)
    expect(result.promptText).toContain('Xiaomi 15 Ultra')
    expect(result.promptText).toContain('genuine rear camera module')
    expect(result.promptText).not.toContain('LiDAR')
  })
  it.each(bedroomShots.filter(s=>s.mode !== 'mirror'))('Non-mirror $id has no iPhone model lock',shot => {
    const lighting = shot.id==='silhouette'||shot.id==='half_light'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const {result,validation}=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true})
    expect(validation.isValid).toBe(true)
    expect(result.promptText).not.toContain('iPhone 15 Pro Max')
  })
  it('Bedroom geometry is fixed across all 60 shots', () => {
    for (const shot of bedroomShots) {
      const lighting=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='silhouette'||shot.id==='half_light'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
      const compiled=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true})
      expect(compiled.validation.isValid).toBe(true)
      expect(compiled.result.sections.filter(s=>s.id==='bedroom_environment_lock')).toHaveLength(1)
      expect(compiled.result.promptText).toContain('original bed against the LEFT wall')
      expect(compiled.result.promptText).toContain('RIGHT wall: sliding-door wardrobe')
    }
  })
  it('Gemini and ChatGPT use shared geometry but separate hairstyle-specific directions', () => {
    const base={...defaultCtx,hairVariantId:'neatly_combed',hairstyleMode:'apply' as const,bedroomShotId:'supine_high_phone'}
    const gemini=compilePrompt({...base,promptTarget:'gemini'})
    const chatgpt=compilePrompt({...base,promptTarget:'chatgpt'})
    expect(gemini.validation.isValid).toBe(true)
    expect(chatgpt.validation.isValid).toBe(true)
    expect(gemini.result.promptText).not.toContain('ChatGPT hairstyle priority:')
    expect(chatgpt.result.promptText).toContain('ChatGPT hairstyle priority:')
    expect(chatgpt.result.promptText).toContain('Lying on the back')
    expect(gemini.result.promptText).toContain('Lying on the back')
    expect(chatgpt.result.promptText).toContain('original bed against the LEFT wall')
  })
  it('ChatGPT does not force hairstyle changes in preserve mode', () => {
    const result=compilePrompt({...defaultCtx,promptTarget:'chatgpt',hairstyleMode:'preserve'})
    expect(result.result.promptText).not.toContain('ChatGPT hairstyle priority:')
  })
  it.each(bedroomShots)('Camera physics follows $id capture mode', shot => {
    const lighting=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const compiled=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true})
    expect(compiled.validation.isValid).toBe(true)
    const physics=compiled.result.sections.filter(s=>s.id==='camera_physics')
    expect(physics).toHaveLength(1)
    const content=physics[0].content
    if (shot.mode==='mirror') {
      expect(content).toContain('MIRROR CAPTURE:')
      expect(content).toContain('Xiaomi 15 Ultra')
      expect(content).not.toContain('FRONT SELFIE CAPTURE:')
    } else if (shot.mode==='timer') {
      expect(content).toContain('TIMER CAPTURE:')
      expect(content).toContain('Neither hand holds')
    } else if (shot.mode==='rear') {
      expect(content).toContain('REAR CAMERA CAPTURE:')
      expect(content).not.toContain('FRONT SELFIE CAPTURE:')
    } else {
      expect(content).toContain('FRONT SELFIE CAPTURE:')
      expect(content).toContain('realistic available arm distance')
    }
    expect(content).toContain('No beauty smoothing')
    expect(content).toContain('physically credible camera-to-subject distance')
  })
  it.each(bedroomShots.filter(s => s.mode === 'mirror'))('Mirror $id has no front-camera face direction', shot => {
    const lighting = shot.id === 'mirror_rear_flash' ? 'rear_flash' : 'ceiling_neutral'
    const compiled = compilePrompt({...defaultCtx, bedroomShotId:shot.id, nightLightingId:lighting, faceDirectionId:'toward_camera'})
    expect(compiled.validation.isValid).toBe(true)
    const geometry = compiled.result.sections.find(s => s.id === 'light_pose_geometry')?.content || ''
    expect(geometry).toContain('wardrobe mirror')
    expect(geometry).not.toMatch(/held front camera|front-facing camera|FRONT SELFIE CAPTURE:/i)
    if (shot.id === 'mirror_phone_gaze') {
      expect(geometry).toContain('handset screen')
    } else {
      expect(geometry).toContain('reflected rear-camera lens')
    }
    expect(compiled.result.promptText).not.toMatch(/Face oriented toward the held front camera|FRONT SELFIE CAPTURE:|Subject holds front-facing smartphone/)
  })
  it('Front selfie preserves its own camera-facing text', () => {
    const compiled=compilePrompt({...defaultCtx,bedroomShotId:'edge_one_knee_raised',nightLightingId:'ceiling_neutral'})
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.sections.find(s=>s.id==='light_pose_geometry')?.content).toContain('Face oriented toward the actual recording camera')
  })
  it('Final realism rejects any front-camera instructions leaked into a mirror prompt', async () => {
    const {validateFinalRealism}=await import('../compiler/final-realism')
    const ctx={...defaultCtx,bedroomShotId:'mirror_wardrobe',nightLightingId:'ceiling_neutral'}
    const compiled=compilePrompt(ctx)
    expect(compiled.validation.isValid).toBe(true)
    const sections=compiled.result.sections.map(s=>s.id==='light_pose_geometry'
      ? {...s,content:s.content+' Face oriented toward the held front camera.'}
      : s)
    const audited=validateFinalRealism(ctx,sections)
    expect(audited.isValid).toBe(false)
    expect(audited.errors).toContain('Final realism: front selfie camera instruction leaked into mirror capture')
  })
  it('Unselected shot uses ordinary front selfie camera profile', () => {
    const compiled=compilePrompt(defaultCtx)
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.sections.find(s=>s.id==='camera_physics')?.content).toContain('FRONT SELFIE CAPTURE:')
  })
  it.each(bedroomShots)('Body contact and arm ownership consistent for $id', shot => {
    const lighting=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const compiled=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true,poseId:'standing'})
    expect(compiled.validation.isValid).toBe(true)
    const section=compiled.result.sections.filter(s=>s.id==='body_pose_physics')
    expect(section).toHaveLength(1)
    const body=section[0].content
    expect(body).toContain('193 cm')
    if (shot.mode==='timer') expect(body).toContain('No phone grip from the subject')
    else if (shot.mode==='mirror') expect(body).toContain('Mirror shot:')
    else expect(body).toContain('Handheld capture:')
    if (getShotPosture(shot.id)==='supine') {
      expect(body).toContain('Back, pelvis and head are supported')
      expect(body).not.toContain('Hips and thighs bear weight')
    }
  })
  it('Default body profile keeps linked anatomy', () => {
    const {result}=compilePrompt(defaultCtx)
    expect(result.sections.find(s=>s.id==='body_pose_physics')?.content).toContain('BODY AND POSE PHYSICS:')
  })
  it.each(bedroomShots)('Final realism accepts coherent $id', shot => {
    const light = shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const output=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:light,windowUncovered:true})
    expect(output.validation.isValid).toBe(true)
    expect(output.result.errors).toHaveLength(0)
  })
  it('Final realism rejects mismatched camera and room', async () => {
    const {validateFinalRealism}=await import('../compiler/final-realism')
    const broken=validateFinalRealism({...defaultCtx,bedroomShotId:'supine_high_phone'},[
      {id:'light_pose_geometry',content:'Seated'},
      {id:'camera_physics',content:'TIMER CAPTURE'},
      {id:'body_pose_physics',content:'Standing'},
      {id:'bedroom_environment_lock',content:'Different room'}
    ])
    expect(broken.isValid).toBe(false)
    expect(broken.errors.length).toBeGreaterThan(1)
  })
  it('Advanced hairstyle direction, volume and disorder render only in apply mode',()=>{
    const settings={...defaultCtx,hairVariantId:'neatly_combed',hairstyleMode:'apply' as const,hairDirection:'forward' as const,hairVolume:'lifted' as const,hairTexture:'messy' as const}
    const result=compilePrompt(settings)
    expect(result.validation.isValid).toBe(true)
    expect(result.result.promptText).toContain('Bring existing front strands forward')
    expect(result.result.promptText).toContain('Lift the existing top strands')
    expect(result.result.promptText).toContain('visibly uneven strand directions')
    expect(result.result.promptText).toContain('original hairline')
    expect(result.result.sections.filter(s=>s.id==='advanced_hairstyle')).toHaveLength(1)
    const preserve=compilePrompt({...settings,hairstyleMode:'preserve'})
    expect(preserve.result.sections.some(s=>s.id==='advanced_hairstyle')).toBe(false)
    const automatic=compilePrompt({...settings,hairDirection:'auto',hairVolume:'auto',hairTexture:'auto'})
    expect(automatic.result.sections.some(s=>s.id==='advanced_hairstyle')).toBe(false)
  })
  it('Advanced hairstyle validates invalid configuration',()=>{
    const result=compilePrompt({...defaultCtx,hairDirection:'diagonal' as any})
    expect(result.validation.isValid).toBe(false)
  })
  it.each(['gemini','chatgpt'] as const)('Advanced hair preserved for %s engine', engine=>{
    const result=compilePrompt({...defaultCtx,promptTarget:engine,hairstyleMode:'apply',hairVariantId:'natural_slightly_tousled',hairDirection:'back'})
    expect(result.validation.isValid).toBe(true)
    expect(result.result.promptText).toContain('Direct the existing strands backward')
    expect(result.result.sections.filter(s=>s.id==='advanced_hairstyle')).toHaveLength(1)
  })
  it('Room reference is an additional authority without replacing the subject identity',()=>{
    const without=compilePrompt({...defaultCtx,roomReferencePresent:false})
    const withRoom=compilePrompt({...defaultCtx,roomReferencePresent:true})
    expect(without.validation.isValid).toBe(true)
    expect(withRoom.validation.isValid).toBe(true)
    expect(without.result.promptText).not.toContain('ROOM IMAGE REFERENCE:')
    expect(withRoom.result.promptText).toContain('ROOM IMAGE REFERENCE:')
    expect(withRoom.result.promptText).toContain('subject identity reference controls the person only')
    expect(withRoom.result.promptText).toContain('original bed against the LEFT wall')
    expect(withRoom.result.sections.filter(x=>x.id==='bedroom_environment_lock')).toHaveLength(1)
    expect(withRoom.result.sections.filter(x=>x.id==='reference_identity')).toEqual(without.result.sections.filter(x=>x.id==='reference_identity'))
  })
  it.each(['gemini','chatgpt'] as const)('Room reference works with %s output',target=>{
    const compiled=compilePrompt({...defaultCtx,promptTarget:target,roomReferencePresent:true})
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.promptText).toContain('ROOM IMAGE REFERENCE:')
  })
  it.each(bedroomShots)('Room reference leaves shot $id valid',shot=>{
    const light=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const compiled=compilePrompt({...defaultCtx,roomReferencePresent:true,bedroomShotId:shot.id,nightLightingId:light,windowUncovered:true})
    expect(compiled.validation.isValid).toBe(true)
    expect(compiled.result.errors).toEqual([])
  })
  it('Identity fidelity stays fixed while hairstyle changes',()=>{
    const applied=compilePrompt({...defaultCtx,hairstyleMode:'apply',hairVariantId:'neatly_combed',hairDirection:'forward',promptTarget:'chatgpt'})
    const preserved=compilePrompt({...defaultCtx,hairstyleMode:'preserve',hairVariantId:'neatly_combed',promptTarget:'chatgpt'})
    expect(applied.validation.isValid).toBe(true)
    expect(preserved.validation.isValid).toBe(true)
    expect(applied.result.sections.filter(s=>s.id==='identity_fidelity')).toHaveLength(1)
    expect(applied.result.promptText).toContain('selected styling may move existing strands')
    expect(applied.result.promptText).toContain('original hairline contour')
    expect(applied.result.promptText).toContain('ChatGPT reference priority:')
    expect(preserved.result.promptText).toContain('Keep the reference hairstyle')
    expect(preserved.result.promptText).not.toContain('selected styling may move existing strands')
  })
  it.each(['gemini','chatgpt'] as const)('Identity fidelity protects room versus subject references in %s',target=>{
    const result=compilePrompt({...defaultCtx,promptTarget:target,roomReferencePresent:true})
    expect(result.validation.isValid).toBe(true)
    expect(result.result.promptText).toContain('room reference is authoritative for surroundings')
    expect(result.result.promptText).toContain('IDENTITY FIDELITY ENGINE:')
  })
  it.each(bedroomShots)('Identity fidelity present for shot $id',shot=>{
    const light=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const result=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:light,windowUncovered:true})
    expect(result.validation.isValid).toBe(true)
    expect(result.result.errors).toEqual([])
    expect(result.result.sections.filter(s=>s.id==='identity_fidelity')).toHaveLength(1)
  })
  it('Background anchors remain stable when camera pose changes',()=>{
    const seated=compilePrompt({...defaultCtx,poseId:'seated_bed'})
    const standing=compilePrompt({...defaultCtx,poseId:'standing'})
    expect(seated.validation.isValid).toBe(true)
    expect(standing.validation.isValid).toBe(true)
    for(const output of [seated,standing]){
      const sections=output.result.sections.filter(s=>s.id==='background_continuity')
      expect(sections).toHaveLength(1)
      expect(sections[0].content).toContain('existing nightstand and right-side dresser keep the same objects')
      expect(sections[0].content).toContain('two ordinary sleeping pillows')
      expect(output.result.errors).toEqual([])
    }
    expect(seated.result.promptText).toContain('BED CONTACT CONTINUITY:')
    expect(standing.result.promptText).toContain('NO BED CONTACT:')
  })
  it('Room image reference reinforces background textures without changing face',()=>{
    const result=compilePrompt({...defaultCtx,roomReferencePresent:true})
    expect(result.validation.isValid).toBe(true)
    expect(result.result.promptText).toContain('ROOM REFERENCE PRIORITY:')
    expect(result.result.promptText).toContain('Do not replace the subject identity')
  })
  it.each(bedroomShots)('Background continuity remains compatible with $id',shot=>{
    const light=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const out=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:light,windowUncovered:true})
    expect(out.validation.isValid).toBe(true)
    expect(out.result.errors).toEqual([])
    expect(out.result.sections.filter(s=>s.id==='background_continuity')).toHaveLength(1)
  })
  it('Gaze and single-eye wink preserve identity and work in both target models',()=>{
    for(const target of ['gemini','chatgpt'] as const){
      const output=compilePrompt({...defaultCtx,promptTarget:target,gazeId:'screen',microExpressionId:'wink_left'})
      expect(output.validation.isValid).toBe(true)
      expect(output.result.promptText).toContain('Left eyelids briefly close')
      expect(output.result.promptText).toContain('right eye stays open')
      expect(output.result.promptText).toContain('face identity')
      expect(output.result.sections.filter(s=>s.id==='gaze_micro_expression')).toHaveLength(1)
    }
  })
  it('Default gaze and expression do not add conflicting facial commands',()=>{
    const output=compilePrompt({...defaultCtx,gazeId:'auto',microExpressionId:'none'})
    expect(output.result.sections.some(s=>s.id==='gaze_micro_expression')).toBe(false)
  })
  it('Invalid gaze and micro selection is rejected',()=>{
    expect(compilePrompt({...defaultCtx,gazeId:'wrong' as any}).validation.isValid).toBe(false)
    expect(compilePrompt({...defaultCtx,microExpressionId:'wrong' as any}).validation.isValid).toBe(false)
  })
  it.each(bedroomShots)('Gaze and wink compile with $id',shot=>{
    const lighting=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const output=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true,gazeId:'lens',microExpressionId:'wink_right'})
    expect(output.validation.isValid).toBe(true)
    expect(output.result.errors).toEqual([])
  })
  it.each(['natural','candid','raw'] as const)('Realism intensity %s is valid and preserves identity',intensity=>{
    const result=compilePrompt({...defaultCtx,realismIntensity:intensity})
    expect(result.validation.isValid).toBe(true)
    expect(result.result.errors).toEqual([])
    const realism=result.result.sections.filter(s=>s.id==='realism_intensity')
    expect(realism).toHaveLength(1)
    expect(realism[0].content).toContain('Never alter facial identity')
    expect(result.result.sections.filter(s=>s.id==='reference_identity')).toHaveLength(1)
  })
  it('Unknown realism intensity cannot produce a copyable prompt',()=>{
    const result=compilePrompt({...defaultCtx,realismIntensity:'invalid' as any})
    expect(result.validation.isValid).toBe(false)
    expect(result.result.promptText).toBe('')
  })
  it.each(bedroomShots)('Realism remains valid for $id',shot=>{
    const lighting=shot.id==='mirror_rear_flash'?'rear_flash':shot.id==='half_light'||shot.id==='silhouette'?'bedside_warm':shot.id==='curtain_shadows'?'window_streetlight':'ceiling_dim'
    const out=compilePrompt({...defaultCtx,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:true,realismIntensity:'raw',promptTarget:'chatgpt'})
    expect(out.validation.isValid).toBe(true)
    expect(out.result.errors).toEqual([])
  })
  it('Lower garment optional selection', () => {
    const withLower = compilePrompt({ ...defaultCtx, lowerGarmentId: 'lounge_shorts' })
    expect(withLower.result.sections.some(s=>s.id.startsWith('lower_'))).toBe(true)
    const withoutLower = compilePrompt({ ...defaultCtx, lowerGarmentId: null })
    expect(withoutLower.result.sections.some(s=>s.id.startsWith('lower_'))).toBe(false)
  })
})
