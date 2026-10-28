import type { CompilationContext } from '../domain/types'
import { bedroomShots, getShotPosture } from './bedroom-shots'

const postures: Record<string,string> = {
  seated_bed: 'Hips and thighs bear weight on the mattress. Spine upright with small natural asymmetry; feet and knees rest at feasible distances. No back contact claimed unless visibly supported.',
  reclined_pillows: 'Pelvis and back distribute weight into mattress and stacked pillows. Shoulders compress pillows, head follows cervical alignment. Torso is semi-reclined and never upright without support.',
  side_lying_right: 'Right shoulder, right hip and right cheek-side pillow take contact loads; spine remains continuous, knees can bend lightly. Right arm avoids trapped impossible camera support.',
  side_lying_left: 'Left shoulder, left hip and left cheek-side pillow take contact loads; spine remains continuous, knees can bend lightly. Left arm avoids trapped impossible camera support.',
  supine: 'Back, pelvis and head are supported by mattress and pillow. Shoulders stay near the surface, face looks upward toward the reachable overhead phone; the body is not seated.',
  prone: 'Chest, abdomen and pelvis contact mattress. Neck rotation and elbow support stay within natural range; the photographing arm remains free.',
  seated_floor: 'Hips rest on the floor, legs fold within joint limits, and torso balances naturally. A nearby bed edge never becomes an invisible seat.',
  standing: 'Feet support the whole body through the floor, knees soften naturally and weight transfers through the hips. No mattress compression under standing feet.'
}
export function renderBodyPosePhysics(ctx: CompilationContext): string {
  const shot = bedroomShots.find(s => s.id === ctx.bedroomShotId)
  const posture = (shot ? getShotPosture(shot.id) : ctx.poseId) || 'seated_bed'
  const mode = shot?.mode ?? 'front'
  const support = postures[posture] || postures.seated_bed
  const grip = mode === 'timer'
    ? 'Timer shot: photographing phone is placed on stable support; hands remain available for the selected gesture. No phone grip from the subject.'
    : mode === 'mirror'
    ? 'Mirror shot: one hand grips the visible phone with believable thumb and finger contacts; the other hand alone performs any independent gesture. Its reflection agrees with the real wrist.'
    : 'Handheld capture: one arm supports the photographing phone through a connected shoulder, elbow, forearm and wrist. The free arm alone performs any added gesture. No duplicate fingers.'
  return [
    'BODY AND POSE PHYSICS: Keep the same person and natural reference body proportions. Height 193 cm, lean-athletic build approximately 83 kg; never widen shoulders, enlarge muscles, shorten limbs, and reshape the torso.',
    support, grip,
    'A hand may support a pillow, hold a cup, touch the face, and operate the camera only when physically available. Each arm has one continuous shoulder-to-wrist chain; no third arm and no simultaneous incompatible grips.',
    'Gravity shapes shirt drape, skin pressure, pillow compression, mattress depression and limb balance from real contact points. Keep the pelvis, shoulders and neck in one plausible skeletal arrangement.',
    'Match body orientation to the selected bedroom shot and camera placement. The face direction alters head rotation within neck limits, not the underlying torso posture. No impossible twisting or weightless limbs.'
  ].join(' ')
}
