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
