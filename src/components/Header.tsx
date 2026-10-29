
import React from 'react'
export const Header: React.FC = () => {
  return (
    <header className="header">
      <div>
        <h1 style={{margin:0, fontSize:'18px'}}>Bedroom Selfie Builder</h1>
        <div style={{fontSize:'11px', color:'var(--muted)'}}>Gemini primary prompt engine · offline fallback</div>
      </div>
      <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
        <span className="badge">Gemini Main</span>
        <span className="badge">MVP</span>
        <span className="badge">PWA</span>
        <span className="badge">Subject & Clothing</span>
      </div>
    </header>
  )
}
