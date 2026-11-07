import React,{useEffect,useMemo,useRef,useState} from 'react'
import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {buildCreativeSceneBrief} from './buildCreativeSceneBrief'
import {GhalyonPromptOptimizer} from './GhalyonPromptOptimizer'
import {ImagePromptAuditorV8} from './ImagePromptAuditorV8'
import {naturalSceneSelectionIssues} from './natural-scene-director'
import {
 buildSceneSpecification,validateConstrainedEditorReply,MAX_SCENE_SPEC_REQUEST_BYTES
} from './scene-specification'

type Props={ctx:CompilationContext;result:CompilationResult;validation:ValidationResult;onReset:()=>void;onPromptReady:(prompt:string)=>void}
type MainReply={
 prompt?:string;source?:string;model?:string;error?:string;errorCode?:string
 sectionOrder?:string[];openingLineSelection?:'canonical'|'concise';integrity?:string;promptDigest?:string;sectionCount?:number;protectedUnitDigests?:{id:string;digest:string}[]
 validated?:boolean
}

export const AiPromptEnhancer:React.FC<Props>=({ctx,result,validation,onReset,onPromptReady})=>{
 const [generated,setGenerated]=useState('')
 const [auditorSource,setAuditorSource]=useState('')
 const [engine,setEngine]=useState<'gemini'|'local'|''>('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [copied,setCopied]=useState(false)
 const requestRef=useRef<AbortController|null>(null)
 const requestVersion=useRef(0)
 const prompt=result.promptText
 // This specification is assembled solely from the already validated local compiler.
 // The old concise brief remains for Ghalyon and Auditor v8, not the main Gemini editor.
 const sceneBrief=buildCreativeSceneBrief(ctx)
 const spec=useMemo(()=>buildSceneSpecification(ctx,result,validation),[ctx,result,validation])
 const selectionIssues=naturalSceneSelectionIssues(ctx)
 const fallbackReady=validation.isValid&&result.errors.length===0&&prompt.length>=100
 const specTooLong=typeof Blob!=='undefined'?new Blob([JSON.stringify({sceneSpecification:spec})]).size>MAX_SCENE_SPEC_REQUEST_BYTES:false
 const ready=fallbackReady&&!specTooLong&&selectionIssues.length===0&&spec.conflicts.length===0
 const targetLabels={gemini:'Gemini / Imagen',chatgpt:'ChatGPT / GPT Image',flux:'FLUX',midjourney:'Midjourney'} as const
 const selectedTarget=targetLabels[ctx.promptTarget||'gemini']

 useEffect(()=>{
  // A changed selection invalidates all previously requested editor results.
  requestVersion.current++
  requestRef.current?.abort()
  requestRef.current=null
  setGenerated('');setAuditorSource('');setEngine('');setError('');setLoading(false);setCopied(false)
  onPromptReady('')
 },[spec.integrity,prompt,sceneBrief,ctx.promptTarget,onPromptReady])
 useEffect(()=>()=>{requestVersion.current++;requestRef.current?.abort()},[])

 function acceptLocal(reason=''){
  if(!fallbackReady)return
  setGenerated(prompt);setAuditorSource('');setEngine('local')
  setError(reason);setLoading(false);setCopied(false)
  onPromptReady(prompt)
 }
 async function generate(){
  if(!ready)return
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
   // Independently reconstruct and compare all immutable units on the client.
   const checked=await validateConstrainedEditorReply(spec,payload)
   if(current()){setGenerated(checked.prompt);setEngine('gemini');onPromptReady(checked.prompt)}
  }catch(e){
   if(current()){
    const detail=e instanceof Error?e.message:'تعذر الاتصال بمحرر Gemini.'
    acceptLocal('لم يُعتمد تعديل Gemini: '+detail+' تم الرجوع إلى البرومبت المحلي الصحيح.')
   }
  }finally{if(current())setLoading(false)}
 }
 async function copy(){
  if(!generated)return
  try{await navigator.clipboard.writeText(generated);setCopied(true)}
  catch{setError('تعذر النسخ؛ يمكنك تحديد النص ونسخه يدويًا.')}
 }
 function useLocal(){
  requestVersion.current++;requestRef.current?.abort();requestRef.current=null
  acceptLocal()
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
   <button type="button" className="btn btn-secondary" disabled={!fallbackReady} onClick={useLocal}>اعتماد البرومبت المحلي</button>
  </div>
  {error&&<div role="alert" style={{marginTop:12,fontSize:12,color:'#b91c1c',lineHeight:1.8}}>{error}</div>}
  {generated&&<div style={{marginTop:16}}>
   <p style={{fontSize:12,fontWeight:650,margin:'0 0 8px'}}>
    {engine==='gemini'?'✓ نتيجة Gemini المحررة والمعتمدة برمجيًا — '+selectedTarget:'✓ البرومبت المحلي — دون اعتماد تحرير Gemini'}
   </p>
   <div dir="ltr" className="preview-box" style={{textAlign:'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:520,overflowY:'auto'}}>{generated}</div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
    <button type="button" className="btn" onClick={()=>void copy()}>{copied?'✓ تم النسخ':'نسخ البرومبت النهائي'}</button>
    <button type="button" className="btn btn-secondary" onClick={onReset}>إعادة تعيين الخيارات</button>
   </div>
  </div>}
  <GhalyonPromptOptimizer sourcePrompt={generated} scenePrompt={sceneBrief} phoneOnlyMode={ctx.phoneOnlyIlluminationMode||'OFF'} initialTarget={ctx.promptTarget==='chatgpt'?'chatgpt':'gemini'} onPromptReady={text=>{setAuditorSource(text);onPromptReady(text)}}/>
  <ImagePromptAuditorV8 ctx={ctx} sourcePrompt={auditorSource||generated} sceneBrief={sceneBrief} onPromptReady={onPromptReady}/>
 </section>
}
