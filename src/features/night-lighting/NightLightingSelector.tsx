import React from 'react'
import {nightLightingPresets} from '../../data/night-lighting'
import {bedroomShots} from '../../data/bedroom-shots'
import {isLaptopSelfieShot} from '../../data/laptop-selfie-physics'
import type {LightingOption} from '../../../shared/lighting-decision'

type Props={shotId?:string;selectedId:string;onSelect:(id:LightingOption)=>void}
export const NightLightingSelector:React.FC<Props>=({shotId,selectedId,onSelect})=>{
 const mode=bedroomShots.find(s=>s.id===shotId)?.mode||'front'
 const incompatible=(id:LightingOption)=>
  (shotId==='mirror_rear_flash'&&id!=='camera_flash')||
  (id==='camera_flash'&&mode!=='mirror'&&mode!=='rear')||
  (id==='phone_screen'&&mode==='rear')||
  (id==='laptop_screen'&&!isLaptopSelfieShot(shotId))
 return <section className="card" aria-label="مصدر الإضاءة الوحيد">
  <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>٥. مصدر الإضاءة الوحيد</div>
  <p style={{fontSize:12,color:'var(--muted)'}}>الغرفة مظلمة تمامًا. اختر مصدرًا واحدًا فقط؛ لا ضوء محيط، ولا نافذة أو نهار، ولا تُضاف مصادر تلقائيًا.</p>
  {shotId==='mirror_rear_flash'&&<p style={{fontSize:11,color:'var(--muted)'}}>لقطة فلاش المرآة تتطلب فلاش الكاميرا الخلفية. غيّر الوضعية إن أردت ضوءًا آخر.</p>}
  <div className="grid">{nightLightingPresets.map(p=><button type="button" key={p.id}
   className={'option '+(selectedId===p.id?'selected':'')}
   aria-pressed={selectedId===p.id} disabled={incompatible(p.id)}
   title={incompatible(p.id)?'اختر وضعية تصوير متوافقة أولًا':undefined}
   onClick={()=>onSelect(p.id)}>
    <div style={{fontWeight:600,fontSize:13}}>{p.arabicLabel}</div>
    <div style={{fontSize:11,marginTop:4,opacity:.8}}>{p.description}</div>
   </button>)}</div>
  {nightLightingPresets.every(p=>p.id!==selectedId)&&<div role="alert" style={{color:'var(--error)',fontSize:12}}>مصدر إضاءة قديم أو غير معروف؛ اختر أحد الخيارات الأربعة.</div>}
  {nightLightingPresets.some(p=>p.id===selectedId&&incompatible(p.id))&&<div role="alert" style={{color:'var(--error)',fontSize:12}}>اللقطة الحالية لا تتوافق مع المصدر المختار. غيّر اللقطة أو الإضاءة بنفسك.</div>}
 </section>
}
