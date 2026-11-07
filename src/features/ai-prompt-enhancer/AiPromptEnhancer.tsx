import React,{useEffect,useRef,useState} from 'react'
import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
import {buildCreativeSceneBrief} from './buildCreativeSceneBrief'
import {GhalyonPromptOptimizer} from './GhalyonPromptOptimizer'
import {ImagePromptAuditorV8} from './ImagePromptAuditorV8'
import {naturalSceneSelectionIssues} from './natural-scene-director'
import {MAX_SCENE_BRIEF_CHARS} from './scene-request-limits'

type Props={ctx:CompilationContext;result:CompilationResult;validation:ValidationResult;onReset:()=>void;onPromptReady:(prompt:string)=>void}
type MainReply={prompt?:string;source?:string;model?:string;error?:string;errorCode?:string}

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
  const ready=sceneBrief.trim().length>=50&&!sceneTooLong&&selectionIssues.length===0
  const fallbackReady=validation.isValid&&result.errors.length===0&&prompt.length>=100
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
    if(!ready)return
    requestRef.current?.abort()
    const version=++requestVersion.current
    const ctrl=new AbortController()
    requestRef.current=ctrl
    const current=()=>version===requestVersion.current&&!ctrl.signal.aborted
    setLoading(true);setError('');setCopied(false);setGenerated('');setAuditorSource('');setEngine('')
    const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
    try{
      const response=await fetch('/api/generate-main-prompt',{
        method:'POST',
        headers:{'content-type':'application/json'},
        signal:ctrl.signal,
        body:JSON.stringify({
          sceneBrief,
          mode:shot?.mode||'front',
          shotId:shot?.id||'',
          posture:shot?getShotPosture(shot.id)||'seated_bed':ctx.poseId||'seated_bed',
          lighting:ctx.nightLightingId||'phone_screen_only',
          target:ctx.promptTarget||'gemini'
        })
      })
      if(!(response.headers.get('content-type')||'').includes('application/json'))
        throw Error('خدمة Gemini أعادت ردًا غير متوقع. جرّب مجددًا أو استخدم النسخة المحلية.')
      let payload:MainReply
      try{payload=await response.json() as MainReply}
      catch{throw Error('تعذر قراءة رد Gemini.')}
      if(!response.ok||typeof payload.prompt!=='string'||payload.prompt.length<100)
        throw Error((payload.error||'تعذر توليد البرومبت عبر Gemini.')+(payload.errorCode?' ('+payload.errorCode+')':''))
      if(current()){setGenerated(payload.prompt);setEngine('gemini');onPromptReady(payload.prompt)}
    }catch(err){
      if(current())setError(err instanceof Error?err.message:'تعذر الاتصال بـGemini.')
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
    <div style={{fontSize:'16px',fontWeight:750,marginBottom:'10px'}}>✨ Gemini — محرك توليد البرومبت الرئيسي</div>
    <p style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.8,margin:'0 0 12px'}}>
      اختر الإعدادات ثم دع Gemini يكتب <strong>البرومبت كاملًا بحرية</strong> لـ <strong>{selectedTarget}</strong>. الشرط الأساسي: واقعية الجسم والحركة والوزن والضوء والعدسة والمرآة. لن تُلصق أي قواعد محلية إضافية بنص Gemini.
    </p>
    <p style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.7,margin:'0 0 10px'}}>🛏️ مخرج المشهد الطبيعي مفعّل تلقائيًا: يحوّل الوضعية المختارة إلى لحظة عفوية بتفاصيل حركة واقعية، من دون تغيير الهوية أو الأثاث أو مصادر الضوء.</p>
    <p style={{fontSize:'10px',color:'var(--muted)',lineHeight:1.7,margin:'0 0 14px'}}>
      تُرسل إلى Google اختيارات مشهد مختصرة فقط؛ لا يُرسل البرومبت المحلي الطويل أو ملفات صور الوجه والغرفة. يمكنك دائمًا استخدام النسخة المحلية الاحتياطية المستقلة. رابط التطبيق عام وقد يستهلك زواره حصة Gemini.
    </p>
    {sceneTooLong&&<p role="alert" style={{fontSize:'12px',color:'#b91c1c',margin:'0 0 10px'}}>وصف المشهد أطول من الحد الآمن ({sceneBrief.length} حرفًا). اختر تفاصيل أقل أو قلّل الخيارات المتكررة قبل التوليد.</p>}
    {selectionIssues.length>0&&<div role="alert" style={{fontSize:'12px',color:'#b91c1c',marginBottom:'10px'}}>{selectionIssues.map(issue=><p key={issue}>{issue}</p>)}</div>}
    {(validation.errors.length>0||result.errors.length>0)&&<div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'10px'}}>ملاحظة: بعض الخيارات لا تصلح لمحرك النسخة المحلية الاحتياطية فقط؛ لا تمنع Gemini من تأليف برومبت فيزيائي واقعي.</div>}
    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
      <button type="button" className="btn" disabled={!ready||loading} onClick={generate}>{loading?'Gemini يولّد البرومبت…':engine==='gemini'?'إعادة التوليد بواسطة Gemini':'توليد البرومبت بواسطة Gemini'}</button>
      <button type="button" className="btn btn-secondary" disabled={!fallbackReady} onClick={useLocal}>النسخة المحلية الاحتياطية</button>
    </div>
    {error&&<div role="alert" style={{marginTop:'12px',fontSize:'12px',color:'#b91c1c'}}>{error}</div>}
    {generated&&<div style={{marginTop:'16px'}}>
      <p style={{fontSize:'12px',fontWeight:600,margin:'0 0 8px'}}>{engine==='gemini'?'✓ برومبت Gemini مخصص لـ '+selectedTarget:'✓ البرومبت المحلي الاحتياطي'}</p>
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
