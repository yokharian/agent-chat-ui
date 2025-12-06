import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface WelcomeDialogProps {
  children?: React.ReactNode;
}

function WelcomeDialog({ children }: WelcomeDialogProps) {
  // Welcome dialog visibility
  const [showWelcome, setShowWelcome] = useState(true);

  if (showWelcome) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4">
        <div className="animate-in fade-in-0 zoom-in-95 bg-background flex max-w-3xl flex-col rounded-lg border shadow-lg">
          <div className="mt-14 flex flex-col gap-2 border-b p-6">
            <div className="flex flex-col items-start gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Agent Chat
              </h1>
            </div>
            <p className="text-muted-foreground">Welcome to my Agent Chat!</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowWelcome(false);
            }}
            className="bg-muted/50 flex flex-col gap-6 p-6"
          >
            <div className="mt-2 flex justify-end">
              <Button
                type="submit"
                size="lg"
                ignore-auth-gate="true"
              >
                Start
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export { WelcomeDialog };
