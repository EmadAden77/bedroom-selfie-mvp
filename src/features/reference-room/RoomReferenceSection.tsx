import React from 'react'
import type { ReferenceImageMeta } from '../../domain/types'

type Props={meta:ReferenceImageMeta|null;loading:boolean;error:string|null;onFile:(file:File)=>void;onRemove:()=>void}
export const RoomReferenceSection:React.FC<Props>=({meta,loading,error,onFile,onRemove})=>(
  <section className="card" aria-label="صورة الغرفة المرجعية">
    <div style={{fontSize:'14px',fontWeight:600,marginBottom:'6px'}}>صورة الغرفة المرجعية — اختيارية</div>
    <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'10px'}}>
      صورة مستقلة للغرفة لتثبيت شكل السرير وتوزيع الأثاث. تبقى محليًا على الجهاز. بعد نسخ البرومبت، أرفق صورة الغرفة وصورة الوجه كلتيهما في مولّد الصور؛ النص وحده لا ينقل الصورة إليه.
    </div>
    <input aria-label="اختر صورة الغرفة" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f);e.currentTarget.value=''}} style={{display:'block',maxWidth:'100%',marginBottom:'9px'}}/>
    {loading&&<div role="status">جاري فحص صورة الغرفة...</div>}
    {error&&<div role="alert" style={{color:'var(--error)',fontSize:'12px'}}>{error}</div>}
    {meta&&<div>
      <img src={meta.objectUrl} alt="معاينة صورة الغرفة المرجعية" style={{display:'block',maxWidth:'100%',maxHeight:'320px',objectFit:'contain',borderRadius:'10px',marginBottom:'8px'}}/>
      <div style={{fontSize:'11px',overflowWrap:'anywhere',marginBottom:'8px'}}>صورة الغرفة: {meta.fileName} — {meta.sizeKB} KB</div>
      <button className="btn btn-secondary" type="button" onClick={onRemove}>إزالة صورة الغرفة فقط</button>
    </div>}
  </section>
)
