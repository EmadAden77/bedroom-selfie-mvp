# Physical Reality Engine V2.2 — contact-driven bedding

## Verified baseline

Starting `main`: `1a1e998a097416c01cf267ce44972f70c8d2d922` (V2.1 PR #51). Its GitHub Actions run `42404599187` passed: `npm ci`, `tsc --noEmit`, `vitest run` (**1,587** passing tests in 32 files), production Vite build and the Node 24 native TypeScript serverless import smoke test.

## Deterministic state and integration

- `shared/bedding-physics.ts` is a pure rules-based derivation of a stable bed stack: `bed.frame`, `bed.mattress`, `bed.pillow`, `bed.sheet`, `bed.blanket`. It consumes the **actual canonical `BodyMechanicalState`** from V2.1; it does not create a competing posture engine.
- `src/engine/bedding-physics.ts` adapts existing `CompilationContext` to the shared derivation.
- `BeddingSelection` preserves explicit `sheet`, `pillow` and `blanket` choices. Default `reference` means **not verified by this text route**, not a fabricated bedcover. The three selectors are optional and contained in an Arabic RTL disclosure.
- `BeddingState` contains typed object presence/anchors/visibility, a deterministic causal contact graph, qualitative mattress/pillow/textile responses, stable issue codes and uncertainty markers. Pressure/deformation follows established load-bearing body contacts only; a visually overlapping surface is not an asserted contact.
- The local compiler validates definite conflicts, then renders one immutable `bedding_physics_v22` unit. Unknown textile presence does not block normal poses. The existing V2.1 mechanical section remains unchanged.
- `scene-specification.ts` carries both the exact user selection and derived bedding graph. `api/generate-main-prompt.ts` independently recomputes bedding from the *already revalidated* V2.1 body state using the shared TypeScript code; it rejects forged responses, statuses, objects, invalid selected arrangements, and changed immutable bedding prose before Gemini. It retains the local fallback and constrained editor architecture.
- The auxiliary Ghalyon/V8 scene brief receives the same deterministic bedding prose, retaining its existing V1 effective light selection.

## Causal rules

| Existing physical cause | Deterministic effect |
|---|---|
| Pelvis supported by mattress | Local qualitative pelvis compression |
| Selected bed-edge pose and confirmed sheet | Edge-localized mattress depression, mild sheet tension and restrained folds |
| Torso supported by mattress while reclining | Qualitative additional torso compression |
| Pelvis seated on floor, no bed contact | No mattress compression |
| Separate elbow pressure on bed edge from floor | Only a local elbow impression |
| Confirmed head/back or forearm pressure on pillow | Compression of just the contacted pillow region |
| Free hand hugging an existing pillow | Local hand pressure, never an invented head contact |
| Confirmed sheet above mattress and confirmed body support | Sheet-mattress contact with mild contact-localized folds |
| Confirmed blanket spread on mattress | Stable placement, no unselected body coverage |
| Selected blanket contact with body | Supported draping and mild local folds |
| Pillow/blanket explicitly absent in a contact-requiring shot | Stable error and an explicit UI correction requiring approval |

The frame and the fixed bedroom anchors never relocate or deform to resolve a pose. The existing 98-shot posture mapping remains the single body-mode source. No new pillows, sheets, cushions or blankets are created by an unconfirmed photo reference. Unknown geometry, cloth placement and unseen surfaces remain unknown.

## V1/V2.1 non-regression

Both V1 exclusivity modes still derive exactly one active emitter, rear LED or phone display. Bedding selection never touches camera/light or clothing values. V2.1 hand occupancy, body support, camera posture, and crop/visual overlap remain authoritative.

## Limits

This is deterministic **qualitative** physical consistency, not a 3D material simulation, cloth solver, depth map, ray tracer, real pressure measurement or guaranteed compliance by a downstream image generator. A confirmed user-selection can stand in for a separately inspected reference, but the server **does not see the actual photograph pixels**. It can independently verify the supplied normalized facts and their effects, not cryptographically establish their origin. Underspecified bedding remains unasserted instead of guessed.

## Verification

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. GitHub Actions additionally verifies direct Node 24 import of the serverless Gemini route. Regression suites exercise contact chains, floor/standing non-contact, bed-edge effects, pillow pressure, blanket coverage, unknown and absent textiles, invalid selections, immutability, strict lighting, Gemini server tamper rejection and RTL correction consent.
