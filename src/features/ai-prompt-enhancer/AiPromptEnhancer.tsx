import React,{useEffect,useMemo,useRef,useState} from 'react'
import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {buildCreativeSceneBrief} from './buildCreativeSceneBrief'
import {GhalyonPromptOptimizer} from './GhalyonPromptOptimizer'
import {ImagePromptAuditorV8} from './ImagePromptAuditorV8'
import {naturalSceneSelectionIssues} from './natural-scene-director'
import {MAX_SCENE_BRIEF_CHARS,MAX_SCENE_REQUEST_BYTES} from './scene-request-limits'
import {buildSceneSpecification,scenePromptFromOrder} from '../../compiler/scene-specification'

type Props={ctx:CompilationContext;result:CompilationResult;validation:ValidationResult;onReset:()=>void;onPromptReady:(prompt:string)=>void}
type MainReply={prompt?:string;source?:string;model?:string;validated?:boolean;order?:string[];layout?:'paragraphs'|'compact';error?:string;errorCode?:string}

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
  const sceneBrief=buildCreativeSceneBrief(ctx)
  const selectionIssues=naturalSceneSelectionIssues(ctx)
  const sceneTooLong=sceneBrief.length>MAX_SCENE_BRIEF_CHARS
  const fallbackReady=validation.isValid&&result.errors.length===0&&prompt.length>=100
  const specification=useMemo(()=>{
    if(!fallbackReady)return null
    try{return buildSceneSpecification(ctx,result,validation)}
    catch{return null}
  },[ctx,result,validation,fallbackReady])
  const editorBody=useMemo(()=>specification?JSON.stringify({
    sceneSpecification:specification,target:ctx.promptTarget||'gemini'
  }):'', [specification,ctx.promptTarget])
  const editorRequestBytes=useMemo(()=>new TextEncoder().encode(editorBody).length,[editorBody])
  const ready=!!specification&&editorRequestBytes<=MAX_SCENE_REQUEST_BYTES&&selectionIssues.length===0
  const targetLabels={gemini:'Gemini / Imagen',chatgpt:'ChatGPT / GPT Image',flux:'FLUX',midjourney:'Midjourney'} as const
  const selectedTarget=targetLabels[ctx.promptTarget||'gemini']


  useEffect(()=>{
    // Invalidate the old response even if the provider or a mock ignores AbortSignal.
    requestVersion.current++
    requestRef.current?.abort()
    requestRef.current=null
    setGenerated('');setAuditorSource('');setEngine('');setError('');setLoading(false);setCopied(false)
    onPromptReady('')
  },[prompt,sceneBrief,ctx.promptTarget,onPromptReady])
  useEffect(()=>()=>{requestVersion.current++;requestRef.current?.abort()},[])

  async function generate(){
    if(!ready||!specification)return
    requestRef.current?.abort()
    const version=++requestVersion.current
    const ctrl=new AbortController()
    requestRef.current=ctrl
    const current=()=>version===requestVersion.current&&!ctrl.signal.aborted
    setLoading(true);setError('');setCopied(false);setGenerated('');setAuditorSource('');setEngine('')
    try{
      const response=await fetch('/api/generate-main-prompt',{
        method:'POST',
        headers:{'content-type':'application/json'},
        signal:ctrl.signal,
        body:editorBody
      })
      if(!(response.headers.get('content-type')||'').includes('application/json'))
        throw Error('خدمة Gemini أعادت ردًا غير متوقع. جرّب مجددًا أو استخدم النسخة المحلية.')
      let payload:MainReply
      try{payload=await response.json() as MainReply}
      catch{throw Error('تعذر قراءة رد Gemini.')}
      if(!response.ok)
        throw Error((payload.error||'لم يُعتمد تحرير Gemini.')+(payload.errorCode?' ('+payload.errorCode+')':''))
      if(payload.source!=='gemini_editor'||payload.validated!==true||!Array.isArray(payload.order)||
        !['paragraphs','compact'].includes(String(payload.layout))||typeof payload.prompt!=='string')
        throw Error('رد المحرر لا يحتوي على إثبات حفظ القيود المحلية.')
      const locallyVerified=scenePromptFromOrder(specification,payload.order,payload.layout)
      if(payload.prompt!==locallyVerified)throw Error('النص المعدل لا يطابق الأقسام المحلية المعتمدة.')
      if(current()){setGenerated(payload.prompt);setEngine('gemini');onPromptReady(payload.prompt)}
    }catch(err){
      if(current()){
        const why=err instanceof Error?err.message:'تعذر الاتصال بـGemini.'
        setError('لم يُعتمد تحرير Gemini: '+why+' — استُخدم البرومبت المحلي المعتمد بدلًا منه.')
        setGenerated(prompt);setEngine('local');onPromptReady(prompt)
      }
    }finally{
      if(current())setLoading(false)
    }
  }

  async function copy(){
    if(!generated)return
    try{await navigator.clipboard.writeText(generated);setCopied(true)}
    catch{setError('تعذر النسخ؛ يمكنك تحديد النص ونسخه يدويًا.')}
  }

  function useLocal(){
    requestVersion.current++
    requestRef.current?.abort()
    requestRef.current=null
    if(!fallbackReady)return
    setGenerated(prompt);setAuditorSource('');setEngine('local');setError('');setLoading(false);setCopied(false);onPromptReady(prompt)
  }

  return <section className="card" aria-label="المحرك الرئيسي لتوليد البرومبت">
    <div style={{fontSize:'16px',fontWeight:750,marginBottom:'10px'}}>✨ Gemini — المحرر اللغوي المقيّد</div>
    <p style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.8,margin:'0 0 12px'}}>
      يحدد التطبيق <strong>المشهد والهوية والهندسة والفيزياء بالكامل</strong> من اختياراتك، ثم ينظّم Gemini الأقسام الإنجليزية المعتمدة لـ <strong>{selectedTarget}</strong> دون اختراع تفاصيل جديدة أو إسقاط القيود. أي تعديل غير قابل للإثبات يُرفض تلقائيًا.
    </p>
    <p style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.7,margin:'0 0 10px'}}>🛏️ مخرج المشهد الطبيعي مفعّل تلقائيًا: يحوّل الوضعية المختارة إلى لحظة عفوية بتفاصيل حركة واقعية، من دون تغيير الهوية أو الأثاث أو مصادر الضوء.</p>
    <p style={{fontSize:'10px',color:'var(--muted)',lineHeight:1.7,margin:'0 0 14px'}}>
      تُرسل إلى Google مواصفات المشهد النصية الكاملة التي أقرّها المحرك المحلي، بما فيها أقسام القيود ومؤشرات وجود المراجع؛ لا تُرسل صور الوجه والغرفة. لا يُسمح للمحرر بكتابة حقائق جديدة؛ النتيجة تُعاد مراجعتها محليًا قبل اعتمادها. النسخة المحلية تعمل دون Gemini.
    </p>
    {sceneTooLong&&<p role="alert" style={{fontSize:'12px',color:'#b91c1c',margin:'0 0 10px'}}>وصف المشهد المختصر ({sceneBrief.length} حرفًا) يتجاوز حد غَليون وv8؛ لا يمنع ذلك عمل محرر Gemini الذي يعتمد المواصفات المحلية.</p>}
    {editorRequestBytes>MAX_SCENE_REQUEST_BYTES&&<p role="alert" style={{fontSize:'12px',color:'#b91c1c',margin:'0 0 10px'}}>المواصفات المحلية كبيرة جدًا لتمريرها إلى المحرر؛ استعمل النسخة المحلية مباشرة.</p>}
    {selectionIssues.length>0&&<div role="alert" style={{fontSize:'12px',color:'#b91c1c',marginBottom:'10px'}}>{selectionIssues.map(issue=><p key={issue}>{issue}</p>)}</div>}
    {(validation.errors.length>0||result.errors.length>0)&&<div role="alert" style={{fontSize:'11px',color:'#b91c1c',marginBottom:'10px'}}>مواصفات المشهد غير معتمدة: أصلح تعارضات الاختيارات المحلية قبل تشغيل Gemini. {validation.errors.join('، ')}</div>}
    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
      <button type="button" className="btn" disabled={!ready||loading} onClick={generate}>{loading?'Gemini ينظّم المواصفات…':engine==='gemini'?'إعادة التحرير بواسطة Gemini':'تحرير البرومبت بواسطة Gemini'}</button>
      <button type="button" className="btn btn-secondary" disabled={!fallbackReady} onClick={useLocal}>النسخة المحلية الاحتياطية</button>
    </div>
    {fallbackReady&&<details style={{marginTop:12}}><summary style={{cursor:'pointer',fontSize:12,fontWeight:600}}>عرض البرومبت المحلي المعتمد قبل Gemini</summary><div className="preview-box" dir="ltr" style={{whiteSpace:'pre-wrap',textAlign:'left',overflowWrap:'anywhere',maxHeight:300,overflowY:'auto'}}>{prompt}</div></details>}
    {error&&<div role="alert" style={{marginTop:'12px',fontSize:'12px',color:'#b91c1c'}}>{error}</div>}
    {generated&&<div style={{marginTop:'16px'}}>
      <p style={{fontSize:'12px',fontWeight:600,margin:'0 0 8px'}}>{engine==='gemini'?'✓ تحرير Gemini معتمد بعد المطابقة — '+selectedTarget:'✓ البرومبت المحلي المعتمد (Gemini لم يُعتمد أو لم يُستخدم)'}</p>
      <div dir="ltr" className="preview-box" style={{textAlign:'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'520px',overflowY:'auto'}}>{generated}</div>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}}>
        <button type="button" className="btn" onClick={copy}>{copied?'✓ تم النسخ':'نسخ البرومبت النهائي'}</button>
        <button type="button" className="btn btn-secondary" onClick={onReset}>إعادة تعيين الخيارات</button>
      </div>
    </div>}
    <GhalyonPromptOptimizer sourcePrompt={generated} scenePrompt={sceneBrief} initialTarget={ctx.promptTarget==='chatgpt'?'chatgpt':'gemini'} onPromptReady={text=>{setAuditorSource(text);onPromptReady(text)}} />
    <ImagePromptAuditorV8 ctx={ctx} sourcePrompt={auditorSource||generated} sceneBrief={sceneBrief} onPromptReady={onPromptReady}/>
  </section>
}
