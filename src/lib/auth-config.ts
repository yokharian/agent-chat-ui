import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

interface PoolMetadata {
	appClientIds: {
		default?: string;
		vehicleSalesAgent?: string;
		guest?: string;
	};
	userPoolIds: { registered?: string; guest?: string };
	identityPoolIds: { registered?: string; guest?: string };
}

/**
 * The backend (the `backend/` Amplify app inside the api.yokharian.dev
 * monorepo) exports its Cognito topology in the `custom` section of
 * `amplify_outputs.json`: `appClientIds`, `userPoolIds`
 * and `identityPoolIds` for the `registered` (authenticated) and `guest`
 * user pools.
 *
 * aws-amplify v6 has a single active Auth config, so every auth operation
 * configures the pool it targets before running via these helpers.
 */
export function getPoolMetadata(): PoolMetadata | null {
	const payload = (outputs as { custom?: { payload?: string } }).custom
		?.payload;
	if (!payload) return null;
	try {
		return JSON.parse(payload) as PoolMetadata;
	} catch {
		return null;
	}
}

export function configureRegisteredAuth(): void {
	Amplify.configure(outputs);
}

export function guestAuthConfigAvailable(): boolean {
	const meta = getPoolMetadata();
	return Boolean(meta?.appClientIds?.guest && meta?.userPoolIds?.guest);
}

/** Configures Amplify for the guest user pool; false when unconfigured. */
export function configureGuestAuth(): boolean {
	const meta = getPoolMetadata();
	if (!meta?.appClientIds?.guest || !meta?.userPoolIds?.guest) return false;
	Amplify.configure({
		Auth: {
			Cognito: {
				userPoolId: meta.userPoolIds.guest,
				userPoolClientId: meta.appClientIds.guest,
			},
		},
	});
	return true;
}
