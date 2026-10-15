import { fetchAuthSession } from "aws-amplify/auth";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

/**
 * `fetch` wrapper that injects the current Cognito access token as an
 * `Authorization: Bearer` header on every request.
 *
 * Pass it to the LangGraph SDK via `callerOptions.fetch` (HTTP client)
 * and `fetch` (SSE/WS transport) so all traffic is authenticated.
 *
 * For guest sessions (no Cognito token), requests pass through unauthenticated
 * and the backend decides.
 */
export const authFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  Amplify.configure(outputs);

  try {
    const session = await fetchAuthSession();

    const accessToken = session.tokens?.accessToken?.toString();

    if (accessToken) {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);

      return fetch(input, {
        ...init,
        headers,
      });
    }
  } catch {
    // No authenticated session - continue without token for guest access
  }

  return fetch(input, init);
};
