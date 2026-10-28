import React, {useMemo,useState} from 'react'
import type {CompilationContext} from '../../domain/types'
import {compareTargets,isCopyable} from './compare'

export const PromptComparison:React.FC<{ctx:CompilationContext}>=({ctx})=>{
 const {gemini,chatgpt,differences,sharedCount}=useMemo(()=>compareTargets(ctx),[ctx])
 const [message,setMessage]=useState('')
 const copy=async(target:'gemini'|'chatgpt')=>{
   const compiled=target==='gemini'?gemini:chatgpt
   if(!isCopyable(compiled)) return
   try{await navigator.clipboard.writeText(compiled.result.promptText);setMessage('تم نسخ برومبت '+(target==='gemini'?'Gemini':'ChatGPT'))}
   catch{setMessage('تعذر النسخ؛ تحقق من صلاحية الحافظة')}
 }
 return <section className="card" aria-label="مقارنة برومبت Gemini وChatGPT">
  <div style={{fontSize:'14px',fontWeight:600,marginBottom:'7px'}}>مقارنة Gemini وChatGPT</div>
  <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'9px'}}>نفس اختيارات الشخص والغرفة والكاميرا والإضاءة؛ الاختلافات ناتجة فقط عن تعليمات مولّد الصور.</div>
  <div style={{fontSize:'12px',marginBottom:'9px'}}>الأجزاء المشتركة: {sharedCount} — الأجزاء المختلفة: {differences.length}</div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'8px'}}>
   {([['gemini',gemini],['chatgpt',chatgpt]] as const).map(([target,out])=><div key={target} style={{minWidth:0,border:'1px solid var(--border)',borderRadius:'10px',padding:'8px'}}>
    <div style={{fontWeight:600,fontSize:'12px'}}>{target==='gemini'?'Gemini':'ChatGPT'}</div>
    <div style={{fontSize:'10px',color:out.validation.isValid?'var(--muted)':'var(--error)'}}>{isCopyable(out)?'جاهز للنسخ':'غير صالح للنسخ: '+out.result.errors.join('، ')}</div>
    <div className="ltr" style={{fontSize:'10px',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'300px',overflowY:'auto',margin:'8px 0'}}>{out.result.promptText||'لا يوجد برومبت صالح'}</div>
    <button type="button" className="btn" disabled={!isCopyable(out)} style={{width:'100%',fontSize:'11px'}} onClick={()=>copy(target)}>نسخ {target==='gemini'?'Gemini':'ChatGPT'}</button>
   </div>)}
  </div>
  <details style={{marginTop:'10px'}}><summary style={{fontSize:'12px',cursor:'pointer'}}>عرض التعليمات المختلفة فقط ({differences.length})</summary>
   {differences.map(d=><div key={d.id} style={{borderTop:'1px solid var(--border)',padding:'8px 0'}}>
    <div className="ltr" style={{fontSize:'11px',fontWeight:600}}>{d.id}</div>
    <div className="ltr" style={{fontSize:'10px',overflowWrap:'anywhere',marginTop:'3px'}}>Gemini: {d.gemini}</div>
    <div className="ltr" style={{fontSize:'10px',overflowWrap:'anywhere',marginTop:'3px'}}>ChatGPT: {d.chatgpt}</div>
   </div>)}
  </details>
  {message&&<div role="status" style={{marginTop:'8px',fontSize:'12px'}}>{message}</div>}
 </section>
}
