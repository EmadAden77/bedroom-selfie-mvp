import {PHYSICAL_OPTION_IDS,PHYSICAL_SHOT_MODES,PHYSICAL_SHOT_POSTURES,PHYSICAL_GARMENTS,DEFERRED_EXPRESSION_IDS} from './physical-choice-catalog.mjs'

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
 const required=new Set(['hairVariantId','expressionVariantId','upperGarmentId','materialId','fitId','stateId'])
 for(const [field,available] of Object.entries(PHYSICAL_OPTION_IDS)){
  const value=field==='bedroomShotId'?shot:field==='nightLightingId'?light:s[field]
  if(value===undefined||value===null||value===''){
   if(required.has(field))
    add('required-'+field,'clothing',[field],
     field==='upperGarmentId'?'القطعة العلوية مطلوبة - Upper garment is required':field==='hairVariantId'?'Hair variant required':field==='expressionVariantId'?'Expression variant required':field+' required',
     'اختر قيمة مطلوبة من القائمة.')
  }else if(!available.includes(value)){
   const messages={
    hairVariantId:'Hair variant invalid: '+value,
    realismIntensity:'Invalid realism intensity',bedroomClutterId:'Invalid bedroom clutter appearance',
    promptTarget:'Invalid image prompt target',hairstyleMode:'Invalid hairstyle mode',
    hairDirection:'Invalid hair direction',hairVolume:'Invalid hair volume',hairTexture:'Invalid hair texture',
    gazeId:'Invalid gaze selection',microExpressionId:'Invalid micro-expression selection',
    expressionVariantId:'Expression variant invalid: '+value,
    upperGarmentId:'Upper garment invalid: '+value,
    lowerGarmentId:'Lower garment must be category lower: '+value,
    fitId:'Fit invalid: '+value,
    stateId:'State invalid: '+value,
    nightLightingId:'Night lighting preset invalid',
    poseId:'Invalid pose geometry',faceDirectionId:'Invalid face direction',
    lampSideId:'Invalid lamp side',bedroomShotId:'Unknown bedroom shot'
   }
   add('option-'+field,'capture',[field],messages[field]||'Invalid '+field+' selection: '+value,
    'اختر قيمة من الخيارات المعرّفة أو عدل السجل المركزي قبل إضافتها.')
  }
 }
 if(DEFERRED_EXPRESSION_IDS.includes(s.expressionVariantId))
  add('deferred-expression','biomechanics',['expressionVariantId'],
   'Expression '+s.expressionVariantId+' is Deferred Composite State and not selectable - light_fatigue is not available in pure expressions',
   'اختر تعبيرًا متاحًا.')
 if(shot&&PHYSICAL_SHOT_MODES[shot]&&mode!==PHYSICAL_SHOT_MODES[shot])
  add('shot-mode','geometry',['bedroomShotId'],'Shot capture mode does not match its registered camera','استخدم وضع الكاميرا المسجل لهذه اللقطة.')
 if(shot&&PHYSICAL_SHOT_POSTURES[shot]&&s.shotPosture!==PHYSICAL_SHOT_POSTURES[shot])
  add('shot-support','biomechanics',['bedroomShotId','poseId'],'Selected shot posture does not match its registered anatomical support','استخدم الوضعية المعرّفة للّقطة.')
 const upperRule=PHYSICAL_GARMENTS[s.upperGarmentId]
 if(upperRule&&upperRule.category==='upper'&&s.upperGarmentId!=='reference_garment_preserved'&&s.materialId&&!upperRule.allowedMaterials.includes(s.materialId))
  out.push({id:'upper-material-compatibility',status:'WARNING',category:'clothing',
   fields:['upperGarmentId','materialId'],
   reason:'Material '+s.materialId+' may not be compatible with '+s.upperGarmentId,
   repair:'اختر خامة معتمدة لهذه القطعة أو راجع مادتها الفعلية قبل اعتماد المشهد.'})
 if(s.stateId==='slept_in'||s.stateId==='lightly_damp')
  out.push({id:'upper-state-evidence',status:'WARNING',category:'clothing',fields:['stateId'],
   reason:s.stateId==='slept_in'?'حالة slept_in تتطلب سياق نوم صريح':'حالة lightly_damp تتطلب طلب صريح',
   repair:'استخدم حالة تتطابق مع السياق الذي اخترته بالفعل.'})
 if(mode==='mirror'&&light==='phone_screen_only')
  out.push({id:'mirror-underexposure',status:'WARNING',category:'lighting',
   fields:['bedroomShotId','nightLightingId'],
   reason:'Mirror selfie may be severely underexposed with phone screen only',
   repair:'يمكن إبقاء المشهد مظلمًا؛ لا تضف إضاءة مخفية.'})
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
 if(shot&&s.poseId&&s.shotPosture&&s.poseId!==s.shotPosture)
  out.push({id:'shot-posture',status:'WARNING',category:'biomechanics',
   fields:['bedroomShotId','poseId'],
   reason:'الوضعية العامة تختلف عن وضعية اللقطة؛ المترجم الحالي يعتمد وضعية اللقطة صراحةً.',
   repair:'وحّد اختيار الوضعية مع وضعية اللقطة، أو ألغِ اختيار اللقطة.'})
 if(mode==='mirror'&&shot){
  if(!s.roomReferencePresent)
   out.push({id:'mirror-reference',status:'UNKNOWN',category:'reference',
    fields:['roomReferencePresent','bedroomShotId'],
    reason:'صورة الغرفة غير متاحة؛ هندسة المرآة المحددة نصيًا لا تثبت أبعادها أو ما يظهر داخل الانعكاس.',
    repair:'أضف صورة مرجعية للغرفة إذا كانت متاحة، وإلا تجنب ادعاء أبعاد دقيقة.'})
  else
   out.push({id:'mirror-measurements',status:'UNKNOWN',category:'geometry',
    fields:['mirrorDistanceId','mirrorFramingId'],
    reason:'لا توجد قياسات معايرة للمرآة أو المسافات أو مجال رؤية الكاميرا؛ لا يمكن إثبات خلو مسار الانعكاس من الحجب.',
    repair:'استخدم وصفًا نسبيًا واحفظ مواقع الأثاث. يمكن إدخال قياسات موثوقة لاحقًا.'})
 }
 if(!s.referenceImagePresent)
  out.push({id:'person-reference',status:'UNKNOWN',category:'reference',
   fields:['referenceImagePresent'],
   reason:'لم تُرفق صورة هوية؛ لا يمكن التحقق من تفاصيل الوجه أو خط الشعر أو الملابس المرجعية.',
   repair:'أرفق صورة الهوية إن أردت مطابقة الملامح، دون اختراع تفاصيل مفقودة.'})
 if(shot||s.poseId)
  out.push({id:'unmeasured-contact',status:'UNKNOWN',category:'biomechanics',
   fields:['bedroomShotId','poseId'],
   reason:'التلامس والضغط ومركز الثقل مقيّدون وصفيًا، لكن لا توجد بيانات مفاصل أو كتل أو أسطح ثلاثية الأبعاد لإثباتهم عدديًا.',
   repair:'استخدم أوصاف دعم الوزن والتلامس الحالية؛ لا تستنتج قياسات أو قوى رقمية.'})
 return out
}
