import React, { useEffect, useMemo, useState } from 'react'
import { AiPhotoAudit } from './AiPhotoAudit'
import { makeAuditCorrection } from './correction'
import type { CompilationContext } from '../../domain/types'
import { formatAuditFeedback, getAuditCriteria, summarizeAudit, type AuditRatings, type AuditStatus } from './audit'

type Props = { ctx: CompilationContext; originalPrompt: string; advisoryReviewPrompt?: string; subjectReferenceUrl?: string; roomReferenceUrl?: string }
export const PhotoResultAudit: React.FC<Props> = ({ ctx, originalPrompt, advisoryReviewPrompt='', subjectReferenceUrl, roomReferenceUrl }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [ratings, setRatings] = useState<AuditRatings>({})
  const [notes, setNotes] = useState('')
  const [notice, setNotice] = useState('')
  const criteria = useMemo(() => getAuditCriteria(ctx), [ctx])
  const summary = summarizeAudit(criteria, ratings)

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }, [imageUrl])
  const onImage = (file?: File) => {
    setNotice('')
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setNotice('اختر JPG أو PNG أو WebP بحجم لا يتجاوز 15 ميجابايت')
      return
    }
    setImageUrl(URL.createObjectURL(file))
    setRatings({})
    setNotes('')
  }
  const mark = (id: string, value: AuditStatus) => setRatings(previous => ({ ...previous, [id]: value }))
  const correction = summary.complete ? makeAuditCorrection(ctx, ratings, notes) : ''
  const copyCorrection = async () => {
    if (!imageUrl || !summary.complete || !correction) return
    try { await navigator.clipboard.writeText(correction); setNotice('تم نسخ التصحيح') }
    catch { setNotice('تعذر النسخ') }
  }
  const copyFeedback = async () => {
    if (!summary.complete) return
    try {
      await navigator.clipboard.writeText(formatAuditFeedback(ctx, ratings, notes))
      setNotice('تم نسخ تقرير المراجعة')
    } catch {
      setNotice('تعذر النسخ؛ تحقق من صلاحية الحافظة')
    }
  }
  return (
    <section className="card" aria-label="مراجعة الصورة الناتجة">
      <div style={{fontSize:'14px',fontWeight:600,marginBottom:'8px'}}>٨. Photo Result Audit — مراجعة الصورة الناتجة</div>
      <div style={{fontSize:'12px',color:'var(--muted)',marginBottom:'10px'}}>
        ارفع الصورة الناتجة. تستطيع تحليلها عبر Gemini بعد موافقة صريحة، أو مراجعتها يدويًا محليًا دون إرسالها.
      </div>
      {advisoryReviewPrompt.trim()&&<details aria-label="نص استشاري لمراجعة الصورة" style={{margin:'10px 0',fontSize:12}}>
       <summary style={{cursor:'pointer',fontWeight:700}}>Advisory Output — Non-Authoritative</summary>
       <p style={{color:'var(--muted)'}}>هذا اقتراح للمراجعة فقط. لا يحلّ محل البرومبت الأصلي المعتمد المستخدم لتدقيق الصورة.</p>
       <pre className="preview-box" dir="ltr" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:220,overflowY:'auto'}}>{advisoryReviewPrompt}</pre>
      </details>}
      <label style={{fontSize:'12px',display:'block',marginBottom:'8px'}}>
        الصورة الناتجة (JPG / PNG / WebP)
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onImage(e.target.files?.[0])} style={{display:'block',marginTop:'6px',maxWidth:'100%'}}/>
      </label>
      {imageUrl && (
        <div style={{marginBottom:'10px'}}>
          <img src={imageUrl} alt="الصورة الناتجة للمراجعة" style={{width:'100%',maxWidth:'360px',maxHeight:'440px',objectFit:'contain',borderRadius:'10px'}}/>
          <div><button type="button" className="btn btn-secondary" onClick={()=>{setImageUrl(null);setRatings({});setNotes('')}}>إزالة الصورة</button></div>
        </div>
      )}
      {imageUrl && <AiPhotoAudit imageUrl={imageUrl} ctx={ctx} originalPrompt={originalPrompt} subjectReferenceUrl={subjectReferenceUrl} roomReferenceUrl={roomReferenceUrl}/>}
      <div style={{fontSize:'12px',fontWeight:700,marginTop:'16px',marginBottom:'5px'}}>التقييم اليدوي المحلي (بدون رفع الصورة)</div>
      {criteria.map(item=>(
        <div key={item.id} style={{borderTop:'1px solid var(--border)',padding:'10px 0'}}>
          <div style={{fontWeight:600,fontSize:'12px'}}>{item.label}</div>
          <div style={{fontSize:'11px',color:'var(--muted)',margin:'4px 0'}}>{item.expectation}</div>
          <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
            {([['pass','مطابق'],['fail','فيه مشكلة'],['unreviewed','لم يُراجع']] as const).map(([value,label])=>(
              <button type="button" key={value} className={'btn ' + (ratings[item.id] === value ? '' : 'btn-secondary')}
                aria-pressed={ratings[item.id] === value} onClick={()=>mark(item.id,value)}
                style={{fontSize:'11px',padding:'6px 9px'}}>{label}</button>
            ))}
          </div>
        </div>
      ))}
      <label style={{display:'block',fontSize:'12px',marginTop:'8px'}}>ملاحظاتك
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="ما الذي تغيّر أو تشوّه في الصورة؟" style={{display:'block',width:'100%',marginTop:'6px',boxSizing:'border-box'}}/>
      </label>
      <div style={{fontSize:'12px',margin:'10px 0'}}>مطابق: {summary.passed} — مشاكل: {summary.failed} — لم يُراجع: {summary.unreviewed}</div>
      <button type="button" className="btn" disabled={!imageUrl || !summary.complete} onClick={copyFeedback}>نسخ تقرير مراجعة الصورة</button>
      {imageUrl && summary.complete && summary.failed > 0 && <div style={{marginTop:'12px'}}><div style={{fontSize:'12px',fontWeight:600}}>تصحيح موجه للأخطاء</div><div className="ltr preview-box" style={{whiteSpace:'pre-wrap',maxHeight:'220px',overflowY:'auto'}}>{correction}</div><button type="button" className="btn" onClick={copyCorrection}>نسخ البرومبت التصحيحي</button></div>}
      {notice && <div role="status" style={{fontSize:'12px',marginTop:'8px'}}>{notice}</div>}
    </section>
  )
}
