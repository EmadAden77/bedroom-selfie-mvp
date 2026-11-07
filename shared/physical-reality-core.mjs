/** Deterministic camera/light compatibility contract shared by the browser and Vercel.
 * Standalone ESM with no transitive source imports, Node polyfills or network access.
 * Return only established contradictions. Missing dimensions remain UNKNOWN elsewhere.
 */
export function captureLightingIssuesCore(shotId, mode, lighting){
 const issues=[]
 if(shotId==='mirror_rear_flash'&&lighting!=='rear_flash')
  issues.push('وضعية فلاش المرآة تحتاج فلاش الكاميرا الخلفية.')
 if(lighting==='laptop_screen_only'&&!(shotId.startsWith('laptop_')&&shotId!=='laptop_reflection'))
  issues.push('إضاءة شاشة اللابتوب تتطلب وضعية لابتوب حقيقية.')
 if(lighting==='rear_flash'&&mode!=='rear'&&mode!=='mirror')
  issues.push('فلاش الكاميرا الخلفية لا يناسب السيلفي الأمامي أو المؤقت؛ اختر تصويرًا خلفيًا أو مرآة.')
 if(lighting==='phone_screen_only'&&mode==='rear')
  issues.push('شاشة الهاتف المواجهة بعيدًا عن الشخص لا يمكن أن تكون المصدر الوحيد لإضاءة سيلفي الكاميرا الخلفية.')
 return issues
}

