"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  fetchAuthSession,
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  signOut,
  getCurrentUser,
  updateUserAttributes,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import {
  configureGuestAuth,
  configureRegisteredAuth,
  guestAuthConfigAvailable,
} from "@/lib/auth-config";

interface CognitoUser {
  username: string;
  email?: string;
  attributes?: Record<string, string>;
}

interface AuthSession {
  user: CognitoUser | null;
  accessToken?: string;
  idToken?: string;
}

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (
    username: string,
    password: string,
    captchaToken?: string,
  ) => Promise<{ error: string | null; challengeName?: string }>;
  signUp: (
    username: string,
    password: string,
    email: string,
    captchaToken?: string,
  ) => Promise<{ error: string | null; isSignUpComplete?: boolean }>;
  confirmSignUp: (
    username: string,
    code: string,
  ) => Promise<{ error: string | null }>;
  resendSignUpCode: (username: string) => Promise<{ error: string | null }>;
  resetPassword: (
    username: string,
    captchaToken?: string,
  ) => Promise<{ error: string | null; isPasswordReset?: boolean }>;
  confirmResetPassword: (
    username: string,
    code: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
  signInAnonymously: (captchaToken?: string) => Promise<{
    error: string | null;
  }>;
  signOut: () => Promise<void>;
  updateUserAttributes: (
    attributes: Record<string, string>,
  ) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Random password for guest users. The guest user pool requires at least 8
 * characters with one lowercase letter and one digit.
 */
function generateGuestPassword(): string {
  const digits = "23456789";
  const letters = "abcdefghijkmnpqrstuvwxyz";
  const random = (charset: string, length: number): string => {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => charset[b % charset.length]).join("");
  };
  return `g${random(digits, 1)}${random(letters, 5)}${random(digits + letters, 10)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    configureRegisteredAuth();

    const loadSession = async () => {
      try {
        const authSession = await fetchAuthSession();
        const currentUser = await getCurrentUser();

        if (mounted) {
          setSession({
            user: currentUser
              ? {
                  username: currentUser.username,
                  email: currentUser.signInDetails?.loginId,
                  attributes: (
                    currentUser as { attributes?: Record<string, string> }
                  ).attributes,
                }
              : null,
            accessToken: authSession.tokens?.accessToken?.toString(),
            idToken: authSession.tokens?.idToken?.toString(),
          });
          setIsGuest(false);
        }
      } catch {
        // No registered-pool session — restore a guest-pool session if present.
        let guestSession: AuthSession | null = null;
        if (guestAuthConfigAvailable() && configureGuestAuth()) {
          try {
            const authSession = await fetchAuthSession();
            const accessToken = authSession.tokens?.accessToken?.toString();
            if (accessToken) {
              const currentUser = await getCurrentUser();
              guestSession = {
                user: {
                  username: currentUser.username,
                  email: currentUser.signInDetails?.loginId,
                  attributes: {
                    ...((currentUser as { attributes?: Record<string, string> })
                      .attributes ?? {}),
                    "custom:is_guest": "true",
                  },
                },
                accessToken,
                idToken: authSession.tokens?.idToken?.toString(),
              };
            }
          } catch {
            // No guest session either — fall through to signed-out.
          } finally {
            configureRegisteredAuth();
          }
        }
        if (mounted) {
          if (guestSession) {
            setSession(guestSession);
            setIsGuest(true);
          } else {
            setSession(null);
            setIsGuest(false);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSession();

    const hubListener = (data: {
      payload: { event: string; data?: unknown };
    }) => {
      const { event } = data.payload;
      if (
        event === "signedIn" ||
        event === "signedOut" ||
        event === "tokenRefresh"
      ) {
        loadSession();
      }
    };

    const unsubscribe = Hub.listen("auth", hubListener);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signInFn = useCallback(
    async (
      username: string,
      password: string,
      captchaToken?: string,
    ): Promise<{ error: string | null; challengeName?: string }> => {
      try {
        configureRegisteredAuth();
        const result = await signIn({ username, password });
        if (result.isSignedIn) {
          return { error: null };
        }
        const nextStep = result.nextStep;
        const challengeName =
          nextStep &&
          typeof nextStep === "object" &&
          "challengeName" in nextStep
            ? (nextStep as { challengeName?: string }).challengeName
            : undefined;
        return { error: null, challengeName };
      } catch (error: unknown) {
        return {
          error: error instanceof Error ? error.message : "Sign in failed",
        };
      }
    },
    [],
  );

  const signUpFn = useCallback(
    async (
      username: string,
      password: string,
      email: string,
      captchaToken?: string,
    ): Promise<{ error: string | null; isSignUpComplete?: boolean }> => {
      try {
        configureRegisteredAuth();
        const result = await signUp({
          username,
          password,
          options: {
            userAttributes: { email },
            validationData: captchaToken
              ? { turnstileToken: captchaToken }
              : undefined,
          },
        });
        return { error: null, isSignUpComplete: result.isSignUpComplete };
      } catch (error: unknown) {
        return {
          error: error instanceof Error ? error.message : "Sign up failed",
        };
      }
    },
    [],
  );

  const confirmSignUpFn = useCallback(
    async (
      username: string,
      code: string,
    ): Promise<{ error: string | null }> => {
      try {
        configureRegisteredAuth();
        await confirmSignUp({ username, confirmationCode: code });
        return { error: null };
      } catch (error: unknown) {
        return {
          error: error instanceof Error ? error.message : "Confirmation failed",
        };
      }
    },
    [],
  );

  const resendSignUpCodeFn = useCallback(
    async (username: string): Promise<{ error: string | null }> => {
      try {
        configureRegisteredAuth();
        await resendSignUpCode({ username });
        return { error: null };
      } catch (error: unknown) {
        return {
          error: error instanceof Error ? error.message : "Resend failed",
        };
      }
    },
    [],
  );

  const resetPasswordFn = useCallback(
    async (
      username: string,
      captchaToken?: string,
    ): Promise<{ error: string | null; isPasswordReset?: boolean }> => {
      try {
        configureRegisteredAuth();
        const result = await resetPassword({ username });
        return { error: null, isPasswordReset: result.isPasswordReset };
      } catch (error: unknown) {
        return {
          error:
            error instanceof Error ? error.message : "Reset password failed",
        };
      }
    },
    [],
  );

  const confirmResetPasswordFn = useCallback(
    async (
      username: string,
      code: string,
      newPassword: string,
    ): Promise<{ error: string | null }> => {
      try {
        configureRegisteredAuth();
        await confirmResetPassword({
          username,
          confirmationCode: code,
          newPassword,
        });
        return { error: null };
      } catch (error: unknown) {
        return {
          error:
            error instanceof Error ? error.message : "Confirm reset failed",
        };
      }
    },
    [],
  );

  const signInAnonymouslyFn = useCallback(
    async (captchaToken?: string): Promise<{ error: string | null }> => {
      try {
        if (!guestAuthConfigAvailable() || !configureGuestAuth()) {
          return {
            error: "Guest sign-in is unavailable. Please try again later.",
          };
        }

        const guestName = `guest_${Date.now()}`;
        // The guest pool signs in with email usernames; a synthetic address
        // under the app's domain keeps the required format without a mailbox.
        const username = `${guestName}@guest.yokharian.dev`;
        const password = generateGuestPassword();
        const clientMetadata = captchaToken ? { captchaToken } : undefined;
        const validationData = captchaToken
          ? { turnstileToken: captchaToken }
          : undefined;

        // 1. Register the guest in the guest user pool — the hard requirement.
        // The backend pre-sign-up trigger reads the Turnstile token from
        // validationData["turnstileToken"], never from clientMetadata.
        try {
          await signUp({
            username,
            password,
            options: {
              userAttributes: {
                email: username,
                "custom:guest": "true",
              },
              validationData,
            },
          });
        } catch (error: unknown) {
          return {
            error:
              error instanceof Error ? error.message : "Guest sign in failed",
          };
        }

        // 2. Sign the guest in so requests carry a real guest-pool token. The
        // pool's pre-sign-up trigger auto-confirms signups once the backend
        // change is deployed; until then fall back to a local guest session.
        let guestSession: AuthSession = {
          user: {
            username: guestName,
            email: undefined,
            attributes: { "custom:is_guest": "true" },
          },
          accessToken: undefined,
        };
        try {
          await signIn({ username, password, options: { clientMetadata } });
          const authSession = await fetchAuthSession();
          const currentUser = await getCurrentUser();
          guestSession = {
            user: {
              username: currentUser.username,
              email: currentUser.signInDetails?.loginId,
              attributes: { "custom:is_guest": "true" },
            },
            accessToken: authSession.tokens?.accessToken?.toString(),
            idToken: authSession.tokens?.idToken?.toString(),
          };
        } catch (signInError) {
          console.warn("Guest registered but not signed in:", signInError);
        }

        setSession(guestSession);
        setIsGuest(true);
        return { error: null };
      } catch (error: unknown) {
        return {
          error:
            error instanceof Error ? error.message : "Guest sign in failed",
        };
      }
    },
    [],
  );

  const signOutFn = useCallback(async () => {
    try {
      // Sign out from the pool the active session belongs to.
      if (isGuest) {
        configureGuestAuth();
      } else {
        configureRegisteredAuth();
      }
      await signOut({ global: true });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSession(null);
      setIsGuest(false);
      configureRegisteredAuth();
    }
  }, [isGuest]);

  const updateUserAttributesFn = useCallback(
    async (
      attributes: Record<string, string>,
    ): Promise<{ error: string | null }> => {
      try {
        // Update attributes on the pool the active session belongs to
        // (guests convert their account from the guest banner).
        if (isGuest) {
          configureGuestAuth();
        } else {
          configureRegisteredAuth();
        }
        await updateUserAttributes({ userAttributes: attributes });
        return { error: null };
      } catch (error: unknown) {
        return {
          error: error instanceof Error ? error.message : "Update failed",
        };
      }
    },
    [isGuest],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isGuest,
        signIn: signInFn,
        signUp: signUpFn,
        confirmSignUp: confirmSignUpFn,
        resendSignUpCode: resendSignUpCodeFn,
        resetPassword: resetPasswordFn,
        confirmResetPassword: confirmResetPasswordFn,
        signInAnonymously: signInAnonymouslyFn,
        signOut: signOutFn,
        updateUserAttributes: updateUserAttributesFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export { useAuth };
