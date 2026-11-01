# Context7 review: Gemini API + React request races

Date: 2026-11-01

## Scope
This is a development-time audit. Context7 is not connected to the running selfie prompt generator, and no user photo or prompt is sent to Context7.

## Sources consulted
- Google Gen AI JS SDK documentation: https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerationConfig.html
- Gemini REST generationConfig reference: https://ai.google.dev/api/generate-content
- Gemini structured-output reference: https://ai.google.dev/gemini-api/docs/structured-output
- React documentation on effect cleanup and stale requests: https://react.dev/learn/synchronizing-with-effects

## Decisions
1. Keep the existing direct REST implementation, because the Gemini REST generationConfig.responseFormat.text.schema shape is documented. No SDK migration or additional runtime package is necessary.
2. Keep server-side JSON response validation. A provider output schema does not replace runtime checks for required content and physical correctness.
3. Invalidate a request on scene or target changes, and use request versions in addition to AbortController. Abort alone cannot guarantee that a late, already-resolved response is ignored.
4. Keep the local image prompt fallback independent and let it supersede any in-flight Gemini response.
5. Improve error categorization (bad request, access, model, quota, timeout and network) without logging credentials or user prompt content.
6. Preserve identity reference handling, physical lighting, camera geometry, room layout, clothing and all existing photographic constraints.

## Verification
GitHub Actions runs a real TypeScript check, Vitest tests and production Vite build.
New tests intentionally simulate providers that ignore aborted signals and return late responses.
