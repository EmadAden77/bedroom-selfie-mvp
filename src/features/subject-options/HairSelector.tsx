
import React from 'react'
import { hairVariants } from '../../data/hair'

type Props = { selectedId: string, mode: 'preserve' | 'apply', onModeChange: (mode: 'preserve' | 'apply') => void, onSelect: (id: string) => void }

export const HairSelector: React.FC<Props> = ({ selectedId, mode, onModeChange, onSelect }) => {
  return (
    <div className="card">
      <div style={{fontWeight:600, fontSize:'14px', marginBottom:'4px'}}>٢. الشعر - ٧ تسريحات مجمدة</div>
      <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'10px'}} className="ltr">Default: reference_natural_dry - واحد فقط قابل للاختيار</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
        <button type="button" className={`option ${mode==='preserve'?'selected':''}`} aria-pressed={mode==='preserve'} onClick={()=>onModeChange('preserve')}>
          الحفاظ على تسريحة المرجع
        </button>
        <button type="button" className={`option ${mode==='apply'?'selected':''}`} aria-pressed={mode==='apply'} onClick={()=>onModeChange('apply')}>
          تطبيق التسريحة المختارة
        </button>
      </div>
      <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'10px'}}>{mode==='preserve'?'التسريحة المرجعية محفوظة؛ اختيارات التسريح لا تُطبق.':'التسريحة المختارة تُطبّق بوضوح مع ثبات خط الشعر والكثافة والهوية.'}</div>
      <div className="grid">
        {hairVariants.map(v=>{
          const sel = selectedId===v.id && mode==='apply'
          return (
            <button key={v.id} type="button" disabled={mode==='preserve'} onClick={()=>onSelect(v.id)} className={`option ${sel?'selected':''}`}>
              <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
                <span style={{width:'16px', height:'16px', borderRadius:'50%', border:'1px solid currentColor', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'2px'}}>{sel && <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'currentColor'}}/>}</span>
                <span style={{flex:1, textAlign:'right'}}>
                  <span style={{fontWeight:600, fontSize:'13px'}}>{v.arabicLabel}</span> <span className="ltr" style={{fontSize:'10px', opacity:0.7}}>{v.englishName}</span>
                  <span style={{display:'block', fontSize:'11px', marginTop:'4px', opacity: sel?0.8:0.6}}>{v.userFacingMeaning} - {v.observableConfig}</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
