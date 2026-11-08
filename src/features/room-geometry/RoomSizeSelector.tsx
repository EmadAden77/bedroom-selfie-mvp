import React from 'react'
import type {CompilationContext} from '../../domain/types'
import {unverifiedRoomMeasurements} from '../../../shared/room-acknowledgement'
import {
 ROOM_SIZE_PRESETS,deriveRoomGeometry,roomGeometryIssues,roomInputStatus,
 type RoomSizePreset
} from '../../../shared/room-geometry-rules'

type Props={
 ctx:CompilationContext
 posture:string
 activeLighting:string
 onChange:(patch:Partial<CompilationContext>)=>void
}
const choices:readonly {id:RoomSizePreset;label:string}[]=[
 {id:'small_bedroom',label:'صغيرة — 3.0 × 3.5 × 2.4 م'},
 {id:'medium_bedroom',label:'متوسطة — 4.0 × 4.5 × 2.6 م'},
 {id:'large_bedroom',label:'كبيرة — 5.0 × 5.5 × 2.8 م'},
 {id:'custom',label:'مقاسات مخصصة'}
]
/** PR7b: one room-size control, no furniture placement, map or other UI redesign. */
export const RoomSizeSelector:React.FC<Props>=({ctx,posture,activeLighting,onChange})=>{
 const presetId=ctx.roomSizePreset||'medium_bedroom'
 const input=roomInputStatus(ctx)
 const geometry=deriveRoomGeometry(ctx,posture,activeLighting,
  (ctx.bedroomShotId||'').startsWith('mirror_')&&posture==='standing')
 const issues=geometry?roomGeometryIssues(geometry):[]
 const unverified=geometry?unverifiedRoomMeasurements(geometry,posture):[]
 const unconfirmed=!!geometry&&!geometry.userConfirmed
 function choose(next:RoomSizePreset){
  onChange({roomSizePreset:next,roomSizeConfirmed:false,
   ...(next==='custom'?{
    roomCustomWidthMeters:null,roomCustomDepthMeters:null,roomCustomHeightMeters:null
   }:{})})
 }
 const customInputs=[
  {key:'roomCustomWidthMeters',label:'العرض (متر)'},
  {key:'roomCustomDepthMeters',label:'العمق (متر)'},
  {key:'roomCustomHeightMeters',label:'الارتفاع (متر)'}
 ] as const
 return <section className="card" aria-label="أبعاد غرفة النوم">
  <div style={{fontWeight:700,marginBottom:8}}>أبعاد غرفة النوم — اختيارك أنت</div>
  <label style={{fontSize:12}}>حجم الغرفة
   <select aria-label="حجم الغرفة" className="input" value={presetId}
    onChange={e=>choose(e.target.value as RoomSizePreset)}>
    {choices.map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}
   </select>
  </label>
  {presetId==='custom'&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginTop:8}}>
   {customInputs.map(field=><label key={field.key} style={{fontSize:11}}>
    {field.label}
    <input aria-label={field.label} type="number" inputMode="decimal" min="2" max="12" step="0.1"
     className="input" value={ctx[field.key]??''}
     onChange={e=>onChange({[field.key]:e.target.value===''?null:Number(e.target.value)} as Partial<CompilationContext>)}/>
   </label>)}
  </div>}
  {presetId!=='custom'&&!geometry?.userConfirmed&&<button type="button" className="btn btn-secondary"
   style={{marginTop:8}} onClick={()=>onChange({roomSizeConfirmed:true})}>
   تأكيد أبعاد الغرفة المختارة
  </button>}
  {unconfirmed&&<div role="alert" style={{fontSize:12,marginTop:8,color:'#92400e'}}>
   {presetId==='medium_bedroom'
    ?'Room size assumed as medium. Confirm for accuracy.'
    :'Room size assumed as '+presetId.replace('_bedroom','')+'. Confirm for accuracy.'}
  </div>}
  {unverified.length>0&&<div role="alert" aria-label="Unverified room measurements" style={{fontSize:12,marginTop:8,color:'#92400e'}}>
   <strong>Provisional — measurements require verification.</strong>
   {unverified.map(name=><p key={name} style={{margin:'4px 0'}}>{name}. Authoritative status requires verification or explicit acknowledgement.</p>)}
  </div>}
  {input.status==='invalid'&&<div role="alert" style={{fontSize:12,marginTop:8,color:'#b91c1c'}}>{input.reason}</div>}
  {issues.length>0&&<div role="alert" style={{fontSize:12,marginTop:8,color:'#92400e'}}>
   {issues.map((issue,i)=><p key={i} style={{margin:'4px 0'}}>
    {issue.status==='unknown'?'قياس غير مكتمل — ':'تعارض هندسي — '}{issue.reason}
   </p>)}
  </div>}
  {geometry&&<p style={{fontSize:11,color:'var(--muted)'}}>
   {geometry.widthMeters.toFixed(1)} × {geometry.depthMeters.toFixed(1)} × {geometry.heightMeters.toFixed(1)} متر
   {presetId==='custom'?' — مأخوذة من إدخالاتك':' — قيمة محددة في الخيار'}
  </p>}
 </section>
}
