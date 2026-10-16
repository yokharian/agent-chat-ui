# src/components/ — Shared + Feature Components

**Score:** 13 (direct files) | Distinct domain: auth UI cluster; delegates thread/ui/icons to child files

## OVERVIEW

All React components: shadcn/ui primitives (`ui/`), auth screens (root), core chat (`thread/`), and human-in-the-loop interrupt handling (`thread/agent-inbox/`).

## STRUCTURE

```
src/components/
├── current-user-avatar.tsx
├── forgot-password-form.tsx
├── gate.tsx                  # auth guard: loading / login+guest / children
├── guest-banner.tsx          # guest session → create account
├── login-form.tsx
├── logout-button.tsx
├── sign-up-form.tsx
├── turnstile-widget.tsx      # Cloudflare Turnstile captcha
├── update-password-form.tsx
├── icons/                    # github.tsx, langgraph.tsx
├── ui/                       # 14 files: 13 shadcn primitives + welcome-dialog
└── thread/                   # core chat surface (see thread/AGENTS.md)
│   ├── index.tsx             # Thread (548 lines) — main chat surface
│   ├── artifact.tsx          # ArtifactProvider + components
│   ├── markdown-text.tsx
│   ├── syntax-highlighter.tsx
│   ├── tooltip-icon-button.tsx
│   ├── utils.ts
│   ├── messages/             # ai.tsx, human.tsx, tool-calls.tsx, shared.tsx, generic-interrupt.tsx
│   ├── history/              # index.tsx
│   └── agent-inbox/          # human-in-the-loop interrupts (see its AGENTS.md)
```

## WHERE TO LOOK

| Task              | Location                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Auth screens      | root files: `login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`, `gate`, `guest-banner`, `logout-button` |
| Chat UI           | `thread/index.tsx` (main), `thread/messages/`, `thread/artifact.tsx`                                                              |
| Interrupts / HITL | `thread/agent-inbox/` (components, hooks, types, utils)                                                                           |
| UI primitives     | `ui/` — button, card, input, sheet, etc. (see ui/AGENTS.md)                                                                                  |

## CONVENTIONS

- Root auth components = kebab-case named exports
- `thread/` = feature folder with subdomains (`messages/`, `history/`, `agent-inbox/`)
- `ui/` = shadcn/ui primitives only; never feature logic — `welcome-dialog.tsx` lives there and is the standing violation (no root copy exists; used only by `app/page.tsx`)
- No barrel exports; direct imports (`@/components/ui/button` or `../ui/button`)
- `Gate` loads via `dynamic(..., { ssr: false })` in `app/page.tsx` — the repo's only dynamic import; the Suspense boundary lives there too

## ANTI-PATTERNS

- Never add feature logic or app components to `ui/`
- Forms never throw — they surface `{ error }` from `useAuth` actions
