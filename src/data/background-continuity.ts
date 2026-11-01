import type { CompilationContext } from '../domain/types'
import { bedroomShots, getShotPosture } from './bedroom-shots'
import { isLivedInClutter } from './bedroom-clutter'
import { isLaptopSelfieShot } from './laptop-selfie-physics'

/** Persistent small-object anchors, with physically motivated contact changes. */
export function renderBackgroundContinuity(ctx: CompilationContext): string {
  const shot = bedroomShots.find(s => s.id === ctx.bedroomShotId)
  const pose = (shot ? getShotPosture(shot.id) : ctx.poseId) || 'seated_bed'
  const onBed = ['seated_bed','reclined_pillows','side_lying_right','side_lying_left','supine','prone'].includes(pose)
  return [
    'BACKGROUND CONTINUITY: Keep the same actual bedroom belongings from one photograph to the next, at fixed physical anchors.',
    'Keep the real headboard, mattress, original bedding and actual pillow count from the room reference. Maintain their original colors, seam structure, thickness and natural wear; never enforce an invented number of pillows.',
    ...(isLaptopSelfieShot(ctx.bedroomShotId)?['LAPTOP CONTINUITY: The same single ordinary laptop is in use in this chosen scene. Its base rests on the described actual support, with a real screen hinge and keyboard. Existing nightstand, dresser, bedding and room objects retain their fixed identities; the laptop does not replace reference furniture and does not multiply into copies.']:[]),
    'The existing nightstand and right-side dresser keep the same objects that are actually visible in the reference. Preserve the photographed chair/sofa, bag, shoes and other items where they exist; do not invent a book, mug, headphones and chair to satisfy a generic template.',
    isLivedInClutter(ctx)
      ? 'LIVED-IN CONTINUITY: Retain reference items and the selected deterministic movable-object anchors within enabled zones only. Match their positions across viewpoints. No duplicated objects, floating sheets and relocated furniture.'
      : 'Preserve item count and furniture-relative positions. Do not create duplicate pillows, additional nightstands, repeated objects, floating sheets, unexplained clutter and relocated possessions.',
    onBed
      ? 'BED CONTACT CONTINUITY: Body weight compresses the mattress, nearest pillow and bedding at actual pressure points. A shifted shoulder, hip, elbow and hand can locally displace folds and pillows. Preserve the actual pillow count, identities and original approximate positions outside the contact area.'
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
