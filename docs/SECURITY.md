# Security — legacy prompt-engine token

This document covers only \`api/generate-prompt.ts\` and its shared bearer-token configuration. The canonical editor remains \`api/generate-main-prompt.ts\`.

## Generate a secure secret

Run this command **locally in a trusted terminal**:

~~~bash
openssl rand -hex 32
~~~

This prints 64 hexadecimal characters generated from 32 random bytes, exceeding the server's minimum of **32 characters**. Treat the output as a password: **never commit it, paste it into tickets, upload screenshots, or include it in logs**. Do not use \`test\`, \`dev\`, \`changeme\`, or short tokens.

## Store it securely

1. In Vercel project settings, add the server-side environment variable \`PROMPT_ENGINE_ACCESS_TOKEN\` in the correct environments (Production/Preview as appropriate). Store \`GEMINI_API_KEY\` separately.
2. Do **not** put the token in \`VITE_*\`, \`NEXT_PUBLIC_*\`, or other browser-visible variables, local storage, the PWA bundle, or client source code.
3. Only a **trusted server-side caller** should send the token in the \`x-prompt-engine-access\` request header. It is a shared-service bearer credential, **not** user authentication. Any browser-exposed copy is compromised.
4. Server responses must not include either secret. Do not log their plaintext values, hashes, request headers, or full request bodies.

If \`PROMPT_ENGINE_ACCESS_TOKEN\` is missing, shorter than 32 non-space characters, or an insecure placeholder, the legacy route returns **503**. An incorrect caller token returns **401** while the per-IP quota is available.

## Rotate the secret

1. Generate a **new** value with \`openssl rand -hex 32\`; do not reuse an old token.
2. Coordinate changes to **trusted server-side callers**. The route accepts one active token only; overlapping old/new tokens are **not supported**. Plan a controlled cutover (brief 401 responses from out-of-date callers may occur).
3. Update \`PROMPT_ENGINE_ACCESS_TOKEN\` in Vercel's secure environment settings, then redeploy at a separately approved time so running instances receive the new value.
4. Switch authorized callers to the new value; verify expected 200 responses with a valid SceneSpecification, 401 with the old token, and 503 when deliberately misconfigured in a non-production test.
5. Revoke the previous credential in every secret store. If any token was exposed, rotate immediately and investigate how it leaked.

Rotating the bearer token does **not** rotate the separate Gemini provider key. Rotate \`GEMINI_API_KEY\` independently if needed.

## In-memory request quota and limitations

The legacy route allows at most **10 attempts per 60-second fixed window per IP**, returning **429** with \`Retry-After\` when exceeded. Incorrect bearer-token attempts also count. The in-memory map uses a SHA-256 digest of the client IP combined with a prefix of the token's SHA-256 digest; neither the IP nor token hash is logged. Old buckets are discarded on expiration and the map has a size cap.

**Operational caveats:** the limiter is **per warm serverless instance**, not globally synchronized across Vercel instances. Its IP attribution assumes \`x-real-ip\` / \`x-forwarded-for\` are set and sanitized by a trusted reverse proxy; never use untrusted direct-client values as an authentication mechanism. Shared NAT addresses may share a quota; distributed clients, proxy header spoofing, new instances, or instance restarts may weaken the effective limit. For strict global quotas or abuse resistance, use a trusted edge/WAF layer or centralized rate-limiting store in a separately reviewed change.

This endpoint returns **advisory hint IDs only**, not an authoritative final prompt. Keep the canonical SceneSpecification verification and final-authority gates unchanged.
