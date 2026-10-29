import React, {useEffect, useRef, useState} from 'react'
import type {CompilationContext, CompilationResult, ValidationResult} from '../../domain/types'
import {bedroomShots, getShotPosture} from '../../data/bedroom-shots'

type Props = {
  ctx: CompilationContext
  result: CompilationResult
  validation: ValidationResult
}
type ApiResult = {enhancedPrompt?:string; selectedHintIds?:string[]; model?:string; error?:string}

export const AiPromptEnhancer:React.FC<Props> = ({ctx,result,validation})=>{
  const [accessToken,setAccessToken]=useState('')
  const [isBusy,setIsBusy]=useState(false)
  const [enhanced,setEnhanced]=useState('')
  const [error,setError]=useState('')
  const [model,setModel]=useState('')
  const [copied,setCopied]=useState(false)
  const abortRef=useRef<AbortController|null>(null)
  const prompt=result.promptText
  const canGenerate=validation.isValid && result.errors.length===0 && prompt.length>100

  useEffect(()=>{
    abortRef.current?.abort()
    setEnhanced('')
    setError('')
    setModel('')
    setCopied(false)
    setIsBusy(false)
  },[prompt])

  useEffect(()=>()=>abortRef.current?.abort(),[])

  async function enhance(){
    if(!canGenerate)return
    if(!accessToken.trim()){setError('أدخل رمز الوصول السري الذي ستضبطه في Vercel.');return}
    abortRef.current?.abort()
    const controller=new AbortController()
    abortRef.current=controller
    setIsBusy(true);setError('');setEnhanced('');setCopied(false)
    const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
    try {
      const response=await fetch('/api/generate-prompt',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-prompt-engine-access':accessToken.trim()},
        body:JSON.stringify({
          prompt,
          mode:shot?.mode||'front',
          posture:shot?getShotPosture(shot.id)||'seated_bed':ctx.poseId||'seated_bed'
        }),
        signal:controller.signal
      })
      const contentType=response.headers.get('content-type')||''
      if(!contentType.toLowerCase().includes('application/json')){
        throw new Error(response.status>=500
          ? 'تعطلت خدمة التحسين على الخادم. البرومبت الأصلي محفوظ؛ حاول مجددًا بعد تحديث التطبيق.'
          : 'الخادم أعاد استجابة غير متوقعة. حدّث الصفحة وحاول مجددًا.')
      }
      let data:ApiResult
      try {data=await response.json() as ApiResult}
      catch {throw new Error('تعذر قراءة رد الخادم. حدّث الصفحة وحاول مرة أخرى.')}
      if(!response.ok||typeof data.enhancedPrompt!=='string')throw new Error(data.error||'تعذر تحسين البرومبت.')
      if(!data.enhancedPrompt.startsWith(prompt.trim()))throw new Error('تم رفض رد لا يحافظ على البرومبت الأصلي.')
      if(!controller.signal.aborted){setEnhanced(data.enhancedPrompt);setModel(data.model||'Gemini')}
    }catch(err){
      if(!controller.signal.aborted)setError(err instanceof Error?err.message:'تعذر الاتصال.')
    }finally{
      if(!controller.signal.aborted)setIsBusy(false)
    }
  }

  async function copyEnhanced(){
    if(!enhanced)return
    try{await navigator.clipboard.writeText(enhanced);setCopied(true)}
    catch{setError('تعذر النسخ. يمكنك تحديد النص ونسخه يدويًا.')}
  }

  return <section className="card" aria-label="تحسين البرومبت باستخدام Gemini">
    <h3 style={{fontSize:'14px',fontWeight:700,margin:'0 0 8px'}}>✨ تحسين البرومبت باستخدام Gemini (اختياري)</h3>
    <p style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.7}}>
      يولّد التطبيق البرومبت الأصلي محليًا. عند الضغط على «تحسين» يُرسل نص البرومبت وحده إلى Gemini ليختار تحسينات تصوير معتمدة؛ لا تُرسل صور الوجه أو الغرفة ولا يُسمح بتغيير الهوية أو الأثاث أو الإضاءة.
    </p>
    <label style={{display:'block',fontSize:'11px',margin:'10px 0 5px'}} htmlFor="gemini-access">رمز الوصول الخاص بك (ليس مفتاح Google)</label>
    <input id="gemini-access" type="password" autoComplete="off" value={accessToken}
      onChange={e=>setAccessToken(e.target.value)} placeholder="أدخل رمز الوصول المحفوظ في Vercel"
      style={{width:'100%',padding:'10px',border:'1px solid var(--border)',borderRadius:'10px',background:'var(--bg)',color:'var(--text)',boxSizing:'border-box'}}/>
    <p style={{fontSize:'10px',color:'var(--muted)',margin:'6px 0 12px'}}>تتطلب الميزة ضبط GEMINI_API_KEY و PROMPT_ENGINE_ACCESS_TOKEN في إعدادات Vercel. لا يُحفظ الرمز على الجهاز.</p>
    <button className="btn" type="button" disabled={!canGenerate||isBusy} onClick={enhance}>{isBusy?'جاري التحسين…':'تحسين بالذكاء الاصطناعي'}</button>
    {error&&<p role="alert" style={{fontSize:'11px',color:'#b91c1c',marginTop:'10px'}}>{error}</p>}
    {enhanced&&<>
      <p style={{fontSize:'11px',marginTop:'12px'}}>✓ تحسينات معتمدة من {model}. بقيت جميع قيود البرومبت الأصلي دون تغيير.</p>
      <div className="ltr preview-box" style={{maxHeight:'300px',overflowY:'auto'}}>{enhanced}</div>
      <button type="button" className="btn btn-secondary" onClick={copyEnhanced} style={{marginTop:'8px'}}>{copied?'✓ تم نسخ البرومبت المحسّن':'نسخ البرومبت المحسّن'}</button>
    </>}
  </section>
}
