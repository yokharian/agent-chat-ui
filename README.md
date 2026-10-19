# agent-chat-ui — vehicle-sales-agent

A fork of [langchain-ai/agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) productionized for the vehicle-sales-agent: an authenticated, statically-exported Next.js chat UI for a LangGraph server, deployed to AWS Amplify Hosting.

**Live site: <https://vsa.demo.yokharian.dev/>**

> [!NOTE]
> Upstream is a general-purpose template for chatting with any LangGraph server, configured through a setup form with a user-supplied API key. This fork is a single-tenant app for one agent deployment, with real user authentication and a fixed deployment target. See [Differences from upstream](#differences-from-upstream).

## Differences from upstream

| Area               | Upstream                                        | This fork                                                                                                |
| ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Audience           | Template for any LangGraph server               | Single app for the vehicle-sales-agent                                                                   |
| Authentication     | None; users supply a LangSmith API key          | AWS Amplify Gen2 (Cognito): login, sign-up, password reset, guest flow                                   |
| LangGraph access   | Client connects with the user's key             | `authFetch` injects the caller's Cognito token; the backend authorizes it with a Cognito JWT authorizer  |
| Configuration      | Setup form or URL query parameters              | Environment variables only                                                                               |
| Deployment         | Any static host; optional API passthrough proxy | Static export built in GitHub Actions, published to AWS Amplify Hosting on push to `vehicle-sales-agent` |
| Bot protection     | None                                            | Cloudflare Turnstile on the auth forms                                                                   |
| Dependency updates | Dependabot PRs merged manually                  | Grouped Dependabot updates; minor/patch bumps auto-merge, majors stay manual                             |

### Authentication

- Sign-in, sign-up with confirmation, and forgot/reset password flows live in [`src/app/auth/`](src/app/auth/); forms in `src/components/`, session logic in [`src/providers/Auth.tsx`](src/providers/Auth.tsx).
- **Guest flow:** "Continue as guest" registers and signs the visitor into a separate guest user pool (pool IDs ship in the custom payload of `amplify_outputs.json`; see [`src/lib/auth-config.ts`](src/lib/auth-config.ts)). Guests convert to registered users by adding an email.
- **Turnstile:** the auth forms embed a Cloudflare Turnstile challenge (site key via `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, verified by the Amplify backend).
- Every LangGraph SDK request (HTTP and SSE) goes through [`authFetch`](src/lib/auth-fetch.ts), which attaches the current Cognito access token as a bearer — registered pool first, then guest pool.

### Deployment

- Push to `vehicle-sales-agent` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): build the static export, zip it, publish to AWS Amplify Hosting via the deployment API. `amplify_outputs.json` is regenerated from the `AMPLIFY_OUTPUTS_JSON` secret at build time.
- The app is exported statically (`output: "export"` in [`next.config.mjs`](next.config.mjs)): no server runtime, middleware, or API routes — the upstream API passthrough proxy is deleted.
- CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs prettier, ESLint and codespell on PRs. There is no build/typecheck job — deploy runs are the build gate.

### Removed from upstream

- The setup/welcome input form and URL-query configuration — environment variables are required.
- The LangSmith API key flow and API passthrough route — the client talks to the LangGraph deployment directly.
- File upload support and the "Open in Studio" debug button.

### Kept from upstream

- Streaming chat, markdown/KaTeX rendering, the artifacts side panel, human-in-the-loop agent-inbox interrupts, multimodal previews, and the message-hiding hooks described in [Customizing the chat](#customizing-the-chat).

## Local development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy [`.env.example`](.env.example) to `.env` and fill in:

   | Variable                         | Purpose                                                         |
   | -------------------------------- | --------------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL`            | LangGraph deployment URL (must accept the Cognito bearer token) |
   | `NEXT_PUBLIC_ASSISTANT_ID`       | Graph/assistant ID used when submitting runs                    |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for the auth forms                |

3. Ensure `amplify_outputs.json` — the Amplify Gen2 client config generated by the backend (which lives in a separate repository) — is present.

4. Run the dev server:

   ```bash
   pnpm dev
   ```

   The app runs at `http://localhost:3000` behind the sign-in screen — every visitor signs in, either as a registered user or through the guest flow.

`pnpm build` produces the static export in `out/`; it requires `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ASSISTANT_ID` to be set.

## Releases

Versioned releases are tagged `v*` and documented in [`CHANGELOG.md`](CHANGELOG.md). [v1.0.0](https://github.com/yokharian/agent-chat-ui/releases/tag/v1.0.0) marks the first release of the fork and explains the differences from upstream in detail.

## Customizing the chat

These upstream features still work unchanged and are configured from your LangGraph backend.

### Hiding messages

To stop messages from streaming into the chat as they are generated, add the `langsmith:nostream` tag to the chat model's configuration:

```python
from langchain_anthropic import ChatAnthropic

model = ChatAnthropic().with_config(config={"tags": ["langsmith:nostream"]})
```

The message still appears after the LLM call completes if it is saved to the graph's state without further modification.

To hide a message permanently — during streaming and after it is saved — prefix its `id` with `do-not-render-` before adding it to the graph's state:

```python
result = model.invoke([messages])
result.id = f"do-not-render-{result.id}"
return {"messages": [result]}
```

The UI filters out any message whose `id` starts with this prefix. (In TypeScript, set the same tags via `.withConfig({ tags: [...] })`.)

### Rendering artifacts

Artifacts render in a side panel to the right of the chat. Obtain the artifact context from the `thread.meta.artifact` field — for example with a utility hook:

```tsx
export function useArtifact<TContext = Record<string, unknown>>() {
  type Component = (props: {
    children: React.ReactNode;
    title?: React.ReactNode;
  }) => React.ReactNode;

  type Context = TContext | undefined;

  type Bag = {
    open: boolean;
    setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;

    context: Context;
    setContext: (value: Context | ((prev: Context) => Context)) => void;
  };

  const thread = useStreamContext<
    { messages: Message[]; ui: UIMessage[] },
    { MetaType: { artifact: [Component, Bag] } }
  >();

  return thread.meta?.artifact;
}
```

Then render additional content with the `Artifact` component from the hook:

```tsx
import { useArtifact } from "../utils/use-artifact";

export function Writer(props: {
  title?: string;
  content?: string;
  description?: string;
}) {
  const [Artifact, { open, setOpen }] = useArtifact();

  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer rounded-lg border p-4"
      >
        <p className="font-medium">{props.title}</p>
        <p className="text-sm text-gray-500">{props.description}</p>
      </div>

      <Artifact title={props.title}>
        <p className="whitespace-pre-wrap p-4">{props.content}</p>
      </Artifact>
    </>
  );
}
```

The `ArtifactProvider` is already wired up in [`src/app/page.tsx`](src/app/page.tsx).

## For coding agents

[`AGENTS.md`](AGENTS.md) documents the repository structure, commands and conventions; nested `AGENTS.md` files cover individual directories in more depth.

## Known limitations

- CI has no build/typecheck job — a dependency bump that breaks the build surfaces as a failed deploy run, not a failed PR check. Major dependency bumps are therefore reviewed manually.
