
import React, { useRef, useState } from 'react'
import { ReferenceImageMeta } from '../../domain/types'

type Props = {
  meta: ReferenceImageMeta | null
  error: string | null
  loading: boolean
  onFile: (file: File) => void
  onRemove: () => void
}

export const ReferenceImageSection: React.FC<Props> = ({ meta, error, loading, onFile, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div className="card">
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px'}}>
        <div>
          <div style={{fontWeight:600, fontSize:'14px'}}>١. الصورة المرجعية</div>
          <div style={{fontSize:'11px', color:'var(--muted)'}}>الصورة تبقى محليا - Object URL + SHA-256</div>
        </div>
        <span className="badge">PRIVACY</span>
      </div>

      <div
        onDragOver={e=>{e.preventDefault(); setDragOver(true)}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={onDrop}
        style={{border:'2px dashed var(--border)', borderRadius:'16px', padding:'20px', textAlign:'center', background: dragOver ? '#f3f1ec' : 'var(--bg)', position:'relative'}}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} onChange={e=>{ const f=e.target.files?.[0]; if(f) onFile(f)}} />
        <div style={{pointerEvents:'none'}}>
          <div style={{width:'40px', height:'40px', borderRadius:'50%', background:'#fff', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px'}}>＋</div>
          <div style={{fontSize:'13px', fontWeight:500}}>اسحب الصورة هنا أو اضغط للاختيار</div>
          <div style={{fontSize:'11px', color:'var(--muted)'}}>image/jpeg, png, webp - حتى 10MB - لا ترفع خارجيا</div>
        </div>
      </div>

      {loading && <div style={{fontSize:'12px', marginTop:'8px'}}>جاري حساب SHA-256 من بايتات الملف...</div>}
      {error && <div style={{fontSize:'12px', color:'var(--error)', marginTop:'8px', background:'#fef2f2', border:'1px solid #fecaca', padding:'8px', borderRadius:'8px'}}>{error}</div>}

      {meta && (
        <div style={{marginTop:'12px'}}>
          <img src={meta.objectUrl} alt="preview" style={{width:'100%', maxHeight:'360px', objectFit:'contain', borderRadius:'12px', background:'#fff', border:'1px solid var(--border)'}} />
          <div className="grid-2" style={{display:'grid', gap:'8px', marginTop:'8px', gridTemplateColumns:'1fr 1fr'}}>
            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px', fontSize:'11px'}}><div style={{color:'var(--muted)', fontSize:'10px'}}>اسم الملف</div><div style={{fontWeight:500}}>{meta.fileName}</div></div>
            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px', fontSize:'11px'}}><div style={{color:'var(--muted)', fontSize:'10px'}}>MIME</div><div style={{fontWeight:500}}>{meta.mimeType}</div></div>
            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px', fontSize:'11px'}}><div style={{color:'var(--muted)', fontSize:'10px'}}>الحجم</div><div style={{fontWeight:500}}>{meta.sizeKB} KB</div></div>
            <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px', fontSize:'11px'}}><div style={{color:'var(--muted)', fontSize:'10px'}}>الأبعاد</div><div style={{fontWeight:500}}>{meta.width ?? '?'} × {meta.height ?? '?'} px</div></div>
          </div>
          <div style={{marginTop:'8px', background:'#111', color:'#f5f5f0', borderRadius:'12px', padding:'10px', display:'flex', gap:'8px', alignItems:'center'}}>
            <div style={{flex:1, minWidth:0}}><div style={{fontSize:'10px', opacity:0.6}}>SHA-256 من بايتات الملف</div><div className="ltr" style={{fontFamily:'monospace', fontSize:'10px', wordBreak:'break-all'}}>{meta.sha256}</div></div>
            <button className="btn btn-secondary" style={{fontSize:'11px'}} onClick={()=>navigator.clipboard.writeText(meta.sha256)}>نسخ</button>
          </div>
          <button className="btn btn-secondary" style={{width:'100%', marginTop:'8px', color:'var(--error)', borderColor:'#fecaca', background:'#fef2f2'}} onClick={onRemove}>إزالة الصورة وإلغاء Object URL</button>
        </div>
      )}
    </div>
  )
}
