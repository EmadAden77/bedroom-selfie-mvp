
import React from 'react'
import { CompilationResult, ValidationResult } from '../../domain/types'

type Props = {
  result: CompilationResult
  validation: ValidationResult
  onCopy: () => void
  onReset: () => void
}

export const PromptPreview: React.FC<Props> = ({ result, validation, onCopy, onReset }) => {
  return (
    <div className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
        <div style={{fontWeight:600, fontSize:'14px'}}>٦. Subject, Clothing & Night Lighting Preview</div>
        <span className="badge">ليس Final Prompt - الأنظمة التالية لم تبن بعد</span>
      </div>

      {(validation.errors.length>0 || result.errors.length>0) && (
        <div style={{background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'8px', marginBottom:'8px'}}>
          <div style={{fontSize:'11px', fontWeight:600, color:'#dc2626'}}>أخطاء التحقق:</div>
          {[...new Set([...validation.errors, ...result.errors])].map((e,i)=><div key={i} style={{fontSize:'11px', color:'#dc2626'}} className="ltr">• {e}</div>)}
        </div>
      )}
      {(validation.warnings.length>0 || result.warnings.length>0) && (
        <div style={{background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'8px', marginBottom:'8px'}}>
          <div style={{fontSize:'11px', fontWeight:600, color:'#d97706'}}>تحذيرات:</div>
          {[...new Set([...validation.warnings, ...result.warnings])].map((w,i)=><div key={i} style={{fontSize:'11px', color:'#92400e'}} className="ltr">• {w}</div>)}
        </div>
      )}

      <div className="ltr preview-box">{result.promptText || 'لا يوجد Prompt - اختر القطعة العلوية المطلوبة'}</div>

      <div style={{marginTop:'8px'}}>
        <div style={{fontSize:'11px', fontWeight:600}}>ترتيب التجميع (select → validate → resolve → render → strip → compress → assemble):</div>
        <div style={{fontSize:'10px', color:'var(--muted)'}} className="ltr">
          {result.sections.map(s=>s.id).join(' → ')}
        </div>
      </div>

      <div style={{marginTop:'8px', display:'flex', gap:'8px'}}>
        <button className="btn" onClick={onCopy} disabled={!validation.isValid || result.errors.length > 0}>نسخ Subject & Clothing</button>
        <button className="btn btn-secondary" onClick={onReset}>إعادة تعيين Reset</button>
      </div>

      <div style={{marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
        <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px'}}>
          <div style={{fontSize:'11px', fontWeight:600}}>مكتمل:</div>
          {result.completedModules.map(m=><div key={m} style={{fontSize:'10px'}} className="ltr">✓ {m}</div>)}
        </div>
        <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px'}}>
          <div style={{fontSize:'11px', fontWeight:600}}>معلق:</div>
          {result.pendingModules.map(m=><div key={m} style={{fontSize:'10px', color:'var(--muted)'}} className="ltr">⏳ {m}</div>)}
        </div>
      </div>

      <div style={{marginTop:'8px', fontSize:'10px', color:'var(--muted)'}} className="ltr">
        PHYSICAL CLOTHING SYSTEM = APPROVED AND FROZEN - No physics metadata leak - No forbidden words: unknown, deferred, placeholder, possible, optional, likely, either, one of
      </div>
    </div>
  )
}
