import React,{useEffect,useRef,useState} from 'react'
import {compressForAudit} from './imageCompression'
import type {CompilationContext} from '../../domain/types'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'

type Finding={criterion:string;status:'pass'|'fail'|'uncertain';confidence:'high'|'medium'|'low';evidenceAr:string;repairEn:string}
type ApiResult={audit?:{overviewAr:string;findings:Finding[]};correctedPrompt?:string;failed?:number;error?:string;errorCode?:string}
type Props={imageUrl:string;subjectReferenceUrl?:string;roomReferenceUrl?:string;ctx:CompilationContext;originalPrompt:string}
const labels:Record<string,string>={
 identity:'ملامح الوجه',hair:'تسريحة الشعر',room:'الغرفة والأثاث',pose:'الجسم والوضعية',
 hands:'الأيدي والأصابع',mirror:'انعكاس المرآة',lighting:'الإضاءة والظلال',
 clothing:'الملابس',camera:'منظور الكاميرا',skin:'ملمس البشرة'
}
const statusText={pass:'مطابق ظاهريًا',fail:'مخالفة محتملة',uncertain:'غير مؤكد'}
const statusColor={pass:'#047857',fail:'#b91c1c',uncertain:'#92400e'}

export const AiPhotoAudit:React.FC<Props>=({imageUrl,subjectReferenceUrl,roomReferenceUrl,ctx,originalPrompt})=>{
 const [consent,setConsent]=useState(false)
 const [includeSubject,setIncludeSubject]=useState(false)
 const [includeRoom,setIncludeRoom]=useState(false)
 const [busy,setBusy]=useState(false)
 const [issue,setIssue]=useState('')
 const [report,setReport]=useState<ApiResult|null>(null)
 const [copied,setCopied]=useState(false)
 const abort=useRef<AbortController|null>(null)
 useEffect(()=>{
  abort.current?.abort()
  setConsent(false);setReport(null);setBusy(false);setIssue('');setCopied(false)
 },[imageUrl,originalPrompt,subjectReferenceUrl,roomReferenceUrl])
 useEffect(()=>()=>abort.current?.abort(),[])
 const ready=!!imageUrl&&originalPrompt.length>=100
 async function analyze(){
  if(!ready)return
  if(!consent){setIssue('أكّد الموافقة على إرسال الصورة لتحليلها عبر Google Gemini.');return}
  abort.current?.abort()
  const controller=new AbortController()
  abort.current=controller
  setBusy(true);setIssue('');setReport(null);setCopied(false)
  try{
   const resultImage=await compressForAudit(imageUrl)
   if(controller.signal.aborted)return
   const subjectImage=includeSubject&&subjectReferenceUrl?await compressForAudit(subjectReferenceUrl):undefined
   if(controller.signal.aborted)return
   const roomImage=includeRoom&&roomReferenceUrl?await compressForAudit(roomReferenceUrl):undefined
   if(controller.signal.aborted)return
   const shot=bedroomShots.find(s=>s.id===ctx.bedroomShotId)
   const response=await fetch('/api/audit-photo',{
    method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,
    body:JSON.stringify({
     consent:true,outputImage:resultImage,
     ...(subjectImage?{subjectReference:subjectImage}:{}),
     ...(roomImage?{roomReference:roomImage}:{}),
     originalPrompt,
     captureMode:shot?.mode||'front',
     posture:shot?getShotPosture(shot.id)||'seated_bed':ctx.poseId||'seated_bed'
    })
   })
   if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('الخادم أعاد ردًا غير متوقع.')
   const data=await response.json() as ApiResult
   if(!response.ok||!data.audit||typeof data.correctedPrompt!=='string')
    throw Error((data.error||'تعذر تحليل الصورة.')+(data.errorCode?' ('+data.errorCode+')':''))
   if(!data.correctedPrompt.startsWith(originalPrompt.trim()))throw Error('رفض التطبيق تصحيحًا يغيّر البرومبت المرجعي.')
   if(!controller.signal.aborted)setReport(data)
  }catch(err){
   if(!controller.signal.aborted)setIssue(err instanceof Error?err.message:'حدث خطأ في التحليل.')
  }finally{
   if(!controller.signal.aborted)setBusy(false)
  }
 }
 async function copy(){
  if(!report?.correctedPrompt)return
  try{await navigator.clipboard.writeText(report.correctedPrompt);setCopied(true)}
  catch{setIssue('تعذر النسخ. انسخ البرومبت من النص مباشرة.')}
 }
 const failed=report?.audit?.findings.filter(f=>f.status==='fail').length||0
 return <div style={{border:'1px solid var(--border)',borderRadius:'12px',padding:'12px',margin:'12px 0'}} aria-label="تحليل وتصحيح الصورة باستخدام Gemini">
  <div style={{fontSize:'14px',fontWeight:700,marginBottom:'6px'}}>🤖 Gemini — حلّل وأصلح</div>
  <p style={{fontSize:'11px',lineHeight:1.7,color:'var(--muted)',margin:'0 0 12px'}}>
   يحلل Gemini الصورة الناتجة مقابل البرومبت، ويمكنه مقارنة الوجه والغرفة إذا اخترت إرسال صورتيهما المرجعيتين. النتائج تقديرية، وتُراجع يدويًا قبل الاعتماد.
  </p>
  <label style={{display:'flex',alignItems:'start',gap:'8px',fontSize:'12px',marginBottom:'8px'}}>
   <input type="checkbox" checked={includeSubject} disabled={!subjectReferenceUrl||busy} onChange={e=>{setIncludeSubject(e.target.checked);setReport(null)}}/>
   إرسال صورة الوجه المرجعية للمقارنة {subjectReferenceUrl?'':'(لم تُرفع صورة مرجعية)'}
  </label>
  <label style={{display:'flex',alignItems:'start',gap:'8px',fontSize:'12px',marginBottom:'10px'}}>
   <input type="checkbox" checked={includeRoom} disabled={!roomReferenceUrl||busy} onChange={e=>{setIncludeRoom(e.target.checked);setReport(null)}}/>
   إرسال صورة الغرفة المرجعية للمقارنة {roomReferenceUrl?'':'(لم تُرفع صورة الغرفة)'}
  </label>
  <label style={{display:'flex',alignItems:'start',gap:'8px',fontSize:'12px',marginBottom:'10px'}}>
   <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/>
   <span>أوافق على إرسال <strong>الصورة الناتجة</strong>، وأي صور مرجعية اخترتها أعلاه، مع نص البرومبت إلى Google Gemini للتحليل. لن يبدأ الإرسال قبل الضغط على زر التحليل.</span>
  </label>
  <button type="button" className="btn" disabled={!ready||!consent||busy} onClick={analyze}>
   {busy?'يجري تحليل الصورة…':'حلّل الصورة وأصلح البرومبت'}
  </button>
  {!originalPrompt&&<p style={{fontSize:'11px',color:'#92400e'}}>أنشئ البرومبت أولًا لتجهيز المقارنة.</p>}
  {issue&&<p role="alert" style={{fontSize:'12px',color:'#b91c1c'}}>{issue}</p>}
  {report?.audit&&<div style={{marginTop:'12px'}}>
   <div style={{fontSize:'13px',fontWeight:600}}>نتيجة الفحص: {failed} مخالفة محتملة من أصل {report.audit.findings.length} جوانب</div>
   <p style={{fontSize:'12px',lineHeight:1.7}}>{report.audit.overviewAr}</p>
   {report.audit.findings.map(f=><div key={f.criterion} style={{borderTop:'1px solid var(--border)',padding:'9px 0'}}>
    <div style={{fontSize:'12px',fontWeight:600,display:'flex',gap:'10px',flexWrap:'wrap'}}>
      <span>{labels[f.criterion]||f.criterion}</span>
      <span style={{color:statusColor[f.status]}}>{statusText[f.status]}</span>
    </div>
    <p style={{fontSize:'11px',color:'var(--muted)',margin:'5px 0'}}>{f.evidenceAr}</p>
   </div>)}
   {report.correctedPrompt&&<div style={{marginTop:'12px'}}>
     <div style={{fontSize:'12px',fontWeight:700,marginBottom:'6px'}}>{failed?'البرومبت المصحّح (يحافظ على الأصل)':'لا توجد مخالفات مؤكدة — البرومبت الأصلي'}</div>
     <div dir="ltr" className="preview-box" style={{maxHeight:'370px',overflowY:'auto',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{report.correctedPrompt}</div>
     <button type="button" className="btn" onClick={copy} style={{marginTop:'9px'}}>{copied?'✓ تم النسخ':'نسخ البرومبت بعد التصحيح'}</button>
   </div>}
  </div>}
 </div>
}
