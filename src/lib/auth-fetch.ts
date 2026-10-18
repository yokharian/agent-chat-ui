import { fetchAuthSession } from "aws-amplify/auth";
import {
  configureGuestAuth,
  configureRegisteredAuth,
  guestAuthConfigAvailable,
} from "./auth-config";

/**
 * `fetch` wrapper that injects the current Cognito access token as an
 * `Authorization: Bearer` header on every request.
 *
 * Pass it to the LangGraph SDK via `callerOptions.fetch` (HTTP client)
 * and `fetch` (SSE/WS transport) so all traffic is authenticated.
 *
 * The token is resolved from the registered user pool first, then from the
 * guest user pool; sessions without any Cognito token pass through
 * unauthenticated and the backend decides.
 */
export const authFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const accessToken = await currentAccessToken();

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

const currentAccessToken = async (): Promise<string | undefined> => {
  try {
    configureRegisteredAuth();
    let token = await sessionToken();
    if (token) return token;

    if (guestAuthConfigAvailable() && configureGuestAuth()) {
      token = await sessionToken();
      if (token) return token;
    }
    return undefined;
  } finally {
    // Leave Amplify pointed at the registered pool; every auth operation
    // configures the pool it targets explicitly before running.
    configureRegisteredAuth();
  }
};

const sessionToken = async (): Promise<string | undefined> => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  } catch {
    // No session in the currently configured pool.
    return undefined;
  }
};
