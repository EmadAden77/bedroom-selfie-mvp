import React from 'react'
import type {CompilationContext} from '../../domain/types'

type Props={value:CompilationContext['bedroomClutterId'];onChange:(value:'reference'|'lived_in_messy')=>void;roomReferencePresent:boolean}

export const BedroomClutterSelector:React.FC<Props>=({value,onChange,roomReferencePresent})=>(
 <section className="card" aria-label="حالة ترتيب غرفة النوم">
  <div style={{fontSize:14,fontWeight:650,marginBottom:6}}>🏠 مظهر الغرفة — الفوضى الطبيعية</div>
  <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.8,margin:'0 0 12px'}}>
   خيار من برومبت الغرفة العفوية: فراش غير مرتب وأغراض يومية على الأسطح والأرض، مع ثبات الجدران والسرير والدولاب والمرآة والإضاءة المختارة.
  </p>
  <div className="grid">
   <button type="button" className={'option '+((value||'reference')==='reference'?'selected':'')} aria-pressed={(value||'reference')==='reference'} onClick={()=>onChange('reference')}>
    <div style={{fontWeight:600}}>ترتيب الغرفة المرجعي</div>
    <small>الحفاظ على توزيع الأغراض الافتراضي</small>
   </button>
   <button type="button" className={'option '+(value==='lived_in_messy'?'selected':'')} aria-pressed={value==='lived_in_messy'} onClick={()=>onChange('lived_in_messy')}>
    <div style={{fontWeight:600}}>🧺 غرفة معيشية غير مرتبة</div>
    <small>تجاعيد فراش وملابس وأسلاك وأغراض يومية</small>
   </button>
  </div>
  {value==='lived_in_messy'&&<p style={{fontSize:11,color:'var(--muted)',lineHeight:1.8,margin:'10px 0 0'}}>
   ✓ التفاصيل تتبع الجاذبية والتلامس والكادر. لا تُضاف إضاءة أو أثاث جديد.
   {roomReferencePresent?' صورة الغرفة تحكم شكل المكان والأثاث الثابت؛ الإضافات مقتصرة على أغراض صغيرة قابلة للنقل.':''}
  </p>}
 </section>
)
