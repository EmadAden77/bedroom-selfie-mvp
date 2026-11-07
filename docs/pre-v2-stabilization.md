# Pre-V2 stabilization — V1 verified baseline

This pass changes verification reliability and closes reproducible V1 output safety defects. It does not add any Physical Reality Engine V2 functionality.

## Reproducible checks

- `npm ci --no-audit --no-fund` installs from committed `package-lock.json` rather than resolving floating package versions on each CI run.
- `npm run typecheck` invokes actual `tsc --noEmit`.
- `npm test` invokes actual `vitest run`. `npm run test:vitest` remains as a compatibility alias.
- `npm run check:source` runs the previous auxiliary text/brace checker. It is **not** a TypeScript checker.
- `npm run test:static` runs the previous source-text assertions. It is **not** behavioral coverage.
- `npm run build` runs the production Vite build.
- GitHub Actions uses Node 24, checkout/setup-node v5, an npm cache keyed to the lockfile, and the commands above.

## V1 strict-mode audit

`src/engine/physical-reality.ts` remains the shared local source of effective emitters. The saved selection `nightLightingId` is not changed by phone-only modes. The local compiler renders the effective lighting, while the immutable Gemini scene specification records the same effective lighting and strict mode. The server editor rejects conflicting capture and lighting combinations.

Ghalyon and Image Prompt Auditor V8 are optional, freeform text editors, not the authoritative scene compiler. Their scene context uses effective lighting. A bounded, explicit-emitter-claim check now rejects outputs stating an additional active room/studio source in a strict mode before displaying/copying/adopting those outputs through the application.

Regression suites cover strict flash/screen exclusivity, preserved lighting when modes change, camera conflicts, explicit correction, reset, room/garment continuity, front/rear Gemini contracts, unknown window exposure warnings and auxiliary output rejection.

## Known limits and risks (not claimed fixed)

1. The auxiliary freeform output check detects **explicit positive claims** of known unauthorized emitters, not every semantic paraphrase. A text model could still formulate an unrecognized contradictory lighting statement; generated images still require inspection. Standalone API endpoints are not an authenticated physical scene authority.
2. Real ray tracing, 3D measured geometry, phone screen radiometry, material spectral response and body-contact forces are not available. The local engine retains estimated/unknown classification and flags an uncovered window as uncertain rather than inventing its actual external illumination.
3. The local/spec integrity fingerprint is deterministic but is **not cryptographic authentication**. The Gemini route verifies structural capture/source invariants and approved immutable units, not proof that a scene originated from a trusted browser. Full server recompilation is outside this stabilization scope.
4. React RTL composition, reference uploads, PWA service workers and existing mirror/clothing/room modules were intentionally not redesigned. Freeform Ghalyon/V8 authored output is distinct from immutable Gemini-editor output.

Do not start V2 until this branch passes GitHub Actions and is merged with review.
