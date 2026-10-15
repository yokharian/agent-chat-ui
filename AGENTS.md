# PROJECT KNOWLEDGE BASE

**Generated:** 2026-10-15T15:30:00Z
**Commit:** 357290d
**Branch:** vehicle-sales-agent

## OVERVIEW

Next.js 16 (React 19) statically-exported chat UI for LangGraph agents. Auth via AWS Amplify Gen2 (Cognito), streaming via @langchart/langgraph-sdk, UI with shadcn/ui + Tailwind v4. Deployed to AWS Amplify Hosting via GitHub Actions.

## STRUCTURE

```
agent-chat-ui/
├── .github/workflows/  # CI (format/lint/spelling) + Deploy (Amplify)
├── src/
│   ├── app/            # App Router: page + auth route group
│   ├── components/     # UI + thread (core) + agent-inbox (interrupts)
│   ├── hooks/          # useCurrentUserName, useCurrentUserImage, useMediaQuery
│   ├── lib/            # authFetch, utils, multimodal, safe-next-path
│   └── providers/      # Auth, Stream, Thread, client (LangGraph SDK)
├── amplify_outputs.json  # Amplify Gen2 config (Cognito + AppSync)
├── amplify.yml           # Amplify build (legacy; deploy uses GH Actions)
├── package.json          # pnpm 10.5.1, Next 16.3.8, React 19
└── AGENTS.md             # this file
```

## WHERE TO LOOK

| Task                                              | Location                                                                                                                                              | Notes                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Auth flows (login, signup, guest, password reset) | `src/providers/Auth.tsx`, `src/app/auth/`, `src/components/{login-form,sign-up-form,forgot-password-form,update-password-form,gate,guest-banner}.tsx` | Amplify/Cognito; return `{error}` not throw           |
| LangGraph streaming + threads                     | `src/providers/Stream.tsx`, `src/providers/Thread.tsx`, `src/components/thread/`                                                                      | `authFetch` injects Cognito token                     |
| Agent-inbox (human-in-the-loop)                   | `src/components/thread/agent-inbox/`                                                                                                                  | interrupt handling, decision reviews                  |
| UI primitives                                     | `src/components/ui/`                                                                                                                                  | shadcn/ui new-york style, Radix + Tailwind v4         |
| Auth API wrapper                                  | `src/lib/auth-fetch.ts`                                                                                                                               | injects Cognito access token; used by Stream + Thread |
| Build / deploy                                    | `.github/workflows/deploy.yml`, `amplify.yml`                                                                                                         | GH Actions → Amplify manual deployment                |
| Config                                            | `amplify_outputs.json`, `next.config.mjs`, `tsconfig.json`                                                                                            | Static export (`output: "export"`), Cognito us-east-1 |

## CODE MAP

| Symbol                                | Type         | Location                          | Refs | Role                                                     |
| ------------------------------------- | ------------ | --------------------------------- | ---- | -------------------------------------------------------- |
| `cn`                                  | function     | `src/lib/utils.ts`                | 13   | clsx + tailwind-merge                                    |
| `AuthProvider` / `useAuth`            | context/hook | `src/providers/Auth.tsx`          | 9    | Cognito session, signIn/signUp/guest/resetPassword       |
| `StreamProvider` / `useStreamContext` | context/hook | `src/providers/Stream.tsx`        | 5    | LangGraph `useStream` wrapper, typed `StateType`         |
| `ThreadProvider` / `useThreads`       | context/hook | `src/providers/Thread.tsx`        | 3    | thread list state                                        |
| `authFetch`                           | function     | `src/lib/auth-fetch.ts`           | 2    | injects Cognito bearer token; chokepoint for all traffic |
| `createClient`                        | function     | `src/providers/client.ts`         | 1    | LangGraph SDK client factory                             |
| `AuthProvider`                        | component    | `src/app/auth/layout.tsx`         | 1    | mounts auth for all /auth/* routes                       |
| `Gate`                                | component    | `src/components/gate.tsx`         | 1    | guards app: loading / login+guest / children             |
| `Thread`                              | component    | `src/components/thread/index.tsx` | 1    | main chat surface (548 lines)                            |

## CONVENTIONS

- **Static export only**: `output: "export"` in `next.config.mjs` — no server runtime, no middleware
- **File naming**: kebab-case (`login-form.tsx`, `use-current-user-name.ts`); providers PascalCase (`Auth.tsx`)
- **Exports**: named for components/hooks; default for route pages; no barrel exports
- **Imports**: `@/*` → `src/*`; direct paths for local (`../ui/button`); no barrels
- **Auth**: return `{ error: string \| null }` never throw; `authFetch` injects bearer token for all SDK calls
- **State**: React Context + hooks only (`AuthProvider`, `StreamProvider`, `ThreadProvider`); Nuqs for URL state (`threadId`)
- **Auth actions**: return `{ error: string \| null }` — never throw; `authFetch` injects bearer for all SDK calls
- **Styling**: Tailwind v4 (HSL CSS variables), shadcn/ui "new-york", `cn()` for class merging
- **Lint**: ESLint 10 flat config; `no-explicit-any: off`; hook rules warn; Prettier `singleAttributePerLine: true`
- **Package manager**: pnpm 10.5.1; `NODE_OPTIONS='--require ./scripts/use-typescript6.cjs'` for lint

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** use `on_chat_model_stream` for models tagged `langsmith:nostream` (README)
- **NEVER** render messages with id prefixed `do-not-render-` (README + `ensure-tool-responses.ts`)
- **NEVER** throw from auth actions — always return `{ error }`
- **NEVER** assume pre-Next-16 conventions; read `node_modules/next/dist/docs/` first (root AGENTS.md)
- **NO** server components at runtime (static export); `ssr: false` for dynamic imports like Gate
- **NO** external state stores (Redux/Zustand) — pure React Context
- **NO** `any` — ESLint `no-explicit-any` disabled but avoid anyway
- **NO** barrel exports — direct imports only

## UNIQUE STYLES

- `DO_NOT_RENDER_ID_PREFIX = "do-not-render-"` for hidden messages (paired with `langsmith:do-not-render` tag)
- Guest session via Cognito Identity Pool unauthenticated identities; convert via `updateUserAttributes({ email })`
- `authFetch` single chokepoint for both HTTP and SSE (LangGraph SDK `callerOptions.fetch`)
- `WelcomeDialog` → `Gate` (dynamic `ssr:false`) → providers composition on `app/page.tsx`
- `prevMessageLength` ref workaround in `thread/index.tsx` (TODO: move into `useStream`)

## COMMANDS

```bash
pnpm dev          # next dev
pnpm build        # next build → static out/
pnpm start        # next start
pnpm lint         # eslint with TS6 shim
pnpm lint:fix     # eslint --fix
pnpm format       # prettier --write .
pnpm format:check # prettier --check .
# Deploy: push to vehicle-sales-agent branch → GitHub Actions → Amplify Hosting
```

## NOTES

- TS config has stale `include` paths (`src/hooks/use-threads`, `src/app/thread/[threadId]`) — safe to clean
- No test script despite `@playwright/test` dep; CI lacks build/typecheck job
- `src/components/thread/index.tsx` (548 lines) and `inbox-item-input.tsx` (499 lines) are refactor candidates
- Amplify `amplify.yml` is legacy; primary deploy via `.github/workflows/deploy.yml` (GH Actions → Amplify API)
- Amplify `amplify_outputs.json` contains Cognito us-east-1 config + AppSync GraphQL endpoint + `Todo` model
