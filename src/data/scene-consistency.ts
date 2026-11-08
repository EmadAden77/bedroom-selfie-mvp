import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'
import {isLaptopSelfieShot} from './laptop-selfie-physics'
import {mirrorRearFlashNeedsSource,captureAllowsRearFlash,rearCaptureScreenOnlyConflict} from '../../shared/capture-lighting-rules'

/** One source, one feasible capture method. Never silently rewrite a selection. */
export function captureLightingIssues(ctx:Pick<CompilationContext,'bedroomShotId'|'nightLightingId'>):string[]{
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const lighting=ctx.nightLightingId||'phone_screen'
 const issues:string[]=[]
 if(mirrorRearFlashNeedsSource(shot?.id,lighting))
  issues.push('وضعية فلاش المرآة تحتاج فلاش الكاميرا الخلفية.')
 if(lighting==='laptop_screen'&&!isLaptopSelfieShot(ctx.bedroomShotId))
  issues.push('إضاءة شاشة اللابتوب تتطلب وضعية لابتوب حقيقية.')
 if(lighting==='camera_flash'&&!captureAllowsRearFlash(shot?.mode||'front'))
  issues.push('فلاش الكاميرا الخلفية لا يناسب السيلفي الأمامي أو المؤقت؛ اختر تصويرًا خلفيًا أو مرآة.')
 if(rearCaptureScreenOnlyConflict(shot?.mode,lighting))
  issues.push('شاشة الهاتف المواجهة بعيدًا عن الشخص لا يمكن أن تكون المصدر الوحيد لإضاءة الكاميرا الخلفية.')
 if(['curtain_shadows','door_light_strip','silhouette','half_light'].includes(ctx.bedroomShotId||''))
  issues.push('هذه الوضعية تحتاج إضاءة محيطية أو مصدرًا إضافيًا لم يعد مسموحًا؛ اختر وضعية أخرى.')
 return issues
}
export function reconcileCaptureSelection(previous:CompilationContext,patch:Partial<CompilationContext>):CompilationContext{
 return {...previous,...patch}
}
