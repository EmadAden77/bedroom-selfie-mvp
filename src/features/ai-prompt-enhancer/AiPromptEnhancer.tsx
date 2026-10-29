import React,{useEffect,useRef,useState} from 'react'
import type {CompilationContext,CompilationResult,ValidationResult} from '../../domain/types'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'

type Props={ctx:CompilationContext;result:CompilationResult;validation:ValidationResult;onReset:()=>void;onPromptReady:(prompt:string)=>void}
type MainReply={prompt?:string;source?:string;model?:string;error?:string;errorCode?:string}

export const AiPromptEnhancer:React.FC<Props>=({ctx,result,validation,onReset,onPromptReady})=>{
  const [generated,setGenerated]=useState('')
  const [engine,setEngine]=useState<'gemini'|'local'|''>('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const [copied,setCopied]=useState(false)
  const requestRef=useRef<AbortController|null>(null)
  const prompt=result.promptText
  const ready=validation.isValid&&result.errors.length===0&&prompt.length>=100

  useEffect(()=>{
    requestRef.current?.abort()
    setGenerated('');setEngine('');setError('');setLoading(false);setCopied(false)
    onPromptReady('')
  },[prompt,onPromptReady])
  useEffect(()=>()=>requestRef.current?.abort(),[])

  async function generate(){
    if(!ready)return
    requestRef.current?.abort()
    const ctrl=new AbortController()
    requestRef.current=ctrl
    setLoading(true);setError('');setCopied(false);setGenerated('');setEngine('')
    const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
    try{
      const response=await fetch('/api/generate-main-prompt',{
        method:'POST',
        headers:{'content-type':'application/json'},
        signal:ctrl.signal,
        body:JSON.stringify({
          basePrompt:prompt,
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
      if(!payload.prompt.includes(prompt.trim()))
        throw Error('رفض التطبيق نتيجة لم تحافظ على قواعد الهوية والغرفة الأصلية.')
      if(!ctrl.signal.aborted){setGenerated(payload.prompt);setEngine('gemini');onPromptReady(payload.prompt)}
    }catch(err){
      if(!ctrl.signal.aborted)setError(err instanceof Error?err.message:'تعذر الاتصال بـGemini.')
    }finally{
      if(!ctrl.signal.aborted)setLoading(false)
    }
  }

  async function copy(){
    if(!generated)return
    try{await navigator.clipboard.writeText(generated);setCopied(true)}
    catch{setError('تعذر النسخ؛ يمكنك تحديد النص ونسخه يدويًا.')}
  }

  function useLocal(){
    requestRef.current?.abort()
    if(!ready)return
    setGenerated(prompt);setEngine('local');setError('');setLoading(false);setCopied(false);onPromptReady(prompt)
  }

  return <section className="card" aria-label="المحرك الرئيسي لتوليد البرومبت">
    <div style={{fontSize:'16px',fontWeight:750,marginBottom:'10px'}}>✨ Gemini — محرك توليد البرومبت الرئيسي</div>
    <p style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.8,margin:'0 0 12px'}}>
      اختر إعداداتك ثم اضغط «توليد البرومبت». يكتب Gemini وصف اللقطة والتصوير، ويحافظ التطبيق على تعليمات الهوية والفيزياء والغرفة الأصلية. لا توجد كلمة مرور أو تسجيل دخول.
    </p>
    <p style={{fontSize:'10px',color:'var(--muted)',lineHeight:1.7,margin:'0 0 14px'}}>
      تُرسل اختياراتك والنص المرجعي للبرومبت إلى Google لتوليد الوصف؛ لا تُرسل ملفات صور الوجه أو الغرفة. رابط التطبيق عام، وقد يستعمل زواره حصة Gemini.
    </p>
    {(validation.errors.length>0||result.errors.length>0)&&<div role="alert" style={{fontSize:'12px',color:'#b91c1c',marginBottom:'10px'}}>{[...new Set([...validation.errors,...result.errors])].join(' — ')}</div>}
    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
      <button type="button" className="btn" disabled={!ready||loading} onClick={generate}>{loading?'Gemini يولّد البرومبت…':engine==='gemini'?'إعادة التوليد بواسطة Gemini':'توليد البرومبت بواسطة Gemini'}</button>
      <button type="button" className="btn btn-secondary" disabled={!ready} onClick={useLocal}>النسخة المحلية الاحتياطية</button>
    </div>
    {error&&<div role="alert" style={{marginTop:'12px',fontSize:'12px',color:'#b91c1c'}}>{error}</div>}
    {generated&&<div style={{marginTop:'16px'}}>
      <p style={{fontSize:'12px',fontWeight:600,margin:'0 0 8px'}}>{engine==='gemini'?'✓ برومبت Gemini النهائي':'✓ البرومبت المحلي الاحتياطي'}</p>
      <div dir="ltr" className="preview-box" style={{textAlign:'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'520px',overflowY:'auto'}}>{generated}</div>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}}>
        <button type="button" className="btn" onClick={copy}>{copied?'✓ تم النسخ':'نسخ البرومبت النهائي'}</button>
        <button type="button" className="btn btn-secondary" onClick={onReset}>إعادة تعيين الخيارات</button>
      </div>
    </div>}
  </section>
}
