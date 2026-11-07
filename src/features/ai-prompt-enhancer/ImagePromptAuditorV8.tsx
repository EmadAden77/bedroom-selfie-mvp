import React,{useEffect,useRef,useState} from 'react'
import type {CompilationContext} from '../../domain/types'
import {bedroomShots} from '../../data/bedroom-shots'
import {evaluatePhysicalReality,explicitUnauthorizedEmitter} from '../../engine/physical-reality'

type Result={
 repairNotes:string[]
 sceneCameraSurfaceDetails:string
 finalImagePrompt:string
 error?:string
 errorCode?:string
}
type Props={
 ctx:CompilationContext
 sourcePrompt:string
 sceneBrief:string
 onAdvisoryReady:(prompt:string)=>void
}
export const MAX_V8_INPUT=14000
export const MAX_V8_SCENE=12000

/** Optional, text-only final auditor. This does not alter the main Gemini or Ghalyon engines. */
export const ImagePromptAuditorV8:React.FC<Props>=({ctx,sourcePrompt,sceneBrief,onAdvisoryReady})=>{
 const [draft,setDraft]=useState('')
 const [ownPortrait,setOwnPortrait]=useState(true)
 const [promptOnly,setPromptOnly]=useState(false)
 const [result,setResult]=useState<Result|null>(null)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [copied,setCopied]=useState(false)
 const pending=useRef<AbortController|null>(null)
 const version=useRef(0)
 const preferred=(draft.trim()||sourcePrompt.trim()||sceneBrief.trim())
 const tooLong=preferred.length>MAX_V8_INPUT||sceneBrief.length>MAX_V8_SCENE
 const ready=preferred.length>=10&&!tooLong
 const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
 const capture=shot?.mode||'front'

 const reset=()=>{
  version.current++;pending.current?.abort();pending.current=null
  setLoading(false);setResult(null);setError('');setCopied(false)
 }
 useEffect(()=>{
  version.current++;pending.current?.abort();pending.current=null
  setLoading(false);setResult(null);setError('');setCopied(false)
 },[sourcePrompt,sceneBrief,ctx.bedroomShotId,ctx.nightLightingId,ctx.phoneOnlyIlluminationMode])
 useEffect(()=>()=>{version.current++;pending.current?.abort()},[])

 async function audit(){
  if(!ready)return
  pending.current?.abort()
  const number=++version.current
  const ctrl=new AbortController();pending.current=ctrl
  const isCurrent=()=>version.current===number&&!ctrl.signal.aborted
  setLoading(true);setError('');setResult(null);setCopied(false)
  try{
   const response=await fetch('/api/audit-image-prompt',{
    method:'POST',headers:{'content-type':'application/json'},signal:ctrl.signal,
    body:JSON.stringify({
     prompt:preferred,sceneBrief,captureMode:capture,shotId:shot?.id||'',
     lighting:evaluatePhysicalReality(ctx).effectiveLightingId,
     subjectReferencePresent:!!ctx.referenceImagePresent,
     roomReferencePresent:!!ctx.roomReferencePresent,
     ownPortrait
    })
   })
   if(!(response.headers.get('content-type')||'').includes('application/json'))
    throw Error('مدقق v8 أعاد استجابة غير صالحة (AUDITOR_NON_JSON).')
   const data=await response.json() as Result
   if(!isCurrent())return
   if(!response.ok)throw Error((data.error||'تعذر تدقيق البرومبت.')+(data.errorCode?' ('+data.errorCode+')':''))
   if(!Array.isArray(data.repairNotes)||typeof data.sceneCameraSurfaceDetails!=='string'||
      typeof data.finalImagePrompt!=='string'||!data.finalImagePrompt.trim())
    throw Error('مدقق v8 أعاد بيانات غير مكتملة.')
   const forbidden=explicitUnauthorizedEmitter(data.finalImagePrompt,ctx.phoneOnlyIlluminationMode||'OFF')
   if(forbidden)throw Error('رفضت إضاءة غير مصرّح بها في نتيجة التدقيق: '+forbidden)
   setResult(data)
  }catch(reason){
   if(isCurrent())setError(reason instanceof Error?reason.message:'تعذر الاتصال بمدقق v8.')
  }finally{
   if(isCurrent())setLoading(false)
  }
 }
 async function copy(){
  if(!result)return
  try{await navigator.clipboard.writeText(result.finalImagePrompt);setCopied(true)}
  catch{setError('تعذر النسخ التلقائي؛ انسخ النص من مربع البرومبت.')}
 }
 return <section aria-label="مدقق برومبت الصور v8" style={{borderTop:'1px solid var(--border)',marginTop:20,paddingTop:16}}>
  <h2 style={{fontSize:16,margin:'0 0 8px'}}>🔬 IMAGE PROMPT AUDITOR — v8</h2>
  <p role="note" style={{fontSize:12,fontWeight:700}}>Advisory Output — Non-Authoritative</p>
  <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.8}}>
   تدقيق وإصلاح النص قبل إنشاء الصورة: الهوية والشعر، الفيزياء والتشريح، مسار المرآة والكاميرا، التعريض، السيراميك والجدران وآثار الاستخدام الحقيقية. لا يولّد صورًا.
  </p>
  <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.7}}>
   الهدف <strong>ChatGPT Images</strong>. سيستخدم البرومبت الحالي أو خيارات المشهد تلقائيًا عند ترك الحقل فارغًا. يحتفظ بأثاث الغرفة وحالة الفوضى التي اخترتها؛ لا يضيف تلفًا أو أوساخًا لمجرد زيادة الواقعية.
  </p>
  <label htmlFor="v8-raw-prompt" style={{fontSize:12}}>برومبت للتدقيق (اختياري إذا لديك برومبت حالي)</label>
  <textarea id="v8-raw-prompt" className="input" rows={5} maxLength={MAX_V8_INPUT}
   placeholder="الصق البرومبت المراد إصلاحه، أو اتركه فارغًا لاستخدام البرومبت الحالي أو خيارات التصوير."
   value={draft} onChange={e=>{reset();setDraft(e.target.value)}}/>
  <div style={{fontSize:11,color:'var(--muted)',marginTop:7,lineHeight:1.7}}>
   مصدر التدقيق الحالي: {draft.trim()?'النص الذي كتبته':sourcePrompt.trim()?'البرومبت الناتج من المحرك':'اختيارات التصوير في التطبيق'}
   {' · '}الكاميرا: {capture==='mirror'?'خلفية عبر المرآة':capture==='front'?'أمامية مباشرة':capture==='rear'?'خلفية مباشرة':'مؤقت على حامل'}
  </div>
  {sourcePrompt.trim()&&<button type="button" className="btn btn-secondary" style={{marginTop:8}} onClick={()=>{reset();setDraft(sourcePrompt)}}>استيراد البرومبت الحالي للتحرير</button>}
  <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,margin:'12px 0'}}>
   <input type="checkbox" checked={ownPortrait} onChange={e=>{reset();setOwnPortrait(e.target.checked)}}/>
   <span>الصورة تخصني؛ طبّق بنية 193 سم / 83 كجم دون تغيير الهوية. <small style={{display:'block',color:'var(--muted)'}}>ألغِها عند تدقيق صورة شخص آخر.</small></span>
  </label>
  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,margin:'12px 0'}}>
   <input type="checkbox" checked={promptOnly} onChange={e=>setPromptOnly(e.target.checked)}/>
   البرومبت فقط — إخفاء ملاحظات الإصلاح والتفاصيل العربية
  </label>
  {tooLong&&<p role="alert" style={{fontSize:12,color:'#b91c1c'}}>النص أو وصف المشهد طويل جدًا. اختصر الوصف إلى الحدود المسموحة.</p>}
  <button type="button" className="btn" disabled={!ready||loading} onClick={()=>void audit()}>
   {loading?'جارٍ التدقيق الفيزيائي…':'تدقيق وإصلاح البرومبت — v8'}
  </button>
  {error&&<p role="alert" style={{fontSize:12,color:'#b91c1c',lineHeight:1.7}}>{error}</p>}
  {result&&<div style={{marginTop:14}}>
   {!promptOnly&&<><h3 style={{fontSize:13}}>A — ملاحظات الإصلاح</h3>
   {result.repairNotes.length>0
    ? <ul style={{paddingRight:20,fontSize:12,lineHeight:1.9}}>{result.repairNotes.map((item,i)=><li key={i}>{item}</li>)}</ul>
    : <p style={{fontSize:12}}>لم يرصد المدقق تناقضًا نصيًا يستوجب الإصلاح.</p>}
   <h3 style={{fontSize:13}}>B — المشهد والكاميرا والأسطح</h3>
   <p style={{fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{result.sceneCameraSurfaceDetails}</p></>}
   <h3 style={{fontSize:13}}>C — مسودة البرومبت الإنجليزية (استشارية وليست نهائية)</h3>
   <pre className="preview-box" dir="ltr" style={{textAlign:'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:520,overflowY:'auto'}}>
    <code>{result.finalImagePrompt}</code>
   </pre>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
    <button className="btn" type="button" onClick={()=>void copy()}>{copied?'✓ تم النسخ':'نسخ المسودة الاستشارية'}</button>
    <button className="btn btn-secondary" type="button" onClick={()=>onAdvisoryReady(result.finalImagePrompt)}>إرسال المسودة لمراجعة الصورة (استشاري)</button>
   </div>
  </div>}
  <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.7,margin:'12px 0 0'}}>
   يُرسل النص واختيارات المشهد فقط إلى Gemini للتدقيق. لا تُرسل صور الوجه والغرفة إلى هذا المحرك، ولا يستطيع الادعاء بأنه فحص الصور نفسها. التدقيق النصي لا يضمن نتيجة بصرية مثالية.
  </p>
 </section>
}
