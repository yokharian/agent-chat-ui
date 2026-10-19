# PROJECT KNOWLEDGE BASE

**Generated:** 2026-10-16T03:30:53Z
**Commit:** 43d91a6
**Branch:** vehicle-sales-agent

## OVERVIEW

Next.js 16 (React 19) statically-exported chat UI for LangGraph agents (vehicle-sales-agent fork). Auth via AWS Amplify Gen2 (Cognito), streaming via @langchain/langgraph-sdk, UI with shadcn/ui + Tailwind v4. Deployed to AWS Amplify Hosting via the GitHub Actions manual deployment API.

## STRUCTURE

```
agent-chat-ui/
├── .github/workflows/  # ci.yml (main/PRs: format+lint+codespell) + deploy.yml (this branch → Amplify API)
├── scripts/            # use-typescript6.cjs — shims "typescript" → "@typescript/typescript6" for lint
├── src/
│   ├── app/            # App Router: page.tsx + auth/ (real /auth/* segment — NOT a route group)
│   ├── components/     # auth forms + gate; thread/ (chat), ui/ (shadcn), icons/
│   ├── hooks/          # useCurrentUserName, useCurrentUserImage, useMediaQuery
│   ├── lib/            # auth-fetch, agent-inbox-interrupt, ensure-tool-responses, multimodal-utils, safe-next-path, utils
│   └── providers/      # Auth, Stream, Thread, client (LangGraph SDK)
├── amplify_outputs.json  # Amplify Gen2 config (Cognito + AppSync)
├── amplify.yml           # legacy build spec; deploys go through GH Actions
├── package.json          # pnpm 10.5.1, Next 16.3.8, React 19
└── AGENTS.md             # this file (CLAUDE.md is a 1-line `@AGENTS.md` pointer)
```

Nested knowledge files: `AGENTS.md` companions under `src/`, `src/app/auth/`, `src/components/`, `src/components/thread/`, `agent-inbox/`, `agent-inbox/components/`, `ui/`, `providers/` (tracked; a deeper file wins over this root file on conflict).

## WHERE TO LOOK

| Task                                              | Location                                                                                                                                              | Notes                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Auth flows (login, signup, guest, password reset) | `src/providers/Auth.tsx`, `src/app/auth/`, `src/components/{login-form,sign-up-form,forgot-password-form,update-password-form,gate,guest-banner}.tsx` | Amplify/Cognito; actions return `{error}` — never throw                         |
| LangGraph streaming + threads                     | `src/providers/Stream.tsx`, `src/providers/Thread.tsx`, `src/components/thread/`                                                                      | `authFetch` injects Cognito token — see `src/components/thread/AGENTS.md`       |
| Agent-inbox (human-in-the-loop)                   | `src/components/thread/agent-inbox/`                                                                                                                  | interrupt handling, decision reviews — see its AGENTS.md                        |
| UI primitives                                     | `src/components/ui/`                                                                                                                                  | shadcn/ui new-york, Radix + Tailwind v4 — primitives-only rule                  |
| Auth API wrapper                                  | `src/lib/auth-fetch.ts`                                                                                                                               | injects Cognito access token; used by Stream + Thread                           |
| Build / deploy                                    | `.github/workflows/deploy.yml` (`amplify.yml` is legacy)                                                                                              | push to vehicle-sales-agent → build → zip → Amplify create/start-deployment API |
| Config                                            | `amplify_outputs.json`, `next.config.mjs`, `tsconfig.json`                                                                                            | Static export (`output: "export"`), Cognito us-east-1                           |
| Interrupt schema guard                            | `src/lib/agent-inbox-interrupt.ts`                                                                                                                    | `isAgentInboxInterruptSchema` — routes ThreadView vs GenericInterruptView       |
| Tool-response pairing + hidden ids                | `src/lib/ensure-tool-responses.ts`                                                                                                                    | `ensureToolCallsHaveResponses` + `DO_NOT_RENDER_ID_PREFIX`                      |
| Multimodal messages                               | `src/lib/multimodal-utils.ts` + `thread/{MultimodalPreview,ContentBlocksPreview}.tsx`                                                                 |                                                                                 |

## CODE MAP

Refs = files importing the symbol (regex-measured 2026-10-16).

| Symbol                                | Type         | Location                           | Refs    | Role                                             |
| ------------------------------------- | ------------ | ---------------------------------- | ------- | ------------------------------------------------ |
| `cn`                                  | function     | `src/lib/utils.ts`                 | 27      | clsx + tailwind-merge                            |
| `useAuth` / `AuthProvider`            | hook/context | `src/providers/Auth.tsx`           | 10      | Cognito session + all auth actions               |
| `useStreamContext` / `StreamProvider` | hook/context | `src/providers/Stream.tsx`         | 6       | typed `useStream` wrapper, `StateType`           |
| `useThreads` / `ThreadProvider`       | hook/context | `src/providers/Thread.tsx`         | 2       | thread list state                                |
| `authFetch`                           | function     | `src/lib/auth-fetch.ts`            | 2       | bearer-token fetch chokepoint (HTTP + SSE)       |
| `createClient`                        | function     | `src/providers/client.ts`          | 1       | LangGraph SDK client factory                     |
| `Thread`                              | component    | `src/components/thread/index.tsx`  | 1       | main chat surface (548 lines)                    |
| `ThreadView`                          | component    | `thread/agent-inbox/index.tsx`     | 1       | HITL interrupt UI (used by `messages/ai.tsx`)    |
| `Gate`                                | component    | `src/components/gate.tsx`          | dynamic | `dynamic(..., { ssr: false })` in `app/page.tsx` |
| `isAgentInboxInterruptSchema`         | function     | `src/lib/agent-inbox-interrupt.ts` | 1       | interrupt payload type guard                     |
| `ensureToolCallsHaveResponses`        | function     | `src/lib/ensure-tool-responses.ts` | 1       | synthesizes hidden tool responses                |