/** Shared deterministically verifiable scene constraints. Does not simulate pixels. */
export const MIRROR_FIXED_ACTION_SHOTS=['mirror_floor','mirror_double','mirror_dresser','mirror_jacket','mirror_writing']
export const MIRROR_FIXED_HEIGHT={mirror_floor_angle:'waist',mirror_face_phone:'face'}
export const MIRROR_FIXED_DISTANCE={mirror_close:'close'}
export const MIRROR_FIXED_GAZE={mirror_phone_gaze:'screen',mirror_mist:'reflection',mirror_half_face:'reflection'}
export const MIRROR_ENUMS={
 mirrorMovementId:['relaxed','hand_hip','touch_hair','adjust_neckline','adjust_hem','hand_pocket','peace','touch_chin','hand_chest','wave','rest_thigh'],
 mirrorPhoneHeightId:['shot','face','chest','waist'],
 mirrorDistanceId:['shot','close','comfortable','far'],
 mirrorFramingId:['shot','upper_body','three_quarter','full_body'],
 mirrorGazeId:['shot','reflection','screen','side']
}
export const REFERENCE_UPPER_LOCK={
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character'
}
export function inspectSharedScene(s){
 const out=[]
 const add=(id,category,fields,reason,repair)=>out.push({id,status:'CONFLICT',category,fields,reason,repair})
 const mode=s.mode||'front',shot=s.shotId||'',light=s.nightLightingId||'phone_screen_only'
 for(const [i,reason] of captureLightingIssuesCore(shot,mode,light).entries())
  add('capture-light-'+i,'lighting',['bedroomShotId','nightLightingId'],reason,'غيّر الإضاءة أو اللقطة صراحةً.')
 if(shot.startsWith('mirror_')&&mode!=='mirror')
  add('mirror-mode','geometry',['bedroomShotId'],'لقطة المرآة تتطلب الانعكاس بكاميرا خلفية.','اختر وضع المرآة.')
 if(light==='window_streetlight'&&s.windowUncovered!==true)
  add('window-covered','lighting',['nightLightingId','windowUncovered'],'Streetlight requires an uncovered window and open curtains','افتح الستائر أو غيّر مصدر الضوء.')
 if(shot==='curtain_shadows'&&s.windowUncovered!==true)
  add('curtain-covered','lighting',['bedroomShotId','windowUncovered'],'Curtain shadow shot requires uncovered window','افتح الستائر أو غيّر اللقطة.')
 if(shot==='half_light'&&!['bedside_warm','lamp_and_screen','hallway_spill','window_streetlight'].includes(light))
  add('side-light','lighting',['bedroomShotId','nightLightingId'],'Half-lit face requires an actual off-axis source','اختر مصدرًا جانبيًا حقيقيًا.')
 if(shot==='silhouette'&&!['bedside_warm','television_screen','sunset_projector'].includes(light))
  add('silhouette-light','lighting',['bedroomShotId','nightLightingId'],'Silhouette needs an actual brighter source behind the subject','اختر مصدرًا خلفيًا حقيقيًا.')
 if(mode==='mirror'){
  for(const [field,choices] of Object.entries(MIRROR_ENUMS))
   if(s[field]&&!choices.includes(s[field]))
    add('mirror-option-'+field,'geometry',[field],'Unknown mirror '+field,'اختر قيمة مرآة معرّفة.')
  if(MIRROR_FIXED_ACTION_SHOTS.includes(shot)&&s.mirrorMovementId&&s.mirrorMovementId!=='relaxed')
   add('mirror-free-hand','biomechanics',['bedroomShotId','mirrorMovementId'],'Mirror shot already assigns the free hand a task','اجعل الحركة relaxed أو اختر لقطة أخرى.')
  for(const [field,required,reason] of [
   ['mirrorPhoneHeightId',MIRROR_FIXED_HEIGHT[shot],'Mirror camera height conflicts with selected shot'],
   ['mirrorDistanceId',MIRROR_FIXED_DISTANCE[shot],'Mirror distance conflicts with selected shot'],
   ['mirrorGazeId',MIRROR_FIXED_GAZE[shot],'Mirror gaze conflicts with selected shot']
  ]){
   if(required&&s[field]&&s[field]!=='shot'&&s[field]!==required)
    add('mirror-fixed-'+field,'geometry',['bedroomShotId',field],reason,'اختر shot أو قيمة اللقطة نفسها.')
  }
 }
 if(s.upperGarmentId==='reference_garment_preserved'){
  for(const [field,required] of Object.entries(REFERENCE_UPPER_LOCK)){
   if(s[field]!==required){
    const reason=field==='stateId'?'reference_garment_preserved must be observed_natural_state':
     field==='surface'?'reference_garment_preserved cannot change surface - locked':
     'reference_garment_preserved cannot change '+({materialId:'material',fitId:'fit',color:'color'}[field])+' - locked to observed '+({materialId:'material',fitId:'fit',color:'color'}[field])
    add('reference-upper-'+field,'clothing',['upperGarmentId',field],reason,'استعد القيمة المرجعية أو اختر قطعة أخرى.')
   }
  }
 }
 if(s.surface==='ribbed'&&s.materialId!=='rib_knit')
  add('upper-rib','clothing',['surface','materialId'],'Ribbed surface requires rib_knit material','اختر rib_knit أو سطحًا آخر.')
 if(s.lowerGarmentId&&s.lowerSurface==='ribbed'&&s.lowerMaterialId!=='rib_knit')
  add('lower-rib','clothing',['lowerSurface','lowerMaterialId'],'Ribbed lower surface requires rib_knit material','اختر rib_knit أو سطحًا آخر.')
 if((s.upperGarmentId==='oversized_sleep_tshirt'&&s.fitId==='fitted')||
    (s.upperGarmentId==='fitted_stretch_tshirt'&&s.fitId==='oversized'))
  add('upper-fit','clothing',['upperGarmentId','fitId'],'Fitted و Oversized لا يجتمعان في قطعة واحدة','اختر قصّة متوافقة.')
 const room=s.roomPhysicalState
 if(room!==null&&room!==undefined){
  if(!room||typeof room!=='object'||Array.isArray(room))
   add('room-object','room',['roomPhysicalState'],'Invalid room physical state','راجع إعداد الغرفة.')
  else{
   if(!['reference','light','medium','clear'].includes(room.order))
    add('room-order','room',['roomPhysicalState'],'Invalid room order','اختر درجة ترتيب معروفة.')
   if(!['reference','touch','dust'].includes(room.surface))
    add('room-surface','room',['roomPhysicalState'],'Invalid room surface','اختر سطحًا معروفًا.')
   if(!Array.isArray(room.zones)||room.zones.some(x=>!['bed','floor','dresser','nightstand'].includes(x))||new Set(room.zones).size!==room.zones.length)
    add('room-zones','room',['roomPhysicalState'],'Invalid editable room zones','اختر مناطق غير مكررة.')
   if(typeof room.sessionLocked!=='boolean')
    add('room-lock','room',['roomPhysicalState'],'Invalid room session lock','حدد تثبيت الجلسة.')
  }
 }
 return out
}
