/**
 * One user-selected light source. Only these four identifiers may enter a
 * compiled scene, cross the Vercel/Gemini authority boundary.
 * This module is shared by client and server to prevent divergent source text.
 */
export const LIGHTING_PRESET_IDS = ['led_spotlight','camera_flash','phone_screen','laptop_screen'] as const
export type LightingOption = 'led_spotlight' | 'camera_flash' | 'phone_screen' | 'laptop_screen'
export type LightingPresetId = LightingOption
export type LightingDecision = {
 activeLightSource: LightingOption
 savedLightingPreference: LightingOption
 savedLightingPreferenceActive: boolean
}
export const DEFAULT_LIGHTING_PREFERENCE: LightingOption = 'phone_screen'

/** Immutable, physically grounded descriptions used identically by compiler and API gate. */
/** The four exact, user-authoritative physics prompts. No additional emitters. */
export const LIGHTING_FRAGMENTS:Record<LightingOption,string>={
 led_spotlight: "The room is in absolute pitch blackness. There is no ambient light, no window light, and no daylight. The ONLY light source is a single white LED ceiling spotlight. It casts hard-edged shadows directly downward. The light temperature is neutral white (5600K). Strong specular highlights are visible on the forehead and nose. The light falls off rapidly due to the inverse-square law, leaving the rest of the room in absolute darkness.",
 camera_flash: "The room is in absolute pitch blackness. There is no ambient light, no window light, and no daylight. The ONLY light source is a harsh, direct camera flash. This creates extremely hard-edged, high-contrast shadows directly behind the subject on the wall. The intense flash reveals microscopic skin texture, visible pores, and a glossy specular highlight on the T-zone. A tiny, sharp catchlight is visible in the eyes. The background falls into complete darkness instantly due to rapid light falloff. The single flash also creates hard-edged shadows that follow the actual camera-to-surface geometry.",
 phone_screen: "The room is in absolute pitch blackness. There is no ambient light, no window light, and no daylight. The ONLY light source is the soft, diffused light from a smartphone screen. This creates a cool blue color cast on the subject's face. The light source is rectangular, producing a small rectangular catchlight in the eyes. Shadows are extremely soft. The light intensity drops off quickly, leaving the background in pitch blackness.",
 laptop_screen: "The room is in absolute pitch blackness. There is no ambient light, no window light, and no daylight. The ONLY light source is a glowing laptop screen. This creates a slightly larger, softer light source than a phone. It casts gentle, soft-edged shadows (butterfly shadow) under the nose and jawline. The color cast depends on the screen content. The rest of the room is completely unlit."
}
export const LIGHTING_EMITTER:Record<LightingOption,{id:string;origin:string;direction:string}>={
 led_spotlight:{id:'ceiling',origin:'one existing white ceiling LED spotlight',direction:'downward finite spotlight beam'},
 camera_flash:{id:'phone_rear_led',origin:'the recording phone rear LED',direction:'outward from the rear camera module'},
 phone_screen:{id:'phone_display',origin:'the recording phone display',direction:'from the screen normal toward the subject'},
 laptop_screen:{id:'laptop',origin:'one supported open laptop display',direction:'from the screen normal toward the subject'}
}
export function isLightingPresetId(v:unknown):v is LightingOption{
 return typeof v==='string'&&(LIGHTING_PRESET_IDS as readonly string[]).includes(v)
}
export function normalizeSavedLightingPreference(v:unknown):LightingOption{
 const normalized=v===undefined||v===null||v===''?DEFAULT_LIGHTING_PREFERENCE:v
 if(!isLightingPresetId(normalized))throw Error('UNKNOWN_LIGHTING_PREFERENCE')
 return normalized
}
export function deriveLightingDecision(saved:unknown):LightingDecision{
 const selected=normalizeSavedLightingPreference(saved)
 return {activeLightSource:selected,savedLightingPreference:selected,savedLightingPreferenceActive:true}
}
export function lightingSectionText(light:LightingOption):string{
 return 'Night bedroom lighting: '+LIGHTING_FRAGMENTS[light]
}
export function physicalRealityText(light:LightingOption):string{
 const emitter=LIGHTING_EMITTER[light]
 return [
  'PHYSICAL REALITY ENGINE V3:',
  'The bedroom is in absolute darkness before the selected source is active. Exactly one physically located emitter is active.',
  'Active physical emitters: '+emitter.id+' at '+emitter.origin+'.',
  'Source direction: '+emitter.direction+'.',
  LIGHTING_FRAGMENTS[light],
  'All other artificial lights are OFF; there is NO ambient light, NO window light and NO daylight. Reflections and surface bounce are interactions with the selected source, not extra emitters.',
  'No exact ray tracing, force values, geometry measurements and unseen furniture are asserted.'
 ].join(' ')
}
export function validateLightingDecision(raw:unknown,captureLight:unknown):LightingDecision{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('SPEC_LIGHTING_SCHEMA')
 const actual=raw as Record<string,unknown>
 if(Object.keys(actual).sort().join(',')!=='activeLightSource,savedLightingPreference,savedLightingPreferenceActive')
  throw Error('SPEC_LIGHTING_SCHEMA')
 if(!isLightingPresetId(actual.activeLightSource)||!isLightingPresetId(actual.savedLightingPreference)||
  typeof actual.savedLightingPreferenceActive!=='boolean')throw Error('SPEC_LIGHTING_SCHEMA')
 if(!actual.savedLightingPreferenceActive)throw Error('SPEC_LIGHTING_INACTIVE')
 const expected=deriveLightingDecision(actual.savedLightingPreference)
 if(actual.activeLightSource!==expected.activeLightSource)throw Error('SPEC_LIGHTING_CONFLICT')
 if(actual.activeLightSource!==captureLight)throw Error('SPEC_LIGHTING_CAPTURE')
 return expected
}
