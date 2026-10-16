# src/components/thread/ — Core Chat Surface

**Score:** 27 | Distinct domain: LangGraph streaming chat UI

## OVERVIEW

Main chat interface: streaming messages, artifacts, multimodal previews, history, and human-in-the-loop agent inbox for interrupts.

## STRUCTURE

```
src/components/thread/
├── index.tsx                 # Thread (548 lines) — main entry, renders messages + input
├── artifact.tsx              # ArtifactProvider, useArtifact, ArtifactContent, ArtifactTitle
├── markdown-text.tsx         # Markdown + math (KaTeX) + syntax highlighting (markdown-styles.css)
├── MultimodalPreview.tsx      # image/file previews (PascalCase naming exception)
├── ContentBlocksPreview.tsx  # multimodal content-block previews (PascalCase exception)
├── syntax-highlighter.tsx    # Code blocks with line numbers
├── tooltip-icon-button.tsx
├── utils.ts                  # getContentString — multimodal content → text summary
├── messages/                 # message renderers
│   ├── ai.tsx                # AssistantMessage(+Loading) — streaming + interrupt routing
│   ├── human.tsx             # HumanMessage
│   ├── tool-calls.tsx        # ToolCalls + ToolResult
│   ├── shared.tsx            # BranchSwitcher, CommandBar, ContentCopyable
│   └── generic-interrupt.tsx
├── history/
│   └── index.tsx             # ThreadHistory (sidebar)
└── agent-inbox/              # human-in-the-loop (see agent-inbox/AGENTS.md)
```

## WHERE TO LOOK

| Task                      | Location                                        |
| ------------------------- | ----------------------------------------------- |
| Main chat render + input  | `index.tsx`                                     |
| Streaming message render  | `messages/ai.tsx` (AssistantMessage, AssistantMessageLoading) |
| Tool calls / results      | `messages/tool-calls.tsx`                       |
| Artifacts (files, images) | `artifact.tsx`                                  |
| History sidebar           | `history/index.tsx`                             |
| Human-in-the-loop         | `agent-inbox/`                                  |

## CONVENTIONS

- `index.tsx` = main entry (548 lines); TODO: move `prevMessageLength` ref into `useStream`
- `useStreamContext` from `@/providers/Stream` for streaming state
- Interrupts render in `messages/ai.tsx`: `isAgentInboxInterruptSchema` → agent-inbox `ThreadView`, else `GenericInterruptView` (`messages/generic-interrupt.tsx`)
- `useThreads` from `@/providers/Thread` for thread list
- `authFetch` from `@/lib/auth-fetch` for all backend calls
- `cn()` from `@/lib/utils` for classes
- `AssistantMessageLoading` renders streaming; `AssistantMessage` renders complete; `parseAnthropicStreamedToolCalls` rebuilds tool calls from Anthropic streamed content
- Messages with `do-not-render-` id prefix are filtered before render; README pairs the prefix with the `langsmith:do-not-render` model tag

## ANTI-PATTERNS

- `index.tsx` (548 lines) + `agent-inbox/components/inbox-item-input.tsx` (499) are refactor candidates; TODO at `index.tsx:194` — the `prevMessageLength` ref belongs in `useStream`
- Never render `do-not-render-` messages; never bypass the interrupt schema guard