## CONVENTIONS

- **Static export only**: `output: "export"` in `next.config.mjs` — no server runtime, no middleware, no API routes
- **File naming**: kebab-case; exceptions: PascalCase `thread/{ContentBlocksPreview,MultimodalPreview}.tsx`, camelCase `hooks/useMediaQuery.tsx`
- **Exports**: named for components/hooks; default for route pages; no barrel exports
- **Imports**: `@/*` → `src/*`; direct paths for local (`../ui/button`); no barrels
- **Auth actions**: return `{ error: string \| null }` — never throw; `authFetch` injects the Cognito bearer for all SDK calls
- **State**: React Context + hooks only; Nuqs for URL state (`threadId`, `hideToolCalls`) with `NuqsAdapter` in `app/layout.tsx`
- **Styling**: Tailwind v4 (HSL CSS variables), shadcn/ui "new-york" (`components.json`: `rsc: false`), `cn()` for class merging
- **Lint**: ESLint 10 flat config; `no-explicit-any: off`; hook rules warn; Prettier `singleAttributePerLine: true`
- **Package manager**: pnpm 10.5.1; `NODE_OPTIONS='--require ./scripts/use-typescript6.cjs'` for lint

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** use `on_chat_model_stream` for models tagged `langsmith:nostream` (README)
- **NEVER** render messages whose id is prefixed `do-not-render-` (README; filtered in `thread/index.tsx`)
- **NEVER** throw from auth actions — always return `{ error }`
- **NEVER** assume pre-Next-16 conventions; read `node_modules/next/dist/docs/` first (block at file end)
- **NO** server components at runtime (static export); `ssr: false` for dynamic imports like Gate
- **NO** external state stores (Redux/Zustand) — pure React Context
- **NO** `any` — ESLint `no-explicit-any` disabled but avoid anyway
- **NO** barrel exports — direct imports only
- **DO NOT** reintroduce an API-passthrough proxy — this fork is SSG + Amplify; the unused `langgraph-nextjs-api-passthrough` dependency was removed in v1.0.0

## UNIQUE STYLES

- `DO_NOT_RENDER_ID_PREFIX = "do-not-render-"` (`lib/ensure-tool-responses.ts`); ids with the prefix never render — README pairs it with the `langsmith:do-not-render` model tag
- `ensureToolCallsHaveResponses` fabricates `do-not-render-` tool messages so unanswered AI tool_calls don't break state
- `authFetch` single chokepoint for both HTTP and SSE (LangGraph SDK `callerOptions.fetch`); token resolves registered pool first, then guest pool
- Guest flow: "Continue as guest" registers + signs the user into the **guest user pool** (IDs in `amplify_outputs.json` custom payload; pool config in `src/lib/auth-config.ts`); auto-confirmed by the backend's guest pre-sign-up trigger; convert via `updateUserAttributes({ email })` (guest banner)
- Provider composition on `app/page.tsx`: `AuthProvider > Suspense > (WelcomeDialog | Gate > ThreadProvider > StreamProvider > ArtifactProvider > Thread)`
- Interrupts route in `messages/ai.tsx`: `isAgentInboxInterruptSchema` → agent-inbox `ThreadView`, else `GenericInterruptView`
- `prevMessageLength` ref workaround in `thread/index.tsx` (TODO at L194: move into `useStream`)

## COMMANDS

```bash
pnpm dev          # next dev
pnpm build        # next build → static out/ (needs NEXT_PUBLIC_API_URL + NEXT_PUBLIC_ASSISTANT_ID)
pnpm start        # next start
pnpm lint         # eslint with TS6 shim
pnpm lint:fix     # eslint --fix
pnpm format       # prettier --write .
pnpm format:check # prettier --check .
# CI: push to main / PRs → format + lint + codespell (no build/typecheck job)
# Deploy: push to vehicle-sales-agent → GH Actions build → zip → Amplify create/start-deployment API
```

## NOTES

- `tsconfig.tsbuildinfo` (2.2MB) is a tracked generated build cache (`incremental: true`) — candidate for removal + gitignore
- Stale config references: tsconfig `include` paths (`src/hooks/use-threads`, `src/app/thread/[threadId]`); tailwind content globs (`index.html`, `agent/`)
- No test script despite `@playwright/test` dep; CI lacks build/typecheck job
- Hotspots: `thread/index.tsx` 548, `agent-inbox/components/inbox-item-input.tsx` 499, `thread-actions-view.tsx` 423, `providers/Auth.tsx` 349, `state-view.tsx` 303
- Amplify `amplify.yml` is legacy; primary deploy via `.github/workflows/deploy.yml` (GH Actions → Amplify API)
- Amplify `amplify_outputs.json` contains Cognito us-east-1 config + AppSync GraphQL endpoint + `Todo` model (tracked despite a `.gitignore` entry)
- `welcome-dialog.tsx` in `ui/` violates the primitives-only convention; `CLAUDE.md` is a 1-line `@AGENTS.md` pointer
- `next dev` re-adds the nextjs-agent-rules block at file end — keep it in diffs
- `generate/` holds only Amplify backend `node_modules/`; `skills-lock.json` pins Supabase agent skills (legacy — `deploy.yml` injects no Supabase envs since fb1df2a)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
