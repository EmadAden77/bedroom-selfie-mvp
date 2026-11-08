// LEGACY ENDPOINT — see api/generate-main-prompt.ts for the canonical flow. Any behavior change here MUST be mirrored there.
import { createHash, timingSafeEqual } from 'node:crypto'
import {MAX_SCENE_REQUEST_BYTES,validateSceneSpec} from './generate-main-prompt.ts'
// Keep this route self-contained: Vercel's Node ESM runtime must not resolve
// extensionless imports from src/engine after TypeScript compilation.
// The contract below is mirrored in the local-only engine and guarded by parity tests.
/**
 * A bounded AI enhancement layer. Gemini may select only these reviewed
 * photographic details; it cannot rewrite identity, furniture, exposure,
 * clothing, anatomy or camera geometry in the canonical local prompt.
 */
export type CaptureMode = 'front' | 'mirror' | 'rear' | 'timer'

export const PROMPT_HINTS = {
  quiet_framing: 'Preserve the chosen crop and camera viewpoint with ordinary handheld framing imprecision, without forced symmetry. Never extend the real field of view to reveal additional room furniture.',
  consistent_sensor: 'Apply modest phone sensor texture, local sharpness and compression consistently across the person and the room, without separately retouching the face.',
  real_cloth: 'Keep micro-folds and textile tension tied to actual shoulder, elbow, waist and fabric-contact forces; preserve the chosen garment design.',
  natural_expression: 'Retain minor everyday facial-muscle asymmetry and ordinary eye focus without changing reference anatomy, age, expression selection or facial features.',
  real_white_balance: 'Use an everyday automatic white balance response to the already selected practical lighting, without creating any new source, bright wall glow or artificial fill.',
  mirror_optics: 'Check that the single visible rear-camera handset and its grip lie on the same real reflected ray path as the subject; respect natural glass-edge cropping and occlusion.',
  bed_pressure: 'Maintain the existing bedding count and arrangement; allow contact-driven local compression and wrinkles only where this body actually loads the mattress or pillows.',
  timer_stability: 'Keep the recording phone on its real stable timer support; allow hands to act freely without inventing a photographer or a handheld recording arm.'
} as const

export type PromptHintId = keyof typeof PROMPT_HINTS
const DEFAULT_IDS: PromptHintId[] = [
  'quiet_framing', 'consistent_sensor', 'real_cloth', 'natural_expression', 'real_white_balance'
]

export function eligibleHintIds(mode: CaptureMode, posture: string): PromptHintId[] {
  const allowed: PromptHintId[] = [...DEFAULT_IDS]
  if (mode === 'mirror') allowed.push('mirror_optics')
  if (mode === 'timer') allowed.push('timer_stability')
  if (['seated_bed','reclined_pillows','side_lying_right','side_lying_left','supine','prone'].includes(posture)) {
    allowed.push('bed_pressure')
  }
  return allowed
}

export function parseHintSelection(modelText: string, allowedIds: readonly PromptHintId[]): PromptHintId[] {
  let parsed: unknown
  try { parsed = JSON.parse(modelText.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '')) }
  catch { throw new Error('The AI model did not return valid structured output') }
  if (!parsed || typeof parsed !== 'object' || !('ids' in parsed) || !Array.isArray(parsed.ids)) {
    throw new Error('The AI model response did not contain a selection')
  }
  const allowed = new Set<string>(allowedIds)
  const selected: PromptHintId[] = []
  for (const id of parsed.ids as unknown[]) {
    if (typeof id === 'string' && allowed.has(id) && !selected.includes(id as PromptHintId)) {
      selected.push(id as PromptHintId)
    }
    if (selected.length === 3) break
  }
  if (selected.length === 0) throw new Error('The AI model selected no safe enhancements')
  return selected
}

