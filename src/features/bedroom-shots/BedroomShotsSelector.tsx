import React,{useState} from 'react'
import {bedroomShots,shotCategories} from '../../data/bedroom-shots'
type Props={value:string;onChange:(value:string)=>void}
export const BedroomShotsSelector:React.FC<Props>=({value,onChange})=>{
 const [category,setCategory]=useState(0)
 const list=bedroomShots.filter(s=>s.category===category)
 return <section className="card" aria-label="ستون وضعية تصوير داخل غرفة النوم">
  <div style={{fontWeight:600,fontSize:'14px',marginBottom:'5px'}}>٧. ٦٠ وضعية وحركة وزاوية للسيلفي</div>
  <p style={{fontSize:'11px',color:'var(--muted)'}}>اختر وضعية واحدة. تتكيف هندسة اليد والكاميرا والانعكاس مع طريقة الالتقاط.</p>
  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'12px'}}>
   {shotCategories.map((cat,i)=><button type="button" key={cat} onClick={()=>setCategory(i)} className={`option ${category===i?'selected':''}`} style={{fontSize:'11px'}}>{cat} (15)</button>)}
  </div>
  <button type="button" className={`option ${!value?'selected':''}`} onClick={()=>onChange('')} style={{width:'100%',marginBottom:'8px'}}>بدون وضعية إضافية</button>
  <div className="grid">{list.map(s=><button type="button" key={s.id} className={`option ${value===s.id?'selected':''}`} onClick={()=>onChange(s.id)} aria-pressed={value===s.id}><div style={{fontWeight:600}}>{s.label}</div><small style={{opacity:.7}}>{s.mode==='mirror'?'تصوير بالمرآة':s.mode==='timer'?'مؤقت':s.mode==='rear'?'كاميرا خلفية':'كاميرا أمامية'}</small></button>)}</div>
 </section>
}
