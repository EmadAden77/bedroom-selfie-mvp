import React from 'react'
import { poseOptions, faceOptions, lampSideOptions } from '../../data/light-geometry'
type Props = { poseId: string; faceDirectionId: string; lampSideId: string; onChange: (patch: { poseId?: string; faceDirectionId?: string; lampSideId?: string })=>void }
export const LightGeometrySelector: React.FC<Props> = ({poseId,faceDirectionId,lampSideId,onChange}) => (
 <section className="card" aria-label="ربط الإضاءة بالوضعية">
  <div style={{fontWeight:600,fontSize:'14px',marginBottom:'6px'}}>٦. هندسة الوضعية واتجاه الضوء</div>
  <p style={{fontSize:'12px',color:'var(--muted)'}}>تتحرك ظلال الوجه والوسائد تبعًا للوضعية، بينما تظل مصادر الضوء في مواقعها الحقيقية.</p>
  <div style={{display:'grid',gap:'10px'}}>
   <label style={{fontSize:'12px'}}>وضعية الجسم<select className="input" value={poseId} onChange={e=>onChange({poseId:e.target.value})}>{poseOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
   <label style={{fontSize:'12px'}}>اتجاه الوجه<select className="input" value={faceDirectionId} onChange={e=>onChange({faceDirectionId:e.target.value})}>{faceOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
   <label style={{fontSize:'12px'}}>موضع المصباح بالنسبة للشخص<select className="input" value={lampSideId} onChange={e=>onChange({lampSideId:e.target.value})}>{lampSideOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
  </div>
 </section>
)
