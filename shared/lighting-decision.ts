/**
 * One user-selected light source. Only these four identifiers may enter a
 * compiled scene or cross the Vercel/Gemini authority boundary.
 * This module is shared by client and server to prevent divergent source text.
 */
export const LIGHTING_PRESET_IDS = ['led_spotlight','camera_flash','phone_screen','laptop_screen'] as const
export type LightingOption = 'led_spotlight' | 'camera_flash' | 'phone_screen' | 'laptop_screen'
export type LightingPresetId = LightingOption
/** Deprecated ingress field; old exclusive switches are rejected, not silently applied. */
export type ExclusiveLightingMode = 'OFF'|'DARK_ROOM_REAR_FLASH_ONLY'|'DARK_ROOM_FRONT_SCREEN_ONLY'
export type LightingDecision = {
 activeLightSource: LightingOption
 savedLightingPreference: LightingOption
 savedLightingPreferenceActive: boolean
}
export const DEFAULT_LIGHTING_PREFERENCE: LightingOption = 'phone_screen'

/** Immutable, physically grounded descriptions used identically by compiler and API gate. */
export const LIGHTING_FRAGMENTS:Record<LightingOption,string>={
 led_spotlight: 'PITCH-BLACK BEDROOM: Absolute darkness before illumination. The ONLY active light is one real white ceiling LED spotlight at its existing, physically supported ceiling position. Its finite downward beam creates a localized pool, realistic hard-to-soft shadow transitions under eyebrows, nose, chin, hands and furniture, falloff toward unlit corners, occlusion and contact shadows at actual support points. White reflected bounce from existing walls and bedding is secondary reflected energy from this same LED, never an additional emitter. The handset screen, rear flash, laptop display, every other fixture, all windows and the hallway emit no light. Capture sensor exposure, white balance, clipping and noise follow the real spot brightness; no studio fill, window glow, daylight or general ambient illumination.',
 camera_flash: 'PITCH-BLACK BEDROOM: Absolute darkness except for the brief rear-camera LED flash during exposure; it is the ONLY active light. The flash originates beside the actual rear camera lens on the physically held recording phone. For a wardrobe mirror selfie, light hits the real glass and follows equal-angle specular reflections and plausible diffuse bounce to illuminated surfaces; the reflection hotspot appears only where the geometry permits. For a direct rear-camera shot, light travels outward from the phone to visible surfaces. The LED-to-surface distance, lens/hand occlusion, local highlight clipping, cast shadows and sensor exposure govern visibility; distant corners remain black. Phone screen, laptop, ceiling fixtures, room lamps, windows and hallway are all unlit, with no ambient light, daylight, studio fill or fabricated flare.',
 phone_screen: 'PITCH-BLACK BEDROOM: Absolute darkness except for the recording phone display, the ONLY active light. The real display faces the subject within physically feasible reach; its broad weak emission softly illuminates only surfaces it faces, strongest near the eyes, nose and cheeks, decaying quickly toward the neck and upper chest. Arms, bedding, clothing and the background darken with actual distance, screen angle and occlusion. The front camera lens is not a light. No rear LED, laptop glow, ceiling fixture, bedside lamp, window light, daylight or ambient illumination. Automatic exposure can increase noise and reveal limited shadow detail but cannot create photons, brighten distant walls or selectively beautify the face.',
 laptop_screen: 'PITCH-BLACK BEDROOM: Absolute darkness except for ONE real open laptop display, the ONLY active light. The hinged laptop base rests securely on the chosen physical support, with its screen normal directed toward the subject. Its weak broad light reaches screen-facing hands, face and nearby clothing/bedding with strong distance falloff, natural contact shadows and realistic occlusion; remote walls and corners remain unlit. The recording phone display stays dark and does not act as a second emitter. No rear flash, ceiling fixture, bedside lamp, window light, daylight or ambient illumination. The real phone sensor records believable underexposure, high-ISO grain and imperfect automatic white balance without false bright background detail.'
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
export function deriveLightingDecision(saved:unknown,_mode:ExclusiveLightingMode='OFF'):LightingDecision{
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
export function validateLightingDecision(raw:unknown,mode:unknown,captureLight:unknown):LightingDecision{
 if(mode!=='OFF')throw Error('SPEC_LIGHTING_MODE_DISABLED')
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
