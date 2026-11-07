# Bedroom Selfie MVP

Private source repository for the Subject & Clothing Prompt Preview builder.

## Import status

This initial commit preserves the source files received in `bedroom-selfie-mvp.zip`. Generated `dist/` files are excluded. The imported source is known to fail a real TypeScript check, Vite build, and Vitest collection. The original custom scripts inspect source text and do not prove that the application works.

Repairs will be prepared on a separate branch and reviewed in a draft merge request.

Scope: reference image, identity guards, hair, expressions, and clothing. Body, pose, room, lighting, and camera modules are pending.


## Ghalyon prompt optimizer

The Gemini image-prompt writer applies a Ghalyon BASIC-style intent review while preserving the existing photographic realism and physics constraints.

Within the main prompt engine, **غَليون** can also improve a raw idea or an existing generated prompt for **Gemini, ChatGPT, or Claude**. Select **AUTO**, **BASIC** (no questions), or **DETAIL** (up to three high-value questions only when essential details are missing). The result shows the optimized prompt, key improvements, and a professional tip. Adopting that result for the photo audit is an explicit action.

The app keeps the idea, answers and result only in transient React state; it does not write them to localStorage, sessions or a database. Text is transmitted to Google's Gemini API for processing, so Google's data-handling terms still apply. Requests return `Cache-Control: no-store` and the server does not log prompt contents. The existing image generation flow and independent local fallback remain available.


## Mirror Room Geometry — هندسة سيلفي مرآة الدولاب

All 15 wardrobe-mirror shots now automatically include a reference-relative room geometry layer for **both the Gemini scene brief and the separate local fallback**. From the original doorway-facing view: bed on the left wall; primary sliding wardrobe mirror on the right wall; existing dresser and separate vanity mirror to the right of the wardrobe. Standing selfie subjects face the real wardrobe mirror in the existing aisle with a reachable rear-camera handset. The user's approximate **3 m bed behind subject** and **5 m sofa background** are planning cues, not measurements extracted from pixels. The sofa is never fabricated when absent from the uploaded room photo; no furniture is repositioned to force an impossible reflection. The reflection/framing can legitimately hide objects outside its optical path. The mirror UI shows this active topology and warns when no room photo is uploaded. The Gemini server system instruction reinforces the same rules; it does not append hidden text to Gemini's final prompt.

## Natural Scene Director — مخرج المشهد الطبيعي

The main Gemini image-prompt flow and Ghalyon's photographic prompt optimization favor **activity-driven authenticity**. A deterministic, shot-aware scene director adds only plausible contact effects, small contextual details and candid camera behavior consistent with the chosen bedroom pose, laptop, mirror, existing furniture, selected clothing and real light sources. No unrelated props, beauty changes, invented skin features or new room topology are injected.

A client-side preflight flags incompatible flash/laptop-light choices before generation, with matching server-side checks in `api/generate-main-prompt.ts`. The Gemini output guard also rejects physically wrong forward-facing mirror text and extra window/lamp illumination when screen-only lighting is selected. Selected person/room references take priority; ordinary unflipped mirrors reverse text, so forward-legible lettering is not forced.

This feature does not send any reference photos to Gemini or Context7. It improves prompt consistency, but cannot guarantee that a generated image is indistinguishable from a real photograph.


## Ghalyon direct scene optimization & updated PWA navigation

Ghalyon can now optimize **the currently selected bedroom scene directly**, without first running the main Gemini writer or manually pasting a prompt: in the Ghalyon section, choose **«تحسين مشهد السيلفي الحالي مباشرةً»**. The standard **«تحسين البرومبت»** also uses the current scene when the freeform idea field is empty; typed text takes precedence. Clarifying questions preserve the exact original request. Ghalyon continues using the dedicated stateless `/api/optimize-prompt` Gemini route and returns an explicit error code for non-JSON server errors or invalid provider replies. A full scene up to 14,000 characters is accepted while server request-body bytes are limited separately.

The PWA service worker now fetches app HTML **network first** when online, refreshing new deployments rather than serving a permanently stale first-install app shell. Its cached app shell remains available offline. API calls are never handled by the service worker; existing content-hashed static assets can stay cache-first.


## Physical Room State — نظام حالة الغرفة الفيزيائية

The app now offers **physical room state** controls with the requested defaults: `clear` visible everyday clutter, `dust` limited dust, the four editable zones `bed`, `floor`, `dresser`, `nightstand`, and **sessionLocked = true**. This panel replaces the earlier binary clutter selector for new sessions; the old `bedroomClutterId` engine remains backward compatible for older compiled contexts.

