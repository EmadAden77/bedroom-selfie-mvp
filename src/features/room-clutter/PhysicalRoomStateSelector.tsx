import React from 'react'
import type {RoomOrder,RoomPhysicalState,RoomSurface,RoomZone} from '../../data/room-physical-state'
import {ROOM_ZONES,selectedRoomObjects,DEFAULT_ROOM_PHYSICAL_STATE} from '../../data/room-physical-state'

type Props={value:RoomPhysicalState;onChange:(value:RoomPhysicalState)=>void;roomReferencePresent:boolean}
const orders:{id:RoomOrder;label:string;hint:string}[]=[
 {id:'reference',label:'مطابق للمرجع',hint:'لا تضف أغراضًا'},
 {id:'light',label:'استخدام خفيف',hint:'تفصيل واحد بكل منطقة'},
 {id:'medium',label:'استخدام متوسط',hint:'تفصيل ثابت بكل منطقة'},
 {id:'clear',label:'فوضى واضحة',hint:'تفصيلان ثابتان بكل منطقة'}
]
const surfaces:{id:RoomSurface;label:string}[]=[
 {id:'reference',label:'الآثار المرجعية فقط'},
 {id:'touch',label:'آثار لمس خفيفة'},
 {id:'dust',label:'غبار محدود'}
]
const names:Record<RoomZone,string>={bed:'السرير',floor:'الأرضية',dresser:'التسريحة',nightstand:'الكومود'}
export const PhysicalRoomStateSelector:React.FC<Props>=({value,onChange,roomReferencePresent})=>{
 const set=(patch:Partial<RoomPhysicalState>)=>onChange({...value,...patch})
 const objects=selectedRoomObjects(value)
 return <section className="card" aria-label="نظام حالة الغرفة الفيزيائية">
  <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>🏠 حالة الغرفة الفيزيائية — آثار الاستخدام</div>
  <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.8,margin:'0 0 12px'}}>
   الإضافات مرتبطة بمكان ثابت وسبب فيزيائي. الجدران والسيراميك ومرآة الدولاب والتسريحة والأثاث يظلون مطابقين للمرجع. لا نضيف تلفًا دائمًا.
  </p>
  <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>مستوى عدم الترتيب</div>
  <div className="grid">{orders.map(o=><button type="button" key={o.id} className={'option '+(value.order===o.id?'selected':'')} aria-pressed={value.order===o.id} onClick={()=>set({order:o.id})}><div style={{fontWeight:600}}>{o.label}</div><small>{o.hint}</small></button>)}</div>
  <div style={{fontSize:12,fontWeight:600,margin:'12px 0 6px'}}>آثار الأسطح</div>
  <div className="grid">{surfaces.map(o=><button type="button" key={o.id} className={'option '+(value.surface===o.id?'selected':'')} aria-pressed={value.surface===o.id} onClick={()=>set({surface:o.id})}>{o.label}</button>)}</div>
  <fieldset style={{border:'1px solid var(--border)',borderRadius:10,margin:'12px 0',padding:10}}>
   <legend style={{fontSize:12,fontWeight:600}}>المناطق المسموح ترتيب أغراضها</legend>
   <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
    {ROOM_ZONES.map(zone=><label key={zone} style={{fontSize:12,display:'flex',alignItems:'center',gap:7}}>
      <input type="checkbox" checked={value.zones.includes(zone)} onChange={e=>set({zones:e.target.checked?ROOM_ZONES.filter(z=>z===zone||value.zones.includes(z)):value.zones.filter(z=>z!==zone)})}/>{names[zone]}
    </label>)}
   </div>
  </fieldset>
  <label style={{fontSize:12,display:'flex',gap:8,alignItems:'center'}}>
   <input type="checkbox" checked={value.sessionLocked} onChange={e=>set({sessionLocked:e.target.checked})}/>
   تثبيت ترتيب الأغراض بين صور الجلسة
  </label>
  <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.8,marginTop:10}}>
   <strong>معاينة العناصر المختارة ({objects.length}):</strong>{' '}
   {objects.length?objects.map(o=>o.label+' — '+names[o.zone]).join('، '):'لا إضافات جديدة'}
   {value.sessionLocked?'؛ تظل مواقعها ونقاط تماسها نفسها عند تبديل زاوية التصوير.':''}
  </div>
  <button type="button" className="btn btn-secondary" style={{marginTop:10}} onClick={()=>onChange({...DEFAULT_ROOM_PHYSICAL_STATE,order:'reference',surface:'reference'})}>إعادة حالة الغرفة إلى المرجع</button>
  <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.75,margin:'10px 0 0'}}>
   {roomReferencePresent?'مرجع الغرفة مرفوع: له الأولوية في تثبيت الأثاث والعيوب الموجودة.':'صورة الغرفة غير مرفوعة: لن يُخترع تلف ثابت أو قياسات غير مؤكدة.'}
   {' '}الغبار خافت قرب الوزرات وتحت الأثاث فقط، ويظهر بحسب الإضاءة الحقيقية.
  </p>
 </section>
}
