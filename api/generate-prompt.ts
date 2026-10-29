import { createHash, timingSafeEqual } from 'node:crypto'
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


type RequestBody = { prompt?: unknown; mode?: unknown; posture?: unknown }

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

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

    // No user photos, image URL, browser-stored API key or reference hash is sent.
    const apiKey = process.env.GEMINI_API_KEY
    const accessToken = process.env.PROMPT_ENGINE_ACCESS_TOKEN
    if (!apiKey || !accessToken) {
      return json({ error: 'ميزة Gemini غير مفعّلة. أضف GEMINI_API_KEY و PROMPT_ENGINE_ACCESS_TOKEN إلى إعدادات Vercel.' }, 503)
    }
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Request origin rejected' }, 403)
    const token = request.headers.get('x-prompt-engine-access') || ''
    if (!token || !secretMatches(token, accessToken)) return json({ error: 'رمز الوصول غير صحيح.' }, 401)

    const size = Number(request.headers.get('content-length') || '0')
    if (size > 45000) return json({ error: 'حجم البرومبت أكبر من الحد المسموح.' }, 413)

    let body: RequestBody
    try { body = await request.json() as RequestBody }
    catch { return json({ error: 'بيانات الطلب غير صالحة.' }, 400) }

    const prompt = body.prompt
    const mode = body.mode
    const posture = body.posture
    if (typeof prompt !== 'string' || prompt.trim().length < 100 || prompt.length > 35000 ||
      !['front','mirror','rear','timer'].includes(String(mode)) ||
      typeof posture !== 'string' || posture.length > 50) {
      return json({ error: 'يرجى توليد برومبت صحيح من التطبيق أولًا.' }, 400)
    }
    const eligible = eligibleHintIds(mode as CaptureMode, posture)
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    if (!/^[a-zA-Z0-9._-]{3,80}$/.test(model)) return json({ error: 'إعداد اسم نموذج Gemini غير صحيح.' }, 503)

    try {
      const selectionRequest = {
        systemInstruction: {
          parts: [{ text: 'You are the bounded photographic naturalness adviser for Bedroom Selfie MVP. Do not rewrite the original image prompt. Do not output image prompts, prose, identity attributes, objects, lighting sources, room changes, brand alterations or new camera positions. Choose exactly 2 or 3 approved hint IDs from the provided catalog that best complement the existing prompt, and return only valid JSON in the form {"ids":["id1","id2"]}. Select mirror_optics only for mirror capture, timer_stability only for timer capture, bed_pressure only with real bed contact. Preserve the entire input prompt as authoritative.' }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: JSON.stringify({
            mode, posture,
            allowedHints: Object.fromEntries(eligible.map(id=>[id,PROMPT_HINTS[id]])),
            localPrompt: prompt
          }) }]
        }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 180, responseMimeType: 'application/json' }
      }

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(selectionRequest), signal: AbortSignal.timeout(25000) }
      )
      if (!response.ok) {
        // Never forward raw provider errors, which can contain sensitive provider details.
        const reason = response.status === 429
          ? 'تجاوزت حصة Gemini المسموحة حاليًا.'
          : [401,403].includes(response.status)
          ? 'رفضت Google مفتاح Gemini أو صلاحيات المشروع. راجع إعدادات Google AI Studio.'
          : response.status === 404
          ? 'نموذج Gemini المحدد غير متاح لهذا المفتاح. تحقق من اسم النموذج.'
          : response.status === 400
          ? 'رفضت Google إعدادات الطلب. راجع إعدادات النموذج.'
          : 'تعذر الحصول على نتيجة من Gemini. تحقق من اتصال الخدمة.'
        return json({ error: reason }, 502)
      }
      const output = await response.json() as { candidates?: Array<{ content?: {parts?: Array<{text?: string}>} }> }
      const modelText = output.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || ''
      const ids = parseHintSelection(modelText, eligible)
      return json({ enhancedPrompt: buildEnhancedPrompt(prompt, ids), selectedHintIds: ids, model })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (/invalid|selected no safe|structured/.test(message)) return json({ error: 'رد Gemini لم يجتز فحص التوافق مع قواعد التطبيق. البرومبت الأصلي لم يتغير.' }, 422)
      return json({ error: 'تعذر الاتصال بـGemini. يبقى البرومبت المحلي متاحًا للاستخدام.' }, 502)
    }
  }
}
