# src/components/ui/ — shadcn/ui Primitives

**Score:** 19 | Distinct domain: reusable UI primitives

## OVERVIEW

14 files: 13 shadcn/ui "new-york" primitives on Radix + Tailwind v4 (lucide icons) plus the app-specific `welcome-dialog.tsx` — the standing primitives-only violation. No other feature logic.

## STRUCTURE

```
src/components/ui/
├── avatar.tsx          # Avatar / AvatarImage / AvatarFallback
├── button.tsx          # Button / buttonVariants / ButtonProps
├── card.tsx            # Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter
├── input.tsx           # Input
├── label.tsx           # Label
├── password-input.tsx  # PasswordInput (show/hide toggle)
├── separator.tsx       # Separator
├── sheet.tsx           # Sheet / SheetTrigger / SheetContent / SheetHeader / SheetTitle / SheetDescription / SheetClose
├── skeleton.tsx        # Skeleton
├── sonner.tsx          # Toaster (toast notifications)
├── switch.tsx          # Switch
├── textarea.tsx        # Textarea
├── tooltip.tsx         # Tooltip / TooltipTrigger / TooltipContent / TooltipProvider
└── welcome-dialog.tsx  # WelcomeDialog (app-specific but in ui/)
```

## WHERE TO LOOK

| Primitive   | File                                                           |
| ----------- | -------------------------------------------------------------- |
| Buttons     | `button.tsx`                                                   |
| Cards       | `card.tsx`                                                     |
| Form inputs | `input.tsx`, `password-input.tsx`, `textarea.tsx`, `label.tsx` |
| Overlays    | `sheet.tsx`, `tooltip.tsx`                                     |
| Feedback    | `sonner.tsx` (Toaster), `skeleton.tsx`                         |
| Toggles     | `switch.tsx`                                                   |

## CONVENTIONS

- **Pure primitives only** — no feature logic, no app imports
- `welcome-dialog.tsx` VIOLATES this convention (app-specific entry modal) — MUST MOVE out of `ui/`
- Class variance via `class-variance-authority` (`buttonVariants` pattern)
- `cn()` from `@/lib/utils` for class merging
- Radix UI primitives as base (`@radix-ui/react-*`)
- Exports: named for components + variants (`Button`, `buttonVariants`, `ButtonProps`)
- `components.json`: `rsc: false`, baseColor neutral, cssVariables, iconLibrary lucide
- No `index.ts` barrel — import each primitive file directly
- Only 1 of 14 files carries `"use client"`; the rest are client-side via import graph
