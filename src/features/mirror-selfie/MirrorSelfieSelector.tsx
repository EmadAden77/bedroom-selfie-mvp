import React from 'react'
import type {CompilationContext} from '../../domain/types'
import {bedroomShots,getShotPosture} from '../../data/bedroom-shots'
import {
 mirrorMovements,mirrorPhoneHeights,mirrorDistances,mirrorFramings,mirrorGazes,
 fixedMirrorMovementShots,fixedMirrorHeight,fixedMirrorDistance,fixedMirrorGaze
} from '../../data/mirror-controls'

type Props={
 ctx:CompilationContext
 onShotChange:(id:string)=>void
 onChange:(patch:Partial<CompilationContext>)=>void
}

type ChoiceProps={
 title:string
 value:string
 options:readonly {id:string;label:string}[]
 disabled?:boolean
 onSelect:(id:string)=>void
}
const Choices:React.FC<ChoiceProps>=({title,value,options,disabled=false,onSelect})=>(
 <div style={{marginTop:14,opacity:disabled?0.65:1}}>
  <div style={{fontSize:12,fontWeight:650,marginBottom:7}}>{title}{disabled?' · محدد بالوضعية':''}</div>
  <div className="grid">
   {options.map(item=><button type="button" key={item.id} className={'option '+(value===item.id?'selected':'')} aria-pressed={value===item.id} disabled={disabled} onClick={()=>onSelect(item.id)}>{item.label}</button>)}
  </div>
 </div>
)

export const MirrorSelfieSelector:React.FC<Props>=({ctx,onShotChange,onChange})=>{
 const mirrorShots=bedroomShots.filter(shot=>shot.mode==='mirror')
 const active=mirrorShots.some(shot=>shot.id===ctx.bedroomShotId)
 const shotId=active?(ctx.bedroomShotId||''):''
 const standing=mirrorShots.filter(shot=>getShotPosture(shot.id)==='standing')
 const seated=mirrorShots.filter(shot=>getShotPosture(shot.id)!=='standing')
 return <section className="card" aria-label="قسم مستقل للتصوير أمام المرآة">
  <h2 style={{fontSize:16,margin:'0 0 8px'}}>🪞 ٨. التصوير أمام المرآة</h2>
  <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.8}}>
   قسم مستقل يضم {mirrorShots.length} وضعية أصلية، مع حركة اليد ومستوى الهاتف والمسافة والتأطير واتجاه النظر. جميعها تستخدم مرآة باب الدولاب الثابتة على الجدار الأيمن، بكاميرا خلفية لهاتف واحد.
  </p>
  {!active&&<button type="button" className="btn" onClick={()=>onShotChange('mirror_wardrobe')} style={{marginBottom:12}}>تفعيل تصوير المرآة</button>}
  {active&&<div style={{fontSize:12,fontWeight:650,marginBottom:12}}>✓ وضع المرآة نشط — انعكاس حقيقي وهندسة غرفة ثابتة</div>}
  {([{title:'الوقوف وزوايا الجسم',items:standing},{title:'الجلوس أمام المرآة',items:seated}]).map(group=>
   <div key={group.title} style={{marginBottom:16}}>
    <div style={{fontWeight:650,fontSize:13,marginBottom:8}}>{group.title}</div>
    <div className="grid">
     {group.items.map(shot=><button type="button" key={shot.id} className={'option '+(shotId===shot.id?'selected':'')} aria-pressed={shotId===shot.id} onClick={()=>onShotChange(shot.id)}>
      <div style={{fontWeight:600}}>{shot.label}</div>
      <small style={{opacity:0.7}}>كاميرا خلفية · انعكاس المرآة</small>
     </button>)}
    </div>
   </div>
  )}
  {active&&<>
   <div style={{borderTop:'1px solid var(--border)',paddingTop:12,fontSize:13,fontWeight:700}}>تحكم الحركة والهندسة</div>
   <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.8}}>عندما تفرض الوضعية حركة يد أو زاوية محددة، تُقفل الإعدادات المتعارضة تلقائيًا. باقي الخيارات تتبع خطوط الانعكاس والمساحة الفعلية.</p>
   <Choices title="حركة اليد الحرة" value={ctx.mirrorMovementId||'relaxed'} options={mirrorMovements} disabled={fixedMirrorMovementShots.has(shotId)} onSelect={id=>onChange({mirrorMovementId:id})}/>
   <Choices title="ارتفاع الهاتف" value={ctx.mirrorPhoneHeightId||'shot'} options={mirrorPhoneHeights} disabled={!!fixedMirrorHeight[shotId]} onSelect={id=>onChange({mirrorPhoneHeightId:id})}/>
   <Choices title="المسافة من المرآة" value={ctx.mirrorDistanceId||'shot'} options={mirrorDistances} disabled={!!fixedMirrorDistance[shotId]} onSelect={id=>onChange({mirrorDistanceId:id})}/>
   <Choices title="حجم الكادر المنعكس" value={ctx.mirrorFramingId||'shot'} options={mirrorFramings} onSelect={id=>onChange({mirrorFramingId:id})}/>
   <Choices title="اتجاه العينين" value={ctx.mirrorGazeId||'shot'} options={mirrorGazes} disabled={!!fixedMirrorGaze[shotId]} onSelect={id=>onChange({mirrorGazeId:id})}/>
  </>}
 </section>
}
