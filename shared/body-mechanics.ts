/**
 * V2.1 canonical body-mechanics contract.
 * Pure TypeScript shared by the browser's deterministic compiler and Vercel's
 * independent scene-specification validator. No image pixels or made-up measures.
 */
export type BodyStatus='VALID'|'NEEDS_INFORMATION'|'INVALID'
export type BodyCertainty='selected'|'reference_confirmed'|'derived'|'estimated'|'unknown'
export type BodyPosture='standing'|'seated_bed'|'seated_floor'|'reclined_pillows'|'side_lying_right'|'side_lying_left'|'supine'|'prone'
export type CameraMode='front'|'mirror'|'rear'|'timer'
export type HoldingHand='auto'|'left'|'right'|'none'
export type SupportChoice='auto'|'mattress'|'floor'|'none'|'unknown'
export type FreeHandTask='auto'|'free'|'surface_support'|'phone'
export type BodyVisibility='visible'|'occluded'|'outside_crop'|'unknown'|'absent'
export type ContactRelation={
 actorId:string;targetId:string;contactType:'support'|'touch'|'grip'|'pressure'|'occlusion'
 certainty:BodyCertainty;cause:string
}
export type BodyMechanicalInput={
 shotId:string;posture:string;capture:CameraMode
 holdingHand:HoldingHand;supportChoice:SupportChoice
 freeHandTask:FreeHandTask;feetVisibility:BodyVisibility
}
export type BodyIssue={code:string;messageAr:string;controls:string[]}
export type BodyMechanicalState={
 status:BodyStatus;input:BodyMechanicalInput;supportSurface:'mattress'|'floor'|'unknown'
 contacts:ContactRelation[];deformations:{targetId:string;region:string;cause:string;certainty:BodyCertainty}[]
 visibility:{feet:BodyVisibility;oppositeHand:BodyVisibility}
 issues:BodyIssue[];uncertainties:string[]
}
const postures:readonly string[]=['standing','seated_bed','seated_floor','reclined_pillows','side_lying_right','side_lying_left','supine','prone']
const cameraModes:readonly string[]=['front','mirror','rear','timer']
const hands:readonly string[]=['auto','left','right','none']
const surfaces:readonly string[]=['auto','floor','mattress','none','unknown']
const tasks:readonly string[]=['auto','free','surface_support','phone']
const visibilities:readonly string[]=['visible','occluded','outside_crop','unknown','absent']
const fixedHands:Readonly<Partial<Record<string,'left'|'right'>>>={
 side_knee_tucked:'right',laptop_side_bed_open:'left'
}
const pillowShots=new Set([
 'pillow_stack','reading_book','cheek_pillow','side_knee_tucked',
 'side_head_at_pillow_corner','laptop_side_bed_open','pillow_adjust_behind_back',
 'reclined_slide_down','laptop_reclined_reading','laptop_recline_chest',
 'side_pillow_under_arm','upside_bed_edge','supine_high_phone'
])
const bedElbowShots=new Set(['floor_elbow_bed_edge'])
const armPillowShots=new Set(['side_pillow_under_arm'])
const specifiedFreeHandContacts:Readonly<Record<string,{targetId:string;contactType:'touch'|'grip'|'support';cause:string}>>={
 hug_pillow:{targetId:'bed.pillow',contactType:'grip',cause:'selected_pillow_hug'},
 reading_book:{targetId:'selected.book',contactType:'grip',cause:'selected_reading_book'},
 edge_one_knee_raised:{targetId:'subject.raised_knee',contactType:'touch',cause:'selected_knee_contact'},
 floor_lean_forward:{targetId:'subject.knee',contactType:'support',cause:'selected_forearm_knee_support'},
 edge_shirt_hem:{targetId:'selected.shirt_hem',contactType:'grip',cause:'selected_hem_adjustment'},
 mirror_jacket:{targetId:'selected.garment_neckline',contactType:'touch',cause:'selected_neckline_adjustment'},
 laptop_edge_trackpad:{targetId:'laptop.trackpad',contactType:'touch',cause:'selected_trackpad_use'},
 laptop_dresser_standing:{targetId:'laptop.trackpad',contactType:'touch',cause:'selected_trackpad_use'},
 laptop_side_bed_open:{targetId:'laptop.trackpad',contactType:'touch',cause:'selected_trackpad_use'},
 laptop_tilt_screen:{targetId:'laptop.screen_edge',contactType:'grip',cause:'selected_laptop_screen_adjustment'}
}
const freeSupportShots=new Set(['floor_lean_forward','floor_one_leg_extended','edge_palm_behind','floor_elbow_bed_edge'])
export function validateBodyInput(input:BodyMechanicalInput):boolean{
 return !!input&&typeof input.shotId==='string'&&input.shotId.length<100&&typeof input.posture==='string'&&input.posture.length<100&&
  cameraModes.includes(input.capture)&&hands.includes(input.holdingHand)&&surfaces.includes(input.supportChoice)&&
  tasks.includes(input.freeHandTask)&&visibilities.includes(input.feetVisibility)
}
/** Normalized input contains explicit choices, not claimed contact or validation flags. */
export function evaluateBodyMechanics(input:BodyMechanicalInput):BodyMechanicalState{
 if(!validateBodyInput(input))throw Error('BODY_INPUT_INVALID')
 const issues:BodyIssue[]=[]
 const uncertainties:string[]=[]
 const contacts:ContactRelation[]=[]
 const deformations:BodyMechanicalState['deformations']=[]
 const add=(actorId:string,targetId:string,contactType:ContactRelation['contactType'],certainty:BodyCertainty,cause:string)=>{
  contacts.push({actorId,targetId,contactType,certainty,cause})
 }
 const error=(code:string,messageAr:string,controls:string[])=>issues.push({code,messageAr,controls})
 let supportSurface:BodyMechanicalState['supportSurface']='unknown'
 if(!postures.includes(input.posture)){
  uncertainties.push('POSTURE_UNSPECIFIED')
 }else{
  supportSurface=input.posture==='standing'||input.posture==='seated_floor'?'floor':'mattress'
  if(input.supportChoice==='none'||(input.supportChoice!=='auto'&&input.supportChoice!=='unknown'&&input.supportChoice!==supportSurface)){
   error('BODY_SUPPORT_CONFLICT','سطح الارتكاز المحدد لا يتوافق مع وضعية الجسم.',['poseId','bodySupportChoice','bedroomShotId'])
  }
  if(input.supportChoice==='unknown')uncertainties.push('SUPPORT_SURFACE_NOT_CONFIRMED')
  if(supportSurface==='floor'){
   if(input.posture==='standing'){
    add('subject.feet','room.floor','support','derived','standing_base')
    uncertainties.push('CENTER_OF_MASS_NOT_MEASURED')
   }else{
    add('subject.pelvis','room.floor','support','derived','seated_floor_base')
    uncertainties.push('LEG_CONTACT_GEOMETRY_UNMEASURED')
   }
  }else{
   add('subject.pelvis','bed.mattress','support','derived','body_on_bed')
   if(['supine','prone','side_lying_right','side_lying_left','reclined_pillows'].includes(input.posture))
    add('subject.torso','bed.mattress','support','derived','reclining_body_support')
   if(input.posture==='seated_bed'){
    add('subject.thighs','bed.mattress','touch','estimated','plausible_seated_leg_contact')
   }
   deformations.push({targetId:'bed.mattress',region:'pelvis_contact',cause:'subject.pelvis',certainty:'derived'})
   if(['supine','prone','side_lying_right','side_lying_left','reclined_pillows'].includes(input.posture))
    deformations.push({targetId:'bed.mattress',region:'torso_contact',cause:'subject.torso',certainty:'derived'})
  }
  if(pillowShots.has(input.shotId)||armPillowShots.has(input.shotId)){
   if(armPillowShots.has(input.shotId)){
    add('subject.free_forearm','bed.pillow','pressure','derived','selected_pillow_forearm_contact')
    deformations.push({targetId:'bed.pillow',region:'forearm_contact',cause:'subject.free_forearm',certainty:'derived'})
   }else{
   add('subject.head_or_back','bed.pillow','pressure','derived','selected_pillow_contact_shot')
   deformations.push({targetId:'bed.pillow',region:'actual_body_contact',cause:'subject.head_or_back',certainty:'derived'})
   }
  }
  if(bedElbowShots.has(input.shotId)){
   add('subject.free_elbow','bed.mattress','pressure','derived','selected_floor_elbow_bed_contact')
   deformations.push({targetId:'bed.mattress',region:'elbow_contact',cause:'subject.free_elbow',certainty:'derived'})
  }
 }
 if(input.capture==='timer'){
  if(input.holdingHand!=='auto'&&input.holdingHand!=='none')
   error('BODY_TIMER_HAND_OCCUPIED','لقطة المؤقت تتطلب هاتفًا مستندًا، وليس ممسوكًا باليد.',['bodyHoldingHand','bedroomShotId'])
  if(input.freeHandTask==='phone')
   error('BODY_TIMER_GRIP_CONFLICT','لا يمكن وصف اليد الحرة بأنها تمسك هاتف التصوير أثناء المؤقت.',['bodyFreeHandTask','bedroomShotId'])
  add('phone','existing.stable_support','support','estimated','timer_camera_requires_surface')
  uncertainties.push('TIMER_SUPPORT_EXACT_ANCHOR_UNVERIFIED')
 }else{
  if(input.holdingHand==='none')
   error('BODY_HANDHELD_REQUIRES_GRIP','التصوير باليد أو أمام المرآة يتطلب يدًا تمسك الهاتف.',['bodyHoldingHand','bedroomShotId'])
  const fixed=fixedHands[input.shotId]
  if(fixed&&input.holdingHand!=='auto'&&input.holdingHand!=='none'&&input.holdingHand!==fixed)
   error('BODY_FIXED_HAND_CONFLICT','هذه الوضعية تحدد يد التصوير الأخرى؛ لن يتم تبديل اليد تلقائيًا.',['bodyHoldingHand','bedroomShotId'])
  if(input.freeHandTask==='phone')
   error('BODY_HAND_OCCUPANCY_CONFLICT','اليد الحرة لا يمكن أن تكون يد تصوير ثانية في لقطة الهاتف الواحد.',['bodyFreeHandTask','bodyHoldingHand'])
  const hand=input.holdingHand==='auto'?(fixed||'unassigned'):input.holdingHand
  if(hand!=='none')add(hand==='unassigned'?'subject.camera_hand':'subject.'+hand+'_hand','phone','grip',hand==='unassigned'?'estimated':fixed?'derived':'selected','single_reachable_phone_grip')
  uncertainties.push('WRIST_ELBOW_SHOULDER_ANGLES_UNMEASURED')
  if(input.capture==='mirror')uncertainties.push('MIRROR_RAY_COORDINATES_UNMEASURED')
 }
 const selectedFreeHand=specifiedFreeHandContacts[input.shotId]
 if(selectedFreeHand){
  if(input.freeHandTask==='free'||input.freeHandTask==='surface_support'&&selectedFreeHand.contactType!=='support')
   error('BODY_FREE_HAND_TASK_CONFLICT','مهمة اليد الأخرى تتعارض مع التلامس المطلوب في الوضعية المختارة.',['bodyFreeHandTask','bedroomShotId'])
  add('subject.free_hand',selectedFreeHand.targetId,selectedFreeHand.contactType,'derived',selectedFreeHand.cause)
 }
 if(input.freeHandTask==='surface_support'&&!freeSupportShots.has(input.shotId)&&!selectedFreeHand)
  uncertainties.push('FREE_HAND_SUPPORT_TARGET_UNCONFIRMED')
 if(input.freeHandTask==='surface_support'&&freeSupportShots.has(input.shotId)&&!selectedFreeHand)
  add('subject.free_hand','existing.support_surface','support','derived','selected_free_hand_support')
 if(input.feetVisibility==='outside_crop'||input.feetVisibility==='occluded'||input.feetVisibility==='unknown')
  uncertainties.push('FOOT_POSITION_NOT_OBSERVABLE')
 if(input.feetVisibility==='absent'&&input.posture==='standing')
  error('BODY_STANDING_FEET_ABSENT','الوقوف دون قدم داعمة أو دعم بديل تعارض مؤكد.',['bodyFeetVisibility','poseId'])
 const status:BodyStatus=issues.length?'INVALID':
  (!postures.includes(input.posture)||input.supportChoice==='unknown'||input.feetVisibility==='absent'&&input.posture!=='standing')?'NEEDS_INFORMATION':'VALID'
 return {status,input:{...input},supportSurface,contacts,deformations,
  visibility:{feet:input.feetVisibility,oppositeHand:'unknown'},issues,uncertainties}
}
/** Only factual qualitative relationships are sent to the immutable prompt unit. */
export function renderBodyMechanics(state:BodyMechanicalState):string{
 const parts=['BODY MECHANICS V2.1 CONTRACT:']
 if(state.status==='INVALID')return parts.concat('Unresolved body support and hand conflict; scene cannot be generated.').join(' ')
 const phrases:Record<string,string>={
 'subject.feet|room.floor':'At least one supporting foot transfers weight to the actual room floor.',
 'subject.pelvis|room.floor':'Seated pelvis is supported by the existing floor/rug surface, not the bed.',
 'subject.pelvis|bed.mattress':'Pelvis receives support from the actual mattress.',
 'subject.torso|bed.mattress':'Torso makes posture-dependent supported contact with the mattress.',
 'subject.thighs|bed.mattress':'Thigh fabric can rest at a natural seated mattress contact when actually touching.',
 'subject.head_or_back|bed.pillow':'Selected pillow supports only the contacting head/back region.',
 'subject.free_elbow|bed.mattress':'The selected free elbow presses the bed edge while the pelvis remains on the floor.',
 'subject.free_forearm|bed.pillow':'The free forearm rests on the pillow; only its true contact region compresses.',
 'subject.free_hand|bed.pillow':'Only the available free hand grips the selected pillow.',
 'subject.free_hand|selected.book':'The free hand grips the selected book without interrupting the separate phone grip.',
 'subject.free_hand|laptop.trackpad':'The selected free hand reaches the existing laptop trackpad.',
 'subject.free_hand|laptop.screen_edge':'The free hand adjusts the supported laptop screen edge.',
 'subject.free_hand|subject.raised_knee':'The free hand touches the raised knee.',
 'subject.free_hand|subject.knee':'The free forearm braces on the knee.',
 'subject.free_hand|selected.shirt_hem':'The free hand tugs the actual selected shirt hem.',
 'subject.free_hand|selected.garment_neckline':'The free hand adjusts the actually selected garment neckline.',
 'phone|existing.stable_support':'Timer phone rests on a real stable surface; neither hand grips the recording phone.',
 'subject.camera_hand|phone':'One anatomically continuous camera arm supports the handheld phone; exact joint angles are not asserted.',
 'subject.left_hand|phone':'The selected left hand grips the recording phone, supported through a continuous shoulder, elbow and wrist.',
 'subject.right_hand|phone':'The selected right hand grips the recording phone, supported through a continuous shoulder, elbow and wrist.',
 'subject.free_hand|existing.support_surface':'The free hand contacts a real supporting surface as required by the selected pose.'
 }
 for(const c of state.contacts){const phrase=phrases[c.actorId+'|'+c.targetId];if(phrase)parts.push(phrase)}
 if(state.deformations.some(d=>d.targetId==='bed.mattress'))
  parts.push('Mattress compression is limited to '+state.deformations.filter(d=>d.targetId==='bed.mattress').map(d=>d.region.replace(/_/g,' ')).join(' and ')+'.')
 if(state.deformations.some(d=>d.targetId==='bed.pillow'))parts.push('Pillow compresses locally under its established body contact.')
 if(state.deformations.every(d=>d.targetId!=='bed.mattress'))parts.push('No unsupported mattress deformation.')
 if(state.visibility.feet==='outside_crop'||state.visibility.feet==='occluded')
  parts.push('Feet outside the crop and visually blocked feet are not treated as physically absent; exact hidden positions are not asserted.')
 parts.push('Keep selected posture, garment, room anchors, camera profile and lighting unchanged. Do not invent joint angles and hidden limb positions.')
 return parts.join(' ')
}
