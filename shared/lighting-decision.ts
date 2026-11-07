/**
 * PR2 Option B: one effective lighting preset and a preserved user preference.
 * The saved preference is not a second active source during an exclusive mode.
 * This module is shared by the browser and the standalone Vercel specification gate.
 */
export const LIGHTING_PRESET_IDS = [
 'phone_screen_only','bedside_warm','ceiling_dim','ceiling_neutral',
 'ceiling_led_neutral','ceiling_led_soft_diffused','ceiling_led_bed_side',
 'ceiling_led_wardrobe_side','ceiling_led_single_downlight','lamp_and_screen',
 'ceiling_and_screen','hallway_spill','window_streetlight','laptop_screen_only',
 'near_darkness','rear_flash','television_screen','decorative_led','sunset_projector'
] as const

export type LightingPresetId = typeof LIGHTING_PRESET_IDS[number]
export type ExclusiveLightingMode = 'OFF'|'DARK_ROOM_REAR_FLASH_ONLY'|'DARK_ROOM_FRONT_SCREEN_ONLY'
export type LightingDecision = {
 activeLightSource: LightingPresetId
 savedLightingPreference: LightingPresetId
 savedLightingPreferenceActive: boolean
}

export const DEFAULT_LIGHTING_PREFERENCE: LightingPresetId = 'phone_screen_only'

export function isLightingPresetId(value: unknown): value is LightingPresetId {
 return typeof value === 'string' && (LIGHTING_PRESET_IDS as readonly string[]).includes(value)
}

/** An empty stored value is a historical default, not an invented active source. */
export function normalizeSavedLightingPreference(value: unknown): LightingPresetId {
 const normalized = value === undefined || value === null || value === ''
  ? DEFAULT_LIGHTING_PREFERENCE : value
 if (!isLightingPresetId(normalized)) throw Error('UNKNOWN_LIGHTING_PREFERENCE')
 return normalized
}

/** Exclusive mode overrides activation only; it never alters the saved preference. */
export function deriveLightingDecision(saved: unknown, mode: ExclusiveLightingMode): LightingDecision {
 const savedLightingPreference = normalizeSavedLightingPreference(saved)
 const exclusive = mode !== 'OFF'
 const activeLightSource = mode === 'DARK_ROOM_REAR_FLASH_ONLY'
  ? 'rear_flash'
  : mode === 'DARK_ROOM_FRONT_SCREEN_ONLY'
  ? 'phone_screen_only'
  : savedLightingPreference
 return {
  activeLightSource,
  savedLightingPreference,
  savedLightingPreferenceActive: !exclusive
 }
}

/**
 * Fail closed on any attempt to make a saved source active alongside an exclusive
 * emitter. The active light is the only renderable source in an exclusive scene.
 */
export function validateLightingDecision(raw: unknown, mode: unknown, captureLight: unknown): LightingDecision {
 if (mode !== 'OFF' && mode !== 'DARK_ROOM_REAR_FLASH_ONLY' && mode !== 'DARK_ROOM_FRONT_SCREEN_ONLY')
  throw Error('SPEC_LIGHTING_MODE')
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('SPEC_LIGHTING_SCHEMA')
 const actual = raw as Record<string,unknown>
 if (Object.keys(actual).sort().join(',') !== 'activeLightSource,savedLightingPreference,savedLightingPreferenceActive')
  throw Error('SPEC_LIGHTING_SCHEMA')
 if (!isLightingPresetId(actual.activeLightSource) || !isLightingPresetId(actual.savedLightingPreference) ||
     typeof actual.savedLightingPreferenceActive !== 'boolean')
  throw Error('SPEC_LIGHTING_SCHEMA')
 if (mode !== 'OFF' && actual.savedLightingPreferenceActive)
  throw Error('SPEC_SECOND_ACTIVE_LIGHT')
 const expected = deriveLightingDecision(actual.savedLightingPreference, mode)
 if (actual.activeLightSource !== expected.activeLightSource ||
     actual.savedLightingPreferenceActive !== expected.savedLightingPreferenceActive)
  throw Error('SPEC_LIGHTING_CONFLICT')
 if (actual.activeLightSource !== captureLight)
  throw Error('SPEC_LIGHTING_CAPTURE')
 return expected
}
