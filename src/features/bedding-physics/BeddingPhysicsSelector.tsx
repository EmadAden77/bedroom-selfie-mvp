import React from 'react'
import type {CompilationContext} from '../../domain/types'
import {deriveBeddingScene} from '../../engine/bedding-physics'
import type {BeddingSelection} from '../../../shared/bedding-physics'
type Props={ctx:CompilationContext;onChange:(patch:Partial<CompilationContext>)=>void}
export const BeddingPhysicsSelector:React.FC<Props>=({ctx,onChange})=>{
 const state=deriveBeddingScene(ctx)
 const value=state.selection
 const set=(change:Partial<BeddingSelection>)=>onChange({beddingSelection:{...value,...change}})
 return <section className="card" aria-label="فيزياء السرير والمفارش V2.2">
  <h2 style={{fontSize:15,margin:'0 0 8px'}}>🛏️ فيزياء السرير والمفارش — V2.2</h2>
  <p style={{fontSize:12,color:'var(--muted)'}}>يُحسب ضغط المرتبة والوسادة من تماس الجسم المؤكد في V2.1. لا تُضاف مفارش لم يحددها المرجع أو اختياراتك.</p>
  <p role="status" style={{fontSize:12,fontWeight:650}}>{state.status==='INVALID'?'تعارض مؤكد':state.status==='NEEDS_INFORMATION'?'معلومات التلامس غير كافية':'علاقات التلامس المدعومة متسقة'} — {state.status}</p>
  <details>
   <summary style={{cursor:'pointer',fontSize:12}}>وجود الشرشف والوسادة والبطانية (اختياري)</summary>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:8,marginTop:8}}>
    <label style={{fontSize:12}}>الشرشف
     <select className="input" value={value.sheet} onChange={e=>set({sheet:e.target.value as BeddingSelection['sheet']})}>
      <option value="reference">حسب المرجع / غير مؤكد</option><option value="confirmed">موجود فوق المرتبة</option><option value="absent">غير موجود</option>
     </select>
    </label>
    <label style={{fontSize:12}}>الوسادة
     <select className="input" value={value.pillow} onChange={e=>set({pillow:e.target.value as BeddingSelection['pillow']})}>
      <option value="reference">حسب المرجع والوضعية</option><option value="confirmed">وجودها مؤكد</option><option value="absent">غير موجودة</option>
     </select>
    </label>
    <label style={{fontSize:12}}>البطانية
     <select className="input" value={value.blanket} onChange={e=>set({blanket:e.target.value as BeddingSelection['blanket']})}>
      <option value="reference">حسب المرجع والوضعية</option><option value="spread_on_bed">مفرودة على السرير</option><option value="touching_body">تلامس الجسم</option><option value="absent">غير موجودة</option>
     </select>
    </label>
   </div>
  </details>
  <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>تلامسات مترابطة: {state.contacts.length} · استجابات موضعية: {state.responses.length} · تفاصيل غير مؤكدة: {state.unknowns.length}. لا تُستخدم أرقام ضغط أو عمق انضغاط.</p>
  {state.issues.map(i=><div key={i.code} role="alert" style={{fontSize:12,color:'#b91c1c',marginTop:8}}>
   <strong>{i.code}</strong> — {i.messageAr}
   <button type="button" className="option" style={{display:'block',marginTop:4}} onClick={()=>set(i.code==='BEDDING_PILLOW_ABSENT'?{pillow:'reference'}:{blanket:'reference'})}>اعتماد تصحيح هذا التعارض</button>
  </div>)}
 </section>
}