- Every movable detail has a stable item ID, zone, known supporting surface and fixed position. The same selected anchors are used in Gemini's concise scene brief and the independent local prompt. Changing shot angle, posture, camera or lighting does not randomly reshuffle objects. The application **describes** this continuity but cannot guarantee that a remote image generator obeys it.
- The existing room photo remains authoritative: preserve architecture, wardrobe and separate dresser mirrors, original tiles/grout, bed, exact object identities, glossy/matte material response, reference-supplied marks and furniture positions. Do not invent lasting scratches, cracks, stains, wall damage, extra light sources or unidentified furniture.
- Selected dust is local to appropriate skirting/floor corners and visible only when actual light and crop reveal it. Bed and fabric compression occurs only under physical contact. Cables follow continuous paths with credible endpoints; slippers and other props require stable contact.
- Users can control clutter level, removable surface traces, editable zones and session continuity. **Reset to reference** clears movable additions without changing the room.
- The manual photo-result audit adds checks for tile grid, wall/surface response, object contact and inter-view consistency when this feature is active. It does not inspect the image automatically; Gemini image audit still requires explicit user consent and upload.

There is no guaranteed way to make AI-generated photographs undetectable; this feature is for physically and contextually consistent images.


## Wardrobe mirror optics and biomechanics — geometry-first strictness

All 15 wardrobe-mirror shots now share the same deterministic optical and mechanical description in the local compiler and the Gemini **scene brief**, plus a mirror-specific Gemini system constraint. The single Xiaomi 15 Ultra rear camera, rear LED where selected, front-facing screen, real hand/wrist/elbow/shoulder chain, free-hand occupancy, planar equal-angle ray path, virtual image depth, occlusion, furniture continuity, ceramic grid and exposure-dependent flash are all constrained by the selected shot. `renderLightGeometry` now derives the effective body posture from the selected shot rather than stale general pose controls.

Crucially, the floor-seated selfie has real pelvis support on the rug/floor, the bed-edge selfie compresses the mattress at actual pressure points, and standing shots rely on feet on the floor. Mirror distance presets no longer force a seated person to stand. The originally described approximately 3 m bed and 5 m sofa cues do **not** move reference furniture or override real reflected field of view; a cropped scene may simply omit distant features. The separate original dresser mirror is not a second recording surface. The rear LED stays off unless flash was explicitly selected; screen-only shots can remain underexposed rather than being automatically filled by fictional light.

These are *prompt and selection consistency* rules, not a geometric ray tracer or visual image proof. Gemini's prompt-writing route does not receive the original photo pixels and actual generated results still need visual review against the photo references. No software prompt can guarantee realism in every generated pixel or defeat image provenance/detection systems.


## IMAGE PROMPT AUDITOR & PHOTOGRAPHIC REALISM ENGINE · v8

The **🔬 IMAGE PROMPT AUDITOR — v8** section follows Gemini and Ghalyon. It performs a separate opt-in, **text-only** audit before any image generation; it does not replace or secretly modify the main writer, Ghalyon, or the independent local compiler.

**Workflow:** select current scene and room-state options, generate a prompt using Gemini/local/Ghalyon if desired, and click **تدقيق وإصلاح البرومبت — v8**. You can paste a different source prompt or leave the field empty to audit the current result or selected scene. The ChatGPT Images-targeted result contains:
1. Up to 5 concise Arabic repair notes identifying *textual* contradictions, their physical causes and specific corrections (can be empty when no conflict is established).
2. One or two lines in Arabic explaining the scene, camera profile and material/dirt assumptions.
3. One self-contained English image prompt (maximum 500 words), displayed as a code block; copy or adopt it for the existing Photo Result Audit.

Select **البرومبت فقط** to show only section C; deselect **الصورة تخصني** when auditing another person's portrait to ensure the local personal body-size defaults are never transferred to them.

**Audit order (L1–L10):** scene intent/reference scope; face, hair and body identity; anatomy and support mechanics; mutually exclusive front/mirror/supported camera profiles; light transport and corneal reflections; one physically coherent camera pipeline; skin/textile/material optics; causal dirt, surface wear and physical disorder; selective room-specific details; final conflict, crop and visibility check.

**Privacy and implementation:** `/api/audit-image-prompt` is a standalone Vercel text-only Gemini API function with origin/content-type/byte/rate checks and structured output validation. The function receives the prompt text, selected scene description, camera mode, light selection, and only booleans indicating whether face and room references were provided. It **does not** receive image pixels or claim to have inspected them. The user's own 193 cm / 83 kg body defaults are conditional on explicit own-portrait selection. The portrait and bedroom references outrank generic defaults; user-selected `roomPhysicalState` and fixed mirror/hand/lighting physics remain authoritative. A model reply exceeding 500 words or failing the A/B/C schema is rejected rather than silently treated as validated.

