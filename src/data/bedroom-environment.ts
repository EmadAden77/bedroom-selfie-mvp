import type { CompilationContext } from '../domain/types'

/** Immutable physical room anchors; select only visibility and illumination per shot. */
export function renderBedroomEnvironment(ctx: CompilationContext): string {
  const curtainState = ctx.windowUncovered ? 'Curtains may be parted only for a specifically selected window-light scene; do not move the window and furniture.' : 'Back-wall curtains stay fully closed, black-to-charcoal, with no exposed window.'
  return [
    'BEDROOM ENVIRONMENT LOCK: The same modest lived-in bedroom in every shot, approximately 5.2 m by 6.2 m, 2.9 m ceiling.',
    'Fixed room topology: queen bed approximately 160 by 200 cm against the LEFT wall with a dark tufted headboard and exactly one bedside nightstand.',
    'FRONT wall: compact chair with a casually draped garment and a high-mounted split air conditioner.',
    'RIGHT wall: sliding-door wardrobe with integrated mirrored panels toward the rear and a dresser toward the front, leaving a realistic walking clearance.',
    'BACK wall: full-width dark curtains. '+curtainState,
    'Floor: ordinary glossy light-beige 60 by 60 cm tiles, central rug and small beige bedside carpet.',
    'Lived-in belongings: mug, headphones and cable on the sole nightstand; open book and folded clothing on dresser; bag and shoes near storage; only context-visible papers and notebooks on bed.',
    'No second bedside table, freestanding framed mirror, office desk, extra bed, duplicate furniture, hotel-scale decor, or relocated architecture. Televisions and special decorative light fixtures appear solely when the selected lighting mode explicitly requires the actual physical source; keep them absent otherwise.',
    'Camera framing and posture determine which actual items are visible; never force all furniture into the frame. Mirror shots use the existing sliding mirrored wardrobe door.',
    'Preserve the same furniture sizes, materials, locations, background continuity and real light-source positions; do not invent bright fixtures; never alter the room layout.'
  ].join(' ')
}
