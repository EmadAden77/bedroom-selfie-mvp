
import React, { useState, useCallback, useMemo, useRef } from 'react'
import { Header } from '../components/Header'
import { RoomReferenceSection } from '../features/reference-room/RoomReferenceSection'
import { PhysicalRoomStateSelector } from '../features/room-clutter/PhysicalRoomStateSelector'
import {DEFAULT_ROOM_PHYSICAL_STATE} from '../data/room-physical-state'
import { ReferenceImageSection } from '../features/reference-image/ReferenceImageSection'
import { HairSelector } from '../features/subject-options/HairSelector'
import { ExpressionSelector } from '../features/subject-options/ExpressionSelector'
import { ClothingSelector } from '../features/clothing-options/ClothingSelector'
import { BedroomShotsSelector } from '../features/bedroom-shots/BedroomShotsSelector'
import { MirrorSelfieSelector } from '../features/mirror-selfie/MirrorSelfieSelector'
import { LightGeometrySelector } from '../features/night-lighting/LightGeometrySelector'
import { NightLightingSelector } from '../features/night-lighting/NightLightingSelector'
import { AiPromptEnhancer } from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import { RealismIntensitySelector } from '../features/realism-intensity/RealismIntensitySelector'
import { PhotoResultAudit } from '../features/photo-result-audit/PhotoResultAudit'
import { useReferenceImage } from '../hooks/useReferenceImage'
import { CompilationContext } from '../domain/types'
import { compilePrompt } from '../compiler'
import {reconcileCaptureSelection} from '../data/scene-consistency'
import {evaluatePhysicalReality,updatePhysicalReality,includeCompilerFindings} from '../engine/physical-reality'
import type {RealityReport} from '../engine/physical-reality'
import {PhysicalRealityPanel} from '../features/physical-reality/PhysicalRealityPanel'

const defaultContext: CompilationContext = {
  hairVariantId: 'reference_natural_dry',
  hairstyleMode: 'preserve',
  hairDirection: 'auto',
  hairVolume: 'auto',
  hairTexture: 'auto',
  promptTarget: 'gemini',
  realismIntensity:'natural',
  expressionVariantId: 'reference_expression_preserved',
  gazeId:'auto',
  microExpressionId:'none',
  upperGarmentId: 'reference_garment_preserved',
  lowerGarmentId: null,
  materialId: 'lightweight_cotton_appearance_jersey',
  fitId: 'regular',
  stateId: 'observed_natural_state',
  color: 'apparent dark charcoal-gray as observed',
  surface: 'apparent knit-like surface character',
  referenceImagePresent: false,
  roomReferencePresent: false,
  bedroomClutterId: 'reference',
  roomPhysicalState: {...DEFAULT_ROOM_PHYSICAL_STATE,zones:[...DEFAULT_ROOM_PHYSICAL_STATE.zones]}, 
  nightLightingId: 'phone_screen_only',
  windowUncovered: false,
  poseId: 'seated_bed',
  faceDirectionId: 'toward_camera',
  lampSideId: 'left',
  bedroomShotId: ''
}

