import type {CompilationContext} from '../domain/types'
import {bedroomShots} from './bedroom-shots'
import {isLaptopSelfieShot} from './laptop-selfie-physics'

/** Shared capture/light invariants for the local compiler and the Gemini UI. */
export function captureLightingIssues(ctx:Pick<CompilationContext,'bedroomShotId'|'nightLightingId'>):string[]{
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const lighting=ctx.nightLightingId||'phone_screen_only'
 const issues:string[]=[]
 if(shot?.id==='mirror_rear_flash'&&lighting!=='rear_flash')
  issues.push('وضعية فلاش المرآة تحتاج فلاش الكاميرا الخلفية.')
 if(lighting==='laptop_screen_only'&&!isLaptopSelfieShot(ctx.bedroomShotId))
  issues.push('إضاءة شاشة اللابتوب تتطلب وضعية لابتوب حقيقية.')
 if(lighting==='rear_flash'&&shot?.mode!=='rear'&&shot?.mode!=='mirror')
  issues.push('فلاش الكاميرا الخلفية لا يناسب السيلفي الأمامي أو المؤقت؛ اختر تصويرًا خلفيًا أو مرآة.')
 if(lighting==='phone_screen_only'&&shot?.mode==='rear')
  issues.push('شاشة الهاتف المواجهة بعيدًا عن الشخص لا يمكن أن تكون المصدر الوحيد لإضاءة سيلفي الكاميرا الخلفية.')
 return issues
}

/** Preserve all selections: conflict resolution requires an explicit UI action. */
export function reconcileCaptureSelection(previous:CompilationContext,patch:Partial<CompilationContext>):CompilationContext{
 return {...previous,...patch}
}
