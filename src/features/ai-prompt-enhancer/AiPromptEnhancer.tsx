import React,{useEffect,useMemo,useRef,useState} from 'react'
import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {buildCreativeSceneBrief} from './buildCreativeSceneBrief'
import {GhalyonPromptOptimizer} from './GhalyonPromptOptimizer'
import {ImagePromptAuditorV8} from './ImagePromptAuditorV8'
import {naturalSceneSelectionIssues} from './natural-scene-director'
import {
 buildSceneSpecification,validateConstrainedEditorReply,MAX_SCENE_SPEC_REQUEST_BYTES
} from './scene-specification'
import {roomInputStatus,roomGeometryIssues} from '../../../shared/room-geometry-rules'
import {unverifiedRoomMeasurements,type RoomAuditEntry,type RoomAcknowledgement} from '../../../shared/room-acknowledgement'

type Props={ctx:CompilationContext;result:CompilationResult;validation:ValidationResult;onReset:()=>void;onPromptReady:(prompt:string)=>void;onAdvisoryReady:(draft:string)=>void}
type ConfirmableCandidate={source:'local'|'gemini-editor';prompt:string;sectionOrder?:string[];openingLineSelection?:'canonical'|'concise'}
type MainReply={
 prompt?:string;source?:string;model?:string;error?:string;errorCode?:string
 sectionOrder?:string[];openingLineSelection?:'canonical'|'concise';integrity?:string;promptDigest?:string;sectionCount?:number;protectedUnitDigests?:{id:string;digest:string}[]
 validated?:boolean;authoritative?:boolean
}

