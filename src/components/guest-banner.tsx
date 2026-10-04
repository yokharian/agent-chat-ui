"use client";

import React, { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/Auth";

function GuestBanner() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const { error: emailError } = await createClient().auth.updateUser({
      email,
    });
    if (emailError) {
      setError(emailError.message);
      setPending(false);
      return;
    }

    setMessage(
      `Verification link sent to ${email}. After clicking it, set your password to finish.`,
    );
    setPending(false);
    setEmail("");
  };

  return (
    <div className="bg-muted/50 shrink-0 border-b">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2">
        <span className="text-muted-foreground text-sm">
          Guest session — chats live only on this device until you create an
          account.
        </span>
        {!open ? (
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            type="button"
            variant="outline"
          >
            Create account
          </Button>
        ) : null}
        <Button
          onClick={() => signOut()}
          size="sm"
          type="button"
          variant="ghost"
        >
          Sign out
        </Button>
      </div>
      {open ? (
        <form
          className="mx-auto flex max-w-4xl flex-wrap items-end justify-center gap-2 px-4"
          onSubmit={handleCreateAccount}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="guest-email">Email</Label>
            <Input
              className="w-64"
              id="guest-email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <Button
            disabled={pending}
            size="sm"
            type="submit"
          >
            {pending ? "Sending..." : "Send verification link"}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="text-destructive pb-2 text-center text-sm">{error}</p>
      ) : null}
      {message ? (
        <p className="text-muted-foreground pb-2 text-center text-sm">
          {message}{" "}
          <Link
            className="underline underline-offset-4"
            href="/auth/update-password"
          >
            Set password
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export { GuestBanner };
