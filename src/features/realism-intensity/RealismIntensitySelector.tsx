import React from 'react'
import type { CompilationContext } from '../../domain/types'
import { realismPresets } from '../../data/realism-intensity'

type RealismIntensity = NonNullable<CompilationContext['realismIntensity']>
type Props = { value: RealismIntensity; onChange: (value:RealismIntensity)=>void }

export const RealismIntensitySelector: React.FC<Props> = ({value,onChange})=>(
  <section className="card" aria-label="درجة واقعية التصوير">
    <div style={{fontSize:'14px',fontWeight:600,marginBottom:'6px'}}>درجة واقعية تصوير الجوال</div>
    <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'10px'}}>تغيّر المعالجة والطابع العفوي فقط؛ ملامح الوجه والغرفة والوضعية محفوظة.</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'8px'}}>
      {realismPresets.map(p=>(
        <button type="button" key={p.id} aria-pressed={value===p.id}
          className={'option '+(value===p.id?'selected':'')} onClick={()=>onChange(p.id)}>
          <div style={{fontSize:'12px',fontWeight:600}}>{p.label}</div>
          <div style={{fontSize:'10px',marginTop:'5px',opacity:0.75}}>{p.description}</div>
        </button>
      ))}
    </div>
  </section>
)
