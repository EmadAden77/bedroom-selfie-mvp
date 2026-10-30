
import React, { useState, useCallback, useMemo } from 'react'
import { Header } from '../components/Header'
import { RoomReferenceSection } from '../features/reference-room/RoomReferenceSection'
import { ReferenceImageSection } from '../features/reference-image/ReferenceImageSection'
import { HairSelector } from '../features/subject-options/HairSelector'
import { ExpressionSelector } from '../features/subject-options/ExpressionSelector'
import { ClothingSelector } from '../features/clothing-options/ClothingSelector'
import { bedroomShots, getShotPosture } from '../data/bedroom-shots'
import { BedroomShotsSelector } from '../features/bedroom-shots/BedroomShotsSelector'
import { MirrorSelfieSelector } from '../features/mirror-selfie/MirrorSelfieSelector'
import { nextMirrorLighting } from '../data/mirror-flash-physics'
import { LightGeometrySelector } from '../features/night-lighting/LightGeometrySelector'
import { NightLightingSelector } from '../features/night-lighting/NightLightingSelector'
import { AiPromptEnhancer } from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import { RealismIntensitySelector } from '../features/realism-intensity/RealismIntensitySelector'
import { PhotoResultAudit } from '../features/photo-result-audit/PhotoResultAudit'
import { useReferenceImage } from '../hooks/useReferenceImage'
import { CompilationContext } from '../domain/types'
import { compilePrompt } from '../compiler'

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

  const handleContextChange = useCallback((patch: Partial<CompilationContext>) => {
    setCtx(prev => ({ ...prev, ...patch }))
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
      <HairSelector direction={ctx.hairDirection || 'auto'} volume={ctx.hairVolume || 'auto'} texture={ctx.hairTexture || 'auto'} onAdvancedChange={handleContextChange} selectedId={ctx.hairVariantId} mode={ctx.hairstyleMode || 'preserve'} onModeChange={mode=>handleContextChange({hairstyleMode:mode})} onSelect={(id) => handleContextChange({ hairVariantId: id, hairstyleMode: id==='reference_natural_dry'?'preserve':'apply' })} />
      <ExpressionSelector selectedId={ctx.expressionVariantId} gaze={ctx.gazeId || 'auto'} micro={ctx.microExpressionId || 'none'} onAdvancedChange={handleContextChange} onSelect={(id) => handleContextChange({ expressionVariantId: id })} />
      <ClothingSelector ctx={ctxWithImage} onChange={handleContextChange} />
      <NightLightingSelector selectedId={ctx.nightLightingId || 'phone_screen_only'} windowUncovered={!!ctx.windowUncovered} onSelect={id=>handleContextChange({ nightLightingId:id })} onWindowChange={open=>handleContextChange({ windowUncovered:open })}/>
      <LightGeometrySelector poseId={ctx.poseId || 'seated_bed'} faceDirectionId={ctx.faceDirectionId || 'toward_camera'} lampSideId={ctx.lampSideId || 'left'} onChange={patch=>handleContextChange({ ...patch, ...(patch.poseId ? {bedroomShotId:''} : {}) })}/>
      <BedroomShotsSelector value={ctx.bedroomShotId || ''} onChange={id=>{
        const selectedShot=bedroomShots.find(s=>s.id===id)
        const currentLighting=ctx.nightLightingId || 'phone_screen_only'
        const nextLighting=id==='mirror_rear_flash' ? 'rear_flash'
          : selectedShot?.mode==='mirror' && ['phone_screen_only','rear_flash'].includes(currentLighting) ? 'ceiling_neutral'
          : id && currentLighting==='rear_flash' ? 'ceiling_neutral'
          : currentLighting
        handleContextChange({bedroomShotId:id,...(getShotPosture(id)?{poseId:getShotPosture(id)}:{}),nightLightingId:nextLighting,
          ...(selectedShot?.mode==='mirror' ? {faceDirectionId:'toward_camera'} : {})})
      }}/>
      <MirrorSelfieSelector ctx={ctxWithImage} onChange={handleContextChange} onShotChange={id=>{
        const currentLighting=ctx.nightLightingId || 'phone_screen_only'
        const nextLighting=nextMirrorLighting(id,currentLighting)
        handleContextChange({
          bedroomShotId:id,
          poseId:getShotPosture(id)||'standing',
          faceDirectionId:'toward_camera',
          nightLightingId:nextLighting,
          mirrorMovementId:'relaxed',mirrorPhoneHeightId:'shot',
          mirrorDistanceId:'shot',mirrorFramingId:'shot',mirrorGazeId:'shot'
        })
      }}/>
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
          Gemini هو كاتب البرومبت المستقل في كل الحالات. يختار تفاصيل اللقطة بحرية وفق إعداداتك، بشرط أن تكون الإضاءة والكاميرا والحركة والتلامس واقعية فيزيائيًا وميكانيكيًا.
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
