"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Amplify } from "aws-amplify";
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
import outputs from "../../amplify_outputs.json";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    Amplify.configure(outputs);

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
        if (mounted) {
          setSession(null);
          setIsGuest(false);
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
        const result = await signUp({
          username,
          password,
          options: {
            userAttributes: { email },
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
        const guestSession: AuthSession = {
          user: {
            username: `guest_${Date.now()}`,
            email: undefined,
            attributes: { "custom:is_guest": "true" },
          },
          accessToken: undefined,
        };
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
      await signOut({ global: true });
      setSession(null);
      setIsGuest(false);
    } catch (error) {
      console.error("Sign out error:", error);
      setSession(null);
      setIsGuest(false);
    }
  }, []);

  const updateUserAttributesFn = useCallback(
    async (
      attributes: Record<string, string>,
    ): Promise<{ error: string | null }> => {
      try {
        await updateUserAttributes({ userAttributes: attributes });
        return { error: null };
      } catch (error: unknown) {
        return {
          error: error instanceof Error ? error.message : "Update failed",
        };
      }
    },
    [],
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
