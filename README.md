# Bedroom Selfie MVP

A local-first React + TypeScript/Vite application for constructing a physically consistent bedroom-selfie scene from explicit user selections, then presenting a final image prompt. **The Gemini main editor does not create scenes or decide the physics.**

## Architecture (current)

```text
User Selections
  → Constraint Engine (local, deterministic)
  → Validated SceneSpecification (single source of truth)
  → Gemini Prompt Editor (language only; optional)
  → Final Validator (server-authoritative)
  → Final Prompt
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the actual branching paths, failure boundaries, and a Mermaid diagram. The app also supports direct use of the locally constructed prompt after server authorization; Gemini is optional, **not** a prerequisite for scene construction.

### Responsibilities and entry points

| Layer | Implementation | Authority |
|---|---|---|
| User selection interface | `src/app/App.tsx` and feature selectors | Supplies choices only; no implicit creative decisions |
| Constraint engine | `src/engine/scene-construction.ts` via stable `src/compiler/index.ts` `compilePrompt` facade | Evaluates local selection, physics and consistency rules; returns errors/warnings or deterministic compiled sections |
| Scene specification | `src/features/ai-prompt-enhancer/scene-specification.ts` | Emits typed selections, reference flags, lighting decision and immutable `derivedUnits`; `integrity` is a deterministic fingerprint, **not** an authentication signature |
| Main prompt editor | `api/generate-main-prompt.ts` and `shared/editorial-contract.ts` | Server checks the spec, sends Gemini only a read-only `spec` and `editorialInstructions`; Gemini returns **only** `sectionOrder` and `openingLineSelection` |
| Assembly and authority | `assembleEditorialPrompt` (server invocation only), `shared/authoritative-prompt.ts` `assertAuthoritative` | Reconstructs exact immutable text from the original spec and refuses unapproved content; this is the **one Final Prompt authority policy** |
| Local-prompt authorization | `api/authorize-final-prompt.ts` | Server rechecks the SceneSpecification and verifies exact local section text; rejects free-form/advisory promotion |
| Client confirmation | `validateConstrainedEditorReply` | Verifies Gemini server digest, section counts and immutable-unit digests; **does not** reassemble protected text |
| Final-image review | `src/features/photo-result-audit/PhotoResultAudit.tsx` | Uses an authorized original prompt for AI image audit; local manual review is still available |

### Prompt editor contract

The structured Gemini **request content** is exactly `{spec: SceneSpecification, editorialInstructions: string}`. The JSON response contains exactly `{sectionOrder: string[], openingLineSelection: 'canonical' | 'concise'}`. No response field may replace section text or add another light, pose, garment, camera or room object. Server-side assembly copies each original immutable section byte-for-byte; an invalid or duplicated ID, unauthorized opening, or model-authored extra field is rejected.

The two opening choices are a currently fixed allowlist, not a permission for Gemini to invent prose. Do not expand model authorship when adding future local templates.

### Lighting Option B

`shared/lighting-decision.ts` defines the explicit lighting block for **every** compiled scene:

```ts
{
  activeLightSource: LightingPresetId,
  savedLightingPreference: LightingPresetId,
  savedLightingPreferenceActive: boolean
}
```

In normal mode the selected preference is active. Exclusive rear-flash/front-screen modes use their single prescribed source while preserving the historical preference **inactive**. The UI labels it `(inactive: mirror flash mode)` or `(inactive: front screen mode)`. Conflicting requests for two active lights are rejected before Gemini. Unknown saved IDs are invalid; empty IDs use the existing `phone_screen_only` default. Uncovered windows retain their existing warning behavior in exclusive mode.

`shared/capture-lighting-rules.ts` now centralizes the **three previously duplicated capture/light predicates** for rear-flash mirror requirements, rear-camera flash compatibility and screen-only rear-camera conflicts. Their original outcomes and error messages are preserved. Existing physical emitters still come from `src/engine/physical-reality.ts`, and the 19 selectable lighting descriptions still live in `src/data/night-lighting.ts`.

### Ghalyon and Auditor v8: advisory, not final

Both independent text tools remain available with their existing generation modes, review, copy and optional scene-input workflows:

- **Ghalyon** — `src/features/ai-prompt-enhancer/GhalyonPromptOptimizer.tsx` and `api/optimize-prompt.ts`
- **IMAGE PROMPT AUDITOR v8** — `src/features/ai-prompt-enhancer/ImagePromptAuditorV8.tsx` and `api/audit-image-prompt.ts`

Each is permanently labeled **Advisory Output — Non-Authoritative**. Their generated text is displayed and may be copied or passed to the separate review panel, but it cannot replace `activeGeneratedPrompt` or an authorized image-audit source. The server authority route explicitly rejects Ghalyon/Auditor candidates (HTTP 403); spoofed source labels with modified prose fail exact-text validation.

A local prompt can become authoritative only after `/api/authorize-final-prompt` succeeds. **Offline or when that endpoint fails, the local preview remains visible but is not promoted to Final Prompt.** Similarly, a Gemini edit that fails validation cannot be promoted as free text. API failures are not silently accepted.

## Physical constraints and limitations

The application models selections and consistency **as explicit rules, not a true 3D ray tracer or measured-body simulation**. It covers real camera grip/support, lens/mirror orientation, light emitters and their physical sources, approximate room geometry, bedding contact, furniture continuity and natural phone-camera exposure. Unsupported measurements and unseen objects must remain unknown. The user-provided person photo defines person identity; the separate room photo, when supplied to a downstream image generator, defines room appearance. The **main text-editing Gemini endpoint receives no reference image pixels**.

Text-only prompts cannot guarantee physical correctness in every generated pixel, identity preservation in remote models, or that AI imagery will be undetectable. Inspect actual image results separately.

Canonical rule owners include `shared/body-shot-postures.ts`, `shared/body-mechanics.ts`, `shared/bedding-physics.ts`, `shared/lighting-decision.ts`, `shared/capture-lighting-rules.ts`, `src/data/mirror-optics-mechanics.ts` and `src/data/mirror-room-geometry.ts`. The latter two produce **different textual optics/room contracts** and should not be merged merely because they describe the same real mirror.

## Development and validation

Node.js **24** is used in CI. Install dependencies, run the TypeScript check, all Vitest regression tests and a production build:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Local development: `npm run dev`. Preview a production build with `npm run preview`.

GitHub Actions [`Verify application`](.github/workflows/verify.yml) runs TypeScript, a native ESM import smoke test for the standalone Gemini API function, Vitest and Vite production build. The PR1–PR4 regression suites establish compiler equivalence, lighting Option B including its 36 saved-preference cases, immutable Gemini editorial output, and server-side Final Prompt authority with advisory feature continuity.

**No existing test should be deleted to make a refactor pass.** The PR5 capture-rule equivalence test checks unchanged truth tables against the original conditions. The deferred section-transition / long-prompt readability initiative is [Issue #59](https://github.com/EmadAden77/bedroom-selfie-mvp/issues/59), intentionally outside PR5 and reserved for a separate PR **after PR5 merges**.
