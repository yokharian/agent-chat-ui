# src/components/thread/agent-inbox/components/ — HITL Sub-Components

**Score:** 11 | Distinct domain: decision editing + state visualization + action list

## OVERVIEW

Sub-components for human-in-the-loop interrupt handling: decision editing, state visualization, action list, thread ID display, and tool call table.

## STRUCTURE

```
src/components/thread/agent-inbox/components/
├── inbox-item-input.tsx   # (499 lines) decision edit/confirm/cancel UI
├── state-view.tsx         # StateView / StateViewObject (recursive JSON tree)
├── thread-actions-view.tsx # ThreadActionsView (action list; owns useInterruptedActions)
├── thread-id.tsx          # ThreadIdTooltip / ThreadIdCopyable
└── tool-call-table.tsx    # ToolCallTable (renders a single ToolCall)
```

## WHERE TO LOOK

| Component                 | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `inbox-item-input.tsx`    | (499 lines) main decision editing UI — approve/edit/reject        |
| `state-view.tsx`          | `StateView` / `StateViewObject` — recursive object/array renderer |
| `thread-actions-view.tsx` | `ThreadActionsView` — action list; owns `useInterruptedActions`   |
| `thread-id.tsx`           | `ThreadIdTooltip` (hover) + `ThreadIdCopyable` (click to copy)    |
| `tool-call-table.tsx`     | `ToolCallTable` — renders a single `ToolCall`                     |

## CONVENTIONS

- `inbox-item-input.tsx` (499 lines) = largest; handles edit/confirm/cancel flow
- `state-view.tsx` recursive; handles primitives, objects, arrays, null
- `thread-actions-view.tsx` owns `useInterruptedActions` (submit/resume) + `getDecisionStatus` / `getActionTitle` helpers
- `thread-id.tsx` tooltip on hover, copy on click
- `ToolCallTable` takes a single `toolCall` prop
- None of the files carry `"use client"` — client-side via import graph
- Types from `../types.ts` (`Action`, `Decision`, `DecisionWithEdits`, `ReviewConfig`, etc.)
- Utils from `../utils.ts` (`buildDecisionFromState`, `haveArgsChanged`, `prettifyText`)
