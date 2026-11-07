# Physical Reality Engine V2.1 — deterministic body mechanics

## Verified baseline before V2.1

Source: `main` at `4f13062b3c7ccc0d485fe558e469df199d08ffe2`. GitHub Actions run `42401388752` completed successfully: `npm ci`, real `npm run typecheck` (`tsc --noEmit`), `npm test` (1,538 passed across 30 files), and `npm run build`.

## Architecture

1. `shared/body-shot-postures.ts` owns the existing 98 shot-to-posture relationships. The original shot catalog, labels, UI modes and descriptions remain in `src/data/bedroom-shots.ts`. Browser and server use the same posture mapping.
2. `shared/body-mechanics.ts` is a pure deterministic function. A normalized `BodyMechanicalInput` contains shot, posture, capture mode, explicit hand choice, selected support surface, optional free-hand task and optional feet visibility. It returns `BodyMechanicalState` with `VALID`, `NEEDS_INFORMATION`, or `INVALID`, stable coded issues, causal contacts, conservative contact-dependent deformation and non-blocking uncertainty markers. It never measures joint angles, center-of-mass position, body mass transfer or surface compression depth.
3. `src/engine/body-mechanics.ts` adapts the existing `CompilationContext` and actual shot posture/mode, with no hidden modification of user choices. `src/compiler/validate.ts` blocks confirmed invalid states. `src/compiler/render.ts` emits a small immutable `body_mechanics_v21` unit after the existing body-pose physics section. Inconclusive states remain usable and do not claim exact unsupported geometry.
4. `src/features/body-mechanics/BodyMechanicsSelector.tsx` presents a compact Arabic RTL status, a phone-hand control, a body-support control, and an optional disclosure for feet visibility and free-hand tasks. Corrections are *proposed*, never applied without a click. App reset restores the previous default configuration and leaves the PWA/reference image systems intact.
5. `scene-specification.ts` includes both normalized user choices and the canonical derived state. `api/generate-main-prompt.ts` independently recomputes the state using the same pure rules and canonical shot map; it rejects invalid support, camera/shot/posture disagreement, altered contacts or statuses and rewritten immutable physical units **before contacting Gemini**. The legacy immutable-unit fallback behavior stays in place.
6. Ghalyon and Image Prompt Auditor V8 continue to use the effective V1 lighting selection. Their scene brief now includes the validated body-mechanics description. They remain optional freeform text optimizers, not trusted state authorities.

## Contact rules

- Standing: at least one supporting foot contacts the existing floor. The center of mass is not numerically calculated.
- Seated bed: pelvis has mattress support and qualitative depression; thigh contact is estimated, not measured. Feet may be outside frame.
- Seated floor: pelvis contacts floor/rug; no mattress compression absent independently selected bed contact.
- Reclined, supine, prone and side-lying: body support produces mattress contacts at qualitatively relevant torso/pelvis zones. Pillow compression is allowed only for named shots with actual pillow contact; the selected forearm-pillow shot compresses the pillow beneath the forearm, not an invented cheek contact.
- Self-held front/rear and mirror captures: one actual gripping hand, one connected shoulder/elbow/wrist chain. Unspecified hands remain unassigned, rather than silently choosing left/right. Named shot-specific left/right constraints are checked.
- Timer: the phone has a physical support and the person holds no recording phone. Selected free-hand actions are represented as explicit contact relations where named shots establish them.
- Hidden/out-of-crop feet: preserve physical support without claiming coordinates. Unknown posture/support may return `NEEDS_INFORMATION`, not an invented contact or automatic rejection.

## V1 non-regression

Neither V2.1 mechanics rules nor their UI update `nightLightingId` or `phoneOnlyIlluminationMode`. The two strict modes `DARK_ROOM_REAR_FLASH_ONLY` and `DARK_ROOM_FRONT_SCREEN_ONLY` still derive the sole permitted rear LED and screen emitters respectively. Passive reflected light is allowed; added emitters remain forbidden.

## Validation and limitations

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. CI additionally smoke-tests the Node 24 native ESM import of the serverless Gemini route. V2.1 adds 98-shot posture parity, body-contact tests, client/server API tamper tests, and RTL validation/correction tests.

This is a rules-based qualitative validator. It **does not** claim image pixel inspection, calibrated mirror ray tracing, real 3D mass distribution, joint-angle solving, elastic material simulation, exact force fields, or undetectable AI photography. It cannot prove reference-image details that the text route has never seen. Server rules verify normalized input, not cryptographic identity or an authenticated scene; the existing fingerprint is not an authorization signature. Unknown external geometry and unseen body parts remain uncertain, rather than fabricated. No complete clothing simulation was added.
