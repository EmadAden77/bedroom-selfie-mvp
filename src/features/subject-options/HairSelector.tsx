
import React from 'react'
import { hairVariants } from '../../data/hair'
import { hairDirections, hairVolumes, hairTextures } from '../../data/hair-advanced'
import type { CompilationContext } from '../../domain/types'

type Props = { direction: string, volume: string, texture: string, onAdvancedChange: (patch: Partial<CompilationContext>) => void, selectedId: string, mode: 'preserve' | 'apply', onModeChange: (mode: 'preserve' | 'apply') => void, onSelect: (id: string) => void }

export const HairSelector: React.FC<Props> = ({ direction, volume, texture, onAdvancedChange, selectedId, mode, onModeChange, onSelect }) => {
  return (
    <div className="card">
      <div style={{fontWeight:600, fontSize:'14px', marginBottom:'4px'}}>٢. الشعر - ٧ خيارات للتسريح</div>
      <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'10px'}}>اضغط على أي تسريحة لتطبيقها مباشرة، أو اختر الحفاظ على تسريحة الصورة المرجعية.</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
        <button type="button" className={`option ${mode==='preserve'?'selected':''}`} aria-pressed={mode==='preserve'} onClick={()=>onModeChange('preserve')}>
          الحفاظ على تسريحة المرجع
        </button>
        <button type="button" className={`option ${mode==='apply'?'selected':''}`} aria-pressed={mode==='apply'} onClick={()=>onModeChange('apply')}>
          تطبيق التسريحة المختارة
        </button>
      </div>
      <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'10px'}}>{mode==='preserve'?'التسريحة المرجعية محفوظة إلى أن تختار تسريحة أخرى.':selectedId==='reference_natural_dry'?'اختر تسريحة مختلفة أدناه؛ لا يزال خيار شعر المرجع محددًا.':'سيتم تغيير ترتيب الخصلات في البرومبت بوضوح مع ثبات خط الشعر والكثافة والهوية.'}</div>
      <div className="grid">
        {hairVariants.map(v=>{
          const sel = mode==='preserve' ? v.id==='reference_natural_dry' : selectedId===v.id
          return (
            <button key={v.id} type="button" aria-pressed={sel} onClick={()=>onSelect(v.id)} className={`option ${sel?'selected':''}`}>
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
      {mode==='apply' && selectedId!=='reference_natural_dry' && <div style={{marginTop:'12px',borderTop:'1px solid var(--border)',paddingTop:'10px'}}>
        <div style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>التحكم المتقدم بالتسريحة</div>
        {([
          ['اتجاه الشعر',hairDirections,direction,'hairDirection'],
          ['ارتفاع الشعر',hairVolumes,volume,'hairVolume'],
          ['ترتيب الخصلات',hairTextures,texture,'hairTexture']
        ] as const).map(([label,choices,value,field])=>(
          <label key={field} style={{display:'block',fontSize:'12px',marginBottom:'10px'}}>{label}
            <select aria-label={label} value={value} onChange={e=>onAdvancedChange({[field]:e.target.value})} style={{display:'block',width:'100%',padding:'8px',marginTop:'5px'}}>
              {choices.map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}
            </select>
          </label>
        ))}
        <div style={{fontSize:'11px',color:'var(--muted)'}}>خط الشعر واللون والكثافة محفوظة؛ يمكن إبقاء الإعدادات حسب التسريحة.</div>
      </div>}
    </div>
  )
}
