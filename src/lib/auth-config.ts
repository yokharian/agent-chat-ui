import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

/**
 * Contract of the backend's `amplify_outputs.json` custom payload: one user
 * pool and one identity pool for both flows, with `guest` naming the client
 * the create-guest lambda mints guest tokens from.
 */
export interface AppAuthConfig {
  userPoolId?: string;
  identityPoolId?: string;
  appClientIds: {
    default?: string;
    vehicleSalesAgent?: string;
    guest?: string;
  };
}

export function getAppAuthConfig(): AppAuthConfig | null {
  const payload = (outputs as { custom?: { payload?: string } }).custom
    ?.payload;
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<AppAuthConfig>;
    return {
      userPoolId: parsed.userPoolId,
      identityPoolId: parsed.identityPoolId,
      appClientIds: parsed.appClientIds ?? {},
    };
  } catch {
    return null;
  }
}

export function guestAppClientId(): string | undefined {
  return getAppAuthConfig()?.appClientIds.guest;
}

export function guestAuthConfigAvailable(): boolean {
  return Boolean(guestAppClientId());
}

export function configureRegisteredAuth(): void {
  Amplify.configure(outputs);
}
