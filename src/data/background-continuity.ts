import type { CompilationContext } from '../domain/types'
import { bedroomShots, getShotPosture } from './bedroom-shots'
import { isLivedInClutter } from './bedroom-clutter'

/** Persistent small-object anchors, with physically motivated contact changes. */
export function renderBackgroundContinuity(ctx: CompilationContext): string {
  const shot = bedroomShots.find(s => s.id === ctx.bedroomShotId)
  const pose = (shot ? getShotPosture(shot.id) : ctx.poseId) || 'seated_bed'
  const onBed = ['seated_bed','reclined_pillows','side_lying_right','side_lying_left','supine','prone'].includes(pose)
  return [
    'BACKGROUND CONTINUITY: Keep the same actual bedroom belongings from one photograph to the next, at fixed physical anchors.',
    'One dark tufted headboard, one mattress, one fitted sheet, one rumpled duvet, and two ordinary sleeping pillows. These remain the same items with consistent fabric color, thickness, seam structure and wear.',
    'The sole nightstand keeps the same mug, headphones and charging cable. The right-side dresser retains the open book and folded garment. The chair retains its draped garment; the bag and shoes remain near storage.',
    isLivedInClutter(ctx)
      ? 'LIVED-IN CONTINUITY: Retain the original recurring items and their furniture anchors. The chosen small loose floor items, water glass, receipts and gravity-creased bedding stay consistent across views. No extra pillows, nightstands, duplicated mugs, floating sheets and relocated furniture.'
      : 'Preserve item count and furniture-relative positions. Do not create duplicate pillows, additional nightstands, repeated mugs, floating sheets, unexplained clutter and relocated possessions.',
    onBed
      ? 'BED CONTACT CONTINUITY: Body weight compresses the mattress, nearest pillow and bedding at actual pressure points. A shifted shoulder, hip, elbow and hand can locally displace folds and pillows. Preserve the same pillow identities and original approximate positions outside the contact area.'
      : 'NO BED CONTACT: Mattress, duvet and pillows retain their pre-existing resting arrangement; camera movement does not reshape the bedding.',
    'Objects hidden behind the subject, outside the camera view and within real mirror occlusions are simply unseen, not removed from the room.',
    ctx.roomReferencePresent
      ? (isLivedInClutter(ctx)
        ? 'ROOM REFERENCE PRIORITY: Match fixed room architecture, furniture and original object identities to the supplied room image. Add only selected small movable clutter on free supported surfaces and natural bedding folds without inventing furniture, stains and changed material finishes.'
        : 'ROOM REFERENCE PRIORITY: Match visible duvet pattern, pillow shapes, fabric tones, surface wear and small-object locations to the separately provided room photograph whenever visible. Do not replace the subject identity using the room reference.')
      : 'Maintain these recurring prop anchors consistently using the established room description.',
    'Lighting changes only perceived color and shadow; it never swaps the furniture, bedding textiles and belongings.'
  ].join(' ')
}
