import type { CompilationContext } from '../domain/types'

/** Immutable physical room anchors; select only visibility and illumination per shot. */
export function renderBedroomEnvironment(ctx: CompilationContext): string {
  const curtainState = 'Back-wall curtains stay fully closed, black-to-charcoal, with no exposed window, no daylight, no streetlight and no ambient leakage.'
  return [
    ...(ctx.roomReferencePresent ? ['ROOM IMAGE REFERENCE: The separately supplied room photograph is the authoritative visual reference for the room appearance and visible furniture. Keep fixed architectural boundaries and object positions consistent with that photograph. The subject identity reference controls the person only; do not copy a person shown in the room reference. Adapt furniture visibility to the camera viewpoint without rearranging the room. Where the photo differs from default room descriptions, trust the actual photographed geometry and furniture rather than the defaults. The separately user-confirmed layout may constrain the scene only when compatible with the image.'] : []),
    'BEDROOM ENVIRONMENT LOCK: The same established lived-in bedroom in every shot, using reference-consistent room proportions and actual ceiling height without invented measurements.',
    'Fixed room topology: original bed against the LEFT wall, with dimensions and details preserved from the room photograph, including the actual headboard and original bedside nightstand.',
    'FRONT/doorway zone: preserve the actual chair/sofa and high-mounted air conditioner only where supported by the room photograph; do not substitute a chair for the referenced sofa.',
    'RIGHT wall: sliding-door wardrobe with integrated mirrored panels toward the rear and a dresser toward the front, leaving a realistic walking clearance.',
    'BACK wall: full-width dark curtains. '+curtainState,
    'Floor: the original glossy light-beige tiles with their photographed grid proportions, original central rug and only rugs actually visible in the room reference.',
    'Lived-in belongings: preserve the actual visible bedside and dresser objects, bag and shoes in their original positions. Do not invent a mug, book, electronics, cushions and new clutter when the reference does not establish them.',
    'No second bedside table, additional freestanding mirror, office desk, extra bed, duplicated furniture, hotel-scale decor and relocated architecture. The original dresser mirror remains separate from the wardrobe recording mirror. Only depict televisions and special light fixtures when the photograph actually confirms a physical source; a lighting choice alone cannot create one.',
    'Camera framing and posture determine which actual items are visible; never force all furniture into the frame. Mirror shots use the existing sliding mirrored wardrobe door.',
    'Preserve the same furniture sizes, materials, locations, background continuity and real light-source positions; do not invent bright fixtures; never alter the room layout.'
  ].join(' ')
}
