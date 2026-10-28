
import React, { useState, useCallback, useMemo } from 'react'
import { Header } from '../components/Header'
import { ReferenceImageSection } from '../features/reference-image/ReferenceImageSection'
import { HairSelector } from '../features/subject-options/HairSelector'
import { ExpressionSelector } from '../features/subject-options/ExpressionSelector'
import { ClothingSelector } from '../features/clothing-options/ClothingSelector'
import { getShotPosture } from '../data/bedroom-shots'
import { BedroomShotsSelector } from '../features/bedroom-shots/BedroomShotsSelector'
import { LightGeometrySelector } from '../features/night-lighting/LightGeometrySelector'
import { NightLightingSelector } from '../features/night-lighting/NightLightingSelector'
import { PromptPreview } from '../features/prompt-preview/PromptPreview'
import { useReferenceImage } from '../hooks/useReferenceImage'
import { CompilationContext } from '../domain/types'
import { compilePrompt } from '../compiler'

const defaultContext: CompilationContext = {
  hairVariantId: 'reference_natural_dry',
  hairstyleMode: 'preserve',
  expressionVariantId: 'reference_expression_preserved',
  upperGarmentId: 'reference_garment_preserved',
  lowerGarmentId: null,
  materialId: 'lightweight_cotton_appearance_jersey',
  fitId: 'regular',
  stateId: 'observed_natural_state',
  color: 'apparent dark charcoal-gray as observed',
  surface: 'apparent knit-like surface character',
  referenceImagePresent: false,
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

  const ctxWithImage = useMemo(() => ({
    ...ctx,
    referenceImagePresent: !!meta
  }), [ctx, meta])

  const { validation, result } = useMemo(() => {
    return compilePrompt(ctxWithImage)
  }, [ctxWithImage])

  const handleContextChange = useCallback((patch: Partial<CompilationContext>) => {
    setCtx(prev => ({ ...prev, ...patch }))
  }, [])

  const handleCopy = useCallback(() => {
    const text = result.promptText
    if (!validation.isValid || result.errors.length > 0) return
    navigator.clipboard.writeText(text).then(() => {
      alert('تم نسخ Subject & Clothing Prompt Preview. تنبيه: هذا ليس Final Prompt - الأنظمة التالية لم تبن بعد.')
    })
  }, [result.promptText, result.errors.length, validation.isValid])

  const handleReset = useCallback(() => {
    setCtx(defaultContext)
    removeImage()
  }, [removeImage])

  return (
    <div className="container" dir="rtl">
      <Header />
      <ReferenceImageSection meta={meta} error={imageError} loading={imageLoading} onFile={handleFile} onRemove={removeImage} />
      <HairSelector selectedId={ctx.hairVariantId} mode={ctx.hairstyleMode || 'preserve'} onModeChange={mode=>handleContextChange({hairstyleMode:mode})} onSelect={(id) => handleContextChange({ hairVariantId: id, hairstyleMode: id==='reference_natural_dry'?'preserve':'apply' })} />
      <ExpressionSelector selectedId={ctx.expressionVariantId} onSelect={(id) => handleContextChange({ expressionVariantId: id })} />
      <ClothingSelector ctx={ctxWithImage} onChange={handleContextChange} />
      <NightLightingSelector selectedId={ctx.nightLightingId || 'phone_screen_only'} windowUncovered={!!ctx.windowUncovered} onSelect={id=>handleContextChange({ nightLightingId:id })} onWindowChange={open=>handleContextChange({ windowUncovered:open })}/>
      <LightGeometrySelector poseId={ctx.poseId || 'seated_bed'} faceDirectionId={ctx.faceDirectionId || 'toward_camera'} lampSideId={ctx.lampSideId || 'left'} onChange={patch=>handleContextChange({ ...patch, ...(patch.poseId ? {bedroomShotId:''} : {}) })}/>
      <BedroomShotsSelector value={ctx.bedroomShotId || ''} onChange={id=>handleContextChange({bedroomShotId:id, ...(getShotPosture(id)?{poseId:getShotPosture(id)}:{}), ...(id==='mirror_rear_flash'?{nightLightingId:'rear_flash'}:{})})}/>
      <PromptPreview result={result} validation={validation} onCopy={handleCopy} onReset={handleReset} />
      <footer style={{fontSize:'10px', color:'var(--muted)', textAlign:'center', padding:'20px 0', borderTop:'1px solid var(--border)', marginTop:'20px'}} className="ltr">
        <div>PHYSICAL CLOTHING SYSTEM = APPROVED AND FROZEN</div>
        <div>Pending: Body profile, Pose mechanics, Selfie geometry, Bedroom environment, Camera pipeline, Final realism validation</div>
        <div>Local-First - No Backend - No External Uploads - SHA-256 from bytes - Object URL with revoke on remove/replace/unmount - PWA Offline</div>
      </footer>
    </div>
  )
}