Text auditing cannot verify photographic pixels, guarantee identity, or guarantee an AI image is unrecognizable as generated. Use the existing post-generation image audit to evaluate the actual image separately.


## Constrained Prompt Editor — deterministic scene architecture

The main Gemini endpoint no longer writes scene content creatively. Its mandatory pipeline is:

`User Selections → compilePrompt → Validated SceneSpecification → Gemini Editor → Server validation + local reconstruction → Client independent validation → Final Prompt`

- **Single scene authority:** `src/compiler/index.ts` and `renderSections` derive immutable prompt units from selected identity, clothing, expression, posture, geometry, lighting, mirror optics, and the physical room state. The Natural Scene Director contributes its precomputed text as another immutable derived unit. All original local validators must pass before the main Gemini button is enabled.
- **Structured specification:** `src/features/ai-prompt-enhancer/scene-specification.ts` carries selected values, photograph-reference flags, user-confirmed topology, unknown/unseen details, conflicts, ordered immutable units, and a deterministic consistency fingerprint. That fingerprint detects accidental changes in transit but is **not a cryptographic authorization**; user-facing selections and the validated local compilation are the source of truth.
- **No alternate creative authorship:** `api/generate-main-prompt.ts` receives only `{sceneSpecification}`. Gemini may return the complete permutation of immutable section IDs and a grammatical revision of the short opening; only function words and punctuation may change, while the ordered substantive-word sequence and all numbers must remain unchanged. The server compares the result structurally, reassembles the final prompt **exclusively from local unit texts**, and never accepts model-authored free-form scene paragraphs. Core identity must remain first.
- **Fail closed:** missing/duplicate/unknown units, changed clothing, unwanted lights, unverified reference claims and unsafely reworded openings cause rejection. The client independently recomposes the prompt and compares it byte-for-byte against the server return. On provider, network, or validation failure, it automatically adopts the already-validated local prompt with a visible warning. No model output is silently accepted.
- **Honest limitations:** deterministic rules and the local checks can validate configuration invariants, not pixel-level image quality. Reference image bytes are never sent to the main Gemini text editor; later image generation must receive them independently. Lexical checks alone cannot prove arbitrary semantic equivalence, so **all substantive scene sections are immutable**. This intentionally restricts Gemini's rewrite freedom, prioritizing accuracy.
- **Backward compatibility:** Ghalyon remains an independent freeform text optimizer; Image Prompt Auditor v8 and the Photo Result Audit remain independent. Neither implicitly changes the selected scene context. The PWA, physical room state and standalone local fallback retain their own workflows.

The main UI now includes collapsible viewing of the validated local prompt and clearly distinguishes the final Gemini-edited, validated composition from fallback. The previous independent creative Gemini author path was intentionally replaced; no silent legacy unstructured request mode remains.

## Physical Reality Engine — incremental deterministic constraint graph

The physical-reality engine in `src/engine/physical-reality.ts` indexes the complete `CompilationContext` key set and declares dependencies or explicit independence. Enum-valued fields reuse existing option catalogs rather than maintaining independent copies. Dynamic/free-text fields are marked as non-enumerable; that **does not** imply their contents are automatically physically validated. `affectedFields()` and `evaluatePhysicalReality(ctx, changed)` support selective checks for affected options; the UI currently computes the full check as a simple, deterministic baseline.

The engine delegates capture/light conflicts, wardrobe mirror controls and physical room-state validation to their existing modules. `src/compiler/validate.ts` uses its confirmed conflicts as hard errors, blocking local compilation and consequently the constrained Gemini editor. The React panel merges legacy compiler errors as explicitly labeled migration diagnostics and displays the four possible assessments: `VALID`, `CONFLICT`, `WARNING`, `UNKNOWN`, along with affected fields, Arabic explanations and non-mutating repair suggestions. Unknown reference measurements do **not** block plausible scenes. The existing compiler retains its additional clothing, pose, camera and light validation paths during the migration.

**Explicit limitations / outstanding acceptance work:** Not every existing legacy validator has yet been converted into a structured graph rule; several garment colors/material properties are free text. Actual body kinematics, perspective ray tracing, furniture dimensions, force and light transport are not simulated. In particular, reference-image pixels are never inspected here. The `api/generate-main-prompt.ts` endpoint retains its own server-side preflight and immutable-unit guards but does **not yet** execute the full new graph, so cross-runtime parity is not established. Likewise the UI's older proactive shot/light reconciliation logic still exists and should be reviewed for explicit user consent in a later patch. Keep this PR in review until those acceptance criteria and the CI checks are addressed; it does not certify complete physical realism.
