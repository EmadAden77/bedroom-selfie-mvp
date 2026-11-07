import React from 'react'
import { nightLightingPresets } from '../../data/night-lighting'
import {bedroomShots} from '../../data/bedroom-shots'

type Props = { shotId?:string; selectedId: string; windowUncovered: boolean; onSelect: (id: string) => void; onWindowChange: (open: boolean) => void }
export const NightLightingSelector: React.FC<Props> = ({ shotId,selectedId, windowUncovered, onSelect, onWindowChange }) => {
  const shot=bedroomShots.find(s=>s.id===shotId)\n  return (
  <section className="card" aria-label="الإضاءة الليلية الفيزيائية">
    <div style={{fontWeight:600, fontSize:'14px', marginBottom:'4px'}}>٥. الإضاءة الليلية الفيزيائية داخل الغرفة</div>
    <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'12px'}}>اختر مشهد إضاءة واحدًا متكاملًا. لا تُضاف مصادر ضوء مخفية، والتعريض لا يخلق ضوءًا فعليًا.</div>
    {shotId==='mirror_rear_flash'&&<p style={{fontSize:'11px',color:'var(--muted)',marginBottom:8}}>تغيير الإضاءة لا يغيّر لقطة المرآة. ستظهر مشكلة توافق حتى تختار إعدادًا متسقًا بنفسك.</p>}
    <div className="grid">
      {nightLightingPresets.map(p => <button type="button" key={p.id} className={`option ${selectedId === p.id ? 'selected' : ''}`} aria-pressed={selectedId === p.id} onClick={()=>onSelect(p.id)}>
        <div style={{fontWeight:600,fontSize:'13px'}}>{p.arabicLabel}</div>
        <div style={{fontSize:'11px',marginTop:'4px',opacity:0.8}}>{p.description}</div>
      </button>)}
    </div>
    {selectedId === 'window_streetlight' && <label style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'12px',fontSize:'12px'}}><input type="checkbox" checked={windowUncovered} onChange={e=>onWindowChange(e.target.checked)}/>الستائر مفتوحة والنافذة تسمح بدخول الضوء</label>}
    {selectedId === 'window_streetlight' && !windowUncovered && <div role="alert" style={{marginTop:'8px',fontSize:'12px',color:'var(--error)'}}>هذا الخيار يتطلب نافذة مكشوفة. افتح الستائر أو اختر مصدرًا آخر.</div>}
  </section>
  )
}
