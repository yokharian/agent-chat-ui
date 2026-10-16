# src/providers/ — React Context Providers

**Score:** 14 | Distinct domain: app-wide state (auth, streaming, threads)

## OVERVIEW

Four providers for app-wide state: Amplify/Cognito auth, LangGraph streaming, thread list, and LangGraph SDK client factory.

## STRUCTURE

```
src/providers/
├── Auth.tsx       # AuthProvider + useAuth (Cognito session, signIn/signUp/guest/resetPassword)
├── Stream.tsx     # StreamProvider + useStreamContext (LangGraph useStream wrapper)
├── Thread.tsx     # ThreadProvider + useThreads (thread list state)
└── client.ts      # createClient (LangGraph SDK client factory)
```

## WHERE TO LOOK

| Provider     | Purpose                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `Auth.tsx`   | `AuthProvider` mounts in `app/auth/layout.tsx` + `app/page.tsx`; `useAuth` used 10×                   |
| `Stream.tsx` | `StreamProvider` mounts in `app/page.tsx`; `useStreamContext` used 6× (thread, messages, agent-inbox) |
| `Thread.tsx` | `ThreadProvider` mounts in `app/page.tsx`; `useThreads` used 2× (history, Stream)                     |
| `client.ts`  | `createClient` — LangGraph SDK factory used by Stream + Thread providers                              |

## CONVENTIONS

- Each provider = single file, exports `XProvider` + `useX` hook
- Hooks throw when used outside their provider; Auth context defaults `null`, Stream/Thread default `undefined`
- `Auth.tsx`: Amplify.configure in useEffect; Hub listener for auth events; all actions return `{ error }`
- `Stream.tsx`: wraps `@langchain/langgraph-sdk/react` `useStream`; typed `StateType` with UI messages
- `Thread.tsx`: thread list state via `client.threads.search`; `Stream.tsx` owns `useQueryState("threadId")` via Nuqs and refetches threads when the id changes
- `client.ts`: thin factory; `authFetch` injected at call site
- Only `Auth.tsx` carries `"use client"` — Stream/Thread/client are client-side via import graph
- `StreamProvider` throws without `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_ASSISTANT_ID`; `/info` health check toasts on connect failure
- Guest sessions are fabricated locally (`guest_${Date.now()}`, `custom:is_guest` attribute, no access token) — NOT Cognito Identity Pool
- Composition in `app/page.tsx`: `AuthProvider` → `ThreadProvider` → `StreamProvider` → `ArtifactProvider` → `Thread` (behind `Gate`; `WelcomeDialog` shows first)