export const App: React.FC = () => {
  const { meta, error: imageError, loading: imageLoading, handleFile, removeImage } = useReferenceImage()
  const [ctx, setCtx] = useState<CompilationContext>(defaultContext)
  const [activeGeneratedPrompt, setActiveGeneratedPrompt] = useState('')
  const room = useReferenceImage()

  const ctxWithImage = useMemo(() => ({
    ...ctx,
    referenceImagePresent: !!meta,
    roomReferencePresent: !!room.meta
  }), [ctx, meta, room.meta])

  const { validation, result } = useMemo(() => {
    return compilePrompt(ctxWithImage)
  }, [ctxWithImage])

  const previousReality=useRef<{ctx:CompilationContext;report:RealityReport}|null>(null)
  const reality=useMemo(()=>{
    const previous=previousReality.current
    const changed=previous
      ? (Object.keys(ctxWithImage) as (keyof CompilationContext)[]).filter(key=>previous.ctx[key]!==ctxWithImage[key])
      : []
    const report=previous
      ? changed.length?updatePhysicalReality(previous.report,ctxWithImage,changed):previous.report
      : evaluatePhysicalReality(ctxWithImage)
    previousReality.current={ctx:ctxWithImage,report}
    return report
  },[ctxWithImage])
  const physicalReality=useMemo(()=>includeCompilerFindings(reality,validation),[reality,validation])

  const handleContextChange = useCallback((patch: Partial<CompilationContext>) => {
    setCtx(prev => reconcileCaptureSelection(prev,patch))
  }, [])

  const handleReset = useCallback(() => {
    setCtx(defaultContext)
    setActiveGeneratedPrompt('')
    removeImage()
    room.removeImage()
  }, [removeImage, room.removeImage])

  return (
    <div className="container" dir="rtl">
      <Header />
      <ReferenceImageSection meta={meta} error={imageError} loading={imageLoading} onFile={handleFile} onRemove={removeImage} />
      <RoomReferenceSection meta={room.meta} loading={room.loading} error={room.error} onFile={room.handleFile} onRemove={room.removeImage} />
      <PhysicalRealityPanel status={physicalReality.status} findings={physicalReality.findings} />
      <PhysicalRoomStateSelector value={ctx.roomPhysicalState||DEFAULT_ROOM_PHYSICAL_STATE} roomReferencePresent={!!room.meta} onChange={roomPhysicalState=>handleContextChange({roomPhysicalState})} />
      <HairSelector direction={ctx.hairDirection || 'auto'} volume={ctx.hairVolume || 'auto'} texture={ctx.hairTexture || 'auto'} onAdvancedChange={handleContextChange} selectedId={ctx.hairVariantId} mode={ctx.hairstyleMode || 'preserve'} onModeChange={mode=>handleContextChange({hairstyleMode:mode})} onSelect={(id) => handleContextChange({ hairVariantId: id, hairstyleMode: id==='reference_natural_dry'?'preserve':'apply' })} />
      <ExpressionSelector selectedId={ctx.expressionVariantId} gaze={ctx.gazeId || 'auto'} micro={ctx.microExpressionId || 'none'} onAdvancedChange={handleContextChange} onSelect={(id) => handleContextChange({ expressionVariantId: id })} />
      <ClothingSelector ctx={ctxWithImage} onChange={handleContextChange} />
      <NightLightingSelector shotId={ctx.bedroomShotId} selectedId={ctx.nightLightingId || 'phone_screen_only'} windowUncovered={!!ctx.windowUncovered} onSelect={id=>handleContextChange({ nightLightingId:id })} onWindowChange={open=>handleContextChange({ windowUncovered:open })}/>
      <LightGeometrySelector poseId={ctx.poseId || 'seated_bed'} faceDirectionId={ctx.faceDirectionId || 'toward_camera'} lampSideId={ctx.lampSideId || 'left'} onChange={patch=>handleContextChange(patch)}/>
      <BedroomShotsSelector value={ctx.bedroomShotId || ''} onChange={id=>handleContextChange({bedroomShotId:id})}/>
      <MirrorSelfieSelector ctx={ctxWithImage} onChange={handleContextChange} onShotChange={id=>handleContextChange({bedroomShotId:id})}/>
      <div className="card">
        <div style={{fontWeight:600,fontSize:'14px',marginBottom:'10px'}}>نموذج توليد الصور المستهدف</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'8px'}}>
          {([
            ['gemini','Gemini / Imagen'],
            ['chatgpt','ChatGPT / GPT Image'],
            ['flux','FLUX'],
            ['midjourney','Midjourney']
          ] as const).map(([id,label])=><button key={id} type="button"
            className={'option '+((ctx.promptTarget||'gemini')===id?'selected':'')}
            aria-pressed={(ctx.promptTarget||'gemini')===id}
            onClick={()=>handleContextChange({promptTarget:id})}>{label}</button>)}
        </div>
        <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'8px',lineHeight:1.7}}>
          Gemini محرر لغوي مقيد للوحدات التي أجازها المترجم المحلي، ولا يختار هندسة الغرفة أو مصادر الضوء أو وضعيات جديدة.
          لا تُضاف معاملات Midjourney مثل --ar دون اختيارها بشكل صريح.
        </div>
      </div>
      <RealismIntensitySelector value={ctx.realismIntensity || 'natural'} onChange={value=>handleContextChange({realismIntensity:value})}/>
      <AiPromptEnhancer ctx={ctxWithImage} result={result} validation={validation} onReset={handleReset} onPromptReady={setActiveGeneratedPrompt} />
      <PhotoResultAudit ctx={ctxWithImage} originalPrompt={activeGeneratedPrompt || result.promptText} subjectReferenceUrl={meta?.objectUrl} roomReferenceUrl={room.meta?.objectUrl} />
      <footer style={{fontSize:'10px', color:'var(--muted)', textAlign:'center', padding:'20px 0', borderTop:'1px solid var(--border)', marginTop:'20px'}} className="ltr">
        <div>PHYSICAL CLOTHING SYSTEM = APPROVED AND FROZEN</div>
        <div>Gemini independent creative writer + separate optional local fallback; physical and optical plausibility validated</div>
        <div>Only concise scene selections are sent to Google for prompt writing. Images are uploaded for photo audit only with explicit consent. No automatic local rule blocks are appended to Gemini output.</div>
      </footer>
    </div>
  )
}
