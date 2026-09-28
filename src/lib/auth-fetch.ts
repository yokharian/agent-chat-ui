import { fetchAuthSession } from "aws-amplify/auth";

/**
 * `fetch` wrapper that injects the current Cognito access token as an
 * `Authorization: Bearer` header on every request.
 *
 * Pass it to the LangGraph SDK via `callerOptions.fetch` (HTTP client)
 * and `fetch` (SSE/WS transport) so all traffic is authenticated.
 */
export const authFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const session = await fetchAuthSession();

  const accessToken = session.tokens?.accessToken?.toString();

  if (!accessToken) {
    throw new Error("User is not authenticated");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
};
