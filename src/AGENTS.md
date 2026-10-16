# src/ — Application Source Root

**Score:** 26 | Distinct domain: app entry + feature modules

## OVERVIEW

Main source directory containing App Router, feature components, hooks, lib utilities, and React Context providers. Child knowledge files: `src/app/auth/`, `src/components/`, `src/providers/` AGENTS.md.

## STRUCTURE

```
src/
├── app/              # App Router: layout.tsx (server comp) + page.tsx (client) + auth/ segment
├── components/       # UI primitives + thread (core) + agent-inbox
├── hooks/            # useCurrentUserName, useCurrentUserImage, useMediaQuery
├── lib/              # auth-fetch, agent-inbox-interrupt, ensure-tool-responses, multimodal-utils, safe-next-path, utils
└── providers/        # Auth, Stream, Thread, client (LangGraph SDK)
```

## WHERE TO LOOK

| Task                       | Location                                                       |
| -------------------------- | -------------------------------------------------------------- |
| App entry + auth routes    | `src/app/`                                                     |
| Chat UI + agent interrupts | `src/components/thread/`, `src/components/thread/agent-inbox/` |
| Auth provider + hooks      | `src/providers/Auth.tsx`, `src/providers/`                     |
| Streaming + threads        | `src/providers/Stream.tsx`, `src/providers/Thread.tsx`         |
| Auth API wrapper           | `src/lib/auth-fetch.ts`                                        |

## CONVENTIONS

- Kept flat at this level; features live in `components/`, `providers/`, `lib/`, `hooks/`
- Alias `@/*` → `src/*`; direct imports for local (`../ui/button`)
- Static export constraint applies to all code under here
- Naming mostly kebab-case; exceptions: PascalCase `thread/ContentBlocksPreview.tsx` + `MultimodalPreview.tsx`, camelCase `hooks/useMediaQuery.tsx` vs `use-current-user-*.ts`; `use-current-user-image.ts` is a `.ts` hook with `"use client"`
