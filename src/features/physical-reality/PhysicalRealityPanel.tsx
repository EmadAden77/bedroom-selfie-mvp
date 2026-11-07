import React from 'react'
import type {RealityFinding,RealityStatus} from '../../engine/physical-reality'
type Props={status:RealityStatus;findings:readonly RealityFinding[]}
const labels:Record<RealityStatus,string>={
 VALID:'VALID — لم يُكشف تعارض ضمن القيود المفحوصة',
 CONFLICT:'CONFLICT — يوجد تعارض مؤكد ويُمنع اعتماد البرومبت',
 WARNING:'WARNING — وضع ممكن مع تنبيه يستحق المراجعة',
 UNKNOWN:'UNKNOWN — بيانات غير كافية لإثبات بعض العلاقات'
}
const statusLabels:Record<RealityFinding['status'],string>={
 CONFLICT:'تعارض مؤكد',WARNING:'تحذير',UNKNOWN:'معلومات ناقصة'
}
/** Display only; never repairs or modifies user selections without consent. */
export function PhysicalRealityPanel({status,findings}:Props){
 return <section className="card" aria-label="محرك الواقعية الفيزيائية" data-testid="physical-reality-panel">
  <h2 style={{margin:'0 0 8px'}}>⚙️ Physical Reality Engine</h2>
  <p role="status" style={{fontWeight:600,margin:'0 0 8px'}}>{labels[status]}</p>
  <div style={{fontSize:12,lineHeight:1.8,marginBottom:10}}>فحص برمجي للخيارات والعلاقات المعلومة، وليس محاكاة فيزيائية كاملة أو ضمانًا للصورة الناتجة. لا تتغير اختياراتك تلقائيًا بسبب هذا الفحص.</div>
  {findings.length>0&&<details open={status==='CONFLICT'}>
   <summary>تفاصيل التحقق ({findings.length})</summary>
   <ul style={{paddingInlineStart:20}}>
    {findings.map(item=><li key={item.id} style={{marginBottom:12}}>
     <strong>{statusLabels[item.status]} — {item.reason}</strong>
     <div style={{fontSize:12}}>الخيارات: {item.fields.join('، ')}</div>
     <div style={{fontSize:12}}>الإصلاح المقترح: {item.repair}</div>
    </li>)}
   </ul>
  </details>}
 </section>
}
