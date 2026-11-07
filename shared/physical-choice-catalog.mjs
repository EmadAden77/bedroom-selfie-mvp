/** Catalog snapshot generated from the actual UI/data modules. Drift is prevented by exhaustive regression tests.
 * Used by the portable runtime; change this file and the original option source together.
 */
export const PHYSICAL_OPTION_IDS=Object.freeze({
  "hairVariantId": [
    "reference_natural_dry",
    "natural_slightly_tousled",
    "neatly_combed",
    "slightly_damp",
    "wind_blown_natural",
    "just_woke_up_messy",
    "low_volume_natural"
  ],
  "hairstyleMode": [
    "preserve",
    "apply"
  ],
  "hairDirection": [
    "auto",
    "back",
    "forward",
    "left",
    "right"
  ],
  "hairVolume": [
    "auto",
    "flat",
    "natural",
    "lifted"
  ],
  "hairTexture": [
    "auto",
    "tidy",
    "soft",
    "messy"
  ],
  "promptTarget": [
    "gemini",
    "chatgpt",
    "flux",
    "midjourney"
  ],
  "realismIntensity": [
    "natural",
    "candid",
    "raw"
  ],
  "expressionVariantId": [
    "reference_expression_preserved",
    "neutral_relaxed",
    "soft_closed_lip_smile",
    "sleepy_just_awake",
    "focused_concentration",
    "mild_brow_interest",
    "restrained_amusement",
    "mild_surprise"
  ],
  "gazeId": [
    "auto",
    "lens",
    "screen",
    "off_left",
    "off_right",
    "down"
  ],
  "microExpressionId": [
    "none",
    "wink_left",
    "wink_right",
    "brow_raise",
    "micro_smile"
  ],
  "upperGarmentId": [
    "reference_garment_preserved",
    "regular_crewneck_tshirt",
    "relaxed_crewneck_tshirt",
    "fitted_stretch_tshirt",
    "lightweight_long_sleeve_lounge_top",
    "relaxed_sleep_tshirt",
    "oversized_sleep_tshirt",
    "lightweight_hoodie",
    "knit_pajama_top",
    "woven_button_front_pajama_top"
  ],
  "lowerGarmentId": [
    "",
    "lounge_shorts",
    "lightweight_sweatpants",
    "simple_pajama_trousers"
  ],
  "materialId": [
    "lightweight_cotton_appearance_jersey",
    "mediumweight_jersey",
    "stretch_jersey",
    "rib_knit",
    "lightweight_fleece_knit",
    "lightweight_woven_cotton_appearance"
  ],
  "fitId": [
    "fitted",
    "regular",
    "relaxed",
    "oversized"
  ],
  "stateId": [
    "observed_natural_state",
    "fresh_natural",
    "lightly_worn",
    "lightly_wrinkled",
    "slept_in",
    "lightly_damp"
  ],
  "surface": [
    "solid",
    "subtle heathered",
    "ribbed",
    "subtle weave",
    "apparent knit-like surface character"
  ],
  "lowerSurface": [
    "solid",
    "subtle heathered",
    "ribbed",
    "subtle weave",
    "apparent knit-like surface character"
  ],
  "nightLightingId": [
    "phone_screen_only",
    "bedside_warm",
    "ceiling_dim",
    "ceiling_neutral",
    "ceiling_led_neutral",
    "ceiling_led_soft_diffused",
    "ceiling_led_bed_side",
    "ceiling_led_wardrobe_side",
    "ceiling_led_single_downlight",
    "lamp_and_screen",
    "ceiling_and_screen",
    "hallway_spill",
    "window_streetlight",
    "laptop_screen_only",
    "near_darkness"
  ],
  "poseId": [
    "seated_bed",
    "reclined_pillows",
    "side_lying_right",
    "side_lying_left",
    "supine",
    "prone",
    "seated_floor",
    "standing"
  ],
  "faceDirectionId": [
    "toward_camera",
    "toward_lamp",
    "away_from_lamp",
    "toward_door",
    "toward_window"
  ],
  "lampSideId": [
    "left",
    "right"
  ],
  "bedroomShotId": [
    "",
    "belly_elbows",
    "hug_pillow",
    "shoulder_glance",
    "blanket_half_face",
    "supine_high_phone",
    "reading_book",
    "cross_legged_timer",
    "stretch_yawn",
    "pillow_stack",
    "feet_in_frame",
    "ceiling_gaze",
    "blanket_cocoon",
    "bed_edge",
    "upside_bed_edge",
    "cheek_pillow",
    "mirror_floor",
    "mirror_face_phone",
    "mirror_double",
    "mirror_dresser",
    "mirror_45",
    "mirror_rear_flash",
    "mirror_close",
    "mirror_phone_gaze",
    "mirror_jacket",
    "mirror_wardrobe",
    "mirror_bed_reflection",
    "mirror_writing",
    "mirror_mist",
    "mirror_floor_angle",
    "mirror_half_face",
    "fingers_hair",
    "touch_chin",
    "peace_wink",
    "hot_cup",
    "adjust_glasses",
    "strand_twirl",
    "one_eye_cover",
    "cheek_hand",
    "laugh_closed_eyes",
    "headphones_touch",
    "finger_heart",
    "skincare",
    "wink_tongue",
    "hand_on_head",
    "block_lens",
    "high_angle",
    "low_angle",
    "side_profile",
    "half_light",
    "curtain_shadows",
    "ultrawide_rear",
    "eye_closeup",
    "frame_foreground",
    "silhouette",
    "motion_blur",
    "wall_lean",
    "laptop_reflection",
    "phone_on_floor",
    "door_light_strip",
    "inverted_phone",
    "edge_lean_both_elbows",
    "edge_one_knee_raised",
    "edge_half_turn_back",
    "edge_shirt_hem",
    "edge_palm_behind",
    "edge_ankle_cross",
    "side_knee_tucked",
    "side_pillow_under_arm",
    "supine_one_knee",
    "reclined_slide_down",
    "side_head_at_pillow_corner",
    "prone_one_knee_bent",
    "laptop_cross_legs_trackpad",
    "laptop_edge_typing_timer",
    "laptop_recline_chest",
    "laptop_side_floor",
    "laptop_notebook_compare",
    "laptop_tilt_screen",
    "floor_back_bed_knees",
    "floor_one_leg_extended",
    "floor_cross_leg_rug",
    "floor_lean_forward",
    "floor_elbow_bed_edge",
    "floor_phone_near_knee_timer",
    "wake_rub_eyes",
    "wake_reach_water",
    "pillow_adjust_behind_back",
    "duvet_draw_below_knees",
    "wake_ankle_stretch",
    "paper_reach_bed",
    "laptop_edge_trackpad",
    "laptop_edge_screen_glance",
    "laptop_rug_cross_legged",
    "laptop_dresser_standing",
    "laptop_side_bed_open",
    "laptop_reclined_reading",
    "laptop_high_angle_keyboard",
    "laptop_dresser_typing_timer"
  ],
  "mirrorMovementId": [
    "relaxed",
    "hand_hip",
    "touch_hair",
    "adjust_neckline",
    "adjust_hem",
    "hand_pocket",
    "peace",
    "touch_chin",
    "hand_chest",
    "wave",
    "rest_thigh"
  ],
  "mirrorPhoneHeightId": [
    "shot",
    "face",
    "chest",
    "waist"
  ],
  "mirrorDistanceId": [
    "shot",
    "close",
    "comfortable",
    "far"
  ],
  "mirrorFramingId": [
    "shot",
    "upper_body",
    "three_quarter",
    "full_body"
  ],
  "mirrorGazeId": [
    "shot",
    "reflection",
    "screen",
    "side"
  ],
  "lowerMaterialId": [
    "lightweight_cotton_appearance_jersey",
    "mediumweight_jersey",
    "stretch_jersey",
    "rib_knit",
    "lightweight_fleece_knit",
    "lightweight_woven_cotton_appearance"
  ],
  "lowerFitId": [
    "fitted",
    "regular",
    "relaxed",
    "oversized"
  ],
  "lowerStateId": [
    "observed_natural_state",
    "fresh_natural",
    "lightly_worn",
    "lightly_wrinkled",
    "slept_in",
    "lightly_damp"
  ],
  "bedroomClutterId": [
    "reference",
    "lived_in_messy"
  ]
})
export const PHYSICAL_SHOT_MODES=Object.freeze({
  "belly_elbows": "front",
  "hug_pillow": "front",
  "shoulder_glance": "front",
  "blanket_half_face": "front",
  "supine_high_phone": "front",
  "reading_book": "front",
  "cross_legged_timer": "timer",
  "stretch_yawn": "front",
  "pillow_stack": "front",
  "feet_in_frame": "front",
  "ceiling_gaze": "front",
  "blanket_cocoon": "front",
  "bed_edge": "front",
  "upside_bed_edge": "front",
  "cheek_pillow": "front",
  "mirror_floor": "mirror",
  "mirror_face_phone": "mirror",
  "mirror_double": "mirror",
  "mirror_dresser": "mirror",
  "mirror_45": "mirror",
  "mirror_rear_flash": "mirror",
  "mirror_close": "mirror",
  "mirror_phone_gaze": "mirror",
  "mirror_jacket": "mirror",
  "mirror_wardrobe": "mirror",
  "mirror_bed_reflection": "mirror",
  "mirror_writing": "mirror",
  "mirror_mist": "mirror",
  "mirror_floor_angle": "mirror",
  "mirror_half_face": "mirror",
  "fingers_hair": "front",
  "touch_chin": "front",
  "peace_wink": "front",
  "hot_cup": "front",
  "adjust_glasses": "front",
  "strand_twirl": "front",
  "one_eye_cover": "front",
  "cheek_hand": "front",
  "laugh_closed_eyes": "front",
  "headphones_touch": "front",
  "finger_heart": "front",
  "skincare": "front",
  "wink_tongue": "front",
  "hand_on_head": "front",
  "block_lens": "front",
  "high_angle": "front",
  "low_angle": "front",
  "side_profile": "front",
  "half_light": "front",
  "curtain_shadows": "front",
  "ultrawide_rear": "rear",
  "eye_closeup": "front",
  "frame_foreground": "front",
  "silhouette": "front",
  "motion_blur": "front",
  "wall_lean": "front",
  "laptop_reflection": "front",
  "phone_on_floor": "timer",
  "door_light_strip": "front",
  "inverted_phone": "front",
  "edge_lean_both_elbows": "timer",
  "edge_one_knee_raised": "front",
  "edge_half_turn_back": "front",
  "edge_shirt_hem": "front",
  "edge_palm_behind": "front",
  "edge_ankle_cross": "front",
  "side_knee_tucked": "front",
  "side_pillow_under_arm": "front",
  "supine_one_knee": "front",
  "reclined_slide_down": "front",
  "side_head_at_pillow_corner": "front",
  "prone_one_knee_bent": "front",
  "laptop_cross_legs_trackpad": "front",
  "laptop_edge_typing_timer": "timer",
  "laptop_recline_chest": "front",
  "laptop_side_floor": "front",
  "laptop_notebook_compare": "front",
  "laptop_tilt_screen": "front",
  "floor_back_bed_knees": "front",
  "floor_one_leg_extended": "front",
  "floor_cross_leg_rug": "front",
  "floor_lean_forward": "front",
  "floor_elbow_bed_edge": "front",
  "floor_phone_near_knee_timer": "timer",
  "wake_rub_eyes": "front",
  "wake_reach_water": "front",
  "pillow_adjust_behind_back": "front",
  "duvet_draw_below_knees": "front",
  "wake_ankle_stretch": "front",
  "paper_reach_bed": "front",
  "laptop_edge_trackpad": "front",
  "laptop_edge_screen_glance": "front",
  "laptop_rug_cross_legged": "front",
  "laptop_dresser_standing": "front",
  "laptop_side_bed_open": "front",
  "laptop_reclined_reading": "front",
  "laptop_high_angle_keyboard": "front",
  "laptop_dresser_typing_timer": "timer"
})
export const PHYSICAL_SHOT_POSTURES=Object.freeze({
  "laptop_edge_trackpad": "seated_bed",
  "laptop_edge_screen_glance": "seated_bed",
  "laptop_rug_cross_legged": "seated_floor",
  "laptop_dresser_standing": "standing",
  "laptop_side_bed_open": "side_lying_right",
  "laptop_reclined_reading": "reclined_pillows",
  "laptop_high_angle_keyboard": "seated_bed",
  "laptop_dresser_typing_timer": "standing",
  "edge_lean_both_elbows": "seated_bed",
  "edge_one_knee_raised": "seated_bed",
  "edge_half_turn_back": "seated_bed",
  "edge_shirt_hem": "seated_bed",
  "edge_palm_behind": "seated_bed",
  "edge_ankle_cross": "seated_bed",
  "side_knee_tucked": "side_lying_left",
  "side_pillow_under_arm": "side_lying_right",
  "supine_one_knee": "supine",
  "reclined_slide_down": "reclined_pillows",
  "side_head_at_pillow_corner": "side_lying_left",
  "prone_one_knee_bent": "prone",
  "laptop_cross_legs_trackpad": "seated_bed",
  "laptop_edge_typing_timer": "seated_bed",
  "laptop_recline_chest": "reclined_pillows",
  "laptop_side_floor": "side_lying_right",
  "laptop_notebook_compare": "seated_bed",
  "laptop_tilt_screen": "seated_bed",
  "floor_back_bed_knees": "seated_floor",
  "floor_one_leg_extended": "seated_floor",
  "floor_cross_leg_rug": "seated_floor",
  "floor_lean_forward": "seated_floor",
  "floor_elbow_bed_edge": "seated_floor",
  "floor_phone_near_knee_timer": "seated_floor",
  "wake_rub_eyes": "seated_bed",
  "wake_reach_water": "seated_bed",
  "pillow_adjust_behind_back": "reclined_pillows",
  "duvet_draw_below_knees": "seated_bed",
  "wake_ankle_stretch": "seated_bed",
  "paper_reach_bed": "seated_bed",
  "belly_elbows": "prone",
  "shoulder_glance": "side_lying_right",
  "cheek_pillow": "side_lying_right",
  "supine_high_phone": "supine",
  "ceiling_gaze": "supine",
  "upside_bed_edge": "supine",
  "reading_book": "reclined_pillows",
  "pillow_stack": "reclined_pillows",
  "mirror_bed_reflection": "seated_bed",
  "mirror_floor": "seated_floor",
  "mirror_dresser": "standing",
  "hug_pillow": "seated_bed",
  "blanket_half_face": "seated_bed",
  "cross_legged_timer": "seated_bed",
  "stretch_yawn": "seated_bed",
  "feet_in_frame": "seated_bed",
  "blanket_cocoon": "seated_bed",
  "bed_edge": "seated_bed",
  "cheek_hand": "seated_bed",
  "hot_cup": "seated_bed",
  "phone_on_floor": "seated_bed",
  "mirror_face_phone": "standing",
  "mirror_double": "standing",
  "mirror_45": "standing",
  "mirror_rear_flash": "standing",
  "mirror_close": "standing",
  "mirror_phone_gaze": "standing",
  "mirror_jacket": "standing",
  "mirror_wardrobe": "standing",
  "mirror_writing": "standing",
  "mirror_mist": "standing",
  "mirror_floor_angle": "standing",
  "mirror_half_face": "standing",
  "wall_lean": "standing",
  "fingers_hair": "seated_bed",
  "touch_chin": "seated_bed",
  "peace_wink": "seated_bed",
  "adjust_glasses": "seated_bed",
  "strand_twirl": "seated_bed",
  "one_eye_cover": "seated_bed",
  "laugh_closed_eyes": "seated_bed",
  "headphones_touch": "seated_bed",
  "finger_heart": "seated_bed",
  "skincare": "seated_bed",
  "wink_tongue": "seated_bed",
  "hand_on_head": "seated_bed",
  "block_lens": "seated_bed",
  "high_angle": "seated_bed",
  "low_angle": "seated_bed",
  "side_profile": "seated_bed",
  "half_light": "seated_bed",
  "curtain_shadows": "seated_bed",
  "ultrawide_rear": "seated_bed",
  "eye_closeup": "seated_bed",
  "frame_foreground": "seated_bed",
  "silhouette": "seated_bed",
  "motion_blur": "seated_bed",
  "laptop_reflection": "seated_bed",
  "door_light_strip": "seated_bed",
  "inverted_phone": "seated_bed"
})
export const PHYSICAL_GARMENTS=Object.freeze({
  "reference_garment_preserved": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "regular",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey"
    ]
  },
  "regular_crewneck_tshirt": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "regular",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey",
      "mediumweight_jersey",
      "stretch_jersey",
      "rib_knit"
    ]
  },
  "relaxed_crewneck_tshirt": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey",
      "mediumweight_jersey",
      "rib_knit"
    ]
  },
  "fitted_stretch_tshirt": {
    "category": "upper",
    "defaultMaterial": "stretch_jersey",
    "defaultFit": "fitted",
    "allowedMaterials": [
      "stretch_jersey"
    ]
  },
  "lightweight_long_sleeve_lounge_top": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "regular",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey",
      "mediumweight_jersey",
      "lightweight_fleece_knit"
    ]
  },
  "relaxed_sleep_tshirt": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey",
      "mediumweight_jersey"
    ]
  },
  "oversized_sleep_tshirt": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "oversized",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey",
      "mediumweight_jersey"
    ]
  },
  "lightweight_hoodie": {
    "category": "upper",
    "defaultMaterial": "lightweight_fleece_knit",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_fleece_knit",
      "mediumweight_jersey"
    ]
  },
  "knit_pajama_top": {
    "category": "upper",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey"
    ]
  },
  "woven_button_front_pajama_top": {
    "category": "upper",
    "defaultMaterial": "lightweight_woven_cotton_appearance",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_woven_cotton_appearance"
    ]
  },
  "lounge_shorts": {
    "category": "lower",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey",
      "lightweight_fleece_knit"
    ]
  },
  "lightweight_sweatpants": {
    "category": "lower",
    "defaultMaterial": "lightweight_fleece_knit",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_fleece_knit",
      "mediumweight_jersey"
    ]
  },
  "simple_pajama_trousers": {
    "category": "lower",
    "defaultMaterial": "lightweight_cotton_appearance_jersey",
    "defaultFit": "relaxed",
    "allowedMaterials": [
      "lightweight_cotton_appearance_jersey"
    ]
  }
})
export const DEFERRED_EXPRESSION_IDS=Object.freeze(["light_fatigue"])