export const AiPromptEnhancer:React.FC<Props>=({ctx,result,validation,onReset,onPromptReady,onAdvisoryReady})=>{
 const [generated,setGenerated]=useState('')
 const [auditorSource,setAuditorSource]=useState('')
 const [engine,setEngine]=useState<'gemini'|'local'|''>('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [copied,setCopied]=useState(false)
 const [confirmOpen,setConfirmOpen]=useState(false)
 const [pendingCandidate,setPendingCandidate]=useState<ConfirmableCandidate|null>(null)
 const [isAuthoritative,setIsAuthoritative]=useState(false)
 const [auditEntry,setAuditEntry]=useState<RoomAuditEntry|null>(null)
 const requestRef=useRef<AbortController|null>(null)
 const requestVersion=useRef(0)
 const prompt=result.promptText
 // This specification is assembled solely from the already validated local compiler.
 // The old concise brief remains for Ghalyon and Auditor v8, not the main Gemini editor.
 const sceneBrief=buildCreativeSceneBrief(ctx)
 const roomInput=roomInputStatus(ctx)
 const spec=useMemo(()=>roomInput.status==='invalid'?null:buildSceneSpecification(ctx,result,validation),
  [ctx,result,validation,roomInput.status])
 const selectionIssues=naturalSceneSelectionIssues(ctx)
 const invalidRoom=!!spec&&roomGeometryIssues(spec.roomGeometry).some(x=>x.status==='invalid')
 const fallbackReady=roomInput.status==='valid'&&!invalidRoom&&validation.isValid&&result.errors.length===0&&prompt.length>=100
 const specTooLong=!!spec&&typeof Blob!=='undefined'?new Blob([JSON.stringify({sceneSpecification:spec})]).size>MAX_SCENE_SPEC_REQUEST_BYTES:false
 const ready=!!spec&&fallbackReady&&!specTooLong&&selectionIssues.length===0&&spec.conflicts.length===0
 const targetLabels={gemini:'Gemini / Imagen',chatgpt:'ChatGPT / GPT Image',flux:'FLUX',midjourney:'Midjourney'} as const
 const selectedTarget=targetLabels[ctx.promptTarget||'gemini']
 const authorityEligible=!!spec&&spec.roomGeometry.userConfirmed&&roomGeometryIssues(spec.roomGeometry).length===0
 const unverified=spec?unverifiedRoomMeasurements(spec.roomGeometry,spec.capture.posture):[]

 useEffect(()=>{
  // A changed selection invalidates all previously requested editor results.
  requestVersion.current++
  requestRef.current?.abort()
  requestRef.current=null
  setGenerated('');setAuditorSource('');setEngine('');setError('');setLoading(false);setCopied(false)
  setConfirmOpen(false);setPendingCandidate(null);setIsAuthoritative(false);setAuditEntry(null)
  onPromptReady('')
  onAdvisoryReady('')
 },[spec?.integrity,prompt,sceneBrief,ctx.promptTarget,onPromptReady,onAdvisoryReady])
 useEffect(()=>()=>{requestVersion.current++;requestRef.current?.abort()},[])

 /**
  * Local scene output is not authoritative solely because it exists in React.
  * Only the server's single authority gate can promote its exact section text.
  */
 async function authorizeLocal(reason=''){
  if(!fallbackReady||!spec)return
  // PR7b: local text may be shown/copied without any final authority.
  // Do not ask the server to promote a scene with unconfirmed/unknown geometry.
  if(!spec.roomGeometry.userConfirmed||roomGeometryIssues(spec.roomGeometry).length>0){
   requestVersion.current++
   requestRef.current?.abort()
   setGenerated(prompt);setEngine('local');setAuditorSource('')
   setPendingCandidate({source:'local',prompt});setIsAuthoritative(false);setAuditEntry(null)
   setError((reason?reason+' ':'')+'البرومبت المحلي للعرض فقط — أبعاد الغرفة غير مؤكدة أو قياسات الهندسة غير مكتملة؛ لا يمكن اعتماده نهائيًا.')
   setCopied(false);onPromptReady('')
   return
  }
  requestRef.current?.abort()
  const version=++requestVersion.current
  const ctrl=new AbortController();requestRef.current=ctrl
  const current=()=>version===requestVersion.current&&!ctrl.signal.aborted
  setLoading(true);setError('');setGenerated('');setAuditorSource('');setEngine('');setCopied(false)
  onPromptReady('')
  try{
   const response=await fetch('/api/authorize-final-prompt',{
    method:'POST',headers:{'content-type':'application/json'},signal:ctrl.signal,
    body:JSON.stringify({sceneSpecification:spec,candidate:{source:'local',prompt}})
   })
   if(!(response.headers.get('content-type')||'').includes('application/json'))
    throw Error('FINAL_AUTH_NON_JSON')
   const data=await response.json() as {source?:string;prompt?:string;integrity?:string;validated?:boolean;errorCode?:string;error?:string}
   if(!current())return
   if(!response.ok)throw Error(data.errorCode||data.error||'FINAL_AUTH_REJECTED')
   if(data.source!=='local'||data.validated!==true||data.prompt!==prompt||data.integrity!==spec.integrity)
    throw Error('FINAL_AUTH_RESPONSE_MISMATCH')
   if(current()){
    setGenerated(prompt);setEngine('local');setError(reason)
    setPendingCandidate(null);setIsAuthoritative(true);setAuditEntry(null)
    onPromptReady(prompt)
   }
  }catch(e){
   if(current()){
    setGenerated('');setEngine('');onPromptReady('')
    setError((reason?reason+' ':'')+'رفض اعتماد البرومبت المحلي حتى يجتاز بوابة الخادم: '+(e instanceof Error?e.message:'FINAL_AUTH_FAILED'))
   }
  }finally{if(current())setLoading(false)}
 }
 async function generate(){
  if(!ready||!spec)return
  requestRef.current?.abort()
  const version=++requestVersion.current
  const ctrl=new AbortController();requestRef.current=ctrl
  const current=()=>version===requestVersion.current&&!ctrl.signal.aborted
  setLoading(true);setError('');setGenerated('');setCopied(false);setAuditorSource('');setEngine('')
  try{
   const response=await fetch('/api/generate-main-prompt',{
    method:'POST',headers:{'content-type':'application/json'},signal:ctrl.signal,
    body:JSON.stringify({sceneSpecification:spec})
   })
   if(!(response.headers.get('content-type')||'').includes('application/json'))
    throw Error('تعذر تشغيل خدمة Gemini على الخادم (HTTP '+response.status+'، EDITOR_NON_JSON). البرومبت المحلي محفوظ.')
   const payload=await response.json() as MainReply
   if(!current())return
   if(!response.ok)throw Error((payload.error||'تعذر تحرير البرومبت عبر Gemini.')+(payload.errorCode?' ('+payload.errorCode+')':''))
   if(payload.validated!==true)throw Error('لم يؤكد الخادم مطابقة نتيجة Gemini للمشهد المحلي.')
   // Verify server claims and section digests without reassembling protected text.
   const checked=await validateConstrainedEditorReply(spec,payload)
   if(current()){
    setGenerated(checked.prompt);setEngine('gemini')
    setPendingCandidate({source:'gemini-editor',prompt:checked.prompt,
     sectionOrder:checked.sectionOrder,openingLineSelection:checked.openingLineSelection})
    setAuditEntry(null)
    // Editorial verification is distinct from promotion to Final Prompt.
    // Only the explicit server authority claim can update activeGeneratedPrompt.
    // Defense in depth: an incorrect/malformed server authority claim
    // cannot bypass the locally observed unconfirmed/unknown room state.
    const finalAllowed=payload.authoritative===true&&spec.roomGeometry.userConfirmed&&
     roomGeometryIssues(spec.roomGeometry).length===0
    setIsAuthoritative(finalAllowed)
    onPromptReady(finalAllowed?checked.prompt:'')
    if(!finalAllowed)
     setError('تحرير Gemini صحيح نصيًا لكنه غير معتمد نهائيًا: تأكيد الغرفة والقياسات الناقصة مطلوبان.')
   }
  }catch(e){
   if(current()){
    const detail=e instanceof Error?e.message:'تعذر الاتصال بمحرر Gemini.'
    await authorizeLocal('لم يُعتمد تعديل Gemini: '+detail+' يمكن اعتماد البرومبت المحلي بعد تحقق الخادم.')
   }
  }finally{if(current())setLoading(false)}
 }
 /** PR7b-1: explicit opt-in, verified by the SAME final server authority gate. */
 async function confirmMeasurements(){
  if(!spec||!pendingCandidate||!generated||invalidRoom||unverified.length===0)return
  setConfirmOpen(false)
  requestRef.current?.abort()
  const version=++requestVersion.current
  const ctrl=new AbortController();requestRef.current=ctrl
  const current=()=>version===requestVersion.current&&!ctrl.signal.aborted
  setLoading(true);setError('')
  const ack:RoomAcknowledgement={
   accepted:true,sceneIntegrity:spec.integrity,measurements:[...unverified]
  }
  try{
   const response=await fetch('/api/authorize-final-prompt',{
    method:'POST',headers:{'content-type':'application/json'},signal:ctrl.signal,
    body:JSON.stringify({sceneSpecification:spec,candidate:pendingCandidate,roomAcknowledgement:ack})
   })
   if(!(response.headers.get('content-type')||'').includes('application/json'))
    throw Error('ROOM_ACK_NON_JSON')
   const data=await response.json() as {
    source?:string;prompt?:string;integrity?:string;validated?:boolean;
    audit?:RoomAuditEntry;errorCode?:string;error?:string
   }
   if(!current())return
   if(!response.ok)throw Error(data.errorCode||data.error||'ROOM_ACK_DENIED')
   if(data.validated!==true||data.source!==pendingCandidate.source||
      data.prompt!==pendingCandidate.prompt||data.integrity!==spec.integrity||
      !data.audit||data.audit.event!=='ROOM_MEASUREMENTS_ACKNOWLEDGED'||
      data.audit.actor!=='interactive_user_unverified'||data.audit.actorVerified!==false||
      data.audit.sceneIntegrity!==spec.integrity||
      !Number.isFinite(Date.parse(data.audit.confirmedAt))||
      JSON.stringify(data.audit.unverifiedMeasurements)!==JSON.stringify(unverified))
    throw Error('ROOM_ACK_RESPONSE_MISMATCH')
   if(current()){
    setIsAuthoritative(true);setAuditEntry(data.audit);setError('')
    onPromptReady(pendingCandidate.prompt)
   }
  }catch(e){
   if(current()){
    setIsAuthoritative(false);onPromptReady('')
    setError('لم يُعتمد إقرار القياسات غير المتحققة: '+(e instanceof Error?e.message:'ROOM_ACK_FAILED'))
   }
  }finally{if(current())setLoading(false)}
 }
 async function copy(){
  if(!generated)return
  try{await navigator.clipboard.writeText(generated);setCopied(true)}
  catch{setError('تعذر النسخ؛ يمكنك تحديد النص ونسخه يدويًا.')}
 }
 function useLocal(){
  void authorizeLocal()
 }

 return <section className="card" aria-label="المحرك الرئيسي لتوليد البرومبت">
  <div style={{fontSize:16,fontWeight:750,marginBottom:10}}>✨ Gemini — محرر البرومبت المقيّد</div>
  <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.8,margin:'0 0 12px'}}>
   <strong>اختياراتك ومحركات القواعد المحلية تحدد المشهد بالكامل.</strong> يقتصر دور Gemini على ترتيب الأقسام واختيار افتتاحية من قوالب لغوية محلية معتمدة من دون تغيير الهوية أو الملابس أو هندسة الغرفة أو الكاميرا أو الإضاءة. لا تُعتمد النتيجة إلا بعد مطابقتها برمجيًا مع المواصفات المحلية.
  </p>
  <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.75,margin:'0 0 10px'}}>
   تُرسل إلى Gemini مواصفات المشهد النصية المنظمة من محرك التطبيق، دون ملفات صور الوجه والغرفة. يحتفظ غَليون ومدقق v8 بمساريهما المستقلين ولا يغيران اختياراتك تلقائيًا. الهدف: {selectedTarget}.
  </p>
  {specTooLong&&<p role="alert" style={{fontSize:12,color:'#b91c1c'}}>مواصفات المشهد تتجاوز حجم الطلب الآمن. البرومبت المحلي ما زال متاحًا.</p>}
  {selectionIssues.length>0&&<div role="alert" style={{fontSize:12,color:'#b91c1c'}}>{selectionIssues.map(x=><p key={x}>{x}</p>)}</div>}
  {unverified.length>0&&<div role="alert" aria-label="Room measurements provisional warning" style={{fontSize:12,color:'#92400e'}}>
   <strong>Provisional — unverified measurements.</strong>
   {unverified.map(name=><p key={name}>{name}. Authoritative status requires verification or explicit acknowledgement.</p>)}
  </div>}
  {roomInput.status==='invalid'&&<p role="alert" style={{fontSize:12,color:'#b91c1c'}}>
   {roomInput.reason} — لم يُرسل شيء إلى Gemini.
  </p>}
  {!fallbackReady&&<div role="alert" style={{fontSize:12,color:'#b91c1c'}}>
   لا يمكن تشغيل محرر Gemini قبل اجتياز محرك المشهد المحلي جميع فحوص الفيزياء والهندسة.
   {[...new Set([...validation.errors,...result.errors])].slice(0,4).map(x=><p key={x}>{x}</p>)}
  </div>}
  <details style={{marginBottom:12}}>
   <summary style={{cursor:'pointer',fontSize:12,fontWeight:650}}>عرض البرومبت المحلي المعتمد من اختياراتك</summary>
   <div dir="ltr" className="preview-box" style={{textAlign:'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:380,overflowY:'auto',marginTop:8}}>
    {fallbackReady?prompt:'لا توجد مواصفات مشهد محلي صالحة بعد.'}
   </div>
  </details>
  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <button type="button" className="btn" disabled={!ready||loading} onClick={()=>void generate()}>
    {loading?'Gemini يراجع ترتيب البرومبت…':'تحرير البرومبت بواسطة Gemini'}
   </button>
   <button type="button" className="btn btn-secondary" disabled={!fallbackReady} onClick={useLocal}>
    {authorityEligible?'اعتماد البرومبت المحلي':'عرض البرومبت المحلي (غير معتمد)'}
   </button>
  </div>
  {error&&<div role="alert" style={{marginTop:12,fontSize:12,color:'#b91c1c',lineHeight:1.8}}>{error}</div>}
  {generated&&<div style={{marginTop:16}}>
   <p style={{fontSize:12,fontWeight:650,margin:'0 0 8px'}}>
    <span>{engine==='gemini'
     ?(isAuthoritative?'✓ نتيجة Gemini المحررة والمعتمدة برمجيًا — ':'نتيجة Gemini المحررة — غير معتمدة نهائيًا — ')+selectedTarget
     :(isAuthoritative?'✓ البرومبت المحلي — دون اعتماد تحرير Gemini':'البرومبت المحلي — للعرض فقط، غير معتمد')}</span>
    {' — '}<strong>{isAuthoritative?'Authoritative':'Provisional'}</strong>
   </p>
   <div dir="ltr" className="preview-box" style={{textAlign:'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:520,overflowY:'auto'}}>{generated}</div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
    <button type="button" className="btn" onClick={()=>void copy()}>{copied?'✓ تم النسخ':isAuthoritative?'نسخ البرومبت النهائي':'نسخ المسودة غير المعتمدة'}</button>
    <button type="button" className="btn btn-secondary" onClick={onReset}>إعادة تعيين الخيارات</button>
   </div>
   {!isAuthoritative&&pendingCandidate&&unverified.length>0&&!invalidRoom&&
    <button type="button" className="btn btn-secondary" style={{marginTop:10}}
     onClick={()=>setConfirmOpen(true)} disabled={loading}>
     Confirm and mark as authoritative (acknowledges unverified measurements)
    </button>}
   {auditEntry&&<p role="status" style={{fontSize:11,color:'var(--muted)'}}>
    Audit: {auditEntry.confirmedAt} — {auditEntry.actor} — {auditEntry.unverifiedMeasurements.join('; ')}
   </p>}
  </div>}
  {confirmOpen&&<div role="presentation" style={{
   position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.64)',
   display:'flex',alignItems:'center',justifyContent:'center',padding:16
  }}>
   <div role="dialog" aria-modal="true" aria-label="Confirm unverified room measurements"
    className="card" style={{maxWidth:540,width:'100%',maxHeight:'85vh',overflowY:'auto'}}>
    <h3>Confirm unverified room measurements</h3>
    <p>These measurements are NOT verified. Your explicit acknowledgement authorizes
     this exact provisional prompt without changing any RG result. The audit actor
     will be recorded as an unauthenticated interactive user.</p>
    <ul>{unverified.map(name=><li key={name}>{name}</li>)}</ul>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <button type="button" className="btn btn-secondary" onClick={()=>setConfirmOpen(false)}>
      Cancel confirmation
     </button>
     <button type="button" className="btn" onClick={()=>void confirmMeasurements()}>
      I acknowledge every unverified measurement and confirm
     </button>
    </div>
   </div>
  </div>}
  <GhalyonPromptOptimizer sourcePrompt={generated} scenePrompt={sceneBrief} selectedLighting={ctx.nightLightingId||'phone_screen'} initialTarget={ctx.promptTarget==='chatgpt'?'chatgpt':'gemini'} onAdvisoryReady={text=>{setAuditorSource(text);onAdvisoryReady(text)}}/>
  <ImagePromptAuditorV8 ctx={ctx} sourcePrompt={auditorSource||generated} sceneBrief={sceneBrief} onAdvisoryReady={onAdvisoryReady}/>
 </section>
}
