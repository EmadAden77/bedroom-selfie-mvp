
import React from 'react'
import { CompilationContext } from '../../domain/types'
import { garmentRecords, materialProfiles, fitProfiles, garmentStates, clothingColors, garmentSurfaceChoices } from '../../data/clothing'

type ColorPaletteProps = {
  value: string
  onSelect: (color: string) => void
  label: string
}
const ColorPalette: React.FC<ColorPaletteProps> = ({ value, onSelect, label }) => (
  <div style={{marginBottom:'12px'}}>
    <div style={{fontSize:'12px', fontWeight:600, marginBottom:'8px'}}>{label}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(76px, 1fr))',gap:'7px'}}>
      {clothingColors.map(color => (
        <button key={color.id} type="button" aria-pressed={value === color.id} aria-label={color.label}
          onClick={() => onSelect(color.id)}
          style={{background:'var(--bg)',border:value===color.id?'2px solid #111':'1px solid var(--border)',borderRadius:'10px',padding:'8px 3px',display:'flex',alignItems:'center',flexDirection:'column',gap:'5px',color:'inherit',fontSize:'11px',cursor:'pointer'}}>
          <span aria-hidden="true" style={{width:'27px',height:'27px',borderRadius:'50%',background:color.hex,border:'1px solid #8888'}}/>
          <span>{color.label}</span>
        </button>
      ))}
    </div>
  </div>
)

type Props = {
  ctx: CompilationContext
  onChange: (patch: Partial<CompilationContext>) => void
}

export const ClothingSelector: React.FC<Props> = ({ ctx, onChange }) => {
  const uppers = garmentRecords.filter(g=>g.category==='upper')
  const lowers = garmentRecords.filter(g=>g.category==='lower')
  const upper = uppers.find(u=>u.id===ctx.upperGarmentId)
  const isRef = upper?.isReferencePreservation

  return (
    <div className="card">
      <div style={{fontWeight:600, fontSize:'14px', marginBottom:'4px'}}>٤. الملابس - Physical Clothing System مجمد</div>
      <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'12px'}} className="ltr">Upper مطلوب - Lower اختياري - ribbed يتطلب rib_knit فقط</div>

      <div style={{fontSize:'12px', fontWeight:600, marginBottom:'6px'}}>القطعة العلوية (مطلوبة):</div>
      <div className="grid" style={{marginBottom:'14px'}}>
        {uppers.map(g=>{
          const sel = ctx.upperGarmentId===g.id
          return (
            <button key={g.id} onClick={()=>onChange({ upperGarmentId: g.id, materialId: g.defaultMaterial, fitId: g.defaultFit, stateId: g.defaultState, color: g.defaultColor, surface: g.defaultSurface })} className={`option ${sel?'selected':''}`}>
              <div style={{fontWeight:600, fontSize:'13px'}}>{g.arabicLabel}</div>
              <div className="ltr" style={{fontSize:'10px', opacity:0.7}}>{g.id} - {g.defaultMaterial.replace(/_/g,' ')}</div>
              {g.isReferencePreservation && <div style={{fontSize:'10px', marginTop:'4px', background:'#f3f1ec', color:'#111', borderRadius:'6px', padding:'2px 6px', display:'inline-block'}}>مقفل - يحافظ على المرجع تماما</div>}
            </button>
          )
        })}
      </div>

      {!isRef && (
        <>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'11px', fontWeight:600, marginBottom:'4px'}}>Material:</div>
              <select className="input" value={ctx.materialId} onChange={e=>onChange({ materialId: e.target.value })}>
                {materialProfiles.map(m=><option key={m.id} value={m.id}>{m.arabicLabel} - {m.id}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:'11px', fontWeight:600, marginBottom:'4px'}}>Fit:</div>
              <select className="input" value={ctx.fitId} onChange={e=>onChange({ fitId: e.target.value })}>
                {fitProfiles.map(f=><option key={f.id} value={f.id}>{f.arabicLabel} - {f.id}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:'11px', fontWeight:600, marginBottom:'4px'}}>State:</div>
              <select className="input" value={ctx.stateId} onChange={e=>onChange({ stateId: e.target.value })}>
                {garmentStates.map(s=><option key={s.id} value={s.id}>{s.arabicLabel} - {s.id}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:'11px', fontWeight:600, marginBottom:'4px'}}>Surface:</div>
              <select className="input" value={ctx.surface} onChange={e=>onChange({ surface: e.target.value })}>
                {garmentSurfaceChoices.map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}
              </select>
            </div>
          </div>

          <ColorPalette label="لون القطعة العلوية" value={ctx.color} onSelect={color=>onChange({color})} />
          <div style={{marginBottom:'12px'}}>
            <div style={{fontSize:'11px', fontWeight:600, marginBottom:'4px'}}>لون مخصص (اختياري):</div>
            <input className="input" value={ctx.color} onChange={e=>onChange({ color: e.target.value })} placeholder="مثال: charcoal أو apparent dark charcoal-gray as observed" />
          </div>
        </>
      )}

      <div style={{fontSize:'12px', fontWeight:600, marginBottom:'6px'}}>القطعة السفلية (اختيارية):</div>
      <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px'}}>
        <button className={`option ${!ctx.lowerGarmentId?'selected':''}`} onClick={()=>onChange({ lowerGarmentId: null })} style={{padding:'6px 12px'}}>بدون قطعة سفلية (اختياري)</button>
        {lowers.map(g=>{
          const sel = ctx.lowerGarmentId===g.id
          return <button key={g.id} className={`option ${sel?'selected':''}`} onClick={()=>onChange({ lowerGarmentId: g.id })} style={{padding:'6px 12px', fontSize:'12px'}}>{g.arabicLabel} - {g.id}</button>
        })}
      </div>

      {ctx.lowerGarmentId && (
        <ColorPalette label="لون القطعة السفلية" value={ctx.lowerColor || (lowers.find(g=>g.id===ctx.lowerGarmentId)?.defaultColor ?? '')}
          onSelect={color=>onChange({lowerColor:color})} />
      )}
      {ctx.lowerGarmentId && <input className="input" style={{marginBottom:'12px'}} aria-label="لون مخصص للقطعة السفلية"
        value={ctx.lowerColor || (lowers.find(g=>g.id===ctx.lowerGarmentId)?.defaultColor ?? '')}
        onChange={e=>onChange({lowerColor:e.target.value})} placeholder="لون مخصص للقطعة السفلية" />}

      {isRef && <div style={{fontSize:'11px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'8px', padding:'8px'}}>reference_garment_preserved مقفل - لا يمكن تغيير المادة أو اللون أو السطح - يحافظ على المرجع تماما كما يظهر</div>}
    </div>
  )
}
