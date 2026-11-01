import type {CompilationContext} from '../domain/types'

/** Optional everyday disorder adapted from the supplied lived-in bedroom brief.
 * Never mutate immutable furniture or introduce incompatible light sources. */
export function isLivedInClutter(ctx:CompilationContext):boolean{
 return ctx.bedroomClutterId==='lived_in_messy'
}

export function renderBedroomClutter(ctx:CompilationContext):string{
 if(!isLivedInClutter(ctx))return ''
 return [
  'LIVED-IN BEDROOM CLUTTER: An ordinary occupied room with pre-existing casual disorder, not a staged commercial set. Keep the locked room topology, original furniture, exactly one nightstand, real material finishes and consistent object identities.',
  'The existing duvet is rumpled with gravity-loaded folds and a supported overhanging edge only when the fabric naturally reaches it. The fitted sheet shows creases from prior use. The two real pillows rest unevenly with plausible old compression and cotton creases. Actual body contact adds fresh local compression only at its true contact points.',
  'The existing FRONT-wall chair retains its draped garment. A worn t-shirt and a small pair of socks can rest separately on available clear floor patches, each with true fabric thickness, folds, gravity and floor contact. Preserve the room walking gap and body clearance.',
  'Preserve objects actually present on the existing bedside nightstand. Add a small water glass, a few loose receipts and naturally coiled cable slack only when this user-selected clutter mode and real free surface space permit them. The glass is stably supported and transparent with restrained optical refraction. No unsupported objects and no duplicated mugs.',
  'Keep the RIGHT-wall mirrored sliding wardrobe in its real track, with its original reflective geometry and fixed dresser. Do not substitute a hinged half-open closet, expose a fabricated interior, invent drawers, change the actual glossy beige floor to laminate, add furniture, and force items into the camera crop.',
  'Maintain continuity: these light loose-object additions and bedding folds are pre-existing within the chosen messy scene, stable across further viewpoints until physical touch moves them. If a room reference is supplied, retain its architecture and fixed objects; compatible loose clutter may supplement only genuinely available surfaces.',
  'Capture as a candid handheld smartphone snapshot when handheld is selected, with plausible wide-angle perspective, natural exposure, real skin texture, and subtle shadow grain only where the selected lighting warrants it. Use portrait 9:16 framing when consistent with the selected shot. No invented fixed 24mm lens, f/1.9 aperture, extreme shallow background blur, 8K texture claims, airbrushing, fake wear, added lamps, daylight and artificial flare.'
 ].join(' ')
}

export function buildBedroomClutterGeminiBrief(ctx:CompilationContext):string{
 if(!isLivedInClutter(ctx))return ''
 return [
  'Selected room appearance: an authentically lived-in, casually messy bedroom, with unmade existing bed, rumpled duvet folds under gravity, wrinkled fitted sheet and two naturally uneven pillows.',
  'Preserve the photographed chair or sofa in its original place; realistic small discarded shirt and socks may occupy clear floor patches in the selected clutter mode. The existing nightstand keeps only its actual reference objects; small receipts, plausible cable slack and a supported water glass can add restrained everyday disorder when space permits.',
  'This is a deliberate visual selection: show visible pre-existing disorder when those room areas are inside the actual camera view, without replacing the real room or forcing all belongings into frame. Keep original LEFT-wall bed, RIGHT-wall sliding wardrobe mirror, dresser, real walking gap and glossy beige tile floor.',
  'Preserve supplied room-reference architecture and fixed belongings. Only small physically supported loose items plus realistic fabric deformations may differ. Do not invent a hinged open wardrobe, hidden interior, extra furniture, opened nonexistent drawers or new surface damage.',
  'Use ONLY the separately selected real lighting, camera mode and portrait framing where the chosen crop permits. Never force daylight and a 2700K lamp, phone screen illumination, front-camera perspective, artificial shallow depth of field, specific 24mm/f1.9 optics, oversized fake noise or 8K marketing detail.'
 ].join('\n')
}
