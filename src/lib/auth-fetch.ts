import { createClient } from "@/lib/supabase/client";

/**
 * `fetch` wrapper that injects the Supabase access token as an
 * `Authorization: Bearer` header on every request. Requests without a token
 * pass through unauthenticated and the backend decides.
 *
 * Pass it to the LangGraph SDK via `callerOptions.fetch`. In SDK 1.11.0 the
 * React `useStream` hook routes both HTTP calls and the SSE run stream
 * through the client's `asyncCaller.fetch`, so this single channel covers
 * all traffic.
 */
export const authFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const accessToken = session?.access_token;

  if (accessToken) {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    return fetch(input, {
      ...init,
      headers,
    });
  }

  return fetch(input, init);
};
