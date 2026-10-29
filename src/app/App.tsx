
import React, { useState, useCallback, useMemo } from 'react'
import { Header } from '../components/Header'
import { RoomReferenceSection } from '../features/reference-room/RoomReferenceSection'
import { ReferenceImageSection } from '../features/reference-image/ReferenceImageSection'
import { HairSelector } from '../features/subject-options/HairSelector'
import { ExpressionSelector } from '../features/subject-options/ExpressionSelector'
import { ClothingSelector } from '../features/clothing-options/ClothingSelector'
import { bedroomShots, getShotPosture } from '../data/bedroom-shots'
import { BedroomShotsSelector } from '../features/bedroom-shots/BedroomShotsSelector'
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
      <div className="card">
        <div style={{fontWeight:600,fontSize:'14px',marginBottom:'10px'}}>مولّد الصور المستهدف</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          <button type="button" className={`option ${(ctx.promptTarget || 'gemini') === 'gemini' ? 'selected' : ''}`}
            aria-pressed={(ctx.promptTarget || 'gemini') === 'gemini'}
            onClick={()=>handleContextChange({promptTarget:'gemini'})}>Gemini Prompt</button>
          <button type="button" className={`option ${ctx.promptTarget === 'chatgpt' ? 'selected' : ''}`}
            aria-pressed={ctx.promptTarget === 'chatgpt'}
            onClick={()=>handleContextChange({promptTarget:'chatgpt'})}>ChatGPT Prompt</button>
        </div>
        <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'8px'}}>
          نفس الملابس والوجه والغرفة والوضعيات. نسخة ChatGPT تعطي أولوية أوضح لتغيير التسريحة المختارة.
        </div>
      </div>
      <RealismIntensitySelector value={ctx.realismIntensity || 'natural'} onChange={value=>handleContextChange({realismIntensity:value})}/>
      <AiPromptEnhancer ctx={ctxWithImage} result={result} validation={validation} onReset={handleReset} />
      <PhotoResultAudit ctx={ctxWithImage} />
      <footer style={{fontSize:'10px', color:'var(--muted)', textAlign:'center', padding:'20px 0', borderTop:'1px solid var(--border)', marginTop:'20px'}} className="ltr">
        <div>PHYSICAL CLOTHING SYSTEM = APPROVED AND FROZEN</div>
        <div>Gemini main writer + guarded offline fallback; body, pose, mirror, bedroom and exposure rules validated locally</div>
        <div>Gemini writes primary image text without a login; local physics and identity are mandatory locks. Uploaded photos stay on device. Text specifications are sent to Google. Offline fallback available.</div>
      </footer>
    </div>
  )
}
