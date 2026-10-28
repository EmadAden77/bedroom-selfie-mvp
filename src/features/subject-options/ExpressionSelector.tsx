
import React from 'react'
import { expressionVariants, deferredCompositeStates } from '../../data/expressions'
import { gazeChoices,microChoices } from '../../data/gaze-micro'
import type { CompilationContext } from '../../domain/types'

type Props = { selectedId: string, gaze:string, micro:string, onAdvancedChange:(patch:Partial<CompilationContext>)=>void, onSelect: (id: string) => void }

export const ExpressionSelector: React.FC<Props> = ({ selectedId, gaze, micro, onAdvancedChange, onSelect }) => {
  return (
    <div className="card">
      <div style={{fontWeight:600, fontSize:'14px', marginBottom:'4px'}}>٣. التعبير - ٨ تعبيرات نقية مجمدة</div>
      <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'10px'}} className="ltr">Default: reference_expression_preserved - light_fatigue مستبعد كـ Deferred</div>
      <div className="grid">
        {expressionVariants.map(v=>{
          const sel = selectedId===v.id
          return (
            <button key={v.id} onClick={()=>onSelect(v.id)} className={`option ${sel?'selected':''}`}>
              <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
                <span style={{width:'16px', height:'16px', borderRadius:'50%', border:'1px solid currentColor', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'2px'}}>{sel && <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'currentColor'}}/>}</span>
                <span style={{flex:1, textAlign:'right'}}>
                  <span style={{fontWeight:600, fontSize:'13px'}}>{v.arabicLabel}</span> <span className="ltr" style={{fontSize:'10px', opacity:0.7}}>{v.englishName}</span>
                  <span style={{display:'block', fontSize:'11px', marginTop:'4px', opacity: sel?0.8:0.6}}>{v.userFacingMeaning}</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <div style={{marginTop:'12px',borderTop:'1px solid var(--border)',paddingTop:'10px'}}>
        <div style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>النظر والتعابير الدقيقة</div>
        <label style={{display:'block',fontSize:'12px',marginBottom:'10px'}}>اتجاه النظر
          <select aria-label="اتجاه النظر" value={gaze} onChange={e=>onAdvancedChange({gazeId:e.target.value as CompilationContext['gazeId']})} style={{display:'block',width:'100%',marginTop:'5px',padding:'8px'}}>
            {gazeChoices.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label style={{display:'block',fontSize:'12px',marginBottom:'10px'}}>حركة دقيقة
          <select aria-label="حركة دقيقة" value={micro} onChange={e=>onAdvancedChange({microExpressionId:e.target.value as CompilationContext['microExpressionId']})} style={{display:'block',width:'100%',marginTop:'5px',padding:'8px'}}>
            {microChoices.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <div style={{fontSize:'11px',color:'var(--muted)'}}>الغمزة تخص عينًا واحدة، والنظر يُحسب عبر العين المفتوحة. لا يتغير شكل الوجه الأصلي.</div>
      </div>
      <div style={{marginTop:'12px', background:'#fafaf7', border:'1px solid var(--border)', borderRadius:'10px', padding:'10px'}}>
        <div style={{fontSize:'11px', fontWeight:600}}>حالات مركبة مؤجلة (غير قابلة للاختيار):</div>
        {deferredCompositeStates.map(d=>(
          <div key={d.id} style={{fontSize:'11px', color:'var(--muted)', marginTop:'4px'}} className="ltr">• {d.id} - {d.reason} - isSelectable: false</div>
        ))}
      </div>
    </div>
  )
}
