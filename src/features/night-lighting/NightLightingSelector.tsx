import React from 'react'
import { nightLightingPresets } from '../../data/night-lighting'
import {bedroomShots} from '../../data/bedroom-shots'
import {isLaptopSelfieShot} from '../../data/laptop-selfie-physics'
import type {PhoneOnlyMode} from '../../engine/physical-reality'

type Props = { shotId?:string; selectedId: string; exclusiveMode?: PhoneOnlyMode; windowUncovered: boolean; onSelect: (id: string) => void; onWindowChange: (open: boolean) => void }
export const NightLightingSelector: React.FC<Props> = ({ shotId,selectedId,exclusiveMode='OFF', windowUncovered, onSelect, onWindowChange }) => {
  const shot=bedroomShots.find(s=>s.id===shotId)
  const incompatible=(id:string)=>
   (id==='rear_flash'&&shot?.mode!=='mirror'&&shot?.mode!=='rear')||
   (id==='laptop_screen_only'&&!isLaptopSelfieShot(shotId))||
   (id==='phone_screen_only'&&shot?.mode==='rear')
  return (
  <section className="card" aria-label="الإضاءة الليلية الفيزيائية">
    <div style={{fontWeight:600, fontSize:'14px', marginBottom:'4px'}}>٥. الإضاءة الليلية الفيزيائية داخل الغرفة</div>
    <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'12px'}}>اختر مشهد إضاءة واحدًا متكاملًا. لا تُضاف مصادر ضوء مخفية، والتعريض لا يخلق ضوءًا فعليًا.</div>
    {shotId==='mirror_rear_flash'&&<p style={{fontSize:'11px',color:'var(--muted)',marginBottom:8}}>اختيار إضاءة مخالفة لفلاش المرآة سيظهر تعارضًا حتى تختار التصحيح بنفسك.</p>}
    <div className="grid">
      {nightLightingPresets.map(p => <button type="button" key={p.id} className={`option ${selectedId === p.id ? 'selected' : ''}`} aria-pressed={selectedId === p.id} disabled={incompatible(p.id)} title={incompatible(p.id)?'اختر وضعية تصوير متوافقة مع مصدر الضوء أولًا':undefined} onClick={()=>onSelect(p.id)}>
        <div style={{fontWeight:600,fontSize:'13px'}}>{p.arabicLabel}</div>
        <div style={{fontSize:'11px',marginTop:'4px',opacity:0.8}}>{p.description}</div>
        {selectedId===p.id&&exclusiveMode!=='OFF'&&<div role="status" style={{fontSize:'11px',marginTop:5,fontWeight:700}}> (inactive: {exclusiveMode==='DARK_ROOM_REAR_FLASH_ONLY'?'mirror flash mode':'front screen mode'})</div>}
      </button>)}
    </div>
    {selectedId === 'window_streetlight' && <label style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'12px',fontSize:'12px'}}><input type="checkbox" checked={windowUncovered} onChange={e=>onWindowChange(e.target.checked)}/>الستائر مفتوحة والنافذة تسمح بدخول الضوء</label>}
    {selectedId === 'window_streetlight' && !windowUncovered && <div role="alert" style={{marginTop:'8px',fontSize:'12px',color:'var(--error)'}}>هذا الخيار يتطلب نافذة مكشوفة. افتح الستائر أو اختر مصدرًا آخر.</div>}
  </section>
  )
}
