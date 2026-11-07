import React from 'react'
import type {CompilationContext} from '../../domain/types'
import {deriveBodyScene} from '../../engine/body-mechanics'

type Props={ctx:CompilationContext;onChange:(patch:Partial<CompilationContext>)=>void}
export const BodyMechanicsSelector:React.FC<Props>=({ctx,onChange})=>{
 const state=deriveBodyScene(ctx)
 const statusText=state.status==='INVALID'?'تعارض فيزيائي مؤكد':state.status==='NEEDS_INFORMATION'?'تحتاج معلومات إضافية':'المتطلبات المدعومة متسقة'
 return <section className="card" aria-label="فحص ميكانيكا الجسم V2.1">
  <h2 style={{fontSize:15,margin:'0 0 8px'}}>🦴 ميكانيكا الجسم والتلامس — V2.1</h2>
  <p style={{fontSize:12,color:'var(--muted)'}}>يتحقق النظام من ارتكاز الجسم ويد الهاتف والتلامس مع السرير، دون تحريك الأثاث أو اختراع قياسات. اختلاف موضع الجسم أو الكاميرا لا يغيّر اختياراتك.</p>
  <p role="status" style={{fontSize:12,fontWeight:650}}>{statusText} — {state.status}</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:8}}>
   <label style={{fontSize:12}}>يد الهاتف
    <select className="input" value={ctx.bodyHoldingHand||'auto'} onChange={e=>onChange({bodyHoldingHand:e.target.value as CompilationContext['bodyHoldingHand']})}>
     <option value="auto">حسب الوضعية / غير محددة</option><option value="right">اليمنى</option><option value="left">اليسرى</option><option value="none">بدون إمساك</option>
    </select>
   </label>
   <label style={{fontSize:12}}>سطح ارتكاز الجسم
    <select className="input" value={ctx.bodySupportChoice||'auto'} onChange={e=>onChange({bodySupportChoice:e.target.value as CompilationContext['bodySupportChoice']})}>
     <option value="auto">يُشتق من الوضعية</option><option value="floor">الأرض / السجادة</option><option value="mattress">المرتبة</option><option value="none">دون ارتكاز</option><option value="unknown">لم يتم التأكد</option>
    </select>
   </label>
  </div>
  <details style={{marginTop:8}}>
   <summary style={{fontSize:12,cursor:'pointer'}}>معلومات الظهور واليد الأخرى (اختياري)</summary>
   <label style={{display:'block',fontSize:12,marginTop:8}}>ظهور القدمين
    <select className="input" value={ctx.bodyFeetVisibility||'unknown'} onChange={e=>onChange({bodyFeetVisibility:e.target.value as CompilationContext['bodyFeetVisibility']})}>
     <option value="unknown">غير مؤكّد</option><option value="visible">ظاهرتان أو يظهر موضع داعم</option><option value="occluded">محجوبتان بصريًا</option><option value="outside_crop">خارج الكادر</option><option value="absent">غياب فعلي للدعم بالقدمين</option>
    </select>
   </label>
   <label style={{display:'block',fontSize:12,marginTop:8}}>مهمة اليد الأخرى
    <select className="input" value={ctx.bodyFreeHandTask||'auto'} onChange={e=>onChange({bodyFreeHandTask:e.target.value as CompilationContext['bodyFreeHandTask']})}>
     <option value="auto">تتبع اللقطة</option><option value="free">حرة</option><option value="surface_support">تستند إلى سطح</option><option value="phone">تمسك هاتف التصوير أيضًا</option>
    </select>
   </label>
  </details>
  <p style={{fontSize:11,color:'var(--muted)'}}>الارتكاز: {state.supportSurface==='mattress'?'المرتبة':state.supportSurface==='floor'?'الأرض':'غير محدد'} · نقاط التلامس: {state.contacts.length} · استجابة الأسطح: {state.deformations.length} · علاقات الحجب: {state.visualRelations.length}. لا توجد محاكاة لقوى أو زوايا مفاصل رقمية.</p>
  {state.issues.map(item=><div key={item.code} role="alert" style={{fontSize:12,color:'#b91c1c',marginTop:8}}>
   <strong>{item.code}</strong> — {item.messageAr} (إعدادات: {item.controls.join('، ')})
   <button type="button" className="option" style={{display:'block',marginTop:4}} onClick={()=>onChange(item.code==='BODY_SUPPORT_CONFLICT'?{bodySupportChoice:'auto'}:item.code==='BODY_TIMER_HAND_OCCUPIED'||item.code==='BODY_HANDHELD_REQUIRES_GRIP'||item.code==='BODY_FIXED_HAND_CONFLICT'?{bodyHoldingHand:'auto'}:item.code==='BODY_STANDING_FEET_ABSENT'?{bodyFeetVisibility:'unknown'}:{bodyFreeHandTask:'auto'})}>اعتماد تصحيح هذا التعارض</button>
  </div>)}
  {state.status==='NEEDS_INFORMATION'&&<p style={{fontSize:12,color:'var(--muted)'}}>لا توجد معلومات كافية لإثبات كل تفاصيل الدعم؛ يبقى المشهد مسموحًا إذا لم يوجد تعارض مؤكد.</p>}
 </section>
}
