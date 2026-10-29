import React,{useEffect,useState} from 'react'
import {bedroomShots,shotCategories} from '../../data/bedroom-shots'
type Props={value:string;onChange:(value:string)=>void}
export const BedroomShotsSelector:React.FC<Props>=({value,onChange})=>{
 const [category,setCategory]=useState<number>(()=>bedroomShots.find(s=>s.id===value)?.category??0)
 useEffect(()=>{
  const selected=bedroomShots.find(s=>s.id===value)
  if(selected)setCategory(selected.category)
 },[value])
 const list=bedroomShots.filter(s=>s.category===category)
 const mirrorCategory=category===1
 return <section className="card" aria-label="وضعيات تصوير داخل غرفة النوم">
  <div style={{fontWeight:600,fontSize:'14px',marginBottom:'5px'}}>٧. {bedroomShots.length} وضعية وحركة وزاوية للسيلفي</div>
  <p style={{fontSize:'11px',color:'var(--muted)'}}>اختر وضعية واحدة. يتطابق موضع اليد والهاتف والمنظور مع نوع اللقطة، دون تغيير أثاث الغرفة.</p>
  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'12px'}}>
   {shotCategories.map((cat,i)=><button type="button" key={cat} onClick={()=>setCategory(i)} className={`option ${category===i?'selected':''}`} style={{fontSize:'11px'}} aria-pressed={category===i}>{cat} ({bedroomShots.filter(s=>s.category===i).length})</button>)}
  </div>
  {mirrorCategory&&<p style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.7,marginBottom:'10px'}}>🪞 كل وضعيات المرآة تستخدم باب الدولاب العاكس الموجود على الجدار الأيمن فقط. التصوير بالكاميرا الخلفية لهاتف واحد، والانعكاس والوقفة والإضاءة متوافقة مع الواقع.</p>}
  <button type="button" className={`option ${!value?'selected':''}`} onClick={()=>onChange('')} style={{width:'100%',marginBottom:'8px'}}>بدون وضعية إضافية</button>
  <div className="grid">{list.map(s=><button type="button" key={s.id} className={`option ${value===s.id?'selected':''}`} onClick={()=>onChange(s.id)} aria-pressed={value===s.id}><div style={{fontWeight:600}}>{s.label}</div><small style={{opacity:.7}}>{s.mode==='mirror'?'مرآة الدولاب · كاميرا خلفية':s.mode==='timer'?'مؤقت':s.mode==='rear'?'كاميرا خلفية':'كاميرا أمامية'}</small></button>)}</div>
 </section>
}
