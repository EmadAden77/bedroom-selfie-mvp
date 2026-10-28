
import { useState, useCallback, useEffect, useRef } from 'react'
import { ReferenceImageMeta } from '../domain/types'
import { computeSHA256 } from '../utils/crypto'
import { validateImageFile } from '../utils/validation'

export function useReferenceImage() {
  const [meta, setMeta] = useState<ReferenceImageMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  const revokeCurrent = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const removeImage = useCallback(() => {
    revokeCurrent()
    setMeta(null)
    setError(null)
  }, [revokeCurrent])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    setLoading(true)
    try {
      // Revoke previous if exists (replace case)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      const objectUrl = URL.createObjectURL(file)
      objectUrlRef.current = objectUrl

      // Get dimensions
      const dimensions = await new Promise<{width: number|null, height: number|null}>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve({ width: null, height: null })
        img.src = objectUrl
      })

      // SHA-256 from bytes
      const sha256 = await computeSHA256(file)

      const newMeta: ReferenceImageMeta = {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sizeKB: (file.size / 1024).toFixed(1),
        width: dimensions.width,
        height: dimensions.height,
        sha256,
        objectUrl
      }
      setMeta(newMeta)
    } catch (e) {
      setError('فشل معالجة الصورة - حاول ملف آخر')
      revokeCurrent()
    } finally {
      setLoading(false)
    }
  }, [revokeCurrent])

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  return { meta, error, loading, handleFile, removeImage }
}
