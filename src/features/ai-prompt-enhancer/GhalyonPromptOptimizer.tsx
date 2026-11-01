import React,{useEffect,useRef,useState} from 'react'
import type {GhalyonMode,GhalyonTarget} from './ghalyon-config'

type Reply={status:'questions'|'complete';questions:string[];optimizedPrompt:string;improvements:string[];proTip:string;error?:string;errorCode?:string}
type Props={sourcePrompt:string;scenePrompt?:string;initialTarget?:GhalyonTarget;onPromptReady:(prompt:string)=>void}

export const GhalyonPromptOptimizer:React.FC<Props>=({sourcePrompt,scenePrompt='',initialTarget='gemini',onPromptReady})=>{
 const [idea,setIdea]=useState('')
 const [mode,setMode]=useState<GhalyonMode>('auto')
 const [target,setTarget]=useState<GhalyonTarget>(initialTarget)
 const [questions,setQuestions]=useState<string[]>([])
 const [answers,setAnswers]=useState<string[]>([])
 const [result,setResult]=useState<Reply|null>(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [copied,setCopied]=useState(false)
 const pending=useRef<AbortController|null>(null)
 const requestVersion=useRef(0)
 const lastSubmittedIdea=useRef('')
 const submittedFromScene=useRef(false)
 const usableScene=scenePrompt.trim().length>=8&&scenePrompt.length<=14000
 useEffect(()=>()=>{requestVersion.current++;pending.current?.abort()},[])
 useEffect(()=>{
  if(submittedFromScene.current){
   requestVersion.current++;pending.current?.abort();pending.current=null
   setLoading(false);setQuestions([]);setAnswers([]);setResult(null)
   setError('');submittedFromScene.current=false
  }
 },[scenePrompt])
 const reset=()=>{requestVersion.current++;pending.current?.abort();pending.current=null;lastSubmittedIdea.current='';submittedFromScene.current=false;setLoading(false);setQuestions([]);setAnswers([]);setResult(null);setError('');setCopied(false)}
 async function generate(answerList:{question:string;answer:string}[]=[],overrideIdea?:string){
  const selectedIdea=answerList.length>0?lastSubmittedIdea.current:(overrideIdea??(idea.trim()||scenePrompt.trim())).trim()
  if(selectedIdea.length<8){setError('اكتب فكرة أو اختر تحسين مشهد السيلفي الحالي.');return}
  if(selectedIdea.length>14000){setError('البرومبت طويل جدًا. اختصره إلى 14000 حرف أو أقل.');return}
  if(answerList.length===0){
   lastSubmittedIdea.current=selectedIdea
   submittedFromScene.current=!!scenePrompt&&!idea.trim()&&selectedIdea===scenePrompt.trim()||!!overrideIdea&&overrideIdea===scenePrompt
  }
  pending.current?.abort()
  const version=++requestVersion.current
  const ctrl=new AbortController();pending.current=ctrl
  const current=()=>version===requestVersion.current&&!ctrl.signal.aborted
  setLoading(true);setError('')
  try{
   const response=await fetch('/api/optimize-prompt',{method:'POST',headers:{'content-type':'application/json'},
    signal:ctrl.signal,body:JSON.stringify({idea:selectedIdea,mode,target,answers:answerList})})
   if(!(response.headers.get('content-type')||'').includes('application/json'))
    throw Error('خدمة غَليون لم تُرجع JSON صالحًا. تحقق من تحديث التطبيق وحالة الخادم (GHALYON_NON_JSON).')
   const data=await response.json() as Reply
   if(!current())return
   if(!response.ok)throw Error((data.error||'تعذر تحسين البرومبت.')+(data.errorCode?' ('+data.errorCode+')':''))
   if(data.status==='questions'&&data.questions.length>0&&data.questions.length<=3){
    setQuestions(data.questions);setAnswers(data.questions.map(() => ''));setResult(null)
   }else if(data.status==='complete'&&data.optimizedPrompt){
    setResult(data);setQuestions([]);setAnswers([])
   }else throw Error('استجابة غير صالحة من المحرك.')
  }catch(e){if(current())setError(e instanceof Error?e.message:'تعذر الاتصال بـ Gemini.')}
  finally{if(current())setLoading(false)}
 }
 async function copy(){
  if(!result)return
  try{await navigator.clipboard.writeText(result.optimizedPrompt);setCopied(true)}
  catch{setError('تعذر النسخ تلقائيًا. يمكنك نسخ النص يدويًا.')}
 }
 return <div style={{borderTop:'1px solid var(--border)',marginTop:'20px',paddingTop:'16px'}}>
  <h2 style={{fontSize:'16px',margin:'0 0 8px'}}>🧠 غَليون — مهندس تحسين الأوامر</h2>
  <p style={{fontSize:'12px',lineHeight:1.8,color:'var(--muted)'}}>
   مرحباً، أنا غَليون — مهندس تحسين الأوامر. أرسل فكرتك أو البرومبت الخام وحدد النموذج المستهدف وBASIC أو DETAIL وسأحوّله إلى Prompt احترافي جاهز للاستخدام.
  </p>
  <label htmlFor="ghalyon-idea" style={{fontSize:'12px'}}>الفكرة أو البرومبت الخام</label>
  <textarea id="ghalyon-idea" className="input" rows={5} maxLength={14000} value={idea}
   onChange={e=>{reset();setIdea(e.target.value)}} placeholder="اكتب فكرة أو الصق برومبت..." />
  {usableScene&&<div style={{marginTop:'8px'}}>
   <p style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.7,margin:'0 0 7px'}}>يمكنك تشغيل غَليون مباشرةً من خيارات التصوير الحالية دون توليد البرومبت الرئيسي أولًا. عند كتابة فكرة خاصة، تُعطى الأولوية لنصك.</p>
   <button className="btn btn-secondary" type="button" disabled={loading}
    onClick={()=>{reset();void generate([],scenePrompt)}}>🪞 تحسين مشهد السيلفي الحالي مباشرةً</button>
  </div>}
  {sourcePrompt&&<button className="btn btn-secondary" type="button" style={{marginTop:'8px'}}
   onClick={()=>{reset();setIdea(sourcePrompt)}}>استخدام برومبت الصورة الحالي</button>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'10px',margin:'12px 0'}}>
   <label style={{fontSize:'12px'}}>النموذج المستهدف
    <select className="input" value={target} onChange={e=>{reset();setTarget(e.target.value as GhalyonTarget)}}>
     <option value="gemini">Gemini</option><option value="chatgpt">ChatGPT</option><option value="claude">Claude</option>
    </select>
   </label>
   <label style={{fontSize:'12px'}}>وضع التحسين
    <select className="input" value={mode} onChange={e=>{reset();setMode(e.target.value as GhalyonMode)}}>
     <option value="auto">AUTO — تلقائي</option><option value="basic">BASIC — سريع</option><option value="detail">DETAIL — تفصيلي</option>
    </select>
   </label>
  </div>
  {questions.length===0&&<button type="button" className="btn" disabled={(!usableScene&&idea.trim().length<8)||loading}
   onClick={()=>void generate()}>{loading?'غَليون يحسّن…':'تحسين البرومبت'}</button>}
  {questions.length>0&&<div>
   <p style={{fontSize:'12px',fontWeight:700}}>أسئلة توضيحية (حتى 3)</p>
   {questions.map((q,i)=><label key={q} style={{display:'block',fontSize:'12px',marginBottom:'9px'}}>
    {i+1}. {q}
    <input className="input" maxLength={1500} value={answers[i]||''}
     onChange={e=>setAnswers(prev=>prev.map((a,n)=>n===i?e.target.value:a))}
     placeholder="الإجابة، أو اتركها فارغة إذا كانت غير معروفة" />
   </label>)}
   <button className="btn" disabled={loading} onClick={()=>void generate(questions.map((q,i)=>({question:q,answer:answers[i]||''})))}>
    {loading?'جارٍ الإعداد…':'توليد البرومبت بالإجابات'}
   </button>
   <button className="btn btn-secondary" style={{marginRight:'8px'}} disabled={loading}
    onClick={()=>{reset();setMode('basic')}}>التخطي إلى BASIC</button>
  </div>}
  {error&&<p role="alert" style={{fontSize:'12px',color:'#b91c1c'}}>{error}</p>}
  {result?.status==='complete'&&<div style={{marginTop:'16px'}}>
   <h3 style={{fontSize:'13px'}}>الأمر المحسّن</h3>
   <div className="preview-box" dir="ltr" style={{textAlign:'left',overflowWrap:'anywhere'}}>{result.optimizedPrompt}</div>
   <h3 style={{fontSize:'13px'}}>أبرز التحسينات</h3>
   <ul style={{fontSize:'12px',lineHeight:1.8,paddingRight:'20px'}}>{result.improvements.map((s,i)=><li key={i}>{s}</li>)}</ul>
   <h3 style={{fontSize:'13px'}}>نصيحة احترافية</h3>
   <p style={{fontSize:'12px',lineHeight:1.8}}>{result.proTip}</p>
   <button type="button" className="btn" onClick={()=>void copy()}>{copied?'✓ نُسخ':'نسخ الأمر'}</button>
   <button type="button" className="btn btn-secondary" style={{marginRight:'8px'}}
    onClick={()=>onPromptReady(result.optimizedPrompt)}>اعتماده لتدقيق الصورة</button>
  </div>}
  <p style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.7,marginTop:'12px'}}>
   لا يحفظ التطبيق الأفكار أو الإجابات محليًا. يُرسل النص إلى Gemini للتحسين وفق سياسة Google. Claude هنا هدف لتحسين البرومبت النصي، لا لتوليد الصور.
  </p>
 </div>
}
