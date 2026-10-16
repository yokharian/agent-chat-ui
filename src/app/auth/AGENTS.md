# src/app/auth/ — Auth Pages (/auth/*)

**Score:** 12 | Distinct domain: Cognito auth route screens

## OVERVIEW

Real `/auth/*` URL segment (no parenthesized route groups in this repo) with a shared layout mounting `AuthProvider`; each page is a thin `"use client"` wrapper around a form component from `src/components/`.

## STRUCTURE

```
src/app/auth/
├── layout.tsx                # server component; mounts AuthProvider for all /auth/* routes
├── login/page.tsx            # LoginForm
├── sign-up/page.tsx          # SignUpForm
├── sign-up-success/page.tsx  # confirmation screen
├── confirm-sign-up/page.tsx  # email verification code entry
├── forgot-password/page.tsx  # ForgotPasswordForm
├── update-password/page.tsx  # UpdatePasswordForm (exports force-dynamic)
└── error/page.tsx            # auth error display (React.Suspense-wrapped)
```

## WHERE TO LOOK

| Flow               | Page                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| Login              | `login/page.tsx` → `LoginForm`                                       |
| Signup             | `sign-up/page.tsx` → `SignUpForm`                                    |
| Email verification | `confirm-sign-up/page.tsx` (code entry + resend)                     |
| Forgot password    | `forgot-password/page.tsx` → `ForgotPasswordForm`                    |
| Reset password     | `update-password/page.tsx` → `UpdatePasswordForm`                  |
| Errors             | `error/page.tsx`                                                     |

## CONVENTIONS

- `layout.tsx` mounts `AuthProvider` so all children have `useAuth`
- All pages are `"use client"`; only `confirm-sign-up` and `update-password` also export `dynamic = "force-dynamic"`
- Forms call `useAuth` actions and render returned `{ error }` — never throw
- Turnstile captcha (`useTurnstileToken`) on login / sign-up / forgot-password forms + the Gate guest button — not update-password
- `error/page.tsx` is the only page wrapping content in `React.Suspense`
- `confirm-sign-up` reads `username` + `code` from form (not searchParams)
