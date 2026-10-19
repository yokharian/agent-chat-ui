# Changelog

Notable changes to this fork. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-10-19

First tagged release of the vehicle-sales-agent fork of [langchain-ai/agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui). Upstream is a generic template that connects to any LangGraph server with a user-supplied API key; this fork turns it into a single-tenant, authenticated deployment for the vehicle-sales-agent.

### Differences from upstream

**Added**

- Authentication on top of AWS Amplify Gen2 (Cognito): login, sign-up with confirmation, forgot/reset password, and a "Continue as guest" flow that signs users into a separate guest user pool. Guests convert to a registered account by adding an email. Flows live in `src/app/auth/`, session logic in `src/providers/Auth.tsx`, pool configuration in `src/lib/auth-config.ts`.
- Cloudflare Turnstile protection on the sign-in and sign-up forms.
- `authFetch` (`src/lib/auth-fetch.ts`): single fetch chokepoint for LangGraph SDK HTTP and SSE requests, attaching the caller's Cognito access token; the LangGraph deployment validates it with a Cognito JWT authorizer.
- Deployment pipeline (`.github/workflows/deploy.yml`): GitHub Actions builds the static export and publishes it to AWS Amplify Hosting via the deployment API on every push to `vehicle-sales-agent` (production: <https://vsa.demo.yokharian.dev/>).
- Welcome dialog with member/guest sign-in choice, current-user avatar, guest banner.
- Dependabot version updates with an auto-merge workflow for grouped minor-and-patch bumps; major bumps stay manual.
- `AGENTS.md` knowledge base for coding agents.

**Changed**

- README rewritten to document this fork; environment variables are the only configuration (upstream's setup form and URL-query configuration were removed).
- The app is a static export (`output: "export"`) with no server runtime.

**Removed**

- The API passthrough route (`src/app/api/[..._path]/route.ts`) and the LangSmith API key flow (`src/lib/api-key.tsx`) — clients talk to the LangGraph deployment directly with their Cognito token.
- The `langgraph-nextjs-api-passthrough` dependency — unused since the passthrough route was deleted.
- File upload support and the "Open in Studio" debug button.

**Upstream baseline**

- Forked from upstream `cf72cb0`; upstream's dependabot group bump (#325) is merged into branch history. At release time upstream is 3 commits ahead (major version bumps, intentionally deferred for manual review).
- The fork's own Dependabot auto-merge pipeline ran live before tagging: grouped bump #4 (28 updates) merged itself into `vehicle-sales-agent`.
- A Supabase authentication phase was rolled back to Amplify/Cognito in `43d91a6`.

**Known limitations**

- CI runs prettier, ESLint and codespell only — there is no build/typecheck job; deploy runs are the build gate.
