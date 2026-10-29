import { createHash, timingSafeEqual } from 'node:crypto'
import { buildEnhancedPrompt, eligibleHintIds, parseHintSelection, PROMPT_HINTS, type CaptureMode } from '../src/engine/ai-prompt-guard'

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
        return json({ error: response.status === 429 ? 'تجاوزت حصة Gemini المسموحة حاليًا.' : 'تعذر الحصول على نتيجة من Gemini. تأكد من المفتاح والنموذج وحدود الاستخدام.' }, 502)
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
