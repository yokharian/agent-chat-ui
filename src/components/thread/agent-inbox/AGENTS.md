# src/components/thread/agent-inbox/ — Human-in-the-Loop Interrupts

**Score:** 24 | Distinct domain: HITL decision reviews + edits

## OVERVIEW

Handles LangGraph interrupts for human review: decision types, state views, thread actions, inbox item input with editing.

## STRUCTURE

```
src/components/thread/agent-inbox/
├── index.tsx                 # ThreadView — tabbed container + StateView side panel
├── types.ts                  # DecisionType, Action, ActionRequest, ReviewConfig, HITLRequest, Decision, DecisionWithEdits, Email, ThreadValues, ThreadData, ThreadStatusWithAll, SubmitType, AgentInbox
├── utils.ts                  # prettifyText, isArrayOfMessages, baseMessageObject, unknownToPrettyDate, createDefaultHumanResponse, buildDecisionFromState, haveArgsChanged
├── components/
│   ├── inbox-item-input.tsx  # (499 lines) decision editing + review
│   ├── state-view.tsx        # StateView / StateViewObject (JSON tree)
│   ├── thread-actions-view.tsx # ThreadActionsView (action list)
│   ├── thread-id.tsx         # ThreadIdTooltip / ThreadIdCopyable
│   └── tool-call-table.tsx   # ToolCallTable
├── hooks/
│   └── use-interrupted-actions.tsx # useInterruptedActions (manages interrupt state)
```

## WHERE TO LOOK

| Task                 | Location                                      |
| -------------------- | --------------------------------------------- |
| Main container       | `index.tsx` → `ThreadView`                    |
| Decision editing     | `components/inbox-item-input.tsx` (499 lines) |
| State visualization  | `components/state-view.tsx`                   |
| Action list          | `components/thread-actions-view.tsx`          |
| Thread ID display    | `components/thread-id.tsx`                    |
| Tool call table      | `components/tool-call-table.tsx`              |
| Interrupt state hook | `hooks/use-interrupted-actions.tsx`           |
| Types                | `types.ts`                                    |
| Helpers              | `utils.ts`                                    |

## CONVENTIONS

- `index.tsx` exports `ThreadView` (tabbed multi-interrupt container); `useInterruptedActions` is consumed by `ThreadActionsView`, not here
- `inbox-item-input.tsx` (499 lines) = largest sub-component; handles edit/confirm/cancel
- `use-interrupted-actions.tsx` manages interrupt queue + human responses
- Types in `types.ts` mirror LangGraph HITL schema
- `buildDecisionFromState` / `haveArgsChanged` in `utils.ts` for edit tracking
- `SubmitType = DecisionType`: `approve` / `edit` / `reject` — there is no `retry`
- `ThreadValues` models the vehicle-sales inbox state (`email`, `triage { logic, response }`, `messages`) — domain types live inside UI types here
- ThreadView renders only when `isAgentInboxInterruptSchema` passes (`src/lib/agent-inbox-interrupt.ts`) and the message is last / no AI or tool messages follow (checked in `messages/ai.tsx`)
