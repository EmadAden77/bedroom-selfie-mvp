import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'
export const poseInteractionRules:Record<string,string>={
  "edge_lean_both_elbows": "Both forearms supported on thighs; phone placed securely on dresser.",
  "edge_one_knee_raised": "One hand rests on lifted knee; phone hand remains free.",
  "edge_half_turn_back": "Pelvis stays supported and shoulder rotation remains small.",
  "edge_shirt_hem": "Free hand adjusts shirt hem and causes tension folds.",
  "edge_palm_behind": "Planted palm supports back lean through elbow and shoulder.",
  "edge_ankle_cross": "Both feet are supported by floor; ankles cross naturally.",
  "side_knee_tucked": "Left arm supports head; right arm alone holds phone.",
  "side_pillow_under_arm": "Pillow compresses under resting forearm, leaving photographing arm free.",
  "supine_one_knee": "One foot presses mattress while shoulders remain supported.",
  "reclined_slide_down": "Pillows compress behind upper back; pelvis stays on mattress.",
  "side_head_at_pillow_corner": "Pillow corner deforms beneath cheek, lower shoulder supported.",
  "prone_one_knee_bent": "Mattress carries chest and pelvis; photographing arm is not load bearing.",
  "laptop_cross_legs_trackpad": "Laptop base bears on thighs; free hand accesses trackpad.",
  "laptop_edge_typing_timer": "Both hands type on keyboard; phone rests on separate stable stand.",
  "laptop_recline_chest": "Laptop supported by thighs, torso supported by pillows, free hand types.",
  "laptop_side_floor": "Laptop base rests on floor; free hand reaches without twisting wrist.",
  "laptop_notebook_compare": "Notebook and laptop have separate supports; camera hand stays occupied.",
  "laptop_tilt_screen": "Free hand grips screen edge, laptop base remains planted.",
  "floor_back_bed_knees": "Floor supports hips and feet; bed edge supports upper back.",
  "floor_one_leg_extended": "Floor supports pelvis and stabilizing palm.",
  "floor_cross_leg_rug": "Both hips rest on rug; knees fold comfortably.",
  "floor_lean_forward": "Forearm bears weight on knee, phone hand remains independent.",
  "floor_elbow_bed_edge": "Elbow slightly depresses mattress; hips rest on floor.",
  "floor_phone_near_knee_timer": "Phone on steady low support, neither hand holds the device.",
  "wake_rub_eyes": "Only free fingers touch closed eyelid, no extra hands.",
  "wake_reach_water": "Free arm reaches mug within actual nightstand distance.",
  "pillow_adjust_behind_back": "Pillow shifts locally under free palm; shoulders remain supported.",
  "duvet_draw_below_knees": "Duvet moves at grasp point, knees and mattress remain supported.",
  "wake_ankle_stretch": "Free hand balances on mattress, ankle extends without bending knee backward.",
  "paper_reach_bed": "Free hand contacts paper, shoulder reach limited, photographing arm remains free.",
}
export function renderPoseInteraction(ctx:CompilationContext):string {
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const detail=shot && poseInteractionRules[shot.id]
 if(!detail)return ''
 return ['POSE INTERACTION ENGINE:',detail,
 'Assign each hand a single continuous anatomical task. The camera hand cannot simultaneously move an object. A timer capture requires a stable phone support and leaves both hands physically available.',
 'Keep gravity, reachable distances, weight bearing, mattress deformation and limb contact consistent with this selected action. No duplicated objects, limbs and hands.'].join(' ')
}