export function buildEnhancedPrompt(basePrompt: string, selected: readonly PromptHintId[]): string {
  if (typeof basePrompt !== 'string' || !basePrompt.trim()) throw new Error('A valid local prompt is required')
  if (!selected.length || selected.some(id=>!(id in PROMPT_HINTS))) throw new Error('Enhancements must be selected from the approved catalog')
  return basePrompt.trim() + '\n\nPHOTOGRAPHIC NATURALNESS REFINEMENT (subject to all original identity, room, pose, camera and lighting constraints): ' +
    selected.map(id=>PROMPT_HINTS[id]).join(' ')
}


const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  })

const secretMatches = (provided: string, expected: string): boolean => {
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

// Server logs contain only categorized errors. Never log prompts, access tokens,
// provider keys, request bodies, headers or provider error response contents.
const safeFailure = (code: string, message: string, status = 502) =>
  json({ error: message, errorCode: code }, status)

const providerStatus = (status: number): Response => {
  if (status === 429) return safeFailure('GEMINI_QUOTA', 'وصلت خدمة Gemini إلى حد الاستخدام. تحقق من حصة Google AI Studio ثم أعد المحاولة.', 429)
  if (status === 401 || status === 403) return safeFailure('GEMINI_ACCESS', 'رفضت Google مفتاح API أو صلاحيات المشروع. راجع Google AI Studio دون مشاركة المفتاح.', 502)
  if (status === 404) return safeFailure('GEMINI_MODEL', 'النموذج غير متاح في مشروع Google المتصل. تحقق من النماذج المسموحة للمفتاح.', 502)
  if (status === 400) return safeFailure('GEMINI_REQUEST', 'لم تقبل Google إعدادات الطلب. راجع إعدادات النموذج.', 502)
  if (status >= 500) return safeFailure('GEMINI_UPSTREAM', 'خدمة Google غير متاحة مؤقتًا. البرومبت المحلي يعمل دون اتصال.', 502)
  return safeFailure('GEMINI_PROVIDER', 'تعذر تنفيذ طلب Gemini. راجع إعدادات مشروع Google.', 502)
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

    // Mirror the canonical route's cross-origin, JSON, and two-stage size checks.
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin)
      return safeFailure('ORIGIN_REJECTED', 'تم رفض مصدر الطلب.', 403)
    const site = request.headers.get('sec-fetch-site')
    if (site && !['same-origin','none'].includes(site))
      return safeFailure('CROSS_SITE', 'الطلب ليس من التطبيق.', 403)
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json'))
      return safeFailure('JSON_REQUIRED', 'يُقبل JSON فقط.', 415)
    if (Number(request.headers.get('content-length') || 0) > MAX_SCENE_REQUEST_BYTES)
      return safeFailure('TOO_LARGE', 'حجم مواصفات المشهد كبير جدًا.', 413)

    // This is a server-configured shared secret, NOT a user login/session token.
    // Retain the existing header authentication before parsing attacker-controlled JSON.
    const accessToken = process.env.PROMPT_ENGINE_ACCESS_TOKEN
    if (!accessToken) return safeFailure('GEMINI_NOT_CONFIGURED', 'ميزة Gemini غير مفعلة؛ تحقق من إعدادات الخادم.', 503)
    const token = request.headers.get('x-prompt-engine-access') || ''
    if (!token || !secretMatches(token, accessToken))
      return json({ error: 'رمز الوصول غير صحيح.' }, 401)

    // Do not accept free-text prompt/mode/posture fields from callers.
    // validateSceneSpec checks canonical geometry, body/bedding derivations,
    // immutable derivedUnits, matching IDs, and integrity before any Gemini call.
    let sceneSpec: ReturnType<typeof validateSceneSpec>
    try {
      const raw = await request.text()
      if (new TextEncoder().encode(raw).length > MAX_SCENE_REQUEST_BYTES)
        return safeFailure('TOO_LARGE', 'حجم مواصفات المشهد كبير جدًا.', 413)
      const data:unknown = JSON.parse(raw)
      if (!data || typeof data !== 'object' || Array.isArray(data) ||
          Object.keys(data).join(',') !== 'sceneSpecification')
        return safeFailure('STRUCTURED_SPEC_REQUIRED', 'مواصفات المشهد المحلية المنظمة مطلوبة.', 400)
      sceneSpec = validateSceneSpec((data as {sceneSpecification:unknown}).sceneSpecification)
    } catch (error) {
      const code = error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message : 'BAD_JSON'
      return safeFailure(code, 'مواصفات المشهد غير صالحة.', 400)
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return safeFailure('GEMINI_NOT_CONFIGURED', 'ميزة Gemini غير مفعلة؛ تحقق من إعدادات الخادم.', 503)
    // Read only validated capture metadata; never mutate or transmit derivedUnits.
    const {mode,posture,lighting} = sceneSpec.capture
    const eligible = eligibleHintIds(mode, posture)

    // This is a short classification task, not image generation or deep reasoning.
    // Owners can override the model using GEMINI_MODEL in Vercel.
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    if (!/^[a-zA-Z0-9._-]{3,80}$/.test(model)) return safeFailure('GEMINI_MODEL_CONFIG', 'اسم نموذج Gemini غير صحيح.', 503)

    try {
      // Send only selected scene categories and the safe hint catalog to Google.
      // Never forward complete identity, bedroom reference or person prompts.
      const selectionRequest = {
        systemInstruction: {
          parts: [{ text: 'You are a constrained photography hint selector for a private bedroom selfie app. Do not invent scenes, people, lighting or accessories. Choose 2 or 3 unique IDs from the allowedHints keys that are best aligned with the capture mode, posture and selected lighting. Return valid JSON only: {"ids":["id1","id2"]}. All immutable identity, room and camera rules remain governed by the local prompt.' }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: JSON.stringify({
            captureMode: mode, anatomicalPosture: posture, selectedLighting: lighting || 'not_specified',
            allowedHints: Object.fromEntries(eligible.map(id => [id, PROMPT_HINTS[id]]))
          }) }]
        }],
        generationConfig: { maxOutputTokens: 512, responseMimeType: 'application/json' }
      }

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(selectionRequest),
          signal: AbortSignal.timeout(20000)
        }
      )
      if (!response.ok) {
        console.warn('[Gemini selector] upstream HTTP status:', response.status)
        return providerStatus(response.status)
      }
      let output: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      try { output = await response.json() as typeof output }
      catch {
        console.warn('[Gemini selector] provider JSON response invalid')
        return safeFailure('GEMINI_BAD_RESPONSE', 'أعادت Google استجابة غير قابلة للقراءة. حاول مجددًا.')
      }
      const modelText = output.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
      let ids: PromptHintId[]
      try { ids = parseHintSelection(modelText, eligible) }
      catch {
        console.warn('[Gemini selector] model output did not match allowed hint selection')
        return safeFailure('GEMINI_INVALID_SELECTION', 'رد Gemini لم يجتز فحص قواعد التطبيق. لم يتغير البرومبت الأصلي.', 422)
      }
      // Advisory IDs only. No prompt text, validated:true, or final authority is returned.
      return json({ source: 'legacy-hints', authoritative: false, selectedHintIds: ids, model })
    } catch (error) {
      const err = error as Error
      const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      // Only safe diagnostic classification is logged. No request payloads or secrets.
      console.error('[Gemini selector] outbound failure:', timeout ? 'TIMEOUT' : 'NETWORK')
      return timeout
        ? safeFailure('GEMINI_TIMEOUT', 'انتهت مهلة اتصال Google. حاول مرة أخرى؛ البرومبت المحلي ما زال متاحًا.', 504)
        : safeFailure('GEMINI_NETWORK', 'فشل الاتصال الخارجي بخدمة Google من الخادم. البرومبت المحلي لم يتأثر.', 502)
    }
  }
}
