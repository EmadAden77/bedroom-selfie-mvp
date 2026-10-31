import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'
export const poseInteractionRules:Record<string,string>={
  "laptop_edge_trackpad": "Both laptop base corners remain supported by thighs; free finger moves trackpad. Phone arm remains independent and within shoulder range.",
  "laptop_edge_screen_glance": "Camera stays slightly lateral at true arm distance; the face is partly turned toward the laptop without rotating the laptop toward the camera.",
  "laptop_rug_cross_legged": "Floor supports laptop base and hips independently; bent knees leave keyboard clearance, free arm extends without pulling the laptop off its support.",
  "laptop_dresser_standing": "Dresser top directly supports the whole laptop base; standing feet support body weight. One hand operates trackpad and the separate hand holds phone.",
  "laptop_side_bed_open": "Laptop weight depresses mattress slightly at its actual base footprint. Right arm reaches forward independently from the shoulder; left arm supports phone without a trapped elbow.",
  "laptop_reclined_reading": "Pillows compress behind back; knees and thighs stabilize laptop base, which is not propped against the chest.",
  "laptop_high_angle_keyboard": "Phone viewpoint is bounded by a single extended arm; laptop lid occludes the keyboard naturally and free hand rests on accessible keys.",
  "laptop_dresser_typing_timer": "Both hands stay on keyboard. Laptop rests on dresser; timer phone has its own separate stable contact point and unobstructed line of sight.",
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
  "laptop_edge_typing_timer": "Both hands type on keyboard; camera phone is supported by the existing dresser with actual base contact.",
  "laptop_recline_chest": "Laptop supported by thighs, torso supported by pillows, free hand types.",
  "laptop_side_floor": "Laptop base rests across a flat mattress patch in front of bent knees; free forearm reaches without twisting the wrist.",
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
